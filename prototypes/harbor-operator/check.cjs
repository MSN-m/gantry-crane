// PROTOTYPE - NOT FOR PRODUCTION
// Question: Two-layer color scoring, prediction and undo consistency.
// Date: 2026-10-15
const h=require('./core.js'),assert=require('node:assert/strict');
function settle(c){for(let i=0;i<1000;i++){c.update(1/60);if(c.phase==='idle')return;}throw Error('Timeout');}
function run(order){const s=h.create(),c=h.controller(s);assert.ok(c.available(),'Start directly ready');let lastGain;for(const slot of order){c.select(0);if(c.phase==='moving')assert.equal(c.confirm(),false);settle(c);assert.ok(c.confirm());assert.equal(c.confirm(),false);settle(c);c.select(slot);settle(c);const before=h.score(s).total,prediction=h.preview(s,slot-1);assert.ok(prediction);assert.ok(c.confirm());settle(c);lastGain=h.score(s).total-before;assert.equal(lastGain,prediction.total);assert.equal(s.height,130);}return {s,c,lastGain};}
const best=run([1,2,3,1,2,3]);assert.deepEqual(h.score(best.s),{base:600,same:150,completion:200,total:950});assert.deepEqual(best.s.boxes,[['red','red'],['blue','blue'],['yellow','yellow']]);assert.ok(best.c.complete);assert.equal(best.lastGain,350);
assert.ok(h.undo(best.s));assert.equal(h.score(best.s).total,600);assert.equal(best.s.held,'yellow');assert.equal(best.s.boxes[2].length,1);const c=h.controller(best.s);assert.ok(c.confirm());settle(c);assert.equal(h.score(best.s).total,950,'Redo does not farm score');
const mixed=run([1,2,3,2,3,1]);assert.deepEqual(h.score(mixed.s),{base:600,same:0,completion:200,total:800});
const s=h.create(),m=h.controller(s);for(let i=0;i<2;i++){m.select(0);settle(m);m.confirm();settle(m);m.select(1);settle(m);m.confirm();settle(m);}m.select(0);settle(m);m.confirm();settle(m);m.select(1);settle(m);assert.equal(m.confirm(),false);assert.equal(h.preview(s,0),null);assert.equal(s.held,'yellow');assert.equal(s.boxes[0].length,2);
assert.equal(h.hitTarget(12,12,[{index:0,x:12,y:12,width:20,height:20}]),0);assert.equal(h.hitTarget(200,200,[]),null);
console.log('PASS: perfect 950 / mixed 800, six predicted gains, completion bonus once, undo/redo, independent stack history, two-layer cap, early confirm and hit test.');
