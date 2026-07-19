import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import http from 'node:http';
import {setTimeout as sleep} from 'node:timers/promises';

const port=4181;
const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);

function rawRequest(path,{method='GET',body=null,headers={}}={}){
  return new Promise((resolve,reject)=>{
    const req=http.request({host:'127.0.0.1',port,path,method,headers},res=>{let data='';res.setEncoding('utf8');res.on('data',c=>data+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:data}));});
    req.on('error',reject);if(body)req.write(body);req.end();
  });
}
try{
  for(let i=0;i<30;i++){try{const r=await rawRequest('/');if(r.status===200)break;}catch{}await sleep(100);}
  const index=await rawRequest('/');assert.equal(index.status,200);assert.match(index.headers['content-type'],/text\/html/);assert.equal(index.headers['cache-control'],'no-cache');assert.match(index.body,/appVersion">1\.4\.3/);
  const data=await rawRequest('/data/lottery.json');assert.equal(data.status,200);assert.match(data.headers['content-type'],/application\/json/);assert.equal(data.headers['cache-control'],'public,max-age=3600');
  const traversal=await rawRequest('/..%2f..%2fetc%2fpasswd');assert.equal(traversal.status,404);
  const invalid=await rawRequest('/api/check',{method:'POST',body:'{}',headers:{'Content-Type':'application/json','Content-Length':'2'}});assert.equal(invalid.status,400);assert.match(invalid.body,/Invalid lottery check payload/);
  console.log('✓ server MIME, cache policy, traversal guard and API validation pass');
}finally{
  child.kill('SIGTERM');await sleep(100);
  if(!child.killed)child.kill('SIGKILL');
  if(output&&!/ฉันจะซื้อหวยทุกงวด/.test(output))console.error(output);
}
