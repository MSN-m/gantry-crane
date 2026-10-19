// PROTOTYPE - NOT FOR PRODUCTION
// Question: Does level one reward deliberate color grouping over casual legal placement?
// Date: 2026-10-19
const h=require('./core.js');
function take(s,lane){s.camera=h.dockY[lane];s.cameraX=0;s.truckWait[lane]=0;if(!h.contact(s).ok)throw Error('Pickup failed');}
function drop(s,bay,half){s.camera=h.slots[bay];s.half=half;if(!h.contact(s).ok)throw Error('Drop failed');}
function planned(){const s=h.create('mono');let firstTarget=null;for(let i=0;i<h.totalCargo;i++){take(s,i%2);const color=h.colors.indexOf(s.held.color);drop(s,s.held.size===2?color:4+Math.floor(color/2),color%2);if(!firstPass&&h.outcome(s).scoreReached)firstPass={boxes:s.delivered,units:h.score(s).units,score:h.score(s).total};}return {score:h.score(s).total,firstPass};}
let seed=20261019;function rand(n){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*n);}
const completed=[],blocked=[];for(let trial=0;trial<1000;trial++){const s=h.create('mono');for(let i=0;i<24;i++){const choices=[];for(let lane=0;lane<2;lane++){if(!s.trucks[lane])continue;s.held=s.trucks[lane];for(let bay=0;bay<6;bay++)for(let half=0;half<(s.held.size===2?1:2);half++)if(h.placement(s,bay,half))choices.push({lane,bay,half});}s.held=null;if(!choices.length)break;const p=choices[rand(choices.length)];take(s,p.lane);drop(s,p.bay,p.half);}const p=h.score(s);(p.units===36?completed:blocked).push(p.total);}
completed.sort((a,b)=>a-b);const stats={seed:20261019,trials:1000,goal:h.scoreGoal,colors:h.colors,planned:planned(),random:{completed:completed.length,blocked:blocked.length,completedMedian:completed[Math.floor(completed.length/2)],completedMin:completed[0],completedMax:completed.at(-1),passed:completed.filter(n=>n>=h.scoreGoal).length}};console.log(JSON.stringify(stats,null,2));
