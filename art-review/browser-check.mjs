// Isolated real Chromium test. The game's origin and saves are never opened.
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {createReviewServer} from './server.mjs';
const root=import.meta.dirname;
const chrome=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
if(!chrome)throw new Error('Chrome not found');
const profile=fs.mkdtempSync(path.join(root,'.qa-profile-'));
const fixture=fs.mkdtempSync(path.join(root,'.qa-review-'));
for(const name of ['index.html','app.js','style.css'])fs.copyFileSync(path.join(root,name),path.join(fixture,name));
const proposals=JSON.parse(fs.readFileSync(path.join(root,'proposals.json')));
const approvalsBefore=fs.readFileSync(path.join(root,'approvals.json'),'utf8');
const actualHistory=JSON.parse(approvalsBefore).history;
const p={...proposals[0],id:'qa-only',name:'TESTE — NÃO É PROPOSTA',original:'/public/assets/characters/player-sheet.png',proposed:'/public/assets/characters/player-sheet.png'};
fs.writeFileSync(path.join(fixture,'proposals.json'),JSON.stringify([p,{...p,version:'v2'}]));
fs.writeFileSync(path.join(fixture,'approvals.json'),JSON.stringify({schemaVersion:1,history:[]}));
const server=createReviewServer({reviewRoot:fixture});server.listen(0,'127.0.0.1');await once(server,'listening');
const browser=spawn(chrome,['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','about:blank'],{stdio:'ignore',windowsHide:true});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let socket;
const errors=[],metrics=[];
try{
  let port;
  for(let n=0;n<80&&!port;n++){try{port=Number(fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);}catch{}if(!port)await delay(100);}
  if(!port)throw new Error('Chrome startup timeout');
  const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await once(socket,'open');
  let id=0;const pending=new Map();
  socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){const h=pending.get(m.id);pending.delete(m.id);clearTimeout(h.timer);m.error?h.reject(Error(m.error.message)):h.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')errors.push(m.params.entry.text);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const mid=++id;const timer=setTimeout(()=>{pending.delete(mid);reject(Error(`Timeout ${method}`));},10000);pending.set(mid,{resolve,reject,timer});socket.send(JSON.stringify({id:mid,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
  const wait=async expression=>{for(let n=0;n<50;n++){try{if(await evaluate(expression))return;}catch{}await delay(100);}throw Error(`Timeout waiting ${expression}`);};
  const click=async selector=>{const p=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});};
  const select=async(selector,value)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await send('Page.enable');await send('Runtime.enable');await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:4180/'});
  await wait("document.querySelectorAll('#gallery button').length===3 && document.querySelector('#proposed').naturalWidth>0");
  for(const [i,id]of ['tower-stone','forge','vegetation'].entries()){
    await click(`#gallery button[data-proposal="${id}"]`);
    await wait(`document.querySelector('#proposed').src.includes('/${id}/')&&document.querySelector('#proposed').complete`);
    await evaluate("Promise.all(['original','proposed'].map(id=>document.getElementById(id).decode())).then(()=>new Promise(resolve=>requestAnimationFrame(resolve)))");
    const expectedWidth=[90,168,132][i];
    await wait(`document.querySelector('#dimensions').textContent.includes('Original: ${expectedWidth} ')`);
    metrics.push(await evaluate("({name:document.querySelector('#name').textContent,dimensions:document.querySelector('#dimensions').textContent})"));
    const labels={pending:'Pendente',approved:'Aprovada',rejected:'Rejeitada',revision:'Revisão solicitada'};
    assert.equal(await evaluate("document.querySelector('#status').textContent"),labels[actualHistory.filter(e=>e.id===id&&e.version==='v1').at(-1)?.status||'pending']);
  }
  await click('#gallery button');await select('#zoom','2');
  for(const [name,width,height,mobile]of [['desktop',1280,900,false],['mobile-horizontal',844,390,true],['mobile-vertical',390,844,true]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});await delay(100);
    const info=await evaluate("({width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,rendering:getComputedStyle(document.querySelector('#proposed')).imageRendering})");
    assert.equal(info.width,width,`${name}: requested viewport not respected`);
    assert.ok(info.documentWidth<=info.width,`${name}: horizontal overflow`);metrics.push({name,...info});
    await evaluate('scrollTo(0,0)');
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
    fs.writeFileSync(path.join(root,'reports',`painel-${name}.png`),Buffer.from(shot.data,'base64'));
  }
  await select('#mode','slider');await select('#slider','70');
  assert.equal(await evaluate("document.querySelector('#after').style.clipPath"),'inset(0px 30% 0px 0px)');
  for(const bg of ['light','dark','scene','checker']){await select('#background',bg);assert.equal(await evaluate("document.querySelector('#comparison').className"),bg);}
  // Exercise all decisions exclusively against disposable QA proposals.
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/`});
  await wait("document.querySelector('#name')?.textContent==='TESTE — NÃO É PROPOSTA'");
  for(const status of ['approved','rejected','revision']){await click(`[data-status="${status}"]`);try{await wait(`document.querySelectorAll('#history li').length===${['approved','rejected','revision'].indexOf(status)+1}`);}catch(e){console.error(await evaluate("({message:document.querySelector('#message').textContent,status:document.querySelector('#status').textContent})"),errors);throw e;}}
  await click('#note');await send('Input.insertText',{text:'Observação QA temporária'});await click('#annotate');await wait("document.querySelectorAll('#history li').length===4");
  await select('#version','v2');assert.equal(await evaluate("document.querySelector('#status').textContent"),'Pendente');
  await send('Page.reload',{ignoreCache:true});await wait("document.querySelectorAll('#history li').length===4");
  assert.equal(JSON.parse(fs.readFileSync(path.join(fixture,'approvals.json'))).history.length,4);
  assert.equal(fs.readFileSync(path.join(root,'approvals.json'),'utf8'),approvalsBefore);
  const result={date:new Date().toISOString(),browser:await send('Browser.getVersion'),metrics,errors,decisionTest:'4 events persisted in disposable fixture; v2 independent; real approvals untouched'};
  fs.writeFileSync(path.join(root,'reports','browser-check.json'),JSON.stringify(result,null,2));
  assert.deepEqual(errors,[]);console.log(JSON.stringify(result,null,2));
}finally{
  socket?.close();browser.kill();await new Promise(r=>server.close(r));
  // Only directories created above inside art-review are eligible for cleanup.
  await delay(500);
  for(const dir of [profile,fixture]){if(path.dirname(path.resolve(dir))!==root)throw Error('Unsafe cleanup path');try{fs.rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:150});}catch{console.warn('Temporary QA directory still held by Chrome:',dir);}}
}
