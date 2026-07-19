const $=(s,root=document)=>root.querySelector(s); const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const state={data:[],model:null,page:'home',predictTarget:'last2',statTarget:'last2',latest:null,deferredInstall:null,lastFortune:null,lastTamarind:null,tamarindReady:false,tamarindScratching:false,tamarindMoves:0};
const weekdays=['','อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
const months=['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const zodiacs=['','เมษ','พฤษภ','เมถุน','กรกฎ','สิงห์','กันย์','ตุล','พิจิก','ธนู','มังกร','กุมภ์','มีน'];
const thaiMonthAliases={
  'มกราคม':1,'ม.ค':1,'ม.ค.':1,'กุมภาพันธ์':2,'ก.พ':2,'ก.พ.':2,
  'มีนาคม':3,'มี.ค':3,'มี.ค.':3,'เมษายน':4,'เม.ย':4,'เม.ย.':4,
  'พฤษภาคม':5,'พ.ค':5,'พ.ค.':5,'มิถุนายน':6,'มิ.ย':6,'มิ.ย.':6,
  'กรกฎาคม':7,'ก.ค':7,'ก.ค.':7,'สิงหาคม':8,'ส.ค':8,'ส.ค.':8,
  'กันยายน':9,'ก.ย':9,'ก.ย.':9,'ตุลาคม':10,'ต.ค':10,'ต.ค.':10,
  'พฤศจิกายน':11,'พ.ย':11,'พ.ย.':11,'ธันวาคม':12,'ธ.ค':12,'ธ.ค.':12
};
const modeLabels={balanced:'สมดุล',recent:'เน้นงวดล่าสุด',stable:'เน้นความถี่ระยะยาว',context:'เน้นวัน/เดือน/ราศี'};
const hostLines=[
 'ฉันจะซื้อหวยทุกงวดค่ะ…แต่จะไม่ยอมให้หวยแดกทุกงวดนะคะ 😏',
 'เลขเด่นมีไว้ดู เงินในบัญชีมีไว้รักษา เข้าใจตรงกันนะคะ!',
 'โมเดลฉลาดแค่ไหน หวยก็ยังสุ่มเก่งกว่าเราอยู่ดีค่ะ',
 'ซื้อพอสนุกนะคะ ระวังโดนหวยแดกจนข้าวเหนียวต้องกินกับน้ำปลา',
 'ซื้อทุกงวดได้ แต่กำหนดงบทุกงวดด้วยนะคะ 💸',
 'เลขนี้น่ารักค่ะ แต่เงินในกระเป๋าเราน่ารักกว่า อย่าทุ่มหมดนะคะ'
];

async function init(){
  try{
    const [data,model]=await Promise.all([fetch('data/lottery.json').then(r=>r.json()),fetch('data/model.json').then(r=>r.json())]);
    state.data=data; state.model=model; state.latest=normalizeLocalLatest(data.at(-1));
    $('#predictDate').value=model.next_draw_default; $('#siamseeDate').value=model.next_draw_default; $('#tamarindDate').value=model.next_draw_default; $('#checkDate').value=state.latest.date;
    renderHome(); renderPrediction(); renderStats(); renderCheckLatest(state.latest); renderFortuneHistory(); renderTamarindHistory(); bindEvents(); setupTamarindCanvas();
    $('#hostBubble').textContent=hostLines[Math.floor(Math.random()*hostLines.length)];
    refreshLatest(false);
  }catch(e){console.error(e);toast('โหลดฐานข้อมูลไม่สำเร็จ');}
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
}

function bindEvents(){
  $('#menuBtn')?.addEventListener('click',()=>go('about'));
  $$('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
  $$('.seg[data-predict-target]').forEach(b=>b.addEventListener('click',()=>{state.predictTarget=b.dataset.predictTarget; $$('.seg[data-predict-target]').forEach(x=>x.classList.toggle('active',x===b)); renderPrediction();}));
  $$('.seg[data-stat-target]').forEach(b=>b.addEventListener('click',()=>{state.statTarget=b.dataset.statTarget; $$('.seg[data-stat-target]').forEach(x=>x.classList.toggle('active',x===b)); renderStats();}));
  $('#runPredict').addEventListener('click',()=>{renderPrediction(true);toast('ปั่นเลขใหม่แล้วค่ะ ระวังโดนหวยแดกนะคะ 😏');}); $('#predictDate').addEventListener('change',()=>renderPrediction(true)); $('#modelMode').addEventListener('change',()=>renderPrediction(true));
  $('#homeRefresh').addEventListener('click',()=>refreshLatest(true)); $('#checkTicket').addEventListener('click',checkTicket);
  $('#shakeSiamsee').addEventListener('click',shakeSiamsee); $('#copyFortune').addEventListener('click',copyFortune); $('#compareFortune').addEventListener('click',compareFortune); $('#clearFortuneHistory').addEventListener('click',clearFortuneHistory); $('#closeFortune').addEventListener('click',()=>$('#fortuneResult').classList.add('hidden'));
  $('#startTamarind').addEventListener('click',startTamarind); $('#revealTamarind').addEventListener('click',()=>revealTamarind(false)); $('#copyTamarind').addEventListener('click',copyTamarind); $('#compareTamarind').addEventListener('click',compareTamarind); $('#clearTamarindHistory').addEventListener('click',clearTamarindHistory); $('#closeTamarind').addEventListener('click',()=>$('#tamarindResult').classList.add('hidden'));
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.deferredInstall=e;$('#installBtn').hidden=false;});
  $('#installBtn').addEventListener('click',async()=>{
    if(state.deferredInstall){state.deferredInstall.prompt();await state.deferredInstall.userChoice;state.deferredInstall=null;$('#installBtn').hidden=true;return;}
    if(isIosSafari()&&!isStandalone()){go('about');const hint=$('#iosInstallHint');hint.hidden=false;hint.scrollIntoView({behavior:'smooth',block:'center'});toast('บน iPhone/iPad ให้กด แชร์ แล้วเลือก เพิ่มไปยังหน้าจอโฮม');}
  });
  setupInstallHelp();
}
function isIosSafari(){return /iphone|ipad|ipod/i.test(navigator.userAgent)&&/safari/i.test(navigator.userAgent)&&!/crios|fxios|edgios/i.test(navigator.userAgent);}
function isStandalone(){return window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;}
function setupInstallHelp(){const hint=$('#iosInstallHint');if(isIosSafari()&&!isStandalone()){if(hint)hint.hidden=false;$('#installBtn').hidden=false;$('#installBtn').setAttribute('aria-label','วิธีติดตั้งบน iPhone หรือ iPad');}}
function go(page){state.page=page;$('#fortuneResult')?.classList.add('hidden');$('#tamarindResult')?.classList.add('hidden');$$('.page').forEach(p=>p.classList.toggle('active',p.dataset.page===page));$$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.go===page));}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),2600);}
function thaiDate(iso){const d=new Date(iso+'T00:00:00');return `${d.getDate()} ${months[d.getMonth()+1]} ${d.getFullYear()+543}`;}
function normalizeLocalLatest(r){return {date:r.date,displayDate:r.date_th,first:r.first,second:r.second,front3:r.front3,back3:r.back3,last2:r.last2};}
function renderHome(){renderLatestCard($('#homeLatest .latest-grid'),state.latest);const top=state.model.predictions.last2.top.slice(0,4);$('#homePicks').innerHTML=top.map(x=>`<span class="pick-ball">${x.number}</span>`).join('');}
function renderLatestCard(el,l){el.classList.remove('skeleton');el.innerHTML=`
  <div class="prize-box large"><div class="prize-label">งวดวันที่ ${thaiDate(l.date)}</div><div class="prize-label">รางวัลที่ 1</div><div class="prize-number">${l.first}</div></div>
  <div class="prize-box"><div class="prize-label">เลขท้าย 2 ตัว</div><div class="prize-number teal-number">${l.last2}</div></div>
  <div class="prize-box"><div class="prize-label">เลขหน้า 3 ตัว / เลขท้าย 3 ตัว</div><div class="small-numbers">${[...(l.front3||[]),...(l.back3||[])].join(' · ')}</div></div>`;}

