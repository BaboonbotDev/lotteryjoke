export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  try{
    const r=await fetch('https://www.glo.or.th/api/lottery/getLatestLottery',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','User-Agent':'ChanJaSueHuayThukNguat/1.5.1'},body:'{}',signal:AbortSignal.timeout(8000)});
    const text=await r.text();res.status(r.status).setHeader('Cache-Control','no-store').setHeader('X-Content-Type-Options','nosniff');
    try{return res.json(JSON.parse(text))}catch{return res.json({raw:text})}
  }catch(e){return res.status(502).json({error:'GLO API unavailable',detail:e.message})}
}
