// PROTOTYPE - NOT FOR PRODUCTION
// Question: Can owner, spatial and sequential work orders form understandable cross-column builds?
// Date: 2026-10-21
(function(root){
 const config=typeof module!=='undefined'?require('./config.js'):root.HarborConfig;
 const owners={power:{name:'电力设备公司',short:'电',color:'#f3cf79'},medical:{name:'医疗用品公司',short:'医',color:'#b9e3df'}};
 const colorNames={red:'红',blue:'蓝',yellow:'黄',green:'绿'};
 const params=config.orders;
 const definitions=[];
 function add(id,name,kind,text,extra={}){const grade=['flat','corner','convert'].includes(kind)?1:['client','relay','cap'].includes(kind)?2:3;definitions.push({id,name,kind,text,grade,color:{1:'#E2E8E6',2:'#6FCF97',3:'#6FAEFF'}[grade],price:config.economy.prices[grade],sellPrice:config.economy.sell[grade],...extra});}
 for(const owner of Object.keys(owners)){
  const cargoName=owner==='power'?'电力箱':'医疗箱';
  add('priority-'+owner,'优先提货·'+owners[owner].short,'priority','每装一箱，整船每只顶部无遮挡的'+cargoName+'，绩效额外＋'+params.priority+'。',{owner,details:'对象：'+owners[owner].name+'。旧列也计入，装入其他货主的箱子也触发。长箱有任何部分被压住就不计入，一只长箱只算一次。'});
  add('client-'+owner,'长期客户·'+owners[owner].short,'client','每装一只'+cargoName+'，奖励'+params.clientStart+'绩效；此奖励每次提高'+params.clientGrowth+'。',{owner,details:'对象：'+owners[owner].name+'。先按当前奖励结算，再提高下次奖励。成长跨列保留，其他货主不触发，也不会打断成长。'});
 }
 add('relay','长短接力','relay','长短箱交替装船，奖励每次增加'+params.relayStep+'绩效。',{details:'首箱不奖励。连续同尺寸时本次不奖励，接力重置；下次交替从'+params.relayStep+'开始。跨批、跨列保留。'});
 add('corner','边角专家','corner','以短箱补齐一层，绩效额外＋'+params.corner+'。',{details:'短箱装船后，使同一箱位两侧高度相同即为补齐。长箱不触发。'});
 add('cap','封顶交付','cap','箱位装满，该箱位所有箱子的基础绩效和同色绩效再结算一次。',{details:'箱位装满指两侧都达到三层。每箱位仅触发一次，不重复结算其他合约的绩效。'});
 const colors=Object.keys(colorNames);for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)add('convert-'+colors[i]+'-'+colors[j],'转色协议·'+colorNames[colors[i]]+colorNames[colors[j]],'convert',colorNames[colors[i]]+'、'+colorNames[colors[j]]+'箱视为同色。',{pair:[colors[i],colors[j]],repeatable:false,details:'只影响同色绩效判定，实际颜色不变。多份转色协议不会连锁合并。'});
 add('flat','追加报酬','flat','每装一箱，绩效额外＋'+params.flat+'。',{details:'长箱、短箱奖励相同。'});
 add('rush','加急奖金','rush','本次绩效×'+params.rush+'。',{details:'放大结算到此处时已累计的本次绩效，不影响历史绩效。每次乘法四舍五入到整数。'});
 add('review','复核奖励','review','左侧合约的本次绩效，再结算一次。',{repeatable:false,details:'只重复紧邻左侧合约本次有效的加分或倍率，不重复成长。左侧是转色协议、复核奖励或本次未触发时无效；最左侧也无效。'});
 function get(id){return definitions.find(d=>d.id===id);}
 function make(id){if(!get(id))throw Error('Unknown work order '+id);return {id,state:{reward:params.clientStart,lastSize:null,streak:0,marks:[]}};}
 function equivalent(s,a,b){return a===b||(s.orders||[]).some(o=>get(o.id)?.pair?.includes(a)&&get(o.id).pair.includes(b));}
 function bayValue(s,bay){let value=0;for(const col of bay){value+=col.length*config.basePerHalf;for(let i=1;i<col.length;i++)if(equivalent(s,col[i-1].color,col[i].color))value+=config.samePerHalf;}return value;}
 function exposed(s,owner){let count=0;for(const boxes of [...s.archives.map(a=>a.boxes),s.boxes])for(const bay of boxes){const seen=new Set();for(const col of bay){const box=col.at(-1);if(!box||box.owner!==owner||seen.has(box.id))continue;if(box.size===2&&!bay.every(side=>side.at(-1)?.id===box.id))continue;seen.add(box.id);count++;}}return count;}
 function resolve(s,context){let total=context.base+context.same+context.completion;const trace=[],effects=[];
  for(let index=0;index<s.orders.length;index++){const order=s.orders[index],d=get(order.id),before=total,rewardBefore=order.state.reward;let effect=null,note='未触发';
   if(d.kind==='priority'){const count=exposed(s,d.owner);effect={type:'add',value:count*params.priority};note='无遮挡 '+count+'箱';}
   if(d.kind==='client'&&context.box.owner===d.owner){effect={type:'add',value:order.state.reward};order.state.reward+=params.clientGrowth;note='下次绩效 '+order.state.reward;}
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
  let seed=(s.seed^Math.imul(s.column+1,0x85ebca6b)^Math.imul((s.shopRoll||0)+1,0x27d4eb2d))>>>0;for(let i=pool.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}
  // If there is an actionable partner, keep it among the three without forcing the player's choice.
  if(s.orders.length){const kinds=s.orders.map(o=>get(o.id).kind),related=pool.find(d=>d.kind==='review'&&kinds.some(k=>!['review','convert'].includes(k))||d.kind==='rush'&&kinds.some(k=>['priority','client','flat','relay','corner','cap'].includes(k))||d.kind==='cap'&&kinds.includes('convert'));if(related){pool.splice(pool.indexOf(related),1);pool.unshift(related);}}
  const selected=[];for(const d of pool){if(selected.some(item=>item.kind===d.kind))continue;selected.push(d);if(selected.length===3)break;}if(s.column===1&&!s.orders.length&&!selected.some(d=>d.price<=s.coins)){const affordable=pool.find(d=>d.price<=s.coins);if(affordable)selected[selected.length?selected.length-1:0]=affordable;}return selected.map(d=>({...d}));
 }
 function transaction(s,type,data){const event={type,column:s.column+1,...data,balance:s.coins};s.transactions.push(event);if(s.metrics)s.metrics.events.push({...event,batch:s.batchIndex+1,seconds:Math.round(s.metrics.columns[s.column].activeSeconds)});}
 function openShop(s){if(s.column===0||s.ended)return false;s.choicePending=true;s.shopRoll=(s.shopRoll||0)+1;s.shop={offers:choices(s).map(d=>d.id),refreshes:0};}
 function buy(s,id){const index=s.shop?.offers.indexOf(id)??-1,d=get(id);if(!s.choicePending||s.ended||s.held||s.cancelPending||!d||index<0||s.coins<d.price||s.orders.length>=config.economy.limit||s.orders.some(o=>o.id===id))return false;s.coins-=d.price;s.orders.push(make(id));s.shop.offers[index]=null;transaction(s,'contract-buy',{id,amount:-d.price});return true;}
 function sell(s,id){const index=s.orders.findIndex(o=>o.id===id),d=get(id);if(!s.choicePending||s.ended||s.held||s.cancelPending||index<0||!d)return false;s.orders.splice(index,1);s.coins+=d.sellPrice;transaction(s,'contract-sell',{id,amount:d.sellPrice});return true;}
 function refreshShop(s){if(!s.choicePending||s.ended||s.held||s.cancelPending||s.coins<config.economy.refresh)return false;s.coins-=config.economy.refresh;s.shopRoll++;s.shop={offers:choices(s).map(d=>d.id),refreshes:s.shop.refreshes+1};transaction(s,'shop-refresh',{amount:-config.economy.refresh});return true;}
 function closeShop(s){if(!s.choicePending||s.ended)return false;
  const focus=s.orders.map(o=>get(o.id).owner).filter(Boolean);if(focus.length&&focus.every(owner=>owner===focus[0])){const list=s.manifests[s.column];let needed=Math.max(0,14-list.filter(b=>b.owner===focus[0]).length);for(const box of list)if(needed&&box.owner!==focus[0]){box.owner=focus[0];needed--;}}
  s.trucks=s.manifests[s.column].slice(0,4);s.choicePending=false;return true;
 }
 function reorder(s,from,to){if(s.ended||s.choicePending||!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=s.orders.length||to>=s.orders.length)return false;const [order]=s.orders.splice(from,1);s.orders.splice(to,0,order);if(s.metrics)s.metrics.events.push({column:s.column+1,batch:s.batchIndex+1,seconds:Math.round(s.metrics.columns[s.column].activeSeconds*10)/10,type:'reorder',orders:s.orders.map(o=>o.id)});return true;}
 const api={owners,params,definitions,get,make,equivalent,bayValue,exposed,resolve,choices,transaction,openShop,buy,sell,refreshShop,closeShop,reorder};if(typeof module!=='undefined')module.exports=api;else root.HarborOrders=api;
})(typeof window!=='undefined'?window:globalThis);