function zodiac(m,d){if((m===3&&d>=21)||(m===4&&d<=19))return 1;if((m===4&&d>=20)||(m===5&&d<=20))return 2;if((m===5&&d>=21)||(m===6&&d<=20))return 3;if((m===6&&d>=21)||(m===7&&d<=22))return 4;if((m===7&&d>=23)||(m===8&&d<=22))return 5;if((m===8&&d>=23)||(m===9&&d<=22))return 6;if((m===9&&d>=23)||(m===10&&d<=22))return 7;if((m===10&&d>=23)||(m===11&&d<=21))return 8;if((m===11&&d>=22)||(m===12&&d<=21))return 9;if((m===12&&d>=22)||(m===1&&d<=19))return 10;if((m===1&&d>=20)||(m===2&&d<=18))return 11;return 12;}
function contextFromDate(iso){const d=new Date(iso+'T00:00:00');return {weekday:d.getDay()+1,month:d.getMonth()+1,zodiac:zodiac(d.getMonth()+1,d.getDate())};}
function normalize(arr){const s=arr.reduce((a,b)=>a+b,0)||1;return arr.map(x=>x/s);}
function countProb(history,field,alpha=1){const c=Array(100).fill(alpha);history.forEach(r=>c[+r[field]]++);return normalize(c);}
function recencyProb(history,field,half=24,alpha=.5){const c=Array(100).fill(alpha),n=history.length;history.forEach((r,i)=>c[+r[field]]+=Math.pow(.5,(n-1-i)/half));return normalize(c);}
function contextProb(history,field,target){const base=countProb(history,field,1);const specs=[['weekday',.30],['month',.25],['zodiac',.20]];let total=0,out=Array(100).fill(0);for(const [feat,w] of specs){const sub=history.filter(r=>r[feat]===target[feat]);const local=Array(100).fill(1.5);sub.forEach(r=>local[+r[field]]++);const lp=normalize(local),sh=Math.min(.55,sub.length/(sub.length+80));for(let i=0;i<100;i++)out[i]+=w*((1-sh)*base[i]+sh*lp[i]);total+=w;}return out.map(x=>x/total);}
function gapProb(history,field){const last=Array(100).fill(-1);history.forEach((r,i)=>last[+r[field]]=i);const gaps=last.map(x=>Math.min(x<0?history.length:history.length-1-x,80));const mean=gaps.reduce((a,b)=>a+b,0)/100;return normalize(gaps.map(x=>Math.exp((x-mean)/80)));}
function modelWeights(mode){return {balanced:[.45,.35,.15,.05,24],recent:[.25,.60,.10,.05,12],stable:[.75,.15,.08,.02,96],context:[.35,.20,.42,.03,48]}[mode]||[.45,.35,.15,.05,24];}
function predictionHistory(dateIso){const cutoff=toIsoDate(dateIso);if(!cutoff)return[];return state.data.filter(r=>r.date<cutoff);}
function scoreNumbers(field,dateIso,mode,history=predictionHistory(dateIso)){if(!history.length)return[];const target=contextFromDate(dateIso),[wg,wr,wc,wx,half]=modelWeights(mode),g=countProb(history,field,1),r=recencyProb(history,field,half,.5),c=contextProb(history,field,target),x=gapProb(history,field);const p=normalize(g.map((_,i)=>wg*g[i]+wr*r[i]+wc*c[i]+wx*x[i]));return p.map((v,i)=>({number:String(i).padStart(2,'0'),score:v*100})).sort((a,b)=>b.score-a.score);}
function weightedSpin(ranked,count=10){
  const pool=ranked.map(x=>({...x,weight:Math.max(x.score,0.000001)})),out=[];
  while(out.length<count&&pool.length){
    const total=pool.reduce((sum,x)=>sum+x.weight,0);let target=(secureInt(1000000000)/1000000000)*total,index=0;
    while(index<pool.length-1&&target>pool[index].weight){target-=pool[index].weight;index++;}
    out.push(pool.splice(index,1)[0]);
  }
  return out;
}
function renderPrediction(spin=true){
  if(!state.model)return;
  const date=$('#predictDate').value||state.model.next_draw_default,mode=$('#modelMode').value,field=state.predictTarget,history=predictionHistory(date),ctx=contextFromDate(date);
  $('#predictionContext').textContent=`${thaiDate(date)} • วัน${weekdays[ctx.weekday]} • เดือน${months[ctx.month]} • ราศี${zodiacs[ctx.zodiac]}`;
  if(!history.length){$('#predictionList').innerHTML='<p class="empty-state">ยังไม่มีข้อมูลสำหรับงวดนี้ค่ะ</p>';return;}
  const ranked=scoreNumbers(field,date,mode,history),picked=spin?weightedSpin(ranked,5):ranked.slice(0,5),max=Math.max(...picked.map(x=>x.score));
  $('#predictionList').innerHTML=picked.map((x,i)=>`<div class="rank-item"><div class="rank-medal">${i+1}</div><div class="rank-number">${x.number}</div><div class="rank-bar"><div class="rank-fill" style="width:${Math.max(12,x.score/max*100)}%"></div></div></div>`).join('');
}

