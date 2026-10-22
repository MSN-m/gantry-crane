// PROTOTYPE - NOT FOR PRODUCTION
// Question: Direct scene selection of four trucks, two buffers and two ship columns.
// Date: 2026-10-21
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const palette={red:['#ad5546','#cf8061','#6e352e','红'],blue:['#41788a','#74a7b0','#294d59','蓝'],yellow:['#b49643','#d8c477','#76602f','黄'],green:['#3f865b','#73b476','#25543a','绿']};
let s=Harbor.create(),control=Harbor.controller(s),paused=true,last=0,elapsed=0,sway=0,swayV=0,oldVelocity=0;
let W=0,H=0,CX=0,CY=0,hitRegions=[],sceneTargets=[],projectionAdjustment=null;
const cargo=Harbor.cargo,SCORE_GOAL=Harbor.scoreGoal;
let lookReturning=false;
let sceneGesture=null,viewLook={yaw:0,pitch:0},lookTarget={yaw:0,pitch:0};
const lookLimits={yaw:.9,pitch:.95},lookSensitivity=.003,nearPlane=28;
const cameraHeight=480;
const cameraOrigin={x:0,y:52};
let viewCamera={...cameraOrigin};
const cameraLookDragEnabled=false;
const lookArea={left:-620,right:675,shore:-42,sea:405};
let lastReceipt=null;
let feedbackUntil=0,feedbackTimers=[],rackKey='',drag=null,suppressOrderClick=false;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
function rr(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}}
function poly(points,fill,stroke){points=clipNear(points);if(points.length<3)return;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}}
function txt(t,x,y,size=12,color='#e8ddbc',align='center'){ctx.font=`600 ${size}px system-ui`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(t,x,y)}
// Rotate rays around the cabin camera's fixed position; no drag translation or orbit.
function screenPoint(vx,vy,vz){const depth=Math.max(nearPlane,vz),k=255/(depth*Math.max(.48,1+vy*.001)),p={x:CX+vx*k,y:CY-vy*k*Math.min(2.1,canvas.clientHeight/280),k,vx,vy,vz,front:vz>=nearPlane};if(projectionAdjustment){const a=projectionAdjustment;p.x=a.x+(p.x-a.x)*a.k;p.y=a.y+(p.y-a.y)*a.k;p.k*=a.k;}return p;}
function projectFromLook(x,y,z,look){const dx=x-viewCamera.x,dy=y-viewCamera.y,dz=cameraHeight-z,cy=Math.cos(look.yaw),sy=Math.sin(look.yaw),cp=Math.cos(look.pitch),sp=Math.sin(look.pitch),rx=cy*dx-sy*dz,rz=sy*dx+cy*dz;return screenPoint(rx,cp*dy-sp*rz,sp*dy+cp*rz);}
function project(x,y,z=0){return projectFromLook(x,y,z,viewLook);}
// Fit the permitted angular range to the visible work area, not to arbitrary fixed angles.
function cameraLookRange(look=lookTarget){const w=canvas.clientWidth,h=canvas.clientHeight,scale=w/420,centerY=h*.56;
 const screen=(x,y,z,angles)=>{const p=projectFromLook(x,y,z,angles);return {x:w/2+(p.x-CX)*scale,y:centerY+(p.y-CY)*scale};};
 const root=(fn,limit)=>{let a=-limit,b=limit;if(fn(a)>=0)return a;if(fn(b)<=0)return b;for(let i=0;i<18;i++){const mid=(a+b)/2;if(fn(mid)>0)b=mid;else a=mid;}return (a+b)/2;};
 let yawMin=root(yaw=>20-screen(lookArea.left,viewCamera.y,32,{yaw,pitch:look.pitch}).x,lookLimits.yaw),yawMax=root(yaw=>w-20-screen(lookArea.right,viewCamera.y,32,{yaw,pitch:look.pitch}).x,lookLimits.yaw);
 let pitchMin=root(pitch=>screen(viewCamera.x,lookArea.shore,12,{yaw:look.yaw,pitch}).y-(h-52),lookLimits.pitch),pitchMax=root(pitch=>screen(viewCamera.x,lookArea.sea,4,{yaw:look.yaw,pitch}).y-12,lookLimits.pitch);
 if(yawMin>yawMax)yawMin=yawMax=(yawMin+yawMax)/2;if(pitchMin>pitchMax){const center=(pitchMin+pitchMax)/2;pitchMin=center-.045;pitchMax=center+.045;}return {yawMin,yawMax,pitchMin,pitchMax};
}
function boundedLook(look){let result={...look};for(let i=0;i<3;i++){const r=cameraLookRange(result);result.yaw=Math.max(r.yawMin,Math.min(r.yawMax,result.yaw));result.pitch=Math.max(r.pitchMin,Math.min(r.pitchMax,result.pitch));}return result;}
function defaultLook(){let look=boundedLook({yaw:0,pitch:0});for(let i=0;i<3;i++){const r=cameraLookRange(look);look=boundedLook({yaw:Math.max(r.yawMin,Math.min(r.yawMax,0)),pitch:(r.pitchMin+r.pitchMax)/2});}return look;}
function easeEdge(value,delta,min,max){const available=delta>0?max-value:value-min,zone=Math.max(.015,Math.min(.12,(max-min)*.3)),gain=.22+.78*Math.max(0,Math.min(1,available/zone));return Math.max(min,Math.min(max,value+delta*gain));}
// Follow the crane; only a completed placement sends both back to the origin.
function updateCamera(dt){const target={x:s.cameraX,y:s.camera},blend=reducedMotion?1:1-Math.exp(-dt*12);for(const axis of ['x','y']){viewCamera[axis]+=(target[axis]-viewCamera[axis])*blend;if(Math.abs(viewCamera[axis]-target[axis])<.01)viewCamera[axis]=target[axis];}}
function updateLook(dt){if(control.phase!=='idle')return;const blend=reducedMotion?1:1-Math.exp(-dt*(lookReturning?10:22));for(const axis of ['yaw','pitch']){viewLook[axis]+=(lookTarget[axis]-viewLook[axis])*blend;if(Math.abs(lookTarget[axis]-viewLook[axis])<.0001)viewLook[axis]=lookTarget[axis];}if(Math.hypot(viewLook.yaw-lookTarget.yaw,viewLook.pitch-lookTarget.pitch)<.0002)lookReturning=false;}
function clipNear(points){if(!points.length||points.some(p=>p.vz===undefined))return points;const out=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],af=a.vz>=nearPlane,bf=b.vz>=nearPlane;if(af)out.push(a);if(af!==bf){const f=(nearPlane-a.vz)/(b.vz-a.vz);out.push(screenPoint(a.vx+(b.vx-a.vx)*f,a.vy+(b.vy-a.vy)*f,nearPlane));}}return out;}
function quad(x,y,w,l,z){return [project(x-w/2,y+l/2,z),project(x+w/2,y+l/2,z),project(x+w/2,y-l/2,z),project(x-w/2,y-l/2,z)]}
function line(a,b,color,width=1){if(a.vz!==undefined&&b.vz!==undefined){if(!a.front&&!b.front)return;if(a.front!==b.front){const f=(nearPlane-a.vz)/(b.vz-a.vz),p=screenPoint(a.vx+(b.vx-a.vx)*f,a.vy+(b.vy-a.vy)*f,nearPlane);if(!a.front)a=p;else b=p;}}ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
function container(x,y,c,z=0,w=cargo.length,l=cargo.width){const visible=project(x,y,z+cargo.height);if(!visible.front || visible.x < -140 || visible.x > W+140 || visible.y < -140 || visible.y > H+140)return;const p=palette[c],base=quad(x,y,w,l,z),top=quad(x,y,w,l,z+cargo.height);poly([base[3],base[2],top[2],top[3]],p[2],'#273a32');poly([base[1],base[2],top[2],top[1]],p[0]);poly(top,p[0],'#e0d4a859');for(let d=-w/2+9;d<w/2;d+=10)line(project(x+d,y-l/2+5,z+cargo.height),project(x+d,y+l/2-5,z+cargo.height),p[1],1.4);{const mid=project(x,y,z+cargo.height);rr(mid.x-15*mid.k,mid.y-11*mid.k,30*mid.k,22*mid.k,3,'#10292b55');txt(p[3],mid.x,mid.y+4*mid.k,12*mid.k,'#fff3d3');}}
function boxName(box){return box?palette[box.color][3]+(box.size===2?'·40尺':'·20尺')+'·'+(Harbor.orders.owners[box.owner]?.name||'普通货物'):'已取完'}
function drawCargo(box,x,y,z){const length=box.size===2?150:74.5;container(x,y,box.color,z,length);const owner=Harbor.orders.owners[box.owner];if(owner){const mid=project(x,y,z+cargo.height+1);if(!mid.front)return;const scale=canvas.clientWidth/420,label=length*mid.k*scale<48?owner.short:palette[box.color][3]+'·'+owner.short,font=Math.max(9/scale,13*mid.k),width=Math.min(length*mid.k*.95,Math.max((label.length===1?18:42)/scale,54*mid.k)),height=Math.max(15/scale,22*mid.k);rr(mid.x-width/2,mid.y-height/2,width,height,3,'#10292bdc');txt(label,mid.x,mid.y+font*.34,font,'#fff0cf');}}
// Road cargo is 97% of the unstacked ship cargo at the middle bay in the same view.
function roadScale(y){return 1;}
function withRoadScale(y,drawRoad){const center=project(0,y,0),scale=roadScale(y);ctx.save();ctx.translate(center.x,center.y);ctx.scale(scale,scale);ctx.translate(-center.x,-center.y);drawRoad();ctx.restore();}
function truck(color,y=0,offset=0,size=2){const length=size===2?150:74.5,trailer=length+12,cabX=offset+trailer/2+18;poly(quad(offset,y,trailer,36,0),'#323b36','#cbb879');poly(quad(cabX,y,30,34,9),palette[color][0],'#d1d1b0');poly(quad(cabX+5,y,11,25,12),'#acccc6');for(const x of [-trailer/2+19,trailer/2-15])for(const dy of [-20,20])poly(quad(offset+x,y+dy,13,9,0),'#111e1e');}

function draw(){const dpr=Math.min(devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);W=w;H=h;CX=w/2;CY=h*.56;ctx.save();const scale=w/420;ctx.translate(CX,CY);ctx.scale(scale,scale);ctx.translate(-CX,-CY);
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
 const shipName=project(0,351,8);txt('MARLIN / '+(s.column===0?'船尾 01':'船体 02'),shipName.x,shipName.y,9*shipName.k,'#ecdfbd');
 const berth=project(0,121,3);txt('船舷 · 装船作业区',berth.x,berth.y,8*berth.k,'#f4dba4');
 // Each bay contains two half-width columns. Long containers occupy both halves.
 for(let i=Harbor.slots.length-1;i>=0;i--){const y=Harbor.slots[i];poly(quad(0,y,154,32,4),'#394b3f','#c9ba88');line(project(0,y-15,5),project(0,y+15,5),'#7e8c6d',1);
  for(let tier=0;tier<Harbor.capacity;tier++)for(let half=0;half<2;half++){const box=s.boxes[i][half][tier];if(!box||(box.size===2&&half===1))continue;drawCargo(box,box.size===2?0:(half?37.5:-37.5),y,4+tier*cargo.height);}
 }

 // Six physical vehicle targets: four arrivals and two independently retained buffers.
 for(const id of [...Harbor.reserveIds,...Harbor.dockIds]){const d=Harbor.destination(id),isReserve=d.reserve!==undefined,box=isReserve?s.reserves[d.reserve]:s.trucks[d.dock],x=d.x,y=d.y;
  poly(quad(x,y,199,45,0),isReserve?'#355c56':'#565e55',isReserve?'#82bbaa':'#c9b783');
  truck(box?.color||'blue',y,x,box?.size||2);if(box)drawCargo(box,x,y,12);

 }
 // Archived cargo remains visible beside the newly active column.
 if(s.archives.length)for(let bay=5;bay>=0;bay--)for(let tier=0;tier<3;tier++)for(let half=0;half<2;half++){const box=s.archives[0].boxes[bay][half][tier];if(box&&!(box.size===2&&half===1)){ctx.globalAlpha=.52;drawCargo(box,-205+(box.size===2?0:(half?37.5:-37.5)),Harbor.slots[bay],4+tier*cargo.height);ctx.globalAlpha=1;}}
 hitRegions=[];sceneTargets=[];
 const addHit=(index,half,x,y,width,length,z)=>{const raw=quad(x,y,width,length,z);if(raw.some(p=>!p.front))return;const points=raw.map(p=>({x:CX+(p.x-CX)*scale,y:CY+(p.y-CY)*scale})),xs=points.map(p=>p.x),ys=points.map(p=>p.y),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);if(bottom<9||top>h-49)return;const region=sceneTargets.push({index,half})-1;hitRegions.push({index:region,x:(left+right)/2,y:(top+bottom)/2,width:right-left,height:bottom-top});};
 for(const index of [...Harbor.dockIds,...Harbor.reserveIds,1,2,3,4,5,6]){const d=Harbor.destination(index),y=d.y;
  if(d.bay===undefined){const box=d.reserve!==undefined?s.reserves[d.reserve]:s.trucks[d.dock];if(box||d.reserve!==undefined)addHit(index,0,d.x,y,190,48,box?44:12);if(control.selected===index)poly(quad(d.x,y,196,48,box?44:12),null,'#ffe49a');continue;}
  const levels=Harbor.levels(s,d.bay),small=s.held?.size===1,p=Harbor.placement(s,d.bay),z=4+Math.max(...levels)*cargo.height;
  if(small)for(let half=0;half<2;half++)addHit(index,half,half?37.5:-37.5,y,75,30,4+levels[half]*cargo.height);else addHit(index,0,0,y,150,30,z);
  if(control.selected===index){ctx.setLineDash([4,3]);poly(quad(p?.x||0,y,p?.width||154,32,4+(p?.level??Math.max(...levels))*cargo.height+2),null,p?'#ffe49a':'#dba38a');ctx.setLineDash([]);}
  const badge=project(-67,y+10,z+2);rr(badge.x-12,badge.y-8,24,16,2,control.selected===index?'#efd28c':'#182e2bc9');txt('0'+index,badge.x,badge.y+4,10,control.selected===index?'#243833':'#f2e2ba');
 }
 const shadow=project(s.cameraX,s.camera);ctx.globalAlpha=.23;rr(shadow.x-52,shadow.y-27,104,54,7,'#0b1717');ctx.globalAlpha=1;
 const liftY=s.camera+sway,spreaderZ=s.height,rigX=s.cameraX,under=Harbor.target(s),rigBox=s.held||(under?.type==='dock'?s.trucks[under.index]:under?.type==='reserve'?s.reserves[under.index]:null),rigWidth=rigBox?.size===1?75:150;const approach=Math.max(0,Math.min(1,(Harbor.maxHeight-s.height)/(Harbor.maxHeight-12-cargo.height)));if(under?.type==='dock'&&approach>0){const center=project(s.cameraX,liftY,0);projectionAdjustment={x:center.x,y:center.y,k:1+(roadScale(under.y)-1)*approach};}if(s.held)drawCargo(s.held,rigX,liftY,Math.max(0,s.height-cargo.height));
 const corners=quad(rigX,liftY,rigWidth,30,spreaderZ+3),anchors=[{x:CX-94,y:14},{x:CX+94,y:14},{x:CX+110,y:h-35},{x:CX-110,y:h-35}];corners.forEach((p,i)=>{line(anchors[i],p,'#14201d',3);line({x:anchors[i].x+2,y:anchors[i].y},p,'#d2cbb1',.8)});
 poly(quad(rigX,liftY+13,rigWidth+8,6,spreaderZ+5),'#e6b84d','#69572f');poly(quad(rigX,liftY-13,rigWidth+8,6,spreaderZ+5),'#cca148','#69572f');for(const x of [-rigWidth/2+3,rigWidth/2-3])poly(quad(rigX+x,liftY,6,30,spreaderZ+5),'#dcb14a','#69572f');
 const c=project(rigX,liftY,spreaderZ+6);line({x:c.x-7,y:c.y},{x:c.x+7,y:c.y},'#fff5c8');line({x:c.x,y:c.y-7},{x:c.x,y:c.y+7},'#fff5c8');
 // Beacon is bolted to the spreader's upper crossbar and shares its full transform.
 poly(quad(rigX-rigWidth*.32,liftY+13,22,15,spreaderZ+10),'#283634','#8b835f');
 const lamp=project(rigX-rigWidth*.32,liftY+13,spreaderZ+15),lit=!s.held||reducedMotion||(elapsed%1.1)<.55,radius=Math.max(4,Math.min(8,4.5*lamp.k));ctx.save();ctx.fillStyle=s.held?(lit?'#ffd256':'#755b22'):'#65f39a';ctx.shadowColor=s.held?'#ffce45':'#65f39a';ctx.shadowBlur=lit?13:0;ctx.beginPath();ctx.arc(lamp.x,lamp.y,radius,0,Math.PI*2);ctx.fill();ctx.restore();projectionAdjustment=null;
 // Labels are drawn after the spreader, so all six physical vehicles remain identifiable.
 for(const id of [...Harbor.reserveIds,...Harbor.dockIds]){const d=Harbor.destination(id),reserve=d.reserve!==undefined,box=reserve?s.reserves[d.reserve]:s.trucks[d.dock],label=project(d.x,d.y+20,box?44:12);rr(label.x-40,label.y-8,80,16,3,'#10292bf0');txt((reserve?'周转 '+(d.reserve+1):'来货 '+('ABCD'[d.dock]))+(box?'':' · 空'),label.x,label.y+4,11,reserve?'#9fe0c4':'#f4ddb0');}
 ctx.restore();
 const glass=ctx.createLinearGradient(0,0,w,0);glass.addColorStop(0,'#b6d9d418');glass.addColorStop(.5,'#b6d9d400');glass.addColorStop(1,'#b6d9d422');ctx.fillStyle=glass;ctx.fillRect(0,0,w,h);
 poly([{x:0,y:0},{x:19,y:0},{x:31,y:h},{x:0,y:h}],'#543f32','#917657');poly([{x:w-19,y:0},{x:w,y:0},{x:w,y:h},{x:w-31,y:h}],'#543f32','#917657');rr(0,0,w,9,0,'#6d5540');poly([{x:0,y:h-49},{x:w,y:h-49},{x:w,y:h},{x:0,y:h}],'#263b3b','#8e886b');rr(w*.19,h-40,w*.62,24,5,'#10282b','#59675d');txt('CAB 0'+(s.column+1)+' / '+(s.held?boxName(s.held):'点击实物选择 · 吊具空载'),w/2,h-24,10,'#d6c9a5');

}
function say(text){$('message').textContent=text;$('guide').textContent=text;}
function busy(){return control.phase!=='idle'||performance.now()<feedbackUntil;}
function boxLabel(box){return box?boxName(box):'空车';}
function modal(title,text,primaryLabel,primary,secondaryLabel,secondary){paused=true;$('choiceOptions').hidden=true;$('choiceOptions').replaceChildren();$('detailTools').hidden=true;$('dialogPrimary').hidden=false;$('dialogTitle').textContent=title;$('dialogText').textContent=text;$('dialogPrimary').textContent=primaryLabel;$('dialogPrimary').onclick=primary;$('dialogSecondary').hidden=!secondaryLabel;$('dialogSecondary').textContent=secondaryLabel||'';$('dialogSecondary').onclick=secondary||closeModal;$('dialog').hidden=false;sync();}
function closeModal(){if(s.choicePending){showOrderChoice();return;}paused=false;$('dialog').hidden=true;last=0;sync();}
function rebuild(){sceneGesture=null;canvas.classList.remove('panning');control=Harbor.controller(s);lookTarget=boundedLook(lookTarget);sway=swayV=oldVelocity=0;sync();}
function formatTime(seconds){const n=Math.round(seconds);return Math.floor(n/60)+'分'+String(n%60).padStart(2,'0')+'秒';}
function exportRun(){const data=Harbor.report(s),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='harbor-'+data.version+'-'+data.seed+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function result(){const o=Harbor.outcome(s),r=Harbor.report(s),played=r.columns.filter(c=>c.score!==null);modal(o.passed?o.rating:'本次挑战未达标','完成列数 '+o.completedColumns+' / 2\n整船总分 '+o.total+' · 高分线 '+Harbor.highScoreGoal+'\n'+played.map((c,i)=>'第'+(i+1)+'列 '+c.score+' / '+c.goal+' · 装载率 '+c.loadRate+'%\n'+formatTime(c.activeSeconds)+' · 交付 '+c.deliveries+'箱 · 放行 '+c.released+'箱\n周转：临停 '+c.bufferStores+'次／取回 '+c.bufferPicks+'次 · 取消 '+(c.cancels||0)+'次'+(c.advance?' · 第'+c.advance.batch+'批切列':'')).join('\n')+(o.shortfall?'\n当前列还差 '+o.shortfall+'分':'')+'\n已放行 '+s.discarded.length+' 箱\n'+r.version+' · 种子 '+r.seed+'\n用时仅计前台作业，选卡及查看工单不计时。','重新开始',reset,'导出本局记录',exportRun);}
function requestEnd(){if(s.held||busy())return;const r=Harbor.finish(s);if(r.needsReserve){const count=s.reserves.filter(Boolean).length;modal('周转车上还有 '+count+' 箱','返回会保留周转货物，可在当前列继续摆放；放弃将永久丢弃这 '+count+' 箱并立即结算。已封存列与已落船布局不能修改。','返回继续摆放',closeModal,'放弃剩余货物并结算',()=>{Harbor.finish(s,true);result();});}else if(r.ok)result();}
function requestAdvance(){if(paused||busy()||!Harbor.outcome(s).canAdvance)return;const count=s.trucks.filter(Boolean).length+s.manifests[s.column].slice(Math.min(6,s.batchIndex+1)*4).length;modal('封存本列，进入下一列？','本列已达标。剩余 '+count+' 箱来货将永久放行，已摆布局不能修改。两辆周转车及货物、工单和成长一起带入下一列。','封存并进入下一列',advance,'继续本列装载',closeModal);}
function advance(){if(!Harbor.nextColumn(s))return;clearFeedback();rebuild();showOrderChoice();say('进入第2列 · 周转货物保留，旧列已封存');}
function afterBatch(released=0){rebuild();const o=Harbor.outcome(s);if(!o.exhausted){say((released?'已永久放行 '+released+'箱 · ':'')+'第'+(s.batchIndex+1)+'批车辆到场');return;}if(o.canAdvance){modal('本列来货已结束','本列 '+o.columnTotal+' 分，已达到 '+o.goal+' 分。可以带着周转货物进入下一列，也可以留在本列继续装载周转货物。','进入下一列',advance,'留在本列',closeModal);}else requestEnd();}
function sync(){const p=Harbor.score(s),o=Harbor.outcome(s),locked=paused||busy()||s.ended||s.choicePending;
 $('scoreGoal').textContent=(s.column===0?'船尾':'船体')+' · 第'+(s.column+1)+'列 / 2';$('points').textContent=p.total+' / '+o.goal;$('scoreFill').style.width=Math.min(100,p.total/o.goal*100)+'%';$('scoreProgress').setAttribute('aria-valuemax',o.goal);$('scoreProgress').setAttribute('aria-valuenow',Math.min(p.total,o.goal));$('scoreProgress').setAttribute('aria-valuetext',p.total+'分，目标'+o.goal+'分');$('scoreboard').classList.toggle('reached',o.scoreReached);
 $('breakdown').textContent='装载 '+p.units+'/36格 · '+s.delivered+'箱';$('scoreHint').textContent=o.scoreReached?'已达标 · 可继续争分':'还差 '+o.shortfall+'分';$('batchInfo').textContent=(o.exhausted?'本列来货已结束':'第'+(s.batchIndex+1)+'/6批 · 剩余'+s.trucks.filter(Boolean).length+'车')+' · 后续'+Math.max(0,5-s.batchIndex)+'批';$('totalScore').textContent='整船 '+o.total+'分';
 $('nextBatch').disabled=locked||!!s.held||o.exhausted;$('nextBatch').textContent=(s.batchIndex===5?'放行末批':'下一批')+' · 放行'+s.trucks.filter(Boolean).length+'箱';$('nextColumn').disabled=locked||!o.canAdvance;$('nextColumn').textContent=s.column===0?'下一列':'已到最后一列';$('endShift').disabled=locked||!!s.held||!(o.exhausted||o.full||(s.column===1&&o.scoreReached));
 renderOrders();for(const card of $('orderRack').children)card.disabled=paused||busy()||s.ended;
 $('action').disabled=paused||busy()||!control.available();const t=Harbor.target(s);$('action').textContent=control.phase==='moving'?'移动中 · 到位后确认':control.phase==='lowering'?'下降中…':control.phase==='raising'?'提升中…':control.phase==='returning'?'放置完成 · 返回原点':control.phase==='cancelMoving'?'取消中 · 送回来源':control.phase==='cancelLowering'?'取消中 · 下降放回':control.phase==='cancelRaising'?'已放回 · 提升吊具':control.available()?(s.held?(t?.type==='reserve'?'确认临停':'确认落箱'):'确认抓取'):s.held?'点击箱位或空周转车':'点击车辆选择货物';
 const cancelling=control.phase.startsWith('cancel'),source=s.heldSource,sourceName=source?.type==='dock'?'原'+('ABCD'[source.index])+'车':source?.type==='reserve'?'原周转车'+(source.index+1):'原处';$('cancelPickup').hidden=!s.held&&!cancelling;$('cancelPickup').disabled=paused||!control.canCancel();$('cancelPickup').textContent=cancelling?'正在放回原处':'取消 · 放回'+sourceName;$('cancelPickup').title='送回本次抓取来源，不计分；快捷键 Esc';$('workActions').classList.toggle('has-held',!$('cancelPickup').hidden);
 $('halfChoice').hidden=s.held?.size!==1;for(let half=0;half<2;half++){$('half'+half).disabled=paused||['lowering','raising','returning','cancelMoving','cancelLowering','cancelRaising'].includes(control.phase);$('half'+half).classList.toggle('selected',s.half===half);$('half'+half).setAttribute('aria-pressed',String(s.half===half));}

}
function select(index,half=s.half){if(paused)return;if(!control.select(index,half)){say('请等待本次抓放完成');return;}lookTarget={...viewLook};lookReturning=false;const d=Harbor.destination(index);say(d.bay!==undefined?'前往箱位 '+(d.bay+1)+(s.held?.size===1?(half?' · 右半位':' · 左半位'):''):d.reserve!==undefined?'前往周转车 '+(d.reserve+1):'前往来货 '+('ABCD'[d.dock]));sync();}
function clearFeedback(){for(const timer of feedbackTimers)clearTimeout(timer);feedbackTimers=[];feedbackUntil=0;$('scoreEffects').replaceChildren();for(const card of $('orderRack').children)card.classList.remove('firing');}
function traceLabel(event){const effect=event.effect;return (effect?.type==='multiply'?event.before+' ×'+effect.value+' → '+event.after:effect?.type==='add'?'+'+event.delta:event.note==='同色判定生效'?'配色规则生效':'未加分')+' · '+event.note+(event.growth?'（成长 +'+event.growth+'，仅一次）':'');}
function showScoreFeedback(gain){clearFeedback();lastReceipt=JSON.parse(JSON.stringify(gain));renderOrders();const popup=document.createElement('div');popup.className='score-popup';popup.append('本次 +'+gain.total+'分');const detail=document.createElement('small');detail.textContent='基础 '+gain.base+' + 同色 '+gain.same+' = '+(gain.base+gain.same);popup.append(detail);$('scoreEffects').replaceChildren(popup);const step=reducedMotion?0:Harbor.config.feedback.stepMs;feedbackUntil=performance.now()+Math.min(520,gain.trace.length*step+100);
 for(const [i,event] of gain.trace.entries()){const row=document.createElement('small');row.className='receipt-step';row.textContent=(i+1)+'. '+event.name+'：'+traceLabel(event);popup.append(row);feedbackTimers.push(setTimeout(()=>{row.classList.add('shown');const card=Array.from($('orderRack').children).find(c=>c.dataset.order===event.id);if(card){card.classList.toggle('firing',event.triggered);card.querySelector('small').textContent=event.growth?'本次 +'+event.delta+' · 下次 '+s.orders.find(o=>o.id===event.id).state.reward+'分':event.effect?.type==='multiply'?event.before+' ×'+event.effect.value+' → '+event.after:event.note+(event.delta?' · +'+event.delta:'');}feedbackTimers.push(setTimeout(()=>{card?.classList.remove('firing');if(card)card.querySelector('small').textContent=orderStateLabel(s.orders.find(o=>o.id===event.id));},step+450));},i*step));}
 say('落箱 +'+gain.total+'分 · 基础 '+gain.base+' · 摆放 '+gain.same+' · 工单 +'+gain.bonus);feedbackTimers.push(setTimeout(()=>popup.remove(),Harbor.config.feedback.receiptMs));
}
function orderStateLabel(order){const d=Harbor.orders.get(order.id);if(d.kind==='client')return '当前奖励 '+order.state.reward+'分';if(d.kind==='relay')return '接力 '+order.state.streak+'次 · 上次'+(order.state.lastSize===null?'无':order.state.lastSize===1?'短':'长');if(d.kind==='priority')return '整船无遮挡 '+Harbor.orders.exposed(s,d.owner)+'箱';return d.kind==='rush'?'本次累计 ×'+Harbor.orders.params.rush:d.kind==='flat'?'每次 +'+Harbor.orders.params.flat+'分':d.kind==='convert'?'固定双色互认':'点击查看规则';}
function renderOrders(){const key=JSON.stringify(s.orders.map(o=>[o.id,o.state,Harbor.orders.get(o.id).kind==='priority'?Harbor.orders.exposed(s,Harbor.orders.get(o.id).owner):null]));if(key===rackKey)return;rackKey=key;$('orderRack').replaceChildren();for(const order of s.orders){const card=document.createElement('button');card.className='order-card';card.dataset.order=order.id;card.setAttribute('aria-label',Harbor.orders.get(order.id).name+'，点击查看，拖动调整顺序');const title=document.createElement('strong');title.textContent=Harbor.orders.get(order.id).name;const state=document.createElement('small');state.textContent=orderStateLabel(order);card.append(title,state);$('orderRack').append(card);}}
function showOrderChoice(){const options=Harbor.orders.choices(s);modal('第'+(s.column+1)+'列 · 选择一张工单','已有工单与成长保留。选定后本列开始，未选工单本次不获得。','',()=>{});$('dialogPrimary').hidden=true;$('choiceOptions').hidden=false;for(const option of options){const button=document.createElement('button');button.className='choice-option';button.dataset.order=option.id;const title=document.createElement('strong');title.textContent=option.name;const description=document.createElement('span');description.textContent=option.text;button.append(title,description);button.onclick=()=>{if(!Harbor.orders.choose(s,option.id))return;rackKey='';renderOrders();closeModal();say('已获得 '+option.name+' · 点击工单查看规则');};$('choiceOptions').append(button);}}
function showOrderDetails(id){const index=s.orders.findIndex(o=>o.id===id),order=s.orders[index];if(!order)return;const d=Harbor.orders.get(id);modal(d.name,d.text+'\n\n'+orderStateLabel(order)+(lastReceipt?.trace.find(t=>t.id===id)?'\n上次落船：'+traceLabel(lastReceipt.trace.find(t=>t.id===id)):'')+'\n位置 '+(index+1)+' / '+s.orders.length+'，从左到右结算。所有分值为测试配置。','返回作业',closeModal);$('detailTools').hidden=false;$('orderLeft').disabled=index===0;$('orderRight').disabled=index===s.orders.length-1;$('orderLeft').onclick=()=>{Harbor.orders.reorder(s,index,index-1);renderOrders();showOrderDetails(id);};$('orderRight').onclick=()=>{Harbor.orders.reorder(s,index,index+1);renderOrders();showOrderDetails(id);};}
function reset(){clearFeedback();lastReceipt=null;s=Harbor.create();viewCamera={...cameraOrigin};lookTarget=defaultLook();viewLook={...lookTarget};rackKey='';rebuild();elapsed=0;showOrderChoice();}
$('orderRack').addEventListener('pointerdown',e=>{const card=e.target.closest('.order-card');if(!card||paused||busy())return;drag={id:card.dataset.order,x:e.clientX,y:e.clientY};card.setPointerCapture(e.pointerId);});
$('orderRack').addEventListener('pointermove',e=>{if(drag&&Math.abs(e.clientX-drag.x)>12)e.target.closest('.order-card')?.classList.add('dragging');});
$('orderRack').addEventListener('pointerup',e=>{if(!drag)return;const moved=drag;drag=null;for(const card of $('orderRack').children)card.classList.remove('dragging');const dx=e.clientX-moved.x;if(Math.abs(dx)<24)return;suppressOrderClick=true;setTimeout(()=>suppressOrderClick=false,0);if(paused||busy())return;const from=s.orders.findIndex(o=>o.id===moved.id),target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.order-card'),to=target?s.orders.findIndex(o=>o.id===target.dataset.order):Math.max(0,Math.min(s.orders.length-1,from+Math.sign(dx)));if(Harbor.orders.reorder(s,from,to)){renderOrders();say('工单顺序已调整，下一次落箱生效');}});
$('orderRack').addEventListener('pointercancel',()=>{drag=null;for(const card of $('orderRack').children)card.classList.remove('dragging');});
$('orderRack').addEventListener('click',e=>{if(suppressOrderClick||paused||busy())return;const card=e.target.closest('.order-card');if(card)showOrderDetails(card.dataset.order);});
// Drag only navigates the view. A deliberate tap still selects an actual loading target.
function sceneLocked(){return paused||s.ended||['lowering','raising','returning'].includes(control.phase);}
function tapScene(e){const r=canvas.getBoundingClientRect(),hit=Harbor.hitTarget((e.clientX-r.left)*canvas.clientWidth/r.width,(e.clientY-r.top)*canvas.clientHeight/r.height,hitRegions);if(hit!==null){const target=sceneTargets[hit];select(target.index,target.half);}else say('固定视角 · 轻点货物、周转车或箱位');}
canvas.addEventListener('pointerdown',e=>{if(sceneLocked()||!e.isPrimary||e.button!==0||sceneGesture)return;sceneGesture={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{const g=sceneGesture;if(!g||g.id!==e.pointerId)return;if(sceneLocked()){sceneGesture=null;canvas.classList.remove('panning');return;}const dx=e.clientX-g.x,dy=e.clientY-g.y;if(!g.moved&&Math.hypot(dx,dy)<8)return;if(!g.moved){g.moved=true;if(!cameraLookDragEnabled)return;lookReturning=false;lookTarget={...viewLook};canvas.classList.add('panning');say('拖动转头查看 · 松手保持观察角度');}if(!cameraLookDragEnabled)return;const r=cameraLookRange(),stepX=e.clientX-g.lastX,stepY=e.clientY-g.lastY;lookTarget.yaw=easeEdge(lookTarget.yaw,-stepX*lookSensitivity,r.yawMin,r.yawMax);lookTarget.pitch=easeEdge(lookTarget.pitch,stepY*lookSensitivity,r.pitchMin,r.pitchMax);lookTarget=boundedLook(lookTarget);g.lastX=e.clientX;g.lastY=e.clientY;sync();});
canvas.addEventListener('pointerup',e=>{const g=sceneGesture;if(!g||g.id!==e.pointerId)return;sceneGesture=null;canvas.classList.remove('panning');if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(sceneLocked())return;if(!g.moved)tapScene(e);else say(cameraLookDragEnabled?'观察角度已保持 · 轻点目标，视野随作业移动':'镜头已固定 · 轻点实物选择目标');});
function cancelSceneGesture(){sceneGesture=null;canvas.classList.remove('panning');}
canvas.addEventListener('pointercancel',cancelSceneGesture);canvas.addEventListener('lostpointercapture',cancelSceneGesture);
$('cancelPickup').onclick=()=>{if(paused||!control.cancel())return;cancelSceneGesture();say('取消本次吊装 · 正在送回抓取来源');sync();};
$('action').onclick=()=>{if(paused||busy()||!control.confirm())return;lookTarget={...viewLook};say(s.held?'正在下降放箱':'正在下降抓取');sync();};
$('nextBatch').onclick=()=>{if(!paused&&!busy()){const released=s.trucks.filter(Boolean).length;if(Harbor.nextBatch(s))afterBatch(released);}};$('nextColumn').onclick=requestAdvance;$('endShift').onclick=requestEnd;

for(let half=0;half<2;half++)$('half'+half).onclick=()=>{if(control.selected>=1&&control.selected<=6)select(control.selected,half);else{s.half=half;sync();}};
addEventListener('keydown',e=>{if(e.repeat||paused)return;if(e.key==='Escape'){e.preventDefault();$('cancelPickup').click();return;}if(e.key===' '){e.preventDefault();$('action').click();}if(/^[1-6]$/.test(e.key))select(Number(e.key));const n='abcd'.indexOf(e.key.toLowerCase());if(n>=0)select(Harbor.dockIds[n]);if(e.key==='q')select(10);if(e.key==='w')select(11);});
addEventListener('resize',()=>{lookTarget=boundedLook(lookTarget);lookReturning=true;});
document.addEventListener('visibilitychange',()=>{last=0;cancelSceneGesture();});
function frame(now){const dt=Math.min((now-last)/1000||0,.05);last=now;if(!paused&&!document.hidden){elapsed+=dt;Harbor.tick(s,dt);const event=control.update(dt);updateCamera(dt);updateLook(dt);sway=0;swayV=0;oldVelocity=control.velocity;
 if(event.arrived){const t=Harbor.target(s),p=t?.type==='slot'?Harbor.preview(s,t.index):null;say(control.available()?(s.held?(t.type==='reserve'?'已对准空周转车 · 确认临停':'已对准 · 落箱预计 +'+p.total+'分'):'已对准货物 · 确认抓取'):'无法执行：检查空间、等高支撑或车辆是否为空');}
 if(event.contact){const r=event.contact;if(r.delivered)showScoreFeedback(r.gain);say(r.ok?(r.picked?'已抓取 '+boxLabel(r.box):r.stored?'已临停 · 不计分':'落箱 +'+r.gain.total+'分'):r.message);}
 if(event.returning)say('放置完成 · 吊具与镜头返回原点');
 if(event.cancelArrived)say('已回到抓取来源 · 正在下降放回');
 if(event.cancelRestored)say('箱子已放回原处 · 正在提升吊具');
 if(event.cancelled)say('取消完成 · 箱子已放回，可重新选择');
 if(event.raised&&!event.cancelled){if(event.returned)say('已返回原点 · 轻点选择下一箱');if(!s.held&&s.trucks.every(b=>!b)&&s.batchIndex<6){Harbor.nextBatch(s);afterBatch();}else if(!s.held&&s.batchIndex>=6&&!s.reserves.some(Boolean)){const o=Harbor.outcome(s);if(o.canAdvance)afterBatch();else requestEnd();}}
 sync();}draw();requestAnimationFrame(frame);}
document.querySelector('.tag').textContent='HARBOR / '+Harbor.config.version;
$('dialogText').textContent=$('dialogText').textContent.replaceAll('\\n','\n');$('dialogPrimary').onclick=reset;sync();requestAnimationFrame(frame);
