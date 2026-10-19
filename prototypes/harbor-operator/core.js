// PROTOTYPE - NOT FOR PRODUCTION
// Question: Work-order choices, mixed container sizes and two independently selectable delivery trucks.
// Date: 2026-10-19
(function(root){
 const slots=Array.from({length:6},(_,i)=>155+i*32),dockY=[54,12],cargo={length:150,width:30,height:32},capacity=3,maxHeight=150,animationSpeed=1.5,totalUnits=36;
 const colors=['red','blue','yellow','green'],scoreGoal=2600;
 const workOrders={mono:{name:'专色装船',text:'每处上下同色，在原奖励上再加25分／半格。'},mixed:{name:'联合运输',text:'每个半列集齐红蓝黄三色，额外加150分。'},level:{name:'整齐交付',text:'相邻两箱位齐平同高，每组每层首次达成加100分。'}};
 function manifest(){return Array.from({length:24},(_,i)=>({id:i+1,color:colors[i%colors.length],size:Math.floor(i/colors.length)%2===0?2:1}));}
 const totalCargo=24;
 function create(workOrder='mono'){const list=manifest();return {camera:dockY[0],cameraX:0,height:maxHeight,held:null,half:0,boxes:slots.map(()=>[[],[]]),trucks:list.splice(0,2),truckWait:[0,0],queue:list,delivered:0,picks:0,history:[],orderMarks:[],departed:false,workOrder:workOrders[workOrder]?workOrder:'mono'};}
 function levels(s,index){return s.boxes[index].map(col=>col.length);}
 function placement(s,index,half=s.half){if(!s.held||!Number.isInteger(index)||index<0||index>=slots.length||![0,1].includes(half))return null;const h=levels(s,index);if(s.held.size===2){if(h[0]!==h[1]||h[0]>=capacity)return null;return {level:h[0],half:0,x:0,width:cargo.length};}if(h[half]>=capacity)return null;return {level:h[half],half,x:half?37.5:-37.5,width:74.5};}
 function put(s,index,p){const box=s.held;for(let side=p.half;side<p.half+box.size;side++)s.boxes[index][side].push({...box});s.held=null;s.delivered++;
  if(s.workOrder==='level')for(let i=1;i<slots.length;i++){const a=levels(s,i-1),b=levels(s,i),key=i+'-'+a[0];if(a[0]>0&&a[0]===a[1]&&a[0]===b[0]&&b[0]===b[1]&&!s.orderMarks.includes(key))s.orderMarks.push(key);}
 }
 function score(s){let units=0,samePairs=0,bonus=0;for(const bay of s.boxes)for(const col of bay){units+=col.length;for(let i=1;i<col.length;i++)if(col[i].color===col[i-1].color)samePairs++;if(s.workOrder==='mixed'&&new Set(col.map(b=>b.color)).size===3)bonus+=150;}
  if(s.workOrder==='mono')bonus=samePairs*25;
  if(s.workOrder==='level')bonus=s.orderMarks.length*100;
  const base=units*50,same=samePairs*25,completion=units===totalUnits?200:0;return {base,same,bonus,completion,units,total:base+same+bonus+completion};
 }
 function outcome(s){const points=score(s),scoreReached=points.total>=scoreGoal,full=points.units===totalUnits,remaining=Math.max(0,totalCargo-s.delivered),finished=remaining===0&&full&&!s.held&&s.trucks.every(box=>!box)&&s.queue.length===0,passed=finished&&scoreReached;return {scoreReached,finished,passed,full,remaining,failed:finished&&!scoreReached,canDepart:passed&&!s.departed,total:points.total,goal:scoreGoal,shortfall:Math.max(0,scoreGoal-points.total)};}
 function depart(s){if(!outcome(s).canDepart)return false;s.departed=true;return true;}
 function preview(s,index,half=s.half){const p=placement(s,index,half);if(!p)return null;const before=score(s),copy=JSON.parse(JSON.stringify({...s,history:[]}));put(copy,index,p);const after=score(copy),gain={};for(const key of ['base','same','bonus','completion','total'])gain[key]=after[key]-before[key];return gain;}
 function target(s){const points=[...dockY,...slots];let best=0;for(let i=1;i<points.length;i++)if(Math.abs(points[i]-s.camera)<Math.abs(points[best]-s.camera))best=i;if(Math.abs(points[best]-s.camera)>15)return null;return best<2?{type:'dock',index:best,y:points[best]}:{type:'slot',index:best-2,y:points[best]};}
 function save(s){const {history,...rest}=s;history.push(JSON.parse(JSON.stringify(rest)));}
 function undo(s){const entry=s.history.pop();if(!entry)return false;Object.assign(s,entry);return true;}
 function contact(s){const t=target(s);if(!t)return {ok:false,message:'请先对准目标'};
  if(!s.held){if(t.type!=='dock'||!s.trucks[t.index]||s.truckWait[t.index]>0)return {ok:false,message:'请选择有货的车辆'};save(s);s.held=s.trucks[t.index];s.trucks[t.index]=s.queue.shift()||null;s.truckWait[t.index]=1;s.picks++;return {ok:true,picked:true,truck:t.index,box:{...s.held}};}
  if(t.type!=='slot')return {ok:false,message:'请把货物装到船上'};const p=placement(s,t.index);if(!p)return {ok:false,message:s.held.size===2?'长箱需要两侧等高且有空间':'这一侧已满三层'};const gain=preview(s,t.index);save(s);put(s,t.index,p);return {ok:true,delivered:true,gain,complete:outcome(s).finished};
 }
 function destination(index){return index===0?{y:dockY[0],dock:0}:index===7?{y:dockY[1],dock:1}:Number.isInteger(index)&&index>=1&&index<=6?{y:slots[index-1],bay:index-1}:null;}
 function controller(state){const t=target(state),c={phase:'idle',selected:t?(t.type==='dock'?(t.index?7:0):t.index+1):null,destination:state.camera,destinationX:state.cameraX,velocity:0,result:null,complete:false};
  c.select=function(index,half=state.half){const d=destination(index);if(!d||![0,1].includes(half)||state.departed||c.complete||['lowering','raising'].includes(c.phase))return false;state.half=half;c.selected=index;c.destination=d.y;c.destinationX=d.bay!==undefined&&state.held?.size===1?(half?37.5:-37.5):0;c.phase='moving';if(Math.abs(c.destination-state.camera)<.5&&Math.abs(c.destinationX-state.cameraX)<.5){state.camera=c.destination;state.cameraX=c.destinationX;c.phase='idle';c.velocity=0;}return true;};
  c.available=function(){if(c.phase!=='idle'||c.selected===null||c.complete||state.departed)return false;const t=target(state);return !!t&&(state.held?t.type==='slot'&&!!placement(state,t.index):t.type==='dock'&&!!state.trucks[t.index]&&state.truckWait[t.index]<=0);};
  c.confirm=function(){if(!c.available())return false;c.phase='lowering';c.result=null;return true;};
  c.cancel=function(){if(c.phase!=='moving')return false;c.phase='idle';c.selected=null;c.velocity=0;return true;};
  c.update=function(dt){dt*=animationSpeed;state.truckWait=state.truckWait.map(t=>Math.max(0,t-dt));
   if(c.phase==='moving'){const distance=c.destination-state.camera,desired=Math.sign(distance)*Math.min(210,Math.sqrt(840*Math.abs(distance)));c.velocity+=(desired-c.velocity)*Math.min(1,dt*12);let next=state.camera+c.velocity*dt;if(Math.abs(distance)<.5||Math.sign(c.destination-next)!==Math.sign(distance)){next=c.destination;c.velocity=0;}state.camera=next;const dx=c.destinationX-state.cameraX;state.cameraX+=Math.sign(dx)*Math.min(Math.abs(dx),120*dt);if(Math.abs(c.destination-state.camera)<.5&&Math.abs(c.destinationX-state.cameraX)<.5){state.camera=c.destination;state.cameraX=c.destinationX;c.phase='idle';return {arrived:true};}}
   if(c.phase==='lowering'){const t=target(state),p=t?.type==='slot'?placement(state,t.index):null,floor=t?.type==='dock'?12+cargo.height:4+((p?.level||0)+1)*cargo.height;state.height=Math.max(floor,state.height-135*dt);if(state.height<=floor){c.result=contact(state);c.phase='raising';return {contact:c.result};}}
   if(c.phase==='raising'){state.height=Math.min(maxHeight,state.height+150*dt);if(state.height===maxHeight){c.phase='idle';c.complete=!!c.result?.complete;return {raised:true,complete:c.complete};}}
   return {};
  };return c;
 }
 function hitTarget(x,y,regions){let best=null,distance=Infinity;for(const r of regions){if(Math.abs(x-r.x)>Math.max(24,r.width/2)||Math.abs(y-r.y)>Math.max(24,r.height/2))continue;const d=Math.hypot(x-r.x,y-r.y);if(d<distance){best=r.index;distance=d;}}return best;}
 const api={colors,scoreGoal,outcome,depart,slots,dockY,cargo,capacity,maxHeight,animationSpeed,totalUnits,totalCargo,workOrders,manifest,create,levels,placement,score,preview,target,contact,undo,destination,controller,hitTarget};if(typeof module!=='undefined')module.exports=api;else root.Harbor=api;
})(typeof window!=='undefined'?window:globalThis);
