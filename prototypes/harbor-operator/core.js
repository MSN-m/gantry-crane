// PROTOTYPE - NOT FOR PRODUCTION
// Question: Fixed cockpit view with single-axis travel and manual hoisting.
// Date: 2026-10-14
(function(root){
 const slots=[155,235,315], maxHeight=130, clearance=105,capacity=2,totalCargo=6;
 function create(){return {camera:0,height:maxHeight,held:null,boxes:[[],[],[]],queue:['red','blue','yellow','red','blue','yellow'],delivered:0,picks:0,history:[]};}
 function score(s){let count=0,same=0;for(const stack of s.boxes){count+=stack.length;for(let i=1;i<stack.length;i++)if(stack[i]===stack[i-1])same+=50;}const base=count*100,completion=count===totalCargo?200:0;return {base,same,completion,total:base+same+completion};}
 function preview(s,index){if(!s.held||index<0||index>=slots.length||s.boxes[index].length>=capacity)return null;const stack=s.boxes[index],base=100,same=stack.at(-1)===s.held?50:0,completion=s.boxes.reduce((n,a)=>n+a.length,0)===totalCargo-1?200:0;return {base,same,completion,total:base+same+completion};}
 function target(s){if(Math.abs(s.camera)<24)return {type:'dock',y:0};const i=slots.findIndex(y=>Math.abs(y-s.camera)<24);return i<0?null:{type:'slot',index:i,y:slots[i]};}
 function save(s){s.history.push({camera:s.camera,height:s.height,held:s.held,boxes:s.boxes.map(a=>[...a]),queue:[...s.queue],delivered:s.delivered,picks:s.picks});}
 function contact(s){const t=target(s);if(!t)return {ok:false,message:'还没对准 · 提升吊具后调整位置'};
  if(!s.held){if(t.type!=='dock'||!s.queue.length)return {ok:false,message:'请回到卡车取货 · 船上只接收落箱'};save(s);s.held=s.queue.shift();s.picks++;return {ok:true,picked:true,color:s.held,message:'已锁定来货 · 请选择船上的空位'};}
  if(t.type==='dock')return {ok:false,message:'请把货物装到船上 · 卡车位不能落箱'};
  if(s.boxes[t.index].length>=capacity)return {ok:false,message:'这个船位已满两层 · 请选择其他位置'};const gain=preview(s,t.index);save(s);const color=s.held;s.boxes[t.index].push(color);s.held=null;s.delivered++;return {ok:true,delivered:true,color,gain,complete:s.delivered===totalCargo,message:'装船完成 · 货物已留在船上'};
 }
 function undo(s){const a=s.history.pop();if(!a)return false;Object.assign(s,a);return true;}
 function controller(state){
  const initial=target(state),aligned=initial&&Math.abs(state.camera-initial.y)<1;
  const c={phase:'idle',selected:aligned?(initial.type==='dock'?0:initial.index+1):null,destination:state.camera,velocity:0,result:null,complete:false};
  c.select=function(index){if(!Number.isInteger(index)||index<0||index>slots.length||c.complete||['lowering','raising'].includes(c.phase))return false;c.selected=index;c.destination=index===0?0:slots[index-1];if(Math.abs(c.destination-state.camera)<1){state.camera=c.destination;c.velocity=0;c.phase='idle';}else c.phase='moving';return true;};
  c.available=function(){if(c.phase!=='idle'||c.selected===null||c.complete)return false;const t=target(state);if(!t)return false;if(!state.held)return t.type==='dock'&&state.queue.length>0;return t.type==='slot'&&state.boxes[t.index].length<capacity;};
  c.confirm=function(){if(!c.available())return false;c.phase='lowering';c.result=null;return true;};
  c.cancel=function(){if(c.phase!=='moving')return false;c.phase='idle';c.selected=null;c.velocity=0;return true;};
  c.update=function(dt){
   if(c.phase==='moving'){const distance=c.destination-state.camera,desired=Math.sign(distance)*Math.min(210,Math.sqrt(2*420*Math.abs(distance)));c.velocity+=(desired-c.velocity)*Math.min(1,dt*12);const next=state.camera+c.velocity*dt;if(Math.abs(distance)<1||Math.sign(c.destination-next)!==Math.sign(distance)){state.camera=c.destination;c.velocity=0;c.phase='idle';return {arrived:true};}state.camera=next;}
   if(c.phase==='lowering'){const t=target(state),floor=t?.type==='dock'?30:4+state.boxes[t.index].length*18+18;state.height=Math.max(floor,state.height-135*dt);if(state.height<=floor){c.result=contact(state);c.phase='raising';return {contact:c.result};}}
   if(c.phase==='raising'){state.height=Math.min(maxHeight,state.height+150*dt);if(state.height===maxHeight){c.phase='idle';c.complete=!!c.result?.complete;return {raised:true,complete:c.complete};}}
   return {};
  };return c;
 }
 function hitTarget(x,y,regions){let best=null,distance=Infinity;for(const r of regions){const halfW=Math.max(24,r.width/2),halfH=Math.max(24,r.height/2);if(Math.abs(x-r.x)>halfW||Math.abs(y-r.y)>halfH)continue;const d=Math.hypot(x-r.x,y-r.y);if(d<distance){best=r.index;distance=d;}}return best;}
 const api={slots,maxHeight,clearance,capacity,totalCargo,create,target,contact,undo,controller,hitTarget,score,preview};if(typeof module!=='undefined')module.exports=api;else root.Harbor=api;
})(typeof window!=='undefined'?window:globalThis);
