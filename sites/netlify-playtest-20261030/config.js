// PROTOTYPE - NOT FOR PRODUCTION
// Question: Keep phase-three balance and presentation parameters reproducible.
// Date: 2026-10-21
(function(root){
 const config={version:'phase4-v3',goals:[600,2600,5000,9000,16000],highScoreGoal:null,
  basePerHalf:50,samePerHalf:25,
  orders:{priority:20,clientStart:20,clientGrowth:10,relayStep:10,corner:60,flat:25,rush:1.5},
  economy:{initial:10,columnReward:5,refresh:2,limit:5,prices:{1:3,2:5,3:7},sell:{1:1,2:2,3:3}},
  feedback:{stepMs:150,receiptMs:2200}};
 if(typeof module!=='undefined')module.exports=config;else root.HarborConfig=config;
})(typeof window!=='undefined'?window:globalThis);
