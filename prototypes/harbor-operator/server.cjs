// PROTOTYPE - NOT FOR PRODUCTION
// Question: Serve the mobile crane prototype for local playtesting.
// Date: 2026-10-14
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
http.createServer((req,res)=>{const name=decodeURIComponent(req.url.split('?')[0]);const files={'/':'index.html','/index.html':'index.html','/orders.js':'orders.js','/core.js':'core.js','/config.js':'config.js','/game.js':'game.js'};if(!files[name]){res.writeHead(404);return res.end('Not found')}const file=files[name];res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':'application/javascript; charset=utf-8');res.setHeader('Cache-Control','no-store');fs.createReadStream(path.join(__dirname,file)).pipe(res)}).listen(4173,'0.0.0.0',()=>console.log('Harbor prototype: http://localhost:4173'));