async function refreshLatest(showToast=true){
  if(showToast)toast('กำลังอัปเดตผลงวดล่าสุด…');
  try{
    const r=await fetch('api/latest',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(8000)});
    if(!r.ok)throw new Error(`GLO HTTP ${r.status}`);
    const j=await r.json(),latest=normalizeApiLatest(j);
    if(!latest)throw new Error('โครงสร้างข้อมูล GLO ไม่ตรงรูปแบบที่รองรับ');
    state.latest=latest;renderLatestCard($('#homeLatest .latest-grid'),latest);renderCheckLatest(latest);$('#checkDate').value=latest.date;
    if(showToast)toast('อัปเดตผลงวดล่าสุดแล้ว');return;
  }catch(e){console.warn('latest API fallback:',e);}
  if(showToast)toast('ยังอัปเดตออนไลน์ไม่ได้ ใช้ข้อมูลในเครื่องก่อนนะคะ');
  renderLatestCard($('#homeLatest .latest-grid'),state.latest);renderCheckLatest(state.latest);
}
function normalizeLotteryNumber(value,width){const digits=String(value??'').replace(/\D/g,'');return digits.length>0&&digits.length<=width?digits.padStart(width,'0'):null;}
function prizeValues(group,width){
  if(group==null)return[];
  let candidates=[];
  if(Array.isArray(group))candidates=group;
  else if(typeof group==='object'){
    if(Array.isArray(group.number))candidates=group.number;
    else if(group.number!=null)candidates=[group.number];
    else if(group.value!=null)candidates=[group.value];
  }else candidates=[group];
  return candidates.map(item=>normalizeLotteryNumber(typeof item==='object'?(item.value??item.lottery_num??item.number):item,width)).filter(Boolean);
}
function normalizeApiDraw(j,dateHint=null){
  const response=j?.response??j,rawData=response?.data??response,draw=Array.isArray(rawData)?rawData[0]:rawData;
  if(!draw||typeof draw!=='object')return null;
  const date=toIsoDate(response?.date??response?.displayDate??response?.period_date??draw?.date??draw?.displayDate??draw?.period_date??dateHint);
  const first=prizeValues(draw.first,6)[0],last2=prizeValues(draw.last2,2)[0];
  if(!date||!first||!last2)return null;
  return {date,first,last2,second:prizeValues(draw.second,6),third:prizeValues(draw.third,6),fourth:prizeValues(draw.fourth,6),fifth:prizeValues(draw.fifth,6),front3:prizeValues(draw.last3f??draw.front3,3),back3:prizeValues(draw.last3b??draw.back3,3),near1:prizeValues(draw.near1,6),source:'GLO API'};
}
function normalizeApiLatest(j){return normalizeApiDraw(j);}
function toArabicDigits(value){return String(value??'').replace(/[๐-๙]/g,ch=>String('๐๑๒๓๔๕๖๗๘๙'.indexOf(ch)));}
function toIsoDate(value){
  if(value instanceof Date&&!Number.isNaN(value.valueOf()))return value.toISOString().slice(0,10);
  const text=toArabicDigits(value).trim().replace(/\s+/g,' ');
  if(!text)return null;
  let match=text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(match){let y=+match[1];if(y>2400)y-=543;return validIsoParts(y,+match[2],+match[3]);}
  match=text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if(match){let y=+match[3];if(y>2400)y-=543;return validIsoParts(y,+match[2],+match[1]);}
  match=text.match(/^(\d{1,2})\s+([^\d\s]+)\s+(\d{4})$/);
  if(match){let y=+match[3];if(y>2400)y-=543;return validIsoParts(y,thaiMonthAliases[match[2]],+match[1]);}
  return null;
}
function validIsoParts(year,month,day){if(!Number.isInteger(year)||!Number.isInteger(month)||!Number.isInteger(day))return null;const d=new Date(Date.UTC(year,month-1,day));if(d.getUTCFullYear()!==year||d.getUTCMonth()!==month-1||d.getUTCDate()!==day)return null;return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;}
function renderCheckLatest(l){$('#checkLatest').innerHTML=`<div class="draw-date">งวดวันที่ ${thaiDate(l.date)}</div><div class="prize-box"><div class="prize-label">รางวัลที่ 1</div><div class="prize-number">${l.first}</div></div><div class="secondary-prizes"><div>เลขหน้า 3 ตัว<br><b>${(l.front3||[]).join(' · ')||'—'}</b></div><div>เลขท้าย 3 ตัว<br><b>${(l.back3||[]).join(' · ')||'—'}</b></div><div>เลขท้าย 2 ตัว<br><b class="teal-number">${l.last2}</b></div><div>รางวัลที่ 2<br><b>${(l.second||[]).slice(0,2).join(' · ')||'ดูออนไลน์'}</b></div></div>`;}
const ticketKeys=['lottery_num','lotteryNumber','lottery_number','ticket','ticket_number'];
const prizeContainerKeys=['prize','prizes','reward','rewards','winning_prize','winningPrizes','result','results'];
const prizeNameKeys=['prize_name','prizeName','reward_name','rewardName','name','title','description'];
const messageKeys=['message','msg','result_message','resultMessage','status_text','statusText','detail'];
function primitiveWinState(node){for(const key of ['is_win','isWin','win','winner','is_reward','isReward','winning']){const v=node?.[key];if(typeof v==='boolean')return v;if(typeof v==='number'&&(v===0||v===1))return Boolean(v);if(typeof v==='string'){const t=v.trim().toLowerCase();if(['true','1','win','winner','won','ถูกรางวัล'].includes(t))return true;if(['false','0','lose','lost','not win','ไม่ถูกรางวัล'].includes(t))return false;}}return null;}
function noWinText(value){const text=String(value??'').trim();return /ไม่(?:พบว่า)?ถูกรางวัล|ไม่พบรางวัล|not\s*(?:a\s*)?winner|not.?win|no.?prize/i.test(text);}
function prizeLikeText(value){const text=String(value??'').trim();return /รางวัลที่\s*[1-5]|รางวัลข้างเคียง|เลขหน้า\s*3\s*ตัว|เลขท้าย\s*[23]\s*ตัว|first prize|second prize|third prize|fourth prize|fifth prize|near.?first/i.test(text)?text:null;}
function extractExplicitPrizeNames(value,depth=0){
  if(value==null||depth>6)return[];
  if(Array.isArray(value))return [...new Set(value.flatMap(x=>extractExplicitPrizeNames(x,depth+1)))];
  if(typeof value==='string')return noWinText(value)?[]:(prizeLikeText(value)?[value.trim()]:[]);
  if(typeof value!=='object')return[];
  const names=[];
  for(const key of prizeNameKeys){const name=prizeLikeText(value[key]);if(name)names.push(name);}
  for(const key of prizeContainerKeys){if(key in value)names.push(...extractExplicitPrizeNames(value[key],depth+1));}
  return [...new Set(names)];
}
function normalizeApiCheck(payload,ticket){
  const root=payload?.response?.data??payload?.response??payload?.data??payload,queue=[root];let visited=0;
  while(queue.length&&visited++<500){
    const node=queue.shift();
    if(Array.isArray(node)){queue.push(...node);continue;}
    if(!node||typeof node!=='object')continue;
    const ticketRaw=ticketKeys.map(k=>node[k]).find(v=>v!=null),ticketValue=ticketRaw==null?null:normalizeLotteryNumber(ticketRaw,6);
    const matches=ticketValue===ticket;
    if(matches||ticketValue==null){
      const names=extractExplicitPrizeNames(node),winState=primitiveWinState(node);
      const messages=[...messageKeys,...prizeContainerKeys].map(k=>node[k]).filter(v=>typeof v==='string');
      const hasKnownContainer=prizeContainerKeys.some(k=>Object.prototype.hasOwnProperty.call(node,k));
      if(names.length)return {recognized:true,won:true,prizes:names,source:'GLO Check API'};
      if(winState===true)return {recognized:true,won:true,prizes:['รางวัลตามผลตรวจออนไลน์'],source:'GLO Check API'};
      if(winState===false||messages.some(noWinText))return {recognized:true,won:false,prizes:[],source:'GLO Check API'};
      if(matches&&hasKnownContainer&&prizeContainerKeys.every(k=>!(k in node)||node[k]==null||(Array.isArray(node[k])&&node[k].length===0)))return {recognized:true,won:false,prizes:[],source:'GLO Check API'};
    }
    queue.push(...Object.values(node).filter(v=>v&&typeof v==='object'));
  }
  return null;
}
function checkAgainstDraw(ticket,draw){const won=[];if(ticket===draw.first)won.push('รางวัลที่ 1');if((draw.near1||[]).includes(ticket))won.push('รางวัลข้างเคียงรางวัลที่ 1');if((draw.second||[]).includes(ticket))won.push('รางวัลที่ 2');if((draw.third||[]).includes(ticket))won.push('รางวัลที่ 3');if((draw.fourth||[]).includes(ticket))won.push('รางวัลที่ 4');if((draw.fifth||[]).includes(ticket))won.push('รางวัลที่ 5');if((draw.front3||[]).includes(ticket.slice(0,3)))won.push('เลขหน้า 3 ตัว');if((draw.back3||[]).includes(ticket.slice(-3)))won.push('เลขท้าย 3 ตัว');if(ticket.slice(-2)===draw.last2)won.push('เลขท้าย 2 ตัว');return won;}
async function fetchFullDraw(period){const [year,month,date]=period.split('-');const r=await fetch('api/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date,month,year}),signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error(`GLO result HTTP ${r.status}`);return normalizeApiDraw(await r.json(),period);}
async function checkTicket(){
  const num=$('#ticketNumber').value.replace(/\D/g,''),period=$('#checkDate').value;
  if(num.length!==6||!period){toast('กรอกเลขสลากให้ครบ 6 หลักและเลือกวันที่งวด');return;}
  const box=$('#checkResult');box.className='check-result';box.textContent='กำลังตรวจผลออนไลน์…';
  try{
    const r=await fetch('api/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({number:[{lottery_num:num}],period_date:period}),signal:AbortSignal.timeout(8000)});
    if(r.ok){const parsed=normalizeApiCheck(await r.json(),num);if(parsed?.recognized){showCheck(parsed.won,parsed.won?`ตรงกับ: ${parsed.prizes.join(', ')} โปรดเก็บสลากไว้ตรวจอีกครั้ง`:'ไม่พบรางวัลสำหรับหมายเลขนี้ในงวดที่เลือก');return;}}
    const draw=await fetchFullDraw(period);
    if(draw){const won=checkAgainstDraw(num,draw);showCheck(won.length>0,won.length?`ตรงกับ: ${won.join(', ')}`:'ยังไม่พบว่าตรงกับรางวัล');return;}
  }catch(e){console.warn('online check fallback:',e);}
  localCheck(num,period);
}
function localCheck(num,period){
  const d=state.data.find(r=>r.date===period);
  if(!d){showCheck(false,'ยังไม่มีข้อมูลงวดนี้ค่ะ กรุณาลองใหม่ภายหลัง');return;}
  const won=[];if(num===d.first)won.push('รางวัลที่ 1');if((d.second||[]).includes(num))won.push('รางวัลที่ 2');if((d.front3||[]).includes(num.slice(0,3)))won.push('เลขหน้า 3 ตัว');if((d.back3||[]).includes(num.slice(-3)))won.push('เลขท้าย 3 ตัว');if(num.slice(-2)===d.last2)won.push('เลขท้าย 2 ตัว');
  showCheck(won.length>0,won.length?`ตรงกับ: ${won.join(', ')}`:'ยังไม่พบรางวัลค่ะ เก็บสลากไว้ตรวจซ้ำอีกครั้งนะคะ');
}
function showCheck(win,msg){const box=$('#checkResult');box.className=`check-result ${win?'':'lose'}`;box.innerHTML=`<b>${win?'🎉 มีข่าวดี':'🥲 ยังไม่พบรางวัล'}</b><br>${msg}`;}

const fortuneMessages={
  verygood:[
    'ลมโชคพัดมาเบา ๆ แต่อย่าเปิดพัดลมแรง เดี๋ยวเงินปลิวตามนะจ๊ะ',
    'มีจังหวะดีให้ยิ้มได้ค่ะ แต่ยิ้มพอประมาณ เดี๋ยวแผงสลากจำหน้าได้',
    'เลขดูมีประกาย ใจเราก็มีหวัง กระเป๋าตังค์ขอมีสติด้วย'
  ],
  good:[
    'พอมีแววให้ลุ้น เหมือนฝนตั้งเค้า แต่อาจตกบ้านข้าง ๆ ก็ได้',
    'โชคเดินมาหน้าบ้านแล้ว แต่ยังไม่รู้ว่ามาส่งพัสดุหรือมาทวงเงิน',
    'เลขนี้ดูน่าคบ แต่เพิ่งเจอกัน อย่าเพิ่งฝากอนาคตไว้ทั้งหมด'
  ],
  neutral:[
    'กลาง ๆ กำลังดี ไม่หวือหวา ไม่ทำให้ข้าวสารในถังสะเทือน',
    'ดวงวันนี้นิ่งเหมือนควายมองรถไถ ลุ้นได้ แต่อย่าเร่งเครื่อง',
    'เลขไม่ร้อน ไม่เย็น เป็นอุณหภูมิห้อง เหมาะกับงบพอขำ ๆ'
  ],
  caution:[
    'เซียมซีบอกให้เบามือนะคะ เงินเดือนยังมีภารกิจสำคัญกว่าการโดนหวยแดก',
    'วันนี้ดวงอาจง่วง ให้พักก่อนซื้อ เดี๋ยวตื่นมาจะถามว่าใครกดเลขนี้',
    'ไม้หล่นแรงไม่แปลว่าโชคแรง บางทีแค่เราเขย่าแรงไปจ้า'
  ]
};
const fortuneHostLines=[
  'ตั้งจิตให้มั่น…แล้วตั้งงบให้แน่นกว่าจิตนะคะ',
  'เขย่าได้ค่ะ แต่อย่าเขย่าบัญชีจนเหลือศูนย์นะคะ!',
  'หนึ่งไม้หนึ่งคำทาย ไม่ใช่หนึ่งไม้หนึ่งสินเชื่อนะคะ',
  'ดวงมีขึ้นมีลง แต่วงเงินควรมีเพดานเสมอนะคะ',
  'สูดหายใจลึก ๆ แล้วจำไว้นะคะ เลขทุกตัวแพ้ค่าอาหารได้หมด'
];
function secureInt(max){
  if(!Number.isInteger(max)||max<=0)throw new Error('max must be a positive integer');
  if(globalThis.crypto?.getRandomValues){
    const limit=Math.floor(0x100000000/max)*max,buf=new Uint32Array(1);let x;
    do{crypto.getRandomValues(buf);x=buf[0];}while(x>=limit);
    return x%max;
  }
  return Math.floor(Math.random()*max);
}
function weightedPick(items,weights){
  const scale=1_000_000,total=weights.reduce((a,b)=>a+b,0)||1;
  let ticket=secureInt(scale),running=0;
  for(let i=0;i<items.length;i++){running+=Math.max(0,weights[i]/total)*scale;if(ticket<running)return items[i];}
  return items.at(-1);
}
function randomDigits(width){return String(secureInt(10**width)).padStart(width,'0');}
function fortuneTwoDigit(dateIso,mode){
  if(mode!=='blend')return randomDigits(2);
  const ranked=scoreNumbers('last2',dateIso,'balanced');
  // 70% uniform randomness + 30% statistical weighting; all 100 numbers remain possible.
  if(secureInt(100)<70)return randomDigits(2);
  const items=ranked.map(x=>x.number),weights=ranked.map((x,i)=>Math.max(.1,x.score)*(1+(100-i)/350));
  return weightedPick(items,weights);
}
function fortuneGrade(){
  const roll=secureInt(100);
  if(roll<18)return {key:'verygood',label:'มหามงคลแบบพอประมาณ',emoji:'🌟'};
  if(roll<50)return {key:'good',label:'โชคดีมีลุ้น',emoji:'✨'};
  if(roll<82)return {key:'neutral',label:'กลาง ๆ อย่างมีสติ',emoji:'🌾'};
  return {key:'caution',label:'เตือนให้เบามือ',emoji:'🫶'};
}
function thaiNumeral(n){return String(n).replace(/\d/g,d=>'๐๑๒๓๔๕๖๗๘๙'[+d]);}
function shakeSiamsee(){
  const button=$('#shakeSiamsee'),pot=$('#fortunePot'),dateIso=$('#siamseeDate').value||state.model?.next_draw_default||new Date().toISOString().slice(0,10),mode=$('#siamseeMode').value;
  button.disabled=true;button.textContent='กำลังเขย่า… กรุ๊งกริ๊ง 🎋';pot.classList.remove('shaking');void pot.offsetWidth;pot.classList.add('shaking');
  $('#siamseeHostLine').textContent=fortuneHostLines[secureInt(fortuneHostLines.length)];
  setTimeout(()=>{
    const grade=fortuneGrade(),two=fortuneTwoDigit(dateIso,mode),three=randomDigits(3),six=randomDigits(6),stick=secureInt(100)+1;
    const supports=[];while(supports.length<3){const n=randomDigits(2);if(n!==two&&!supports.includes(n))supports.push(n);}
    const ctx=contextFromDate(dateIso),message=fortuneMessages[grade.key][secureInt(fortuneMessages[grade.key].length)];
    state.lastFortune={id:Date.now(),createdAt:new Date().toISOString(),date:dateIso,mode,stick,two,three,six,supports,grade:grade.label,message,context:`วัน${weekdays[ctx.weekday]} • เดือน${months[ctx.month]} • ราศี${zodiacs[ctx.zodiac]}`};
    renderFortune(state.lastFortune);saveFortune(state.lastFortune);renderFortuneHistory();
    pot.classList.remove('shaking');button.disabled=false;button.textContent='เขย่าอีกใบ 🎋';
    if(navigator.vibrate)navigator.vibrate([60,40,90]);
  },1150);
}
function renderFortune(f){
  $('#fortuneStickNo').textContent=thaiNumeral(String(f.stick).padStart(2,'0'));
  $('#fortuneGrade').textContent=`${f.grade}`;$('#fortuneMessage').textContent=f.message;
  $('#fortune2').textContent=f.two;$('#fortune3').textContent=f.three;$('#fortune6').textContent=f.six;$('#fortuneSupport').textContent=f.supports.join(' · ');
  $('#fortuneMeta').textContent=`งวด ${thaiDate(f.date)} • ${f.mode==='blend'?'ผสมอันดับเลข':'สุ่มล้วน'}`;
  $('#fortuneResult').classList.remove('hidden');
}
const FORTUNE_STORAGE_KEY='chan-ja-sue-huay-thuk-nguat-fortunes';
const LEGACY_FORTUNE_STORAGE_KEY='tookhuaydaek-fortunes';
function getFortuneHistory(){
  try{
    const current=localStorage.getItem(FORTUNE_STORAGE_KEY);
    if(current)return JSON.parse(current);
    const legacy=localStorage.getItem(LEGACY_FORTUNE_STORAGE_KEY);
    if(legacy){localStorage.setItem(FORTUNE_STORAGE_KEY,legacy);return JSON.parse(legacy);}
    return [];
  }catch{return[];}
}
function saveFortune(f){const history=[f,...getFortuneHistory().filter(x=>x.id!==f.id)].slice(0,10);localStorage.setItem(FORTUNE_STORAGE_KEY,JSON.stringify(history));}
function renderFortuneHistory(){const el=$('#fortuneHistory');if(!el)return;const history=getFortuneHistory();if(!history.length){el.innerHTML='<p class="empty-state">ยังไม่มีประวัติ เขย่าก่อนแล้วค่อยโทษดวงนะ 😌</p>';return;}el.innerHTML=history.map(f=>`<button class="fortune-history-item" data-fortune-id="${f.id}"><span><b>${f.two}</b><small>${f.grade}</small></span><span><small>${thaiDate(f.date)}</small><em>${f.mode==='blend'?'ผสมอันดับ':'สุ่มล้วน'}</em></span></button>`).join('');$$('[data-fortune-id]',el).forEach(b=>b.addEventListener('click',()=>{const f=history.find(x=>String(x.id)===b.dataset.fortuneId);if(f){state.lastFortune=f;renderFortune(f);}}));}
async function copyFortune(){const f=state.lastFortune;if(!f){toast('เขย่าเซียมซีก่อนนะจ๊ะ');return;}const text=`ฉันจะซื้อหวยทุกงวด — ใบเซียมซี ${f.stick}\n${f.grade}\nเลข 2 ตัว: ${f.two}\nเลข 3 ตัว: ${f.three}\nเลข 6 หลัก: ${f.six}\nเลขประกอบ: ${f.supports.join(', ')}\n${f.message}\n`;
  try{await navigator.clipboard.writeText(text);toast('คัดลอกเลขแล้ว อย่าลืมคัดลอกสติไปด้วยนะ');}catch{toast('คัดลอกไม่สำเร็จ ลองกดค้างที่ตัวเลขแทน');}}
function compareFortune(){const f=state.lastFortune;if(!f){toast('ยังไม่มีเลขให้เทียบ');return;}$('#predictDate').value=f.date;state.predictTarget='last2';$$('.seg[data-predict-target]').forEach(x=>x.classList.toggle('active',x.dataset.predictTarget==='last2'));go('predict');renderPrediction();setTimeout(()=>{const row=[...$('#predictionList').children].find(x=>x.querySelector('.rank-number')?.textContent===f.two);if(row){row.classList.add('fortune-highlight');row.scrollIntoView({behavior:'smooth',block:'center'});toast(`เลข ${f.two} อยู่ใน 5 อันดับแรกของหน้าปัจจุบัน`);}else toast(`เลข ${f.two} ไม่อยู่ใน 5 อันดับแรก — ดวงกับสถิติวันนี้ยังไม่คุยกัน`);},150);}
function clearFortuneHistory(){if(!window.confirm('ล้างประวัติเซียมซีทั้งหมดใช่ไหมคะ? เลขหายได้ แต่เงินที่ซื้อไปไม่ย้อนกลับนะ 😌'))return;localStorage.removeItem(FORTUNE_STORAGE_KEY);localStorage.removeItem(LEGACY_FORTUNE_STORAGE_KEY);state.lastFortune=null;$('#fortuneResult').classList.add('hidden');renderFortuneHistory();toast('ล้างประวัติแล้ว หลักฐานหาย แต่เงินที่ซื้อไปไม่กลับมานะ');}


const TAMARIND_STORAGE_KEY='chan-ja-sue-huay-thuk-nguat-tamarind';
const tamarindHostLines=[
  'ขูดเบา ๆ นะคะ ต้นมะขามแก่กว่าเราและมีทนายค่ะ 🌳',
  'ตั้งจิตขอเลขได้ แต่ตั้งงบไว้ด้วย เดี๋ยวหวยแดกจนเหลือแต่มะขามเปียก',
  'มดแดงอนุญาตให้ขูดในจอเท่านั้น ของจริงกัดนะคะ',
  'เลขจะโผล่หรือไม่ไม่รู้ แต่รอยนิ้วบนจอมาแน่นอนค่ะ',
  'ต้นมะขามกระซิบว่า ซื้อพอขำ อย่าซื้อจนต้องขายสวนค่ะ'
];
const tamarindMarks=[
  {name:'รอยมดแดงเดินสวนกัน',message:'มดแดงเดินตัดกันเป็นเลขค่ะ แต่ระวังเดินตัดบัญชีจนยอดเหลือศูนย์นะคะ'},
  {name:'รอยเปลือกแตกสองแฉก',message:'เห็นเป็นเลขได้ แต่อย่าเห็นเป็นสัญญาณให้ทุ่มหมดหน้าตักค่ะ'},
  {name:'รอยยางไม้หยด',message:'ยางไม้ยังหยดได้ เงินในกระเป๋าก็หยดออกได้เหมือนกัน ซื้อแต่น้อยนะคะ'},
  {name:'รอยกิ่งชี้ทาง',message:'กิ่งชี้ไปที่เลข แต่สถิติยังชี้ว่าโอกาสสุ่มเท่าเดิมค่ะ'},
  {name:'รอยตะปุ่มตะป่ำมหาโชค',message:'ชื่อดูขลัง แต่ระบบสุ่มล้วน ๆ ค่ะ ขลังแค่ไหนก็ต้องมีงบจำกัด'},
  {name:'รอยนกเอี้ยงฝากไว้',message:'นกฝากเลข ส่วนพิธีกรฝากเตือนว่าอย่าให้หวยแดกค่าอาหารนกนะคะ'}
];
function getTamarindHistory(){try{return JSON.parse(localStorage.getItem(TAMARIND_STORAGE_KEY)||'[]');}catch{return[];}}
function saveTamarind(t){const history=[t,...getTamarindHistory().filter(x=>x.id!==t.id)].slice(0,10);localStorage.setItem(TAMARIND_STORAGE_KEY,JSON.stringify(history));}
function startTamarind(){
  if(!state.model)return;
  const button=$('#startTamarind'),date=$('#tamarindDate').value||state.model.next_draw_default,mode=$('#tamarindMode').value;
  button.disabled=true;button.textContent='ต้นมะขามกำลังรวมสมาธิ…';
  $('#tamarindHostLine').textContent=tamarindHostLines[secureInt(tamarindHostLines.length)];
  const mark=tamarindMarks[secureInt(tamarindMarks.length)],two=fortuneTwoDigit(date,mode),three=randomDigits(3),six=randomDigits(6);
  const supports=new Set();while(supports.size<3)supports.add(fortuneTwoDigit(date,mode));
  const ctx=contextFromDate(date);
  state.lastTamarind={id:Date.now(),date,mode,two,three,six,supports:[...supports],mark:mark.name,message:mark.message,context:`วัน${weekdays[ctx.weekday]} • เดือน${months[ctx.month]} • ราศี${zodiacs[ctx.zodiac]}`};
  saveTamarind(state.lastTamarind);renderTamarindHistory();prepareTamarindScratch();
  $('#tamarindReveal2').textContent=two;$('#tamarindRevealMark').textContent=mark.name;
  $('#tamarindResult').classList.add('hidden');$('#revealTamarind').hidden=false;
  $('#tamarindScratchHint').textContent='ใช้นิ้วหรือเมาส์ขูดเปลือกตรงกลางให้เลขโผล่ขึ้นมา';
  setTimeout(()=>{button.disabled=false;button.textContent='ขอเลขจากต้นมะขามอีกครั้ง 🌳';},450);
}
function setupTamarindCanvas(){
  const canvas=$('#tamarindCanvas');if(!canvas)return;
  const point=e=>{const rect=canvas.getBoundingClientRect();return{x:(e.clientX-rect.left)*canvas.width/rect.width,y:(e.clientY-rect.top)*canvas.height/rect.height};};
  const scratch=e=>{if(!state.tamarindReady||!state.tamarindScratching)return;e.preventDefault();const p=point(e),ctx=canvas.getContext('2d');ctx.save();ctx.globalCompositeOperation='destination-out';const g=ctx.createRadialGradient(p.x,p.y,3,p.x,p.y,24);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,25,0,Math.PI*2);ctx.fill();ctx.restore();state.tamarindMoves++;if(state.tamarindMoves%8===0&&scratchRatio(canvas)>.34)revealTamarind(true);};
  canvas.addEventListener('pointerdown',e=>{if(!state.tamarindReady)return;state.tamarindScratching=true;canvas.setPointerCapture?.(e.pointerId);scratch(e);});
  canvas.addEventListener('pointermove',scratch);
  const stop=e=>{state.tamarindScratching=false;try{canvas.releasePointerCapture?.(e.pointerId);}catch{}};
  canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('pointerleave',stop);
}
function prepareTamarindScratch(){
  const canvas=$('#tamarindCanvas'),ctx=canvas.getContext('2d');state.tamarindReady=true;state.tamarindMoves=0;canvas.style.opacity='1';canvas.style.pointerEvents='auto';
  ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,canvas.width,canvas.height);
  const grad=ctx.createLinearGradient(0,0,canvas.width,0);grad.addColorStop(0,'#6b371f');grad.addColorStop(.45,'#a06438');grad.addColorStop(.7,'#704022');grad.addColorStop(1,'#4d291a');ctx.fillStyle=grad;ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let i=0;i<70;i++){ctx.strokeStyle=`rgba(${65+secureInt(45)},${30+secureInt(30)},${15+secureInt(20)},${.18+secureInt(25)/100})`;ctx.lineWidth=1+secureInt(4);ctx.beginPath();const x=secureInt(canvas.width),y=secureInt(canvas.height);ctx.moveTo(x,y);ctx.bezierCurveTo(x+secureInt(35)-17,y+20,x+secureInt(45)-22,y+45,x+secureInt(30)-15,canvas.height);ctx.stroke();}
  ctx.fillStyle='rgba(255,236,188,.92)';ctx.font='700 16px sans-serif';ctx.textAlign='center';ctx.fillText('ขูดตรงนี้',canvas.width/2,canvas.height/2+6);
}
function scratchRatio(canvas){const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let clear=0,total=0;for(let i=3;i<data.length;i+=16){total++;if(data[i]<40)clear++;}return clear/total;}
function revealTamarind(auto=false){
  if(!state.lastTamarind){toast('กดขอเลขจากต้นมะขามก่อนนะคะ');return;}
  const canvas=$('#tamarindCanvas');state.tamarindReady=false;canvas.style.opacity='0';canvas.style.pointerEvents='none';$('#revealTamarind').hidden=true;
  renderTamarind(state.lastTamarind);$('#tamarindScratchHint').textContent=auto?'ขูดครบแล้วค่ะ เลขโผล่เอง ไม่ใช่ผีผลักนะคะ':'เปิดเลขให้แล้วค่ะ รอบหน้าลองขูดเอง ต้นมะขามน้อยใจนะ';
}
function renderTamarind(t){
  $('#tamarindMarkName').textContent=t.mark;$('#tamarindMessage').textContent=t.message;$('#tamarind2').textContent=t.two;$('#tamarind3').textContent=t.three;$('#tamarind6').textContent=t.six;$('#tamarindSupport').textContent=t.supports.join(' · ');$('#tamarindMeta').textContent=`งวด ${thaiDate(t.date)} • ${t.mode==='blend'?'ผสมอันดับเลข':'สุ่มล้วน'}`;
  $('#tamarindResult').classList.remove('hidden');
}
function renderTamarindHistory(){const el=$('#tamarindHistory');if(!el)return;const history=getTamarindHistory();if(!history.length){el.innerHTML='<p class="empty-state">ยังไม่เคยขูด ต้นมะขามยังเก็บความลับอยู่ค่ะ 🌳</p>';return;}el.innerHTML=history.map(t=>`<button class="fortune-history-item tamarind-history-item" data-tamarind-id="${t.id}"><span><b>${t.two}</b><small>${t.mark}</small></span><span><small>${thaiDate(t.date)}</small><em>${t.mode==='blend'?'ผสมอันดับ':'สุ่มล้วน'}</em></span></button>`).join('');$$('[data-tamarind-id]',el).forEach(b=>b.addEventListener('click',()=>{const t=history.find(x=>String(x.id)===b.dataset.tamarindId);if(t){state.lastTamarind=t;$('#tamarindReveal2').textContent=t.two;$('#tamarindRevealMark').textContent=t.mark;revealTamarind(false);}}));}
async function copyTamarind(){const t=state.lastTamarind;if(!t){toast('ยังไม่มีเลขจากต้นมะขามค่ะ');return;}const text=`ฉันจะซื้อหวยทุกงวด — ขูดต้นมะขามจำลอง\n${t.mark}\nเลข 2 ตัว: ${t.two}\nเลข 3 ตัว: ${t.three}\nเลข 6 หลัก: ${t.six}\nเลขกิ่งก้าน: ${t.supports.join(', ')}\n${t.message}\n และห้ามขูดต้นไม้จริง`;try{await navigator.clipboard.writeText(text);toast('คัดลอกเลขแล้ว อย่าคัดลอกความมั่นใจเกินร้อยนะคะ');}catch{toast('คัดลอกไม่สำเร็จ ลองกดค้างที่ตัวเลขแทน');}}
function compareTamarind(){const t=state.lastTamarind;if(!t){toast('ยังไม่มีเลขจากต้นมะขามให้เทียบ');return;}$('#predictDate').value=t.date;state.predictTarget='last2';$$('.seg[data-predict-target]').forEach(x=>x.classList.toggle('active',x.dataset.predictTarget==='last2'));go('predict');renderPrediction();setTimeout(()=>{const row=[...$('#predictionList').children].find(x=>x.querySelector('.rank-number')?.textContent===t.two);if(row){row.classList.add('fortune-highlight');row.scrollIntoView({behavior:'smooth',block:'center'});toast(`เลข ${t.two} อยู่ใน 5 อันดับแรก — ต้นมะขามกับสถิติพยักหน้าพร้อมกัน`);}else toast(`เลข ${t.two} ไม่อยู่ใน 5 อันดับแรก — ต้นมะขามกับสถิติยังงอนกันค่ะ`);},150);}
function clearTamarindHistory(){if(!window.confirm('ล้างประวัติขูดต้นมะขามทั้งหมดใช่ไหมคะ? รอยในจอลบได้ แต่เงินที่ซื้อหวยไปลบไม่ได้นะ 😌'))return;localStorage.removeItem(TAMARIND_STORAGE_KEY);state.lastTamarind=null;state.tamarindReady=false;$('#tamarindResult').classList.add('hidden');$('#revealTamarind').hidden=true;$('#tamarindReveal2').textContent='--';$('#tamarindRevealMark').textContent='รอยยังไม่มา';renderTamarindHistory();toast('ล้างรอยขูดแล้ว ต้นมะขามกลับมาผิวเนียนค่ะ');}

