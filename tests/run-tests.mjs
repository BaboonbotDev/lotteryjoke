import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  normalizeApiLatest,normalizeApiDraw,normalizeApiCheck,toIsoDate,
  checkAgainstDraw,predictionHistory,secureInt,__setTestState
} from '../app.js';


for(let i=0;i<2000;i++){
  const n=secureInt(100);
  assert.ok(Number.isInteger(n)&&n>=0&&n<100,'secureInt must stay within [0,max)');
}

const latestFixture={
  status:true,
  response:{
    date:'16 กรกฎาคม 2569',
    data:{
      first:{price:'6000000',number:[{value:'639214'}]},
      second:{price:'200000',number:[{value:'041103'},{value:'468769'}]},
      third:{price:'80000',number:[{value:'123456'}]},
      fourth:{price:'40000',number:[{value:'234567'}]},
      fifth:{price:'20000',number:[{value:'345678'}]},
      last2:{price:'2000',number:[{value:'71'}]},
      last3f:{price:'4000',number:[{value:'683'},{value:'709'}]},
      last3b:{price:'4000',number:[{value:'746'},{value:'427'}]},
      near1:{price:'100000',number:[{value:'639213'},{value:'639215'}]}
    }
  }
};
const latest=normalizeApiLatest(latestFixture);
assert.equal(latest.date,'2026-07-16');
assert.equal(latest.first,'639214','must not parse the prize amount as the winning number');
assert.equal(latest.last2,'71');
assert.deepEqual(latest.front3,['683','709']);
assert.deepEqual(latest.near1,['639213','639215']);

assert.equal(toIsoDate('16 กรกฎาคม 2569'),'2026-07-16');
assert.equal(toIsoDate('16 ก.ค. 2569'),'2026-07-16');
assert.equal(toIsoDate('๑๖ กรกฎาคม ๒๕๖๙'),'2026-07-16');
assert.equal(toIsoDate('16/07/2569'),'2026-07-16');
assert.equal(toIsoDate('2026-07-16T10:00:00'),'2026-07-16');
assert.equal(toIsoDate('31 กุมภาพันธ์ 2569'),null);
assert.equal(toIsoDate('not-a-date'),null);

const winCheck=normalizeApiCheck({status:true,response:{data:[{lottery_num:'639214',is_win:true,prizes:[{prize_name:'รางวัลที่ 1'}]}]}},'639214');
assert.equal(winCheck.won,true);
assert.deepEqual(winCheck.prizes,['รางวัลที่ 1']);
const loseCheck=normalizeApiCheck({status:true,response:{data:[{lottery_num:'000000',is_win:false,message:'ไม่ถูกรางวัล'}]}},'000000');
assert.equal(loseCheck.won,false);
const loseString=normalizeApiCheck({status:true,response:{data:[{lottery_num:'000000',result:'ไม่ถูกรางวัล'}]}},'000000');
assert.equal(loseString.won,false);
const ambiguous=normalizeApiCheck({status:true,response:{schema:{prize:'field name',reward:'metadata'}}},'000000');
assert.equal(ambiguous,null,'generic prize/reward field names must not create a false positive');

const draw=normalizeApiDraw(latestFixture);
assert.deepEqual(checkAgainstDraw('639214',draw),['รางวัลที่ 1']);
assert.deepEqual(checkAgainstDraw('639213',draw),['รางวัลข้างเคียงรางวัลที่ 1']);
assert.deepEqual(checkAgainstDraw('123456',draw),['รางวัลที่ 3']);
assert.deepEqual(checkAgainstDraw('683999',draw),['เลขหน้า 3 ตัว']);
assert.deepEqual(checkAgainstDraw('999427',draw),['เลขท้าย 3 ตัว']);
assert.deepEqual(checkAgainstDraw('000071',draw),['เลขท้าย 2 ตัว']);

const history=[
  {date:'2024-01-01',last2:'11',first_last2:'11',weekday:2,month:1,zodiac:10},
  {date:'2024-01-16',last2:'22',first_last2:'22',weekday:3,month:1,zodiac:10},
  {date:'2024-02-01',last2:'33',first_last2:'33',weekday:5,month:2,zodiac:11}
];
__setTestState(history,null);
assert.deepEqual(predictionHistory('2024-01-16').map(x=>x.date),['2024-01-01']);
assert.deepEqual(predictionHistory('2024-02-01').map(x=>x.date),['2024-01-01','2024-01-16']);
assert.equal(predictionHistory('2025-01-01').length,3);

const lottery=JSON.parse(fs.readFileSync(new URL('../data/lottery.json',import.meta.url),'utf8'));
assert.equal(lottery.length,716);
assert.equal(new Set(lottery.map(x=>x.date)).size,716);
for(let i=1;i<lottery.length;i++)assert.ok(lottery[i-1].date<lottery[i].date,'lottery data must be strictly sorted');

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const idList=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const htmlIds=new Set(idList);
assert.equal(idList.length,htmlIds.size,'HTML IDs must be unique');
assert.match(html,/data-page="tamarind"/);
assert.match(html,/id="tamarindCanvas"/);
assert.match(html,/ขูดต้นมะขามขอเลข/);
const pages=new Set([...html.matchAll(/data-page="([^"]+)"/g)].map(m=>m[1]));
for(const target of [...html.matchAll(/data-go="([^"]+)"/g)].map(m=>m[1]))assert.ok(pages.has(target),`Missing page for navigation target: ${target}`);
const referencedIds=new Set([...js.matchAll(/\$\('#([^']+)'\)/g)].map(m=>m[1]).filter(id=>!id.includes(' ')));
for(const id of referencedIds)assert.ok(htmlIds.has(id),`HTML is missing id referenced by JS: ${id}`);

console.log('✓ API latest parser uses direct number.value fields');
console.log('✓ Thai dates, check API parser, full-prize comparison and look-ahead cutoff pass');
console.log('✓ 716-row data integrity, tamarind UI, secure random range and HTML/JS ID matching pass');
