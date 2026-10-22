// PROTOTYPE - NOT FOR PRODUCTION
// Question: Require work-order income without offering provably unwinnable color-only builds.
// Date: 2026-10-22
const assert=require('node:assert/strict'),h=require('./core.js'),o=h.orders;
const ceiling=36*h.config.basePerHalf+24*h.config.samePerHalf;
assert.equal(ceiling,2400);assert.ok(h.goals.every(g=>g>ceiling));assert.equal(h.config.completion,undefined);
let conversions=0;
for(let seed=0;seed<200;seed++){
 const first=h.create(seed);assert.equal(o.choices(first).length,3);assert.ok(o.choices(first).every(d=>!['convert','review'].includes(d.kind)));
 for(const id of ['corner','flat']){const s=h.create(seed);s.orders=[o.make(id)];s.choicePending=false;s.points.total=h.goals[0];assert.ok(h.nextColumn(s));const choices=o.choices(s);assert.equal(choices.length,3);assert.equal(new Set(choices.map(d=>d.kind)).size,3);if(id==='corner')assert.ok(choices.every(d=>d.kind!=='convert'),'Corner + conversion cannot reach 3000');else conversions+=choices.filter(d=>d.kind==='convert').length;}
}
assert.ok(conversions>0,'Color protocols remain available alongside scoring work orders');
const colored=h.create(42,{orders:false});colored.orders=[o.make('convert-red-blue')];for(let bay=0;bay<6;bay++)for(let side=0;side<2;side++)colored.boxes[bay][side]=[{color:'red'},{color:'blue'},{color:'red'}];colored.points=h.layoutScore(colored);assert.equal(h.score(colored).total,2400);assert.equal(h.score(colored).completion,0);assert.equal(h.outcome(colored).canAdvance,false);colored.archives=[{boxes:[],score:{total:99999}}];colored.column=1;assert.equal(h.outcome(colored).scoreReached,false);
console.log('PASS: 2400 base/same ceiling below 2600/3000 gates; no full-load reward; 200 seeded drafts exclude impossible standalone or corner-only color builds while preserving viable conversions; old-column surplus cannot rescue current stage.');
