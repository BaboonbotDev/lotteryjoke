function valid(body){return /^\d{4}-\d{2}-\d{2}$/.test(body?.period_date||'')&&Array.isArray(body?.number)&&body.number.length>0&&body.number.length<=10&&body.number.every(x=>/^\d{6}$/.test(x?.lottery_num||''));}
export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  if(!valid(req.body))return res.status(400).json({error:'Invalid lottery check payload'});
  try{
    const r=await fetch('https://www.glo.or.th/api/checking/getcheckLotteryResult',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','User-Agent':'ChanJaSueHuayThukNguat/1.5.1'},body:JSON.stringify(req.body),signal:AbortSignal.timeout(8000)});
    const text=await r.text();res.status(r.status).setHeader('Cache-Control','no-store').setHeader('X-Content-Type-Options','nosniff');
    try{return res.json(JSON.parse(text))}catch{return res.json({raw:text})}
  }catch(e){return res.status(502).json({error:'GLO API unavailable',detail:e.message})}
}
