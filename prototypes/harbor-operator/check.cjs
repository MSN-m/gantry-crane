// PROTOTYPE - NOT FOR PRODUCTION
// Question: Independent truck queues, valid mixed-size support, work-order scoring and reversible placement.
// Date: 2026-10-19
const h=require('./core.js'),assert=require('node:assert/strict');
function settle(c){for(let i=0;i<1500;i++){c.update(1/60);if(c.phase==='idle')return;}throw Error('Animation timeout');}
function pickup(s,c,truck=0){assert.ok(c.select(truck?7:0));settle(c);while(s.truckWait[truck]>0)c.update(1/60);assert.ok(c.confirm());assert.equal(c.confirm(),false,'No double grab');settle(c);return s.held;}
function drop(s,c,index,half=0){assert.ok(c.select(index+1,half));if(c.phase==='moving')assert.equal(c.confirm(),false,'No early confirmation');settle(c);const before=h.score(s),pred=h.preview(s,index,half);assert.ok(pred,'Legal placement');assert.ok(c.confirm());settle(c);assert.equal(h.score(s).total-before.total,pred.total,'Preview equals exact gain');return pred;}
function run(order){const s=h.create(order),c=h.controller(s);assert.ok(c.available(),'Starts aligned to A');let long=0,short=0,last;
 for(let i=0;i<h.totalCargo;i++){const box=pickup(s,c,i%2);if(box.size===2){last=drop(s,c,Math.floor(long/3));long++;}else{last=drop(s,c,4+Math.floor(short/6),Math.floor(short/3)%2);short++;}}
 assert.equal(s.delivered,24);assert.equal(h.score(s).units,36);assert.equal(h.score(s).completion,200);assert.ok(c.complete);assert.equal(s.height,h.maxHeight);assert.equal(s.queue.length,0);assert.deepEqual(s.trucks,[null,null]);
 const total=h.score(s).total;assert.ok(h.undo(s));assert.equal(h.score(s).units,35);assert.equal(h.score(s).completion,0);assert.equal(s.boxes[5][1].length,2);const redo=h.controller(s);assert.ok(redo.confirm());settle(redo);assert.equal(h.score(s).total,total,'Undo/redo cannot farm score');assert.equal(last.completion,200);return s;
}
const mono=run('mono'),mixed=run('mixed'),level=run('level');assert.equal(h.score(mono).total,2000);assert.equal(h.score(mixed).bonus,1800);assert.equal(h.score(mixed).total,3800);assert.equal(h.score(level).bonus,500);assert.equal(h.score(level).total,2500);
// Taking B keeps A untouched; only the emptied lane receives the next manifest item.
const s=h.create(),c=h.controller(s),a=s.trucks[0].id,next=s.queue[0].id;pickup(s,c,1);assert.equal(s.held.id,2);assert.equal(s.trucks[0].id,a);assert.equal(s.trucks[1].id,next);assert.ok(h.undo(s));assert.equal(s.trucks[1].id,2);assert.equal(s.queue[0].id,next);assert.equal(s.held,null);
// A long box cannot bridge unequal half columns. Short boxes can fill the missing support.
const support=h.create();support.held={id:100,color:'red',size:1};support.camera=h.slots[0];assert.ok(h.contact(support).ok);support.held={id:101,color:'blue',size:2};assert.equal(h.placement(support,0),null);assert.equal(h.preview(support,0),null);assert.equal(h.contact(support).ok,false);support.held={id:102,color:'yellow',size:1};support.half=1;assert.ok(h.contact(support).ok);support.held={id:103,color:'blue',size:2};assert.ok(h.placement(support,0));assert.ok(h.contact(support).ok);assert.equal(support.boxes[0][0][1].id,support.boxes[0][1][1].id);
// Real capacity is per half-column; no fourth tier and no state mutation on preview.
const full=h.create();full.camera=h.slots[0];for(let i=0;i<3;i++){full.held={id:200+i,color:'red',size:2};assert.ok(h.contact(full).ok);}full.held={id:204,color:'red',size:1};assert.equal(h.preview(full,0),null);assert.equal(h.contact(full).ok,false);assert.equal(h.score(full).same,100);assert.equal(h.score(full).bonus,100);
const before=JSON.stringify(support);h.preview(support,1);assert.equal(JSON.stringify(support),before);
for(let i=0;i<6;i++){support.camera=h.slots[i];assert.equal(h.target(support).index,i,'Dense bay targets do not overlap');}
// Equal-height milestones are awarded once per neighboring pair and tier; undo restores the ledger.
const flat=h.create('level');function placeAt(bay,id){flat.camera=h.slots[bay];flat.cameraX=0;flat.held={id,color:'red',size:2};assert.ok(h.contact(flat).ok);}
placeAt(0,400);placeAt(1,401);assert.equal(h.score(flat).bonus,100);assert.deepEqual(flat.orderMarks,['1-1']);
placeAt(0,402);assert.equal(h.score(flat).bonus,100,'Previously earned milestone stays');placeAt(1,403);assert.equal(h.score(flat).bonus,200);assert.ok(h.undo(flat));assert.equal(h.score(flat).bonus,100);assert.ok(h.contact(flat).ok);assert.equal(h.score(flat).bonus,200,'No farm on undo and repeat');
assert.equal(h.hitTarget(12,12,[{index:7,x:12,y:12,width:20,height:20}]),7);assert.equal(h.hitTarget(200,200,[]),null);
// Level one must be winnable by planning and must not pass just by filling the ship.
assert.equal(new Set(h.manifest().map(b=>b.color)).size,4);
for(const color of h.colors)assert.equal(h.manifest().filter(b=>b.color===color).reduce((sum,b)=>sum+b.size,0),9,'Equal cargo units per color');
assert.equal(h.outcome(mono).failed,true,'Casual mixed full ship fails its score gate');assert.equal(h.depart(mono),false);
const planned=h.create('mono'),pc=h.controller(planned);let firstTarget=0;
for(let i=0;i<h.totalCargo;i++){const box=pickup(planned,pc,i%2),color=h.colors.indexOf(box.color);drop(planned,pc,box.size===2?color:4+Math.floor(color/2),color%2);const result=h.outcome(planned);if(!firstTarget&&result.scoreReached){firstTarget=planned.delivered;assert.equal(firstTarget,20);assert.equal(result.remaining,4);assert.equal(result.finished,false);assert.equal(result.passed,false,'Reaching score cannot finish an incomplete manifest');assert.equal(result.canDepart,false);assert.equal(h.depart(planned),false,'Early departure rejected');assert.equal(planned.departed,false);assert.equal(pc.complete,false);}}
assert.equal(firstTarget,20);assert.equal(h.score(planned).total,3200,'Score exceeds target without capping');assert.equal(h.outcome(planned).passed,true);assert.equal(h.outcome(planned).remaining,0);assert.ok(h.depart(planned));assert.equal(h.depart(planned),false);assert.equal(h.controller(planned).select(0),false);
// Even a very large earned score is returned as-is; no scoreGoal clamp exists in scoring.
const huge=h.create('level');huge.orderMarks=Array.from({length:100},(_,i)=>'milestone-'+i);assert.equal(h.score(huge).total,10000);assert.equal(h.outcome(huge).passed,false,'Score alone never wins');
// Undoing a full-ship failure returns to an actionable layout with no finish lock.
assert.ok(h.undo(mono));assert.equal(h.outcome(mono).full,false);const recovered=h.controller(mono);assert.ok(recovered.available());
console.log('PASS: all 24 boxes / 36 cells across three work orders; independent A/B refill, long-box support, half selection, capacity, score previews, completion, deep undo/redo dense targets, four-color gate failure, no early departure at box 20, required 24-box manifest, uncapped score and retry by undo.');
