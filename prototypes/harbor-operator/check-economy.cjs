// PROTOTYPE - NOT FOR PRODUCTION
// Question: Can five-stage paid contracts preserve scores, growth and finite currency?
// Date: 2026-10-26
function market(seed){const s=h.create(seed);s.points.total=h.goals[0];if(!h.nextColumn(s))throw Error('tutorial transition');return s;}
const assert=require('node:assert/strict'),h=require('./core.js'),o=h.orders;
assert.deepEqual(h.goals,[600,2600,5000,9000,16000]);
assert.deepEqual([1,2,3].map(grade=>o.definitions.filter(d=>d.grade===grade).length),[8,4,4]);
for(const d of o.definitions){assert.equal(d.price,[0,3,5,7][d.grade]);assert.equal(d.sellPrice,d.grade);}
for(let seed=0;seed<200;seed++){
 const s=market(seed);assert.equal(s.coins,10);assert.equal(s.manifests.length,5);assert.equal(s.metrics.columns.length,5);
 assert.equal(s.shop.offers.length,3);assert.equal(new Set(s.shop.offers).size,3);
 const affordable=s.shop.offers.find(id=>o.get(id).price<=s.coins);assert.ok(affordable,'Initial market always offers a usable affordable contract');
 const price=o.get(affordable).price,index=s.shop.offers.indexOf(affordable),offers=[...s.shop.offers];assert.ok(o.buy(s,affordable));assert.equal(s.coins,10-price);assert.equal(s.shop.offers[index],null);
 assert.deepEqual(s.shop.offers.filter(Boolean),offers.filter(id=>id!==affordable));const after=JSON.stringify(s);assert.equal(o.buy(s,affordable),false);assert.equal(JSON.stringify(s),after,'Duplicate click cannot debit twice');
 if(s.coins<2){const before=JSON.stringify(s);assert.equal(o.refreshShop(s),false);assert.equal(JSON.stringify(s),before);}
 assert.ok(o.closeShop(s));assert.equal(o.sell(s,affordable),false,'Sales only occur between columns');assert.equal(o.refreshShop(s),false);
 s.points.total=h.goals[1];const before=s.coins;assert.ok(h.nextColumn(s));assert.equal(s.coins,before+5);assert.equal(s.choicePending,true);assert.ok(s.shop.offers.every(id=>id!==affordable));
 assert.equal(h.nextColumn(s),false,'Market cannot skip columns or double-award');assert.equal(s.coins,before+5);
}
// A sold grown card can return after a refresh, but returns with a new state.
const s=market(73);s.coins=50;s.shop.offers=['client-power','flat','rush'];assert.ok(o.buy(s,'client-power'));s.orders[0].state.reward=140;s.orders[0].state.marks=['0:0'];
const score=JSON.stringify(s.points),money=s.coins;assert.ok(o.sell(s,'client-power'));assert.equal(s.coins,money+2);assert.equal(s.orders.length,0);assert.equal(JSON.stringify(s.points),score);
let returned=false;for(let i=0;i<100;i++){s.coins=100;assert.ok(o.refreshShop(s));assert.equal(s.coins,98);if(s.shop.offers.includes('client-power')){returned=true;break;}}assert.ok(returned,'Sold contracts may appear again');assert.ok(o.buy(s,'client-power'));assert.equal(s.orders[0].state.reward,20);assert.deepEqual(s.orders[0].state.marks,[]);
// Filled inventory blocks buying without debiting or consuming the offer; selling frees a slot.
s.orders=['flat','corner','relay','cap','client-power'].map(o.make);s.shop.offers=['rush','priority-power','client-medical'];const snapshot=JSON.stringify(s);assert.equal(o.buy(s,'rush'),false);assert.equal(JSON.stringify(s),snapshot);assert.ok(o.sell(s,'flat'));assert.ok(o.buy(s,'rush'));assert.equal(s.orders.length,5);assert.ok(o.refreshShop(s));assert.ok(s.shop.offers.filter(Boolean).every(id=>!s.orders.some(order=>order.id===id)));
// Tutorial grants no completion reward; later four rewards and one starting budget occur once.
const run=h.create(42);o.closeShop(run);run.orders=[o.make('client-power')];run.orders[0].state.reward=80;run.reserves[0]={id:999,size:1,color:'red',owner:'power'};
for(let i=0;i<5;i++){run.points.total=h.goals[i];if(i<4){assert.ok(h.nextColumn(run));assert.equal(run.column,i+1);assert.equal(run.orders[0].state.reward,80);assert.equal(run.reserves[0].id,999);assert.ok(o.closeShop(run));}}
const beforeEnd=JSON.stringify(run);assert.equal(h.finish(run).needsReserve,true);assert.equal(JSON.stringify(run),beforeEnd,'End warning cannot award or mutate');assert.ok(h.finish(run,true).ok);assert.equal(run.coins,30);assert.equal(run.transactions.filter(t=>t.type==='column-reward').length,4);assert.equal(h.outcome(run).passed,true);assert.equal(h.outcome(run).completedColumns,5);assert.equal(h.outcome(run).rating,'达标交付');assert.equal(o.sell(run,'client-power'),false);assert.equal(h.finish(run,true).ok,false);assert.equal(run.coins,30);
const report=h.report(run);report.economy.transactions[0].amount=999;assert.equal(run.transactions[0].amount,10,'Export is detached from game state');assert.equal(report.columns.length,5);
const skipped=market(55);const skipCoins=skipped.coins,skipOrders=JSON.stringify(skipped.orders);assert.ok(o.closeShop(skipped));assert.equal(skipped.coins,skipCoins);assert.equal(JSON.stringify(skipped.orders),skipOrders);assert.equal(skipped.choicePending,false);
const failure=market(42);o.closeShop(failure);h.finish(failure,true);assert.equal(failure.coins,10);assert.equal(failure.rewardedColumns.length,0);
console.log('PASS: 200 seeded markets; prices and 16 qualities; atomic purchases, empty slots, insufficient funds, five-card cap, no duplicates, refresh costs, sale/rebuy reset, four completion rewards plus one starting budget exactly once, final reward and deferred grade, buffer warning, immutable scores and exported transactions.');
