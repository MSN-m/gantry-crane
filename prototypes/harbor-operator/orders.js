// PROTOTYPE - NOT FOR PRODUCTION
// Question: Can owner, spatial and sequential work orders form understandable cross-column builds?
// Date: 2026-10-21
(function(root){
 const config=typeof module!=='undefined'?require('./config.js'):root.HarborConfig;
 const owners={power:{name:'电力设备公司',short:'电',color:'#f3cf79'},medical:{name:'医疗用品公司',short:'医',color:'#b9e3df'}};
 const colorNames={red:'红',blue:'蓝',yellow:'黄',green:'绿'};
 const params=config.orders;
 const definitions=[];
 function add(id,name,kind,text,extra={}){definitions.push({id,name,kind,text,...extra});}
 for(const owner of Object.keys(owners)){
  add('priority-'+owner,'优先提货·'+owners[owner].short,'priority','每次正式落船后，整船每只上方无遮挡的'+owners[owner].name+'箱子奖励'+params.priority+'分。旧列仍生效，长箱两侧均须无遮挡。',{owner});
  add('client-'+owner,'长期客户·'+owners[owner].short,'client','每交付一只'+owners[owner].name+'箱子，先奖励当前金额，再提高后续奖励。初始'+params.clientStart+'分，每次成长'+params.clientGrowth+'分，跨列保留。',{owner});
 }
 add('relay','长短接力','relay','长短箱连续交替时，每档增加'+params.relayStep+'分；同尺寸本次为0并重置。首箱不奖励，跨批跨列保留。');
 add('corner','边角专家','corner','短箱落船后补齐同一箱位左右高度，额外奖励'+params.corner+'分。长箱不触发。');
 add('cap','封顶交付','cap','完整箱位左右首次都达到三层，对其中全部箱子的基础分与同色奖励额外结算一次。每箱位一次。');
 const colors=Object.keys(colorNames);for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)add('convert-'+colors[i]+'-'+colors[j],'转色协议·'+colorNames[colors[i]]+colorNames[colors[j]],'convert',colorNames[colors[i]]+'与'+colorNames[colors[j]]+'计分时互视为同色。实际颜色不变，多张协议不传递合并。',{pair:[colors[i],colors[j]],repeatable:false});
 add('flat','追加报酬','flat','每次正式落船，本次得分额外增加'+params.flat+'分，长短箱相同。');
 add('rush','加急奖金','rush','轮到此工单时，将本次已累计得分×'+params.rush+'，四舍五入到整数。不影响历史总分。');
 add('review','复核奖励','review','左侧相邻工单的计分效果额外执行一次。条件须成立，不额外成长、不制造新落箱。左侧是转色协议或复核奖励时无效果。',{repeatable:false});
 function get(id){return definitions.find(d=>d.id===id);}
 function make(id){if(!get(id))throw Error('Unknown work order '+id);return {id,state:{reward:params.clientStart,lastSize:null,streak:0,marks:[]}};}
 function equivalent(s,a,b){return a===b||(s.orders||[]).some(o=>get(o.id)?.pair?.includes(a)&&get(o.id).pair.includes(b));}
 function bayValue(s,bay){let value=0;for(const col of bay){value+=col.length*config.basePerHalf;for(let i=1;i<col.length;i++)if(equivalent(s,col[i-1].color,col[i].color))value+=config.samePerHalf;}return value;}
 function exposed(s,owner){let count=0;for(const boxes of [...s.archives.map(a=>a.boxes),s.boxes])for(const bay of boxes){const seen=new Set();for(const col of bay){const box=col.at(-1);if(!box||box.owner!==owner||seen.has(box.id))continue;if(box.size===2&&!bay.every(side=>side.at(-1)?.id===box.id))continue;seen.add(box.id);count++;}}return count;}
 function resolve(s,context){let total=context.base+context.same+context.completion;const trace=[],effects=[];
  for(let index=0;index<s.orders.length;index++){const order=s.orders[index],d=get(order.id),before=total,rewardBefore=order.state.reward;let effect=null,note='未触发';
   if(d.kind==='priority'){const count=exposed(s,d.owner);effect={type:'add',value:count*params.priority};note='无遮挡 '+count+'箱';}
   if(d.kind==='client'&&context.box.owner===d.owner){effect={type:'add',value:order.state.reward};order.state.reward+=params.clientGrowth;note='下次 '+order.state.reward+'分';}
   if(d.kind==='relay'){order.state.streak=order.state.lastSize!==null&&order.state.lastSize!==context.box.size?order.state.streak+1:0;order.state.lastSize=context.box.size;effect={type:'add',value:order.state.streak*params.relayStep};note='接力 '+order.state.streak+'次';}
   if(d.kind==='corner'&&context.box.size===1&&context.heights[0]===context.heights[1]){effect={type:'add',value:params.corner};note='短箱补齐';}
   if(d.kind==='cap'){const key=s.column+':'+context.bay;if(context.heights.every(n=>n===3)&&!order.state.marks.includes(key)){effect={type:'add',value:bayValue(s,s.boxes[context.bay])};order.state.marks.push(key);note='箱位封顶';}}
   if(d.kind==='convert')note='同色判定生效';
   if(d.kind==='flat'){effect={type:'add',value:params.flat};note='固定报酬';}
   if(d.kind==='rush'){effect={type:'multiply',value:params.rush};note='×'+params.rush;}
   if(d.kind==='review'){const left=s.orders[index-1],leftDef=left&&get(left.id);if(leftDef&&leftDef.repeatable!==false&&effects[index-1]){effect={...effects[index-1]};note='复核 '+leftDef.name;}else note='左侧无可重复效果';}
   if(effect)total=effect.type==='add'?total+effect.value:Math.round(total*effect.value);
   effects.push(effect);trace.push({id:order.id,index,name:d.name,before,after:total,delta:total-before,triggered:!!effect&&total!==before,note,effect:effect?{...effect}:null,growth:d.kind==='client'?order.state.reward-rewardBefore:0});
  }
  return {total,bonus:total-context.base-context.same-context.completion,trace};
 }
 // Pure color conversion cannot exceed the 2400 base/same ceiling by itself.
 function attainableOffer(s,d){if(d.kind!=='convert')return true;if(!s.orders.length)return false;const kinds=s.orders.map(o=>get(o.id).kind);return !kinds.every(k=>k==='corner'||k==='convert')||config.goals[s.column]<=36*config.basePerHalf+24*config.samePerHalf+6*params.corner;}
 function choices(s){const owned=new Set(s.orders.map(o=>o.id)),cargo=[...s.manifests[s.column],...s.reserves.filter(Boolean)];const pool=definitions.filter(d=>!owned.has(d.id)&&attainableOffer(s,d)&&(!d.owner||cargo.some(b=>b.owner===d.owner))&&(d.kind!=='review'||s.orders.some(o=>get(o.id).repeatable!==false)));
  let seed=(s.seed^Math.imul(s.column+1,0x85ebca6b))>>>0;for(let i=pool.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}
  // If there is an actionable partner, keep it among the three without forcing the player's choice.
  if(s.orders.length){const kinds=s.orders.map(o=>get(o.id).kind),related=pool.find(d=>d.kind==='review'&&kinds.some(k=>!['review','convert'].includes(k))||d.kind==='rush'&&kinds.some(k=>['priority','client','flat','relay','corner','cap'].includes(k))||d.kind==='cap'&&kinds.includes('convert'));if(related){pool.splice(pool.indexOf(related),1);pool.unshift(related);}}
  const selected=[];for(const d of pool){if(selected.some(item=>item.kind===d.kind))continue;selected.push(d);if(selected.length===3)break;}return selected.map(d=>({...d}));
 }
 function choose(s,id){if(!s.choicePending||!choices(s).some(d=>d.id===id))return false;s.orders.push(make(id));s.choicePending=false;if(s.metrics)s.metrics.events.push({column:s.column+1,batch:s.batchIndex+1,seconds:Math.round(s.metrics.columns[s.column].activeSeconds*10)/10,type:'draft',order:id});
  // Give a selected owner build modest support without rerolling colors, sizes or the batch order.
  const focus=s.orders.map(o=>get(o.id).owner).filter(Boolean);let preferred=null;if(focus.length&&focus.every(o=>o===focus[0]))preferred=focus[0];if(preferred){const list=s.manifests[s.column],current=list.filter(b=>b.owner===preferred).length;let needed=Math.max(0,14-current);for(const box of list)if(needed&&box.owner!==preferred){box.owner=preferred;needed--;}}
  s.trucks=s.manifests[s.column].slice(0,4);return true;
 }
 function reorder(s,from,to){if(s.ended||s.choicePending||!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=s.orders.length||to>=s.orders.length)return false;const [order]=s.orders.splice(from,1);s.orders.splice(to,0,order);if(s.metrics)s.metrics.events.push({column:s.column+1,batch:s.batchIndex+1,seconds:Math.round(s.metrics.columns[s.column].activeSeconds*10)/10,type:'reorder',orders:s.orders.map(o=>o.id)});return true;}
 const api={owners,params,definitions,get,make,equivalent,bayValue,exposed,resolve,choices,choose,reorder};if(typeof module!=='undefined')module.exports=api;else root.HarborOrders=api;
})(typeof window!=='undefined'?window:globalThis);
