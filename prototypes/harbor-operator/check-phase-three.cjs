// PROTOTYPE - NOT FOR PRODUCTION
// Question: Verify recording, parameter boundaries and placement-only return behavior.
// Date: 2026-10-21
const assert=require('node:assert/strict'),h=require('./core.js');
const s=h.create(42,{orders:false}),c=h.controller(s);h.tick(s,4.2);
function settle(){let returned=false;for(let i=0;i<2000&&c.phase!=='idle';i++){const event=c.update(1/60);returned ||=!!event.returned;}assert.equal(c.phase,'idle');return returned;}
function select(id){assert.ok(c.select(id));settle();}
select(0);assert.ok(c.confirm());assert.equal(settle(),false);assert.ok(s.held);assert.notEqual(s.cameraX,0);
select(10);assert.ok(c.confirm());assert.equal(settle(),true);assert.equal(s.camera,52);assert.equal(s.cameraX,0);assert.equal(c.selected,null);
select(10);assert.ok(c.confirm());assert.equal(settle(),false);assert.ok(s.held);
select(1);const before=JSON.stringify(s.metrics);h.preview(s,0);assert.equal(JSON.stringify(s.metrics),before,'Previews never record actions');assert.ok(c.confirm());assert.equal(settle(),true);
const m=s.metrics.columns[0];assert.equal(m.picks,2);assert.equal(m.bufferStores,1);assert.equal(m.bufferPicks,1);assert.equal(m.deliveries,1);assert.ok(m.units>0);assert.equal(m.moves,4);assert.equal(m.activeSeconds,4.2);
const remaining=s.trucks.filter(Boolean).length;h.nextBatch(s);assert.equal(m.released,remaining);assert.equal(m.batches,1);
s.points.total=h.goals[0];h.tick(s,3);assert.ok(h.nextColumn(s));assert.equal(m.advance.score,h.goals[0]);assert.equal(m.advance.seconds,7);assert.equal(s.metrics.columns[1].activeSeconds,0);h.tick(s,2.5);
s.points.total=h.config.highScoreGoal-h.goals[0]-1;assert.ok(h.finish(s,true).ok);assert.equal(h.outcome(s).rating,'达标交付');h.tick(s,100);assert.equal(s.metrics.columns[1].activeSeconds,2.5);const r=h.report(s);assert.equal(r.version,h.config.version);assert.equal(r.columns[0].loadRate,Math.round(m.units/36*1000)/10);assert.equal(r.columns[0].score,h.goals[0]);assert.equal(r.columns[1].activeSeconds,3);assert.ok(r.events.some(e=>e.type==='delivery'));r.parameters.orders.flat=999;assert.notEqual(h.config.orders.flat,999,'Export cannot change config');
const boundary=h.create(1,{orders:false});boundary.points.total=h.goals[0];h.nextColumn(boundary);boundary.points.total=h.highScoreGoal-h.goals[0];h.finish(boundary);assert.equal(h.outcome(boundary).rating,'高分交付');
console.log('PASS: placement-only crane return; accurate pickup/buffer/release/delivery/move/time metrics; immutable previews and report; cross-column records; grade threshold boundaries.');
