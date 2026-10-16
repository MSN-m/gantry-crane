// PROTOTYPE - NOT FOR PRODUCTION
// Question: Fixed downward cockpit view, one-axis travel and manual hoisting.
// Date: 2026-10-14
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const palette={red:['#ad5546','#cf8061','#6e352e','红'],blue:['#41788a','#74a7b0','#294d59','蓝'],yellow:['#b49643','#d8c477','#76602f','黄'],green:['#3f865b','#73b476','#25543a','绿']};
let s=Harbor.create(),control=Harbor.controller(s),paused=true,last=0,elapsed=0,departure=0,departColor='red',sway=0,swayV=0,vibrationEnabled=true,oldVelocity=0,queueKey='';
let W=0,H=0,CX=0,CY=0,hitRegions=[];
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
function rr(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}}
function poly(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}}
function txt(t,x,y,size=12,color='#e8ddbc',align='center'){ctx.font=`600 ${size}px system-ui`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(t,x,y)}
function project(x,y,z=0){const dy=y-s.camera,depth=Math.max(.48,1+dy*.001),k=.85/(depth*(1-z/300));return {x:CX+x*k,y:CY-dy*k,k};}
function quad(x,y,w,l,z){return [project(x-w/2,y+l/2,z),project(x+w/2,y+l/2,z),project(x+w/2,y-l/2,z),project(x-w/2,y-l/2,z)]}
function line(a,b,color,width=1){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
function container(x,y,c,z=0,w=124,l=68){const visible=project(x,y,z+18);if(visible.x < -140 || visible.x > W+140 || visible.y < -140 || visible.y > H+140)return;const p=palette[c],base=quad(x,y,w,l,z),top=quad(x,y,w,l,z+18);poly([base[3],base[2],top[2],top[3]],p[2],'#273a32');poly([base[1],base[2],top[2],top[1]],p[0]);poly(top,p[0],'#e0d4a859');for(let d=-w/2+9;d<w/2;d+=10)line(project(x+d,y-l/2+5,z+18),project(x+d,y+l/2-5,z+18),p[1],1.4);if(x===0){const mid=project(x,y,z+18);rr(mid.x-15*mid.k,mid.y-11*mid.k,30*mid.k,22*mid.k,3,'#10292b55');txt(p[3],mid.x,mid.y+4*mid.k,12*mid.k,'#fff3d3');}}
function truck(c,offset=0){poly(quad(offset,0,150,84,0),'#323b36','#cbb879');poly(quad(offset+92,0,38,78,9),palette[c][0],'#d1d1b0');poly(quad(offset+99,0,15,59,12),'#acccc6');for(const x of [-48,42])for(const yy of [-44,44])poly(quad(offset+x,yy,17,12,0),'#111e1e');const p=project(offset,0,4);txt('来货 · '+palette[c][3]+'箱',p.x,p.y+5,12*p.k,'#f1d98c');}
function draw(){const dpr=Math.min(devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);W=w;H=h;CX=w/2;CY=h*.56;ctx.save();const scale=w/366;ctx.translate(CX,CY);ctx.scale(scale,scale);ctx.translate(-CX,-CY);
 // Road on the quay, water gap, then the stern/deck of a large container ship.
 ctx.fillStyle='#254c52';ctx.fillRect(-400,-600,w+800,h+1200);
 poly(quad(0,-200,1600,540,0),'#797c73');
 for(const y of [-400,-310,-220,-130,-40,65])line(project(-800,y),project(800,y),'#d4c78c',1.5);
 for(const y of [-265,-175,-85,35])for(let x=-700;x<=700;x+=65)line(project(x,y),project(x+32,y),'#e3dfba',1);
 // Parking divisions and quay edge make the truck loading zone read as a road.
 for(const x of [-290,-100,100,290])line(project(x,-35),project(x,65),'#d6be62',2);
 poly(quad(0,76,1600,15,0),'#a6a18b','#d8d1b3');
 for(let x=-700;x<=700;x+=45)poly(quad(x,75,22,14,2),'#414846');
 for(let x=-500;x<500;x+=70)line(project(x,93),project(x+34,93),'#80a19a',1);
 // A broad hull is cropped by the cabin view, as in the reference photograph.
 poly(quad(0,650,980,1100,0),'#663d32','#af8060');
 poly(quad(0,659,942,1080,4),'#6d7663','#d1b688');
 poly(quad(0,112,970,19,5),'#915b40','#c49b6a');
 for(const x of [-466,466])line(project(x,120,9),project(x,1180,9),'#e7ce93',3);
 const name=project(0,107,8);txt('船舶装卸区',name.x,name.y,10*name.k,'#f1d1a0');
 // Dense rows of stacked containers flank the single working column.
 for(let row=12;row>=0;row--){const y=155+row*80;
  for(const side of [-1,1])for(let column=3;column>=0;column--){const x=side*(126+column*94);for(let tier=0;tier<4;tier++){const c=['green','red','green','blue'][(row+column+tier+(side===1?1:0))%4];container(x,y,c,4+tier*18,90,76);}}
  if(row>=3)container(0,y,['green','red','green'][row%3],4,124,76);
 }
 for(let i=Harbor.slots.length-1;i>=0;i--){const y=Harbor.slots[i];poly(quad(0,y,132,76,4),'#394b3f','#c9ba88');if(s.boxes[i].length)s.boxes[i].forEach((color,tier)=>container(0,y,color,4+tier*18));else{const p=project(0,y,5);txt('空箱位',p.x,p.y,10*p.k,'#d7cfae');}}
 poly(quad(0,0,172,82,0),'#565e55','#ead291');if(s.queue.length){const offset=departure?-300*departure:0;truck(s.queue[0],offset);container(offset,0,s.queue[0],12);}if(departure)truck(departColor,300*(1-departure));
 // Hit areas use exactly the same projection and viewport scaling as the visible cargo.
 hitRegions=[];
 for(let index=0;index<4;index++){if(index===0&&!s.queue.length)continue;const y=index===0?0:Harbor.slots[index-1],z=index===0?30:4+s.boxes[index-1].length*18,points=quad(0,y,index===0?170:124,index===0?84:68,z).map(p=>({x:CX+(p.x-CX)*scale,y:CY+(p.y-CY)*scale}));const xs=points.map(p=>p.x),ys=points.map(p=>p.y);const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);if(bottom<9||top>h-49)continue;hitRegions.push({index,x:(left+right)/2,y:(top+bottom)/2,width:right-left,height:bottom-top});
  if(control.selected===index)poly(quad(0,y,index===0?174:135,index===0?89:78,z+2),null,'#ffe49a');
  if(index>0){const p=project(-49,y+25,z+2);rr(p.x-11,p.y-8,22,16,3,control.selected===index?'#efd28c':'#182e2bc9');txt(`0${index}`,p.x,p.y+3,9,control.selected===index?'#243833':'#f2e2ba');}
 }
 const target=Harbor.target(s);if(target){const color=s.held?(target.type==='dock'?false:s.boxes[target.index].length<Harbor.capacity):target.type==='dock'&&!!s.queue.length;ctx.setLineDash([5,4]);poly(quad(0,target.y,140,82,target.type==='dock'?30:4+s.boxes[target.index].length*18),null,color?'#fff2bd':'#dba38a');ctx.setLineDash([]);}
 const shadow=project(0,s.camera);ctx.globalAlpha=.23;rr(shadow.x-52,shadow.y-27,104,54,7,'#0b1717');ctx.globalAlpha=1;
 const liftY=s.camera+sway,spreaderZ=s.height;if(s.held)container(0,liftY,s.held,Math.max(0,s.height-18));
 const corners=quad(0,liftY,128,74,spreaderZ+3),anchors=[{x:CX-94,y:14},{x:CX+94,y:14},{x:CX+110,y:h-35},{x:CX-110,y:h-35}];corners.forEach((p,i)=>{line(anchors[i],p,'#14201d',3);line({x:anchors[i].x+2,y:anchors[i].y},p,'#d2cbb1',.8)});
 poly(quad(0,liftY+32,140,11,spreaderZ+5),'#e6b84d','#69572f');poly(quad(0,liftY-32,140,9,spreaderZ+5),'#cca148','#69572f');for(const x of [-62,62])poly(quad(x,liftY,10,73,spreaderZ+5),'#dcb14a','#69572f');
 const c=project(0,liftY,spreaderZ+6);line({x:c.x-7,y:c.y},{x:c.x+7,y:c.y},'#fff5c8');line({x:c.x,y:c.y-7},{x:c.x,y:c.y+7},'#fff5c8');
 // Beacon is bolted to the spreader's upper crossbar and shares its full transform.
 poly(quad(-48,liftY+32,22,15,spreaderZ+10),'#283634','#8b835f');
 const lamp=project(-48,liftY+32,spreaderZ+15),lit=!s.held||reducedMotion||(elapsed%1.1)<.55,radius=Math.max(4,Math.min(8,4.5*lamp.k));ctx.save();ctx.fillStyle=s.held?(lit?'#ffd256':'#755b22'):'#65f39a';ctx.shadowColor=s.held?'#ffce45':'#65f39a';ctx.shadowBlur=lit?13:0;ctx.beginPath();ctx.arc(lamp.x,lamp.y,radius,0,Math.PI*2);ctx.fill();ctx.restore();ctx.restore();
 const glass=ctx.createLinearGradient(0,0,w,0);glass.addColorStop(0,'#b6d9d418');glass.addColorStop(.5,'#b6d9d400');glass.addColorStop(1,'#b6d9d422');ctx.fillStyle=glass;ctx.fillRect(0,0,w,h);
 poly([{x:0,y:0},{x:19,y:0},{x:31,y:h},{x:0,y:h}],'#543f32','#917657');poly([{x:w-19,y:0},{x:w,y:0},{x:w,y:h},{x:w-31,y:h}],'#543f32','#917657');rr(0,0,w,9,0,'#6d5540');poly([{x:0,y:h-49},{x:w,y:h-49},{x:w,y:h},{x:0,y:h}],'#263b3b','#8e886b');rr(w*.19,h-40,w*.62,24,5,'#10282b','#59675d');txt('CAB 01 / '+(s.held?'载荷已锁定':'吊具空载'),w/2,h-24,10,'#d6c9a5');
 rr(w-42,64,14,Math.max(80,h-143),6,'#142c2ce0','#667467');const top=75,bottom=h-89;[...Harbor.slots].reverse().concat(0).forEach((y,i)=>{const yy=bottom-y/360*(bottom-top);ctx.fillStyle=i===3?'#e5cd8b':palette[['yellow','blue','red'][i]][0];ctx.fillRect(w-39,yy-3,8,6)});const py=bottom-s.camera/360*(bottom-top);rr(w-46,py-3,22,6,2,'#f7e4b1');
}
function say(t){$('message').textContent=t}
function buzz(){if(!vibrationEnabled)return;try{if(globalThis.wx?.vibrateShort)globalThis.wx.vibrateShort({type:'light',fail(){}});else if(globalThis.tap?.vibrateShort)globalThis.tap.vibrateShort({type:'light',fail(){}});else navigator.vibrate?.(15);}catch{}}
function sync(){
 const t=Harbor.target(s),busy=['lowering','raising'].includes(control.phase);
 $('score').textContent=`装船 ${s.delivered} / ${Harbor.totalCargo}`;$('undo').disabled=!s.history.length||busy;
 const points=Harbor.score(s);$('points').textContent=`${points.total} 分`;$('breakdown').textContent=`装载 ${points.base} · 同色 ${points.same} · 完成 ${points.completion}`;
 $('signalText').textContent=s.held?'载货 · 吊具黄灯闪烁':'空载 · 吊具绿灯';
 const key=s.queue.join(',');if(key!==queueKey){queueKey=key;const color=s.queue[0];$('current').className='chip '+(color||'');$('current').textContent=color?palette[color][3]:'✓';$('queue').innerHTML=s.queue.slice(1,3).map(c=>`<span class="chip ${c}">${palette[c][3]}</span>`).join(' ');}
 for(let i=0;i<4;i++){const el=$('dest'+i);el.className='destination'+(control.selected===i?' selected':'');el.disabled=paused||busy;let label;if(i===0)label=s.queue[0]?palette[s.queue[0]][3]+'箱':'已取完';else{const stack=s.boxes[i-1],gain=Harbor.preview(s,i-1);label=stack.length?stack.map(c=>palette[c][3]).join('/')+` ${stack.length}/2`:'空位 0/2';if(gain)label=`+${gain.total} · ${stack.length}/2`;else if(stack.length===2)label+=' 满';}const content=(i===0?'卡车':`0${i}`)+`<small>${label}</small>`;if(el.innerHTML!==content)el.innerHTML=content;el.setAttribute('aria-pressed',String(control.selected===i));}
 $('cancel').disabled=control.phase!=='moving';$('action').disabled=paused||!control.available();
 $('action').textContent=control.phase==='moving'?'移动中 · 到位后确认':control.phase==='lowering'?'下降中…':control.phase==='raising'?'提升中…':control.selected===null?'先选择位置':control.available()?(s.held?'确认落箱':'确认抓取'):(s.held?'此位已满 · 请选择其他位':(s.queue.length?'请到卡车取货':'来货已取完'));
 $('guide').textContent=control.phase==='moving'?'自动移动 · 可以改选目标或停止':busy?'作业中 · 升降自动完成':t?(t.type==='dock'?'装货位正下方':`箱位 0${t.index+1} 正下方`)+(s.held&&t.type==='slot'&&Harbor.preview(s,t.index)?' · '+gainText(Harbor.preview(s,t.index)):' · 等待你的确认'):'点击下方位置，吊机自动对准';
}
function gainText(g){return `预计 +${g.total}：装载 +${g.base}${g.same?' · 同色 +'+g.same:''}${g.completion?' · 完成 +'+g.completion:''}`;}
function select(index){if(paused)return;if(!control.select(index)){say('正在抓取或落箱 · 提升完成后再选择');return;}say(index===0?'已选卡车 · 自动移动到装货位':`已选箱位 0${index} · 自动移动，到位后确认`);sync()}
canvas.addEventListener('click',e=>{if(paused)return;const bounds=canvas.getBoundingClientRect(),x=(e.clientX-bounds.left)*canvas.clientWidth/bounds.width,y=(e.clientY-bounds.top)*canvas.clientHeight/bounds.height;const index=Harbor.hitTarget(x,y,hitRegions);if(index!==null)select(index);else say('请点中间一列的货箱、空箱位或卡车');});
for(let i=0;i<4;i++)$('dest'+i).onclick=()=>select(i);
$('action').onclick=()=>{if(paused||!control.confirm())return;say(s.held?'正在下降落箱…':'正在下降抓取…');sync()};
$('cancel').onclick=()=>{if(control.cancel()){say('已停止 · 重新选择位置继续');sync()}};
$('haptics').onclick=()=>{vibrationEnabled=!vibrationEnabled;$('haptics').textContent='振动 '+(vibrationEnabled?'开':'关');$('haptics').setAttribute('aria-pressed',String(vibrationEnabled));if(vibrationEnabled)buzz()};
function reset(){s=Harbor.create();control=Harbor.controller(s);elapsed=0;departure=0;sway=swayV=oldVelocity=0;queueKey='!';paused=false;$('finish').hidden=true;$('intro').hidden=true;say('已对准来货 · 直接按「确认抓取」');sync()}
$('start').onclick=reset;$('reset').onclick=reset;$('again').onclick=reset;
$('undo').onclick=()=>{if(['lowering','raising'].includes(control.phase))return;if(Harbor.undo(s)){s.height=130;control=Harbor.controller(s);const t=Harbor.target(s);control.selected=t?(t.type==='dock'?0:t.index+1):null;departure=0;sway=swayV=0;paused=false;$('finish').hidden=true;say('已撤销 · 可重新选择，或确认作业');sync()}};
addEventListener('keydown',e=>{if(e.repeat)return;if(['0','1','2','3'].includes(e.key))select(Number(e.key));if(e.key===' '){e.preventDefault();$('action').onclick()}});
addEventListener('blur',()=>{if(control.cancel())say('已暂停移动 · 请选择目标继续');sync()});
document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden)control.cancel();sync()});
function frame(now){const dt=Math.min((now-last)/1000||0,.05);last=now;if(!paused&&!document.hidden){elapsed+=dt;departure=Math.max(0,departure-dt);const event=control.update(dt);swayV+=(-sway*32-swayV*10-(control.velocity-oldVelocity)*3)*dt;sway+=swayV*dt;oldVelocity=control.velocity;
 if(event.arrived)say(control.available()?(s.held?'已对准 · 按「确认落箱」':'已对准 · 按「确认抓取」'):'已到位 · 请另选可作业位置');
 if(event.contact){const r=event.contact;say(r.ok?(r.delivered?`落稳 +${r.gain.total} 分${r.gain.same?' · 同色 +50':''} · 提升中`:r.picked?'已取下来货 · 空车驶离，吊具提升中':'已放回 · 吊具提升中'):r.message);if(r.ok)buzz();if(r.picked){departure=1;departColor=r.color;}}
 if(event.raised)say(s.held?'请选择落位 · 同色叠放额外 +50':'吊具已提升 · 回到卡车取下一箱');
 if(event.complete){paused=true;$('finish').hidden=false;$('result').textContent=`六箱已装满！总分 ${Harbor.score(s).total}：装载 ${Harbor.score(s).base} + 同色 ${Harbor.score(s).same} + 完成 ${Harbor.score(s).completion}。用时 ${Math.floor(elapsed/60)}分${Math.floor(elapsed%60)}秒，时间不计分。`;say('本班完成！');}
 sync();}draw();requestAnimationFrame(frame)}sync();requestAnimationFrame(frame);




