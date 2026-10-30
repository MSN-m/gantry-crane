const assert=require('node:assert/strict'),h=require('./core.js');
assert.deepEqual(h.goals,[600,2600,5000,9000,16000]);
assert.equal(h.goals.reduce((a,b)=>a+b,0),33200);
assert.ok(h.goals.slice(1).every(g=>g>2400));
for(let seed=0;seed<200;seed++){
 const s=h.create(seed);assert.equal(s.coins,0);assert.equal(s.shop,null);assert.equal(s.choicePending,false);assert.equal(s.orders.length,0);
 assert.equal(h.orders.openShop(s),false);assert.equal(h.orders.buy(s,'flat'),false);assert.equal(h.orders.refreshShop(s),false);
 s.points.total=599;assert.equal(h.nextColumn(s),false);s.points.total=600;assert.ok(h.nextColumn(s));assert.equal(s.coins,10);assert.equal(s.rewardedColumns.length,0);assert.equal(s.transactions[0].type,'starting-budget');
 assert.equal(s.shop.offers.length,3);assert.ok(s.shop.offers.some(id=>h.orders.get(id).price<=s.coins));assert.ok(s.shop.offers.every(id=>!['convert','review'].includes(h.orders.get(id).kind)));
 assert.equal(h.nextColumn(s),false);assert.equal(s.coins,10);
 h.orders.closeShop(s);s.points.total=2400;assert.equal(h.nextColumn(s),false);
}
console.log('PASS: 200 tutorial lifecycles, fixed gates/33200 sum, no first-column currency or market, exact 600 threshold, one starting budget and viable second-column offers; later gates exceed baseline ceiling.');
