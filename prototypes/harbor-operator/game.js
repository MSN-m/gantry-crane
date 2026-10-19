// PROTOTYPE - NOT FOR PRODUCTION
// Question: Fixed downward cockpit view, one-axis travel and manual hoisting.
// Date: 2026-10-14
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const palette={red:['#ad5546','#cf8061','#6e352e','红'],blue:['#41788a','#74a7b0','#294d59','蓝'],yellow:['#b49643','#d8c477','#76602f','黄'],green:['#3f865b','#73b476','#25543a','绿']};
let s=Harbor.create(),control=Harbor.controller(s),paused=true,last=0,elapsed=0,departures=[null,null],chosenOrder='mono',sway=0,swayV=0,vibrationEnabled=true,oldVelocity=0,queueKey='';
let W=0,H=0,CX=0,CY=0,hitRegions=[],sceneTargets=[],projectionAdjustment=null;
const cargo=Harbor.cargo,SCORE_GOAL=Harbor.scoreGoal;
let finishAt=0;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
function rr(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}}
function poly(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}}
function txt(t,x,y,size=12,color='#e8ddbc',align='center'){ctx.font=`600 ${size}px system-ui`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(t,x,y)}
function project(x,y,z=0){const dy=y-s.camera,depth=Math.max(.48,1+dy*.001),k=.85/(depth*(1-z/300));const p={x:CX+(x-s.cameraX)*k,y:CY-dy*k,k};if(projectionAdjustment){const a=projectionAdjustment;p.x=a.x+(p.x-a.x)*a.k;p.y=a.y+(p.y-a.y)*a.k;p.k*=a.k;}return p;}
function quad(x,y,w,l,z){return [project(x-w/2,y+l/2,z),project(x+w/2,y+l/2,z),project(x+w/2,y-l/2,z),project(x-w/2,y-l/2,z)]}
function line(a,b,color,width=1){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
function container(x,y,c,z=0,w=cargo.length,l=cargo.width){const visible=project(x,y,z+cargo.height);if(visible.x < -140 || visible.x > W+140 || visible.y < -140 || visible.y > H+140)return;const p=palette[c],base=quad(x,y,w,l,z),top=quad(x,y,w,l,z+cargo.height);poly([base[3],base[2],top[2],top[3]],p[2],'#273a32');poly([base[1],base[2],top[2],top[1]],p[0]);poly(top,p[0],'#e0d4a859');for(let d=-w/2+9;d<w/2;d+=10)line(project(x+d,y-l/2+5,z+cargo.height),project(x+d,y+l/2-5,z+cargo.height),p[1],1.4);{const mid=project(x,y,z+cargo.height);rr(mid.x-15*mid.k,mid.y-11*mid.k,30*mid.k,22*mid.k,3,'#10292b55');txt(p[3],mid.x,mid.y+4*mid.k,12*mid.k,'#fff3d3');}}
function boxName(box){return box?palette[box.color][3]+(box.size===2?'·40尺':'·20尺'):'已取完'}
function drawCargo(box,x,y,z){container(x,y,box.color,z,box.size===2?150:74.5);}
// Road cargo is 97% of the unstacked ship cargo at the middle bay in the same view.
function roadScale(y){return .97*project(0,Harbor.slots[2],4+cargo.height).k/project(0,y,12+cargo.height).k;}
function withRoadScale(y,drawRoad){const center=project(0,y,0),scale=roadScale(y);ctx.save();ctx.translate(center.x,center.y);ctx.scale(scale,scale);ctx.translate(-center.x,-center.y);drawRoad();ctx.restore();}
function truck(color,y=0,offset=0,size=2){const length=size===2?150:74.5,trailer=length+12,cabX=offset+trailer/2+18;poly(quad(offset,y,trailer,36,0),'#323b36','#cbb879');poly(quad(cabX,y,30,34,9),palette[color][0],'#d1d1b0');poly(quad(cabX+5,y,11,25,12),'#acccc6');for(const x of [-trailer/2+19,trailer/2-15])for(const dy of [-20,20])poly(quad(offset+x,y+dy,13,9,0),'#111e1e');}

function draw(){const dpr=Math.min(devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);W=w;H=h;CX=w/2;CY=h*.56;ctx.save();const scale=w/366;ctx.translate(CX,CY);ctx.scale(scale,scale);ctx.translate(-CX,-CY);
 // Three compact horizontal lanes, 42 units each; the upper road edge meets the near hull with no water gap.
 ctx.fillStyle='#234c59';ctx.fillRect(-400,-600,w+800,h+1200);
 for(let y=145;y<700;y+=27)for(const side of [-1,1])for(let x=183;x<550;x+=61)line(project(side*x,y),project(side*(x+22),y+2),'#527e8355',1.3);
 // Solid quay paving beyond the outer road edge prevents the narrowed road reading as an island.
 poly(quad(0,-600,1600,1182,0),'#4d5852');
 for(let x=-700;x<=700;x+=55)line(project(x,-17),project(x+42,-17),'#798275',1);
 poly(quad(0,54,1600,126,0),'#797c73');
 for(const y of [-9,117])line(project(-800,y),project(800,y),'#e0d6ac',2);
 for(const y of [33,75])for(let x=-760;x<=760;x+=62)line(project(x,y),project(x+31,y),'#e5dfbb',1.5);
 // The empty ship-side lane is a service lane; A/B trucks occupy the other two lanes.
 for(const y of [12,54,96])for(const x of [-230,230]){const dir=y===96?-1:1;line(project(x-13*dir,y),project(x+13*dir,y),'#d6d4b3',2);line(project(x+13*dir,y),project(x+5*dir,y+5),'#d6d4b3',2);line(project(x+13*dir,y),project(x+5*dir,y-5),'#d6d4b3',2);}
 poly(quad(0,115,1600,4,0),'#a6a18b','#d8d1b3');
 for(let x=-700;x<=700;x+=45)poly(quad(x,115,20,4,1),'#414846');
 // Vessel is moored parallel to the quay: stern left, bow right, cargo row across its beam.
 const shape=(points,z,fill,stroke)=>poly(points.map(([x,y])=>project(x,y,z)),fill,stroke);
 const hull=[[-570,117],[455,117],[538,145],[620,205],[668,246],[620,287],[538,347],[455,375],[-570,375],[-602,348],[-602,145]];
 shape(hull.map(([x,y])=>[x+5,y-7]),-2,'#102d38');
 shape(hull,0,'#183546','#79989a');
 shape([[-570,117],[455,117],[538,145],[-590,145]],1,'#984d3b','#c88860');
 const deck=[[-562,131],[452,131],[531,158],[606,212],[650,246],[606,280],[531,334],[452,361],[-562,361],[-586,341],[-586,151]];
 shape(deck,4,'#64776c','#b6b59b');
 for(let i=0;i<deck.length;i++){line(project(...deck[i],9),project(...deck[(i+1)%deck.length],9),'#ddd4b8',2);}
 // Continuous near/far gunwales and walkways establish the horizontal ship axis.
 for(const y of [137,355]){
  poly(quad(-25,y,1030,8,6),'#314e4f','#a7b3a0');
  line(project(-552,y+(y<200?10:-10),5),project(455,y+(y<200?10:-10),5),'#d8b969',1.5);
  for(let x=-550;x<470;x+=30)line(project(x,y,7),project(x,y,14),'#e5dfc2',1);
  for(const x of [-475,-260,120,350]){poly(quad(x,y,20,11,9),'#2a4142','#a8b7a2');line(project(x-7,y,13),project(x+7,y,13),'#e1d7b8',3);}
 }
 // Non-interactive closed hatch covers sit beside the active central bay.
 for(const x of [-370,-205,205,370]){
  poly(quad(x,245,148,180,4),'#50695e','#8d9c80');
  for(let y=165;y<330;y+=25)line(project(x-68,y,5),project(x+68,y,5),'#7d8f77',1);
 }
 poly(quad(0,235,205,208,4),'#263b3c','#a8ab8b');
 poly(quad(0,235,190,198,4),'#455d50','#bba568');
 for(const side of [-1,1])for(let y=141;y<335;y+=16)poly(quad(side*88,y,4,5,5),'#d7c28b');
 for(let x=-94;x<95;x+=16){line(project(x,130,5),project(x+7,137,5),'#ddba65',2);line(project(x,340,5),project(x+7,347,5),'#ddba65',2);}
 // Bridge and lifeboats are at the left stern; bow equipment is far to the right.
 poly(quad(-495,244,75,167,7),'#b3b8a3','#e0dac0');
 poly(quad(-495,244,62,140,20),'#d4d0b3','#f0e3bf');
 for(let y=189;y<310;y+=18)poly(quad(-469,y,8,12,22),'#2a4c5b','#91acaf');
 for(const y of [160,330]){poly(quad(-493,y,48,18,12),'#c77d43','#e8b97a');}
 poly(quad(-550,245,27,32,22),'#42575a');
 for(const y of [200,288])poly(quad(540,y,24,18,8),'#2b4647','#adb89e');
 line(project(582,246,5),project(582,246,40),'#ded7bb',2);
 const shipName=project(0,351,8);txt('MARLIN  /  01',shipName.x,shipName.y,9*shipName.k,'#ecdfbd');
 const berth=project(0,121,3);txt('船舷 · 装船作业区',berth.x,berth.y,8*berth.k,'#f4dba4');
 // Each bay contains two half-width columns. Long containers occupy both halves.
 for(let i=Harbor.slots.length-1;i>=0;i--){const y=Harbor.slots[i];poly(quad(0,y,154,32,4),'#394b3f','#c9ba88');line(project(0,y-15,5),project(0,y+15,5),'#7e8c6d',1);
  for(let tier=0;tier<Harbor.capacity;tier++)for(let half=0;half<2;half++){const box=s.boxes[i][half][tier];if(!box||(box.size===2&&half===1))continue;drawCargo(box,box.size===2?0:(half?37.5:-37.5),y,4+tier*cargo.height);}
 }
 for(let i=1;i>=0;i--){const y=Harbor.dockY[i],box=s.trucks[i],d=departures[i],wait=s.truckWait[i];poly(quad(0,y,208,40,0),'#565e55','#ead291');
  const label=project(-94,y+16,3);txt(i?'B车':'A车',label.x,label.y,10*label.k,'#f8df9b');
  if(box){const offset=wait?-300*wait:0;withRoadScale(y,()=>{truck(box.color,y,offset,box.size);drawCargo(box,offset,y,12);});}
  if(d&&wait>0)withRoadScale(y,()=>truck(d.color,y,300*(1-wait),d.size));
 }
 // Scene hit targets and highlight share the projected geometry, including short-box half selection.
 hitRegions=[];sceneTargets=[];
 const addHit=(index,half,x,y,width,length,z,road=false)=>{const center=project(0,y,0),roadK=road?roadScale(y):1;const points=quad(x,y,width,length,z).map(p=>({x:CX+(center.x+(p.x-center.x)*roadK-CX)*scale,y:CY+(center.y+(p.y-center.y)*roadK-CY)*scale})),xs=points.map(p=>p.x),ys=points.map(p=>p.y),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);if(bottom<9||top>h-49)return;const region=sceneTargets.push({index,half})-1;hitRegions.push({index:region,x:(left+right)/2,y:(top+bottom)/2,width:right-left,height:bottom-top});};
 for(let index=0;index<8;index++){const d=Harbor.destination(index),y=d.y;
  if(d.dock!==undefined){const box=s.trucks[d.dock],width=(box?.size===1?74.5:150)+48;if(box&&s.truckWait[d.dock]<=0)addHit(index,0,16,y,width,48,12+cargo.height,true);if(control.selected===index)withRoadScale(y,()=>poly(quad(16,y,width+4,50,12+cargo.height),null,'#ffe49a'));continue;}
  const levels=Harbor.levels(s,d.bay),small=s.held?.size===1,p=Harbor.placement(s,d.bay),z=4+Math.max(...levels)*cargo.height;
  if(small)for(let half=0;half<2;half++)addHit(index,half,half?37.5:-37.5,y,75,30,4+levels[half]*cargo.height);else addHit(index,0,0,y,150,30,z);
  if(control.selected===index){ctx.setLineDash([4,3]);poly(quad(p?.x||0,y,p?.width||154,32,4+(p?.level??Math.max(...levels))*cargo.height+2),null,p?'#ffe49a':'#dba38a');ctx.setLineDash([]);}
  const badge=project(-64,y+10,z+2);rr(badge.x-10,badge.y-7,20,14,2,control.selected===index?'#efd28c':'#182e2bc9');txt('0'+index,badge.x,badge.y+3,8,control.selected===index?'#243833':'#f2e2ba');
 }
 const shadow=project(s.cameraX,s.camera);ctx.globalAlpha=.23;rr(shadow.x-52,shadow.y-27,104,54,7,'#0b1717');ctx.globalAlpha=1;
 const liftY=s.camera+sway,spreaderZ=s.height,rigX=s.cameraX,under=Harbor.target(s),rigBox=s.held||(under?.type==='dock'?s.trucks[under.index]:null),rigWidth=rigBox?.size===1?75:150;const approach=Math.max(0,Math.min(1,(Harbor.maxHeight-s.height)/(Harbor.maxHeight-12-cargo.height)));if(under?.type==='dock'&&approach>0){const center=project(s.cameraX,liftY,0);projectionAdjustment={x:center.x,y:center.y,k:1+(roadScale(under.y)-1)*approach};}if(s.held)drawCargo(s.held,rigX,liftY,Math.max(0,s.height-cargo.height));
 const corners=quad(rigX,liftY,rigWidth,30,spreaderZ+3),anchors=[{x:CX-94,y:14},{x:CX+94,y:14},{x:CX+110,y:h-35},{x:CX-110,y:h-35}];corners.forEach((p,i)=>{line(anchors[i],p,'#14201d',3);line({x:anchors[i].x+2,y:anchors[i].y},p,'#d2cbb1',.8)});
 poly(quad(rigX,liftY+13,rigWidth+8,6,spreaderZ+5),'#e6b84d','#69572f');poly(quad(rigX,liftY-13,rigWidth+8,6,spreaderZ+5),'#cca148','#69572f');for(const x of [-rigWidth/2+3,rigWidth/2-3])poly(quad(rigX+x,liftY,6,30,spreaderZ+5),'#dcb14a','#69572f');
 const c=project(rigX,liftY,spreaderZ+6);line({x:c.x-7,y:c.y},{x:c.x+7,y:c.y},'#fff5c8');line({x:c.x,y:c.y-7},{x:c.x,y:c.y+7},'#fff5c8');
 // Beacon is bolted to the spreader's upper crossbar and shares its full transform.
 poly(quad(rigX-rigWidth*.32,liftY+13,22,15,spreaderZ+10),'#283634','#8b835f');
 const lamp=project(rigX-rigWidth*.32,liftY+13,spreaderZ+15),lit=!s.held||reducedMotion||(elapsed%1.1)<.55,radius=Math.max(4,Math.min(8,4.5*lamp.k));ctx.save();ctx.fillStyle=s.held?(lit?'#ffd256':'#755b22'):'#65f39a';ctx.shadowColor=s.held?'#ffce45':'#65f39a';ctx.shadowBlur=lit?13:0;ctx.beginPath();ctx.arc(lamp.x,lamp.y,radius,0,Math.PI*2);ctx.fill();ctx.restore();projectionAdjustment=null;ctx.restore();
 const glass=ctx.createLinearGradient(0,0,w,0);glass.addColorStop(0,'#b6d9d418');glass.addColorStop(.5,'#b6d9d400');glass.addColorStop(1,'#b6d9d422');ctx.fillStyle=glass;ctx.fillRect(0,0,w,h);
 poly([{x:0,y:0},{x:19,y:0},{x:31,y:h},{x:0,y:h}],'#543f32','#917657');poly([{x:w-19,y:0},{x:w,y:0},{x:w,y:h},{x:w-31,y:h}],'#543f32','#917657');rr(0,0,w,9,0,'#6d5540');poly([{x:0,y:h-49},{x:w,y:h-49},{x:w,y:h},{x:0,y:h}],'#263b3b','#8e886b');rr(w*.19,h-40,w*.62,24,5,'#10282b','#59675d');txt('CAB 01 / '+(s.held?'载荷已锁定':'吊具空载'),w/2,h-24,10,'#d6c9a5');

}
function say(t){$('message').textContent=t}
function buzz(){if(!vibrationEnabled)return;try{if(globalThis.wx?.vibrateShort)globalThis.wx.vibrateShort({type:'light',fail(){}});else if(globalThis.tap?.vibrateShort)globalThis.tap.vibrateShort({type:'light',fail(){}});else navigator.vibrate?.(15);}catch{}}
function clearScoreFeedback(){finishAt=0;$('scoreEffects').replaceChildren();$('scoreAnnouncement').textContent='';$('scoreboard').classList.remove('score-hit');}
function showScoreFeedback(gain){
 const boxPoints=gain.base+gain.same,popup=document.createElement('div');popup.className='score-popup';
 const signed=n=>(n>=0?'+':'')+n;
 popup.innerHTML='<div class="score-popup-title">落箱结算 · 本次 '+signed(gain.total)+'</div><div class="score-popup-row cargo-points"><span>箱子得分</span><strong>'+signed(boxPoints)+'</strong></div><div class="score-popup-row order-points '+(gain.bonus?'':'no-bonus')+'"><span>工单得分</span><strong>'+(gain.bonus?signed(gain.bonus):'未触发 +0')+'</strong></div>'+(gain.same?'<div class="score-popup-note">装载 '+signed(gain.base)+' · 同色 '+signed(gain.same)+'</div>':'')+(gain.completion?'<div class="score-popup-row completion-points"><span>装满奖励</span><strong>'+signed(gain.completion)+'</strong></div>':'');
 popup.addEventListener('animationend',e=>{if(e.target===popup)popup.remove();});
 // One readable receipt at a time; a new score cannot inherit an old animation timer.
 $('scoreEffects').replaceChildren(popup);$('scoreAnnouncement').textContent='箱子得分'+signed(boxPoints)+'，工单得分'+signed(gain.bonus)+(gain.completion?'，装满奖励'+signed(gain.completion):'')+'。本次合计'+signed(gain.total)+'分。';
 $('scoreboard').classList.remove('score-hit');void $('scoreboard').offsetWidth;$('scoreboard').classList.add('score-hit');
}
function sync(){
 const t=Harbor.target(s),busy=['lowering','raising'].includes(control.phase),points=Harbor.score(s);
 $('score').textContent=points.units+' / '+Harbor.totalUnits+' 格 · '+s.delivered+'箱';
 $('points').textContent=points.total+' / '+SCORE_GOAL;
 $('scoreFill').style.width=Math.min(100,points.total/SCORE_GOAL*100)+'%';
 $('scoreProgress').setAttribute('aria-valuenow',String(Math.min(SCORE_GOAL,points.total)));$('scoreProgress').setAttribute('aria-valuetext',points.total+'分，目标'+SCORE_GOAL+'分');
 $('scoreboard').classList.toggle('reached',points.total>=SCORE_GOAL);$('scoreGoal').textContent=points.total>=SCORE_GOAL?(s.delivered===Harbor.totalCargo?'货单完成 · 已达标':'分数达标 · 继续装船'):'第一关 · 得分目标';$('scoreHint').textContent=points.total>=SCORE_GOAL?(s.delivered<Harbor.totalCargo?'还需装 '+(Harbor.totalCargo-s.delivered)+' 箱':'超出目标 '+(points.total-SCORE_GOAL)+'分'):'还差 '+(SCORE_GOAL-points.total)+'分';
 $('breakdown').textContent='箱子 '+(points.base+points.same)+' · 工单 '+points.bonus+(points.completion?' · 装满 '+points.completion:'');
 $('undo').disabled=paused||!s.history.length||busy;$('signalText').textContent=s.held?'载货 · 吊具黄灯闪烁':'空载 · 吊具绿灯';
 $('orderName').textContent=Harbor.workOrders[s.workOrder].name;$('orderInfo').textContent=Harbor.workOrders[s.workOrder].text;
 for(let i=0;i<2;i++){const box=s.trucks[i],el=$('truck'+i);el.disabled=paused||busy||!box;el.classList.toggle('selected',control.selected===(i?7:0));el.setAttribute('aria-pressed',String(control.selected===(i?7:0)));const html='<span class="chip '+(box?.color||'')+'">'+(box?palette[box.color][3]:'✓')+'</span><span>'+(i?'B车':'A车')+' · '+(box?(box.size===2?'40尺长箱':'20尺短箱'):'已取完')+(s.truckWait[i]>0?' · 补位中':'')+'</span>';if(el.innerHTML!==html)el.innerHTML=html;}
 const key=s.queue.map(b=>b.id).join(',');if(key!==queueKey){queueKey=key;$('queue').innerHTML=s.queue.slice(0,2).map(b=>'<span class="chip '+b.color+'">'+palette[b.color][3]+(b.size===2?'长':'短')+'</span>').join(' ');}
 for(let i=0;i<8;i++){const el=$('dest'+i),d=Harbor.destination(i);el.disabled=paused||busy;el.classList.toggle('selected',control.selected===i);el.setAttribute('aria-pressed',String(control.selected===i));let title,label;if(d.dock!==undefined){title=d.dock?'B车':'A车';label=boxName(s.trucks[d.dock]);}else{title='0'+i;const h=Harbor.levels(s,d.bay),gain=Harbor.preview(s,d.bay);label=gain?(gain.total>=0?'+':'')+gain.total+' · '+h[0]+'/'+h[1]+'层':h[0]+'/'+h[1]+'层'+(s.held&&!gain?' · 不可放':'');}const html=title+'<small>'+label+'</small>';if(el.innerHTML!==html)el.innerHTML=html;}
 const atDock=control.selected===0||control.selected===7;
 for(const [id,active] of [['navShip',control.selected!==null&&!atDock],['navDock',atDock]]){const el=$(id);el.disabled=paused||busy;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active));}
 const span=Harbor.slots.at(-1)-Harbor.dockY[1];$('navShip').style.setProperty('--position',String(1-(Harbor.slots[2]-Harbor.dockY[1])/span));$('navPosition').style.top=((1-(s.camera-Harbor.dockY[1])/span)*100)+'%';
 const showHalf=s.held?.size===1;$('halfChoice').hidden=!showHalf;
 for(let i=0;i<2;i++){const el=$('half'+i);el.disabled=paused||busy;el.setAttribute('aria-pressed',String(s.half===i));el.classList.toggle('selected',s.half===i);}
 $('cancel').disabled=control.phase!=='moving';$('action').disabled=paused||!control.available();
 const p=t?.type==='slot'?Harbor.placement(s,t.index):null;
 $('action').textContent=control.phase==='moving'?'移动中 · 到位后确认':control.phase==='lowering'?'下降中…':control.phase==='raising'?'提升中…':control.available()?(s.held?'确认落箱':'确认抓取'):s.held?(t?.type==='slot'&&!p?(s.held.size===2?'长箱需两侧等高、有空位':'这一侧已满 · 换一侧'):'请选择船上箱位'):'请选择A车或B车';
 $('guide').textContent=control.phase==='moving'?'自动对准 · 可改选目标或停止':busy?'作业中 · 升降自动完成':s.held&&t?.type==='slot'?(p?gainText(Harbor.preview(s,t.index)):'无法落箱：'+(s.held.size===2?'需要两侧等高的完整空间':'这一侧已满')):t?.type==='dock'?'两车任选 · 取空后按货单补位':'点击箱位或下方位置自动移动';
}
function gainText(g){return g?'预计 '+(g.total>=0?'+':'')+g.total+'：装载 '+g.base+(g.same?' · 同色 '+g.same:'')+(g.bonus?' · 工单 '+(g.bonus>0?'+':'')+g.bonus:'')+(g.completion?' · 完成 '+g.completion:''):'';}
function showResult(){
 const p=Harbor.score(s),o=Harbor.outcome(s);if(!o.finished)return;paused=true;$('finish').hidden=false;finishAt=0;
 if(o.passed)Harbor.depart(s);
 $('finishTitle').textContent=o.passed?'全部装完，第一关通过！':'已装完，还差 '+o.shortfall+' 分';
 $('finishTag').textContent=o.passed?'MANIFEST COMPLETE':'SCORE BELOW TARGET';
 $('result').textContent='固定货单 '+s.delivered+' / '+Harbor.totalCargo+' 箱已全部装船。最终得分 '+p.total+'（目标 '+SCORE_GOAL+'）：箱子 '+(p.base+p.same)+'、工单 '+p.bonus+'、装满奖励 '+p.completion+'。'+(o.passed?'超出目标 '+(p.total-SCORE_GOAL)+' 分，最终分数不按目标封顶。':'多做同色堆叠；可撤销最后一步继续调整，或重新挑战。');
 $('finishUndo').hidden=o.passed||!s.history.length;$('again').textContent='重新挑战第一关';say(o.passed?'货单完成 · 已通过':'货单完成，分数不足 · 可撤销调整');sync();
}
function select(index,half=s.half){if(paused)return;if(!control.select(index,half)){say('正在作业 · 提升完成后再选择');return;}$('dest'+index)?.scrollIntoView({block:'nearest',inline:'nearest'});say(index===0||index===7?'已选'+(index===7?'B车':'A车')+' · 到位后确认抓取':'已选箱位 0'+index+(s.held?.size===1?(half?'右半位':'左半位'):'')+' · 到位后确认');sync();}
canvas.addEventListener('click',e=>{if(paused)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*canvas.clientWidth/r.width,y=(e.clientY-r.top)*canvas.clientHeight/r.height,id=Harbor.hitTarget(x,y,hitRegions);if(id!==null){const hit=sceneTargets[id];select(hit.index,hit.half);}else say('点击A/B车辆或船上箱位');});
$('destinations').innerHTML=[0,7,1,2,3,4,5,6].map(i=>'<button class="destination" id="dest'+i+'"></button>').join('');
for(let i=0;i<8;i++)$('dest'+i).onclick=()=>select(i);
for(let i=0;i<2;i++){$('truck'+i).onclick=()=>select(i?7:0);$('half'+i).onclick=()=>{if(busy())return;s.half=i;if(control.selected>=1&&control.selected<=6)select(control.selected,i);else sync();};}
function busy(){return ['lowering','raising'].includes(control.phase);}
$('navShip').onclick=()=>select(3);$('navDock').onclick=()=>select(s.trucks[0]?0:7);
$('action').onclick=()=>{if(paused||!control.confirm())return;say(s.held?'正在下降落箱…':'正在下降抓取…');sync();};
$('cancel').onclick=()=>{if(control.cancel()){say('已停止 · 重新选位');sync();}};
$('haptics').onclick=()=>{vibrationEnabled=!vibrationEnabled;$('haptics').textContent='振动 '+(vibrationEnabled?'开':'关');$('haptics').setAttribute('aria-pressed',String(vibrationEnabled));if(vibrationEnabled)buzz();};
function reset(){clearScoreFeedback();chosenOrder='mono';s=Harbor.create('mono');control=Harbor.controller(s);elapsed=0;departures=[null,null];sway=swayV=oldVelocity=0;queueKey='!';paused=false;$('finish').hidden=true;$('intro').hidden=true;say('两车已就位 · 任选一辆确认抓取');sync();}
function chooseOrder(key){key='mono';chosenOrder=key;for(const id of Object.keys(Harbor.workOrders)){$('order-'+id).setAttribute('aria-pressed',String(id===key));$('order-'+id).classList.toggle('selected',id===key);}}
$('start').onclick=reset;
function showIntro(){clearScoreFeedback();paused=true;control.cancel();$('finish').hidden=true;$('intro').hidden=false;chooseOrder(chosenOrder);sync();}
$('reset').onclick=showIntro;$('again').onclick=showIntro;
$('finishUndo').onclick=()=>{$('undo').onclick();};
for(const key of Object.keys(Harbor.workOrders))$('order-'+key).onclick=()=>chooseOrder(key);
$('undo').onclick=()=>{if(busy())return;if(Harbor.undo(s)){clearScoreFeedback();s.height=Harbor.maxHeight;control=Harbor.controller(s);departures=[null,null];sway=swayV=0;paused=false;$('finish').hidden=true;say('已撤销 · 双车货单和工单分数一起恢复');sync();}};
addEventListener('keydown',e=>{if(e.repeat)return;if(/^[0-7]$/.test(e.key))select(Number(e.key));if(e.key===' '){e.preventDefault();$('action').onclick();}});
addEventListener('blur',()=>{if(control.cancel())say('移动已暂停 · 可重新选位');sync();});
document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden)control.cancel();sync();});
function frame(now){const dt=Math.min((now-last)/1000||0,.05);last=now;if(!paused&&!document.hidden){elapsed+=dt;const event=control.update(dt);swayV+=(-sway*32-swayV*10-(control.velocity-oldVelocity)*3)*dt;sway+=swayV*dt;oldVelocity=control.velocity;
 if(event.arrived)say(control.available()?(s.held?'已对准 · 确认落箱':'已对准 · 确认抓取'):'已到位 · 查看摆放条件');
 if(event.contact){const r=event.contact;if(r.ok)buzz();if(r.delivered)showScoreFeedback(r.gain);if(r.picked){departures[r.truck]={color:r.box.color,size:r.box.size};say('已抓取'+boxName(r.box)+' · '+(r.truck?'B':'A')+'车补位中');}else if(r.delivered)say('落稳 '+(r.gain.total>=0?'+':'')+r.gain.total+' 分'+(r.gain.bonus?' · 工单 '+(r.gain.bonus>0?'+':'')+r.gain.bonus:'')+' · 提升中');else say(r.message);}
 if(event.raised&&!event.complete)say(s.held?'选择船位'+(s.held.size===1?'和左／右半位':' · 长箱需要两侧等高'):'请选择A车或B车取下一箱');
 if(event.complete){paused=true;finishAt=now+2800;say(Harbor.outcome(s).passed?'装船完成 · 已达标':'装满了，但分数还差 '+Harbor.outcome(s).shortfall+' 分');}

 sync();}draw();if(finishAt&&now>=finishAt){finishAt=0;showResult();}requestAnimationFrame(frame);}
chooseOrder(chosenOrder);sync();requestAnimationFrame(frame);
