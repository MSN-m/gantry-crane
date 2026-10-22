// PROTOTYPE - NOT FOR PRODUCTION
// Question: Compare visible-cargo policies across real drafts and two columns, not human win rates.
// Date: 2026-10-21
const h=require('./core.js');
function simulate(seed,policy){const s=h.create(seed);let random=seed>>>0;const rand=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
 for(let column=0;column<2;column++){
  const offers=h.orders.choices(s),rank=policy==='single'?['client','priority','flat','cap','rush','corner','relay','convert','review']:['rush','review','priority','client','cap','flat','corner','relay','convert'];
  const chosen=['ordinary','casual'].includes(policy)?offers[0]:[...offers].sort((a,b)=>rank.indexOf(a.kind)-rank.indexOf(b.kind))[0];h.orders.choose(s,chosen.id);
  for(let batch=0;batch<6;batch++){
   for(let turn=0;turn<4;turn++){
    const candidates=[];
    for(let lane=0;lane<4;lane++){const box=s.trucks[lane];if(!box)continue;const copy={...s,held:box};
     for(let bay=0;bay<6;bay++)for(let half=0;half<(box.size===2?1:2);half++){
      const p=h.placement(copy,bay,half);if(!p)continue;
      const color=h.colors.indexOf(box.color),plannedBay=box.size===2?color:4+Math.floor(color/2),plannedHalf=box.size===2?0:color%2;
      if(!['ordinary','casual'].includes(policy)&&(bay!==plannedBay||half!==plannedHalf))continue;
      const gain=h.preview(copy,bay,half);candidates.push({lane,bay,half,gain,level:p.level,random:rand()});
     }
    }
    if(!candidates.length)break;
    candidates.sort((a,b)=>['ordinary','casual'].includes(policy)?a.level-b.level||a.random-b.random:policy==='single'?a.lane-b.lane:b.gain.total-a.gain.total||a.lane-b.lane);
    const best=candidates[0],d=h.destination(h.dockIds[best.lane]);s.camera=d.y;s.cameraX=d.x;if(!h.contact(s).ok)throw Error('Pickup failed');
    if(policy==='combo'&&s.orders.length===2){const preview=h.preview(s,best.bay,best.half),orders=s.orders; s.orders=[...orders].reverse();if(h.preview(s,best.bay,best.half).total<=preview.total)s.orders=orders;}
    s.camera=h.slots[best.bay];s.cameraX=s.held.size===1?(best.half?37.5:-37.5):0;s.half=best.half;if(!h.contact(s).ok)throw Error('Placement failed');if(policy==='casual'&&h.outcome(s).scoreReached)break;
   }
   if(policy==='casual'&&h.outcome(s).scoreReached)break;
   h.nextBatch(s);
  }
  if(column===0&&h.outcome(s).canAdvance)h.nextColumn(s);else break;
 }
 h.finish(s,true);return h.report(s);
}
function evaluate(trials=200){const results={};for(const policy of ['casual','ordinary','single','combo']){const runs=Array.from({length:trials},(_,i)=>simulate(20261021+i,policy)),totals=runs.map(r=>r.outcome.total).sort((a,b)=>a-b),columns=[0,1].map(i=>runs.filter(r=>r.columns[i].score!==null).map(r=>r.columns[i].score).sort((a,b)=>a-b));results[policy]={runs:trials,passed:runs.filter(r=>r.outcome.passed).length,high:runs.filter(r=>r.outcome.rating==='高分交付').length,total:{min:totals[0],p10:totals[Math.floor(trials*.1)],median:totals[Math.floor(trials*.5)],p90:totals[Math.floor(trials*.9)],max:totals.at(-1)},columnMedians:columns.map(a=>a[Math.floor(a.length/2)]??null),meanLoadRate:runs.reduce((n,r)=>n+r.columns.reduce((v,c)=>v+c.units,0)/72*100,0)/trials,meanReleased:runs.reduce((n,r)=>n+r.columns.reduce((v,c)=>v+c.released,0),0)/trials};}return {version:h.config.version,seedStart:20261021,trials,parameters:h.config,policies:{casual:'Same as ordinary, but advance/finish immediately on reaching each column gate; demonstrates partial-load delivery.',ordinary:'First actual offer, visible cargo only; prefer lower legal stacks; no color or order optimization.',single:'Prefer client/priority drafts, fixed color lanes, incoming truck order; full-load spatial route.',combo:'Prefer multiplier/review drafts; fixed color lanes, choose best immediate visible payout and card order.'},results,limitations:'Synthetic policies, not player win rates. Planned policies know the balanced pool composition but never inspect future batches. No buffer strategy, human decision time, device performance or subjective feel is modeled.'};}
if(require.main===module)console.log(JSON.stringify(evaluate(Number(process.argv[2])||200),null,2));
module.exports={simulate,evaluate};
