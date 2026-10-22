// PROTOTYPE - NOT FOR PRODUCTION
// Question: Keep phase-three balance and presentation parameters reproducible.
// Date: 2026-10-21
(function(root){
 const config={version:'phase3-v2',goals:[2600,3000],highScoreGoal:8000,
  basePerHalf:50,samePerHalf:25,
  orders:{priority:20,clientStart:20,clientGrowth:5,relayStep:10,corner:60,flat:25,rush:1.5},
  feedback:{stepMs:150,receiptMs:2200}};
 if(typeof module!=='undefined')module.exports=config;else root.HarborConfig=config;
})(typeof window!=='undefined'?window:globalThis);
