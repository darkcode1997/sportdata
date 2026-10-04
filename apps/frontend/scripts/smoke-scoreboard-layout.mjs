// Read-only UI regression checks against the supplied HTML with mocked API fixtures.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.SCOREBOARD_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ ...(process.env.SCOREBOARD_CHROME_PATH ? { executablePath: process.env.SCOREBOARD_CHROME_PATH } : {}), headless: true });
const errors=[];
const athlete1={id:'a1',fullName:'Nguyễn Minh Đức'},athlete2={id:'a2',fullName:'Trần Quốc Phong'};
let board={id:'reference-smoke',eventId:'ui-event',matchNumber:12,category:{name:'Ju-Jitsu Nam – đến 56 kg',matchDurationSeconds:300},event:{name:'Giải vô địch Ju-Jitsu'},status:'RUNNING',resultStatus:'DRAFT',resultVersion:0,athlete1Id:'a1',athlete2Id:'a2',athlete1Score:4,athlete2Score:10,athlete1Advantages:0,athlete2Advantages:0,athlete1Penalties:0,athlete2Penalties:0,resultData:{scoreboard:{remainingMs:168000,runningSince:null,actions:[]}}};
const page=await browser.newPage({viewport:{width:1440,height:900}});
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('cms_token','ui-test-token'));
await page.route('**/api/**',async route=>{
 const req=route.request(),path=new URL(req.url()).pathname.replace('/api','');let data={};
 if(path==='/auth/profile')data={id:'score-user',username:'scorekeeper',role:'SCOREKEEPER'};
 else if(path==='/matches/reference-smoke')data={...board,athlete1,athlete2};
 else if(path==='/results/matches/reference-smoke/scoreboard'){
  if(req.method()==='POST'){
   const input=req.postDataJSON();assert.equal(input.expectedVersion,board.resultVersion);board.resultVersion++;
   const clock=board.resultData.scoreboard;
   if(input.action==='AWARD'){
    const suffix={POINTS:'Score',ADVANTAGE:'Advantages',PENALTY:'Penalties'}[input.award];
    if(input.penaltyLevel)assert.equal(input.penaltyLevel,board[`athlete${input.side}Penalties`]+1);
    if(suffix)board[`athlete${input.side}${suffix}`]+=input.points||1;
    clock.actions.push({id:board.resultVersion,side:input.side,award:input.award,points:input.points||1,penaltyLevel:input.penaltyLevel,remainingMs:clock.remainingMs,at:new Date().toISOString()});
   }
   if(input.action==='UNDO'){const action=clock.actions.findLast(a=>!a.undone);action.undone=true;const suffix={POINTS:'Score',ADVANTAGE:'Advantages',PENALTY:'Penalties'}[action.award];if(suffix)board[`athlete${action.side}${suffix}`]-=action.points;}
   if(input.action==='FINISH'){board.status='FINISHED';board.resultStatus='ENTERED';board.winnerId=input.winnerId;}
  }
  data={...board,serverNow:new Date().toISOString()};
 }
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
});
const reference=await browser.newPage({viewport:{width:1440,height:900}});
await reference.route('**/*',route=>route.abort());
try{
 await reference.setContent(await fs.readFile(fileURLToPath(new URL('../../../scoreboard.html', import.meta.url)),'utf8'),{waitUntil:'domcontentloaded'});
 await page.goto(`${process.env.SCOREBOARD_UI_URL || 'http://localhost:3000'}/cms/matches/reference-smoke/scoreboard`);
 await page.getByRole('timer').waitFor();
 await page.locator('section[aria-label="Bảng điểm Đỏ: Nguyễn Minh Đức"]').waitFor();
 await page.addStyleTag({content:'nextjs-portal { display:none !important; }'});
 const inspect=()=>({
  rows:[...document.querySelectorAll('section[aria-label^="Bảng điểm"]')].map(el=>({rect:el.getBoundingClientRect().toJSON(),background:getComputedStyle(el).backgroundColor})),
  scores:[...document.querySelectorAll('[aria-label^="Điểm "]')].map(el=>({rect:el.getBoundingClientRect().toJSON(),size:getComputedStyle(el).fontSize,color:getComputedStyle(el).color})),
  clock:(()=>{const el=document.querySelector('[role="timer"]');return {rect:el.getBoundingClientRect().toJSON(),size:getComputedStyle(el).fontSize,color:getComputedStyle(el).color}})(),
  penalties:[...document.querySelectorAll('button[aria-pressed]')].map(el=>({rect:el.getBoundingClientRect().toJSON(),size:getComputedStyle(el).fontSize,color:getComputedStyle(el).color})),
 });
 const refInspect=()=>{
  const root=document.body.firstElementChild,rows=[...root.children[0].children],clock=root.children[1].firstElementChild;
  return {rows:rows.map(el=>({rect:el.getBoundingClientRect().toJSON(),background:getComputedStyle(el).backgroundColor})),scores:rows.map(el=>({rect:el.lastElementChild.getBoundingClientRect().toJSON(),size:getComputedStyle(el.lastElementChild).fontSize,color:getComputedStyle(el.lastElementChild).color})),clock:{rect:clock.getBoundingClientRect().toJSON(),size:getComputedStyle(clock).fontSize,color:getComputedStyle(clock).color},penalties:rows.flatMap(row=>[...row.firstElementChild.firstElementChild.lastElementChild.children].map(el=>({rect:el.getBoundingClientRect().toJSON(),size:getComputedStyle(el).fontSize,color:getComputedStyle(el).color})))};
 };
 for(const size of [{width:1440,height:900},{width:1920,height:1080},{width:390,height:844}]){
  await page.setViewportSize(size);await reference.setViewportSize(size);
  const actual=await page.evaluate(inspect),expected=await reference.evaluate(refInspect);
  for(const key of ['rows','scores','penalties'])for(let i=0;i<actual[key].length;i++){
   for(const field of ['x','y','width','height'])assert.ok(Math.abs(actual[key][i].rect[field]-expected[key][i].rect[field])<1.1,`${size.width}: ${key}[${i}].${field} differs: ${actual[key][i].rect[field]} vs ${expected[key][i].rect[field]}`);
   for(const field of ['size','color','background'])if(expected[key][i][field])assert.equal(actual[key][i][field],expected[key][i][field]);
  }
  for(const field of ['x','y','width','height'])assert.ok(Math.abs(actual.clock.rect[field]-expected.clock.rect[field])<1.1,`Clock ${field}: ${actual.clock.rect[field]} vs ${expected.clock.rect[field]}`);
  assert.equal(actual.clock.size,expected.clock.size);assert.equal(actual.clock.color,expected.clock.color);
 }
 await page.setViewportSize({width:1440,height:900});await reference.setViewportSize({width:1440,height:900});
 await page.bringToFront();
 await page.screenshot({path:'/tmp/sportdata-reference-react.png'});await reference.screenshot({path:'/tmp/sportdata-reference-html.png'});
 await reference.close();
 await page.bringToFront();
 const red=page.getByRole('group',{name:'Mốc phạt Đỏ: Nguyễn Minh Đức'}),blue=page.getByRole('group',{name:'Mốc phạt Xanh: Trần Quốc Phong'});
 for(let level=1;level<=4;level++){
  assert.equal(await red.getByRole('button',{name:`${level}P Đỏ: Nguyễn Minh Đức`,exact:true}).isEnabled(),true);
  if(level<4)assert.equal(await red.getByRole('button',{name:`${level+1}P Đỏ: Nguyễn Minh Đức`,exact:true}).isEnabled(),false);
  await red.getByRole('button',{name:`${level}P Đỏ: Nguyễn Minh Đức`,exact:true}).click();
  await page.waitForFunction(n=>document.querySelectorAll('[aria-label^="Mốc phạt Đỏ"] button[aria-pressed="true"]').length===n,level);
  assert.equal(await blue.locator('button[aria-pressed="true"]').count(),0);
 }
 assert.equal(await page.locator('[aria-label="Điểm Nguyễn Minh Đức"]').innerText(),'4');
 await blue.getByRole('button',{name:'1P Xanh: Trần Quốc Phong',exact:true}).click();
 await blue.locator('button[aria-pressed="true"]').waitFor();
 await page.reload();await page.getByRole('timer').waitFor();
 assert.equal(await red.locator('button[aria-pressed="true"]').count(),4);
 assert.equal(await blue.locator('button[aria-pressed="true"]').count(),1);
 await page.getByRole('button',{name:'Điều khiển',exact:true}).click();
 await page.getByRole('button',{name:'Hoàn tác',exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('[aria-label^="Mốc phạt Xanh"] button[aria-pressed="true"]').length===0);
 await page.getByRole('button',{name:'Hoàn tác',exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('[aria-label^="Mốc phạt Đỏ"] button[aria-pressed="true"]').length===3);
 assert.equal(await red.getByRole('button',{name:'4P Đỏ: Nguyễn Minh Đức',exact:true}).isEnabled(),true);
 await page.getByRole('button',{name:'Đóng điều khiển',exact:true}).click();
 await red.getByRole('button',{name:'4P Đỏ: Nguyễn Minh Đức',exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('[aria-label^="Mốc phạt Đỏ"] button[aria-pressed="true"]').length===4);
 await page.getByRole('button',{name:'Cộng 2 điểm cho Nguyễn Minh Đức'}).click();
 await page.waitForFunction(()=>document.querySelector('[aria-label="Điểm Nguyễn Minh Đức"]').textContent==='6');
 await page.bringToFront();
 await page.screenshot({path:'/tmp/sportdata-penalty-lights.png'});

 await page.getByRole('button',{name:'Điều khiển',exact:true}).click();
 await page.getByRole('button',{name:'Toàn màn hình',exact:true}).click();
 assert.equal(await page.evaluate(()=>Boolean(document.fullscreenElement)),true);
 await page.getByRole('button',{name:'Lịch sử (7)',exact:true}).click();
 await page.getByRole('dialog').waitFor();assert.ok((await page.getByRole('dialog').innerText()).includes('4P'));
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Xác nhận kết quả',exact:true}).click();
 await page.getByLabel('Vận động viên thắng').selectOption('a2');await page.getByLabel('Phương thức thắng').selectOption('DISQUALIFICATION');
 await page.getByRole('button',{name:'Xác nhận & lưu kết quả',exact:true}).click();
 await page.getByText('CHIẾN THẮNG',{exact:true}).waitFor();
 assert.equal(await red.getByRole('button').count(),4);assert.equal(await blue.getByRole('button').count(),4);
 assert.deepEqual(errors,[]);
 console.log('PASS: exact reference geometry/colors at 1440, 1920, 390; all eight penalty buttons retained; sequential cumulative lights, independent sides, reload, undo/reapply, points, fullscreen and explicit outcome confirmation.');
} finally{await browser.close();}