function renderStats(){if(!state.model)return;const field=state.statTarget,s=state.model.stats[field],vals=state.data.map(r=>+r[field]);const unique=new Set(vals).size,mean=vals.reduce((a,b)=>a+b,0)/vals.length,hot=s.top_frequency[0];$('#statsMetrics').innerHTML=`<div class="metric"><b>${state.data.length}</b><span>จำนวนงวด</span></div><div class="metric"><b>${unique}/100</b><span>เลขที่เคยออก</span></div><div class="metric"><b>${mean.toFixed(1)}</b><span>ค่าเฉลี่ย</span></div><div class="metric"><b>${hot.number}</b><span>พบบ่อยสุด ${hot.count} ครั้ง</span></div>`;const max=Math.max(...s.digit_units);$('#digitChart').innerHTML=s.digit_units.map((v,i)=>`<div class="bar-col"><div class="bar-value">${v}</div><div class="bar" style="height:${v/max*145}px"></div><div class="bar-label">${i}</div></div>`).join('');$('#hotNumbers').innerHTML=s.top_frequency.slice(0,15).map(x=>`<div class="number-chip"><b>${x.number}</b><small>${x.count} ครั้ง</small></div>`).join('');}

if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',init);
function __setTestState(data=[],model=null){state.data=data;state.model=model;}
export {normalizeApiLatest,normalizeApiDraw,normalizeApiCheck,toIsoDate,prizeValues,checkAgainstDraw,predictionHistory,scoreNumbers,secureInt,__setTestState};
