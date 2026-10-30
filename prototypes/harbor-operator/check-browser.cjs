// PROTOTYPE - NOT FOR PRODUCTION
// Question: Run the current five-column browser regression suite.
// Date: 2026-10-26
const {execFileSync}=require('node:child_process'),path=require('node:path');
for(const file of ['check-goal-prompt-browser.cjs','check-economy-browser.cjs','check-phase-three-browser.cjs','check-cancel-browser.cjs','check-pan-browser.cjs'])execFileSync(process.execPath,[path.join(__dirname,file)],{stdio:'inherit'});
