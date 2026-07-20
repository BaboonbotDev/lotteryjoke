import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const port=Number(process.env.PORT)||4173;
const mime={
  '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8',
  '.png':'image/png','.webmanifest':'application/manifest+json','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};
const API={
  latest:'https://www.glo.or.th/api/lottery/getLatestLottery',
  check:'https://www.glo.or.th/api/checking/getcheckLotteryResult',
  result:'https://www.glo.or.th/api/checking/getLotteryResult'
};

async function readJsonBody(req,maxBytes=64_000){
  let text='';
  for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>maxBytes)throw new Error('request body too large');}
  try{return JSON.parse(text||'{}')}catch{throw new Error('invalid JSON body')}
}
async function proxy(url,payload={}){
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','User-Agent':'ChanJaSueHuayThukNguat/1.4.1'},body:JSON.stringify(payload),signal:AbortSignal.timeout(8000)});
  const text=await response.text();let data;
  try{data=JSON.parse(text)}catch{data={raw:text}}
  return {status:response.status,data};
}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
function validCheckPayload(payload){return /^\d{4}-\d{2}-\d{2}$/.test(payload?.period_date||'')&&Array.isArray(payload?.number)&&payload.number.length>0&&payload.number.length<=10&&payload.number.every(x=>/^\d{6}$/.test(x?.lottery_num||''));}
function validResultPayload(payload){return /^\d{2}$/.test(payload?.date||'')&&/^\d{2}$/.test(payload?.month||'')&&/^\d{4}$/.test(payload?.year||'');}

const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url||'/','http://localhost');
    if(url.pathname==='/api/latest'&&req.method==='POST'){
      const result=await proxy(API.latest,{});return json(res,result.status,result.data);
    }
    if(url.pathname==='/api/check'&&req.method==='POST'){
      const payload=await readJsonBody(req);if(!validCheckPayload(payload))return json(res,400,{error:'Invalid lottery check payload'});
      const result=await proxy(API.check,payload);return json(res,result.status,result.data);
    }
    if(url.pathname==='/api/result'&&req.method==='POST'){
      const payload=await readJsonBody(req);if(!validResultPayload(payload))return json(res,400,{error:'Invalid draw-date payload'});
      const result=await proxy(API.result,payload);return json(res,result.status,result.data);
    }
    if(url.pathname.startsWith('/api/'))return json(res,405,{error:'Method or API route not allowed'});
    if(!['GET','HEAD'].includes(req.method||'')){res.writeHead(405,{'Allow':'GET, HEAD'});return res.end('Method not allowed');}

    let pathname;
    try{pathname=decodeURIComponent(url.pathname)}catch{throw new Error('bad path encoding')}
    if(pathname==='/'||!pathname)pathname='/index.html';
    const relative=pathname.replace(/^\/+/, '');
    const file=path.resolve(root,relative);
    if(file!==root&&!file.startsWith(root+path.sep))throw new Error('bad path');
    const data=await fs.readFile(file);
    res.writeHead(200,{
      'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream',
      'Cache-Control':relative.startsWith('data/')?'public,max-age=3600':'no-cache',
      'X-Content-Type-Options':'nosniff'
    });
    if(req.method==='HEAD')return res.end();
    res.end(data);
  }catch(error){
    if((req.url||'').startsWith('/api/'))return json(res,502,{error:'GLO API unavailable',detail:String(error.message)});
    res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff'});res.end('Not found');
  }
});
server.listen(port,()=>console.log(`ฉันจะซื้อหวยทุกงวด: http://localhost:${port}`));
