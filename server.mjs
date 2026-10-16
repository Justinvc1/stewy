import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./public/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png'};
export function createServer(){return http.createServer(async(req,res)=>{
 const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value))};
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{return json(400,{error:'Invalid URL'})}
 if(pathname==='/api/google/status')return json(200,{configured:false,signedIn:false});
 if(pathname.startsWith('/api/'))return json(503,{error:'Live APIs are disabled in the StackBlitz preview. Configure a separately hosted secure backend.'});
 if(!['GET','HEAD'].includes(req.method))return json(405,{error:'Method not allowed'});
 const file=resolve(root,pathname==='/'?'index.html':'.'+pathname);
 if(!file.startsWith(root.endsWith(sep)?root:root+sep))return json(403,{error:'Forbidden'});
 try{const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data)}catch{return json(404,{error:'Not found'})}
})}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT)||3000;createServer().listen(port,'0.0.0.0',()=>console.log(`Stewy is ready on port ${port}`))}
