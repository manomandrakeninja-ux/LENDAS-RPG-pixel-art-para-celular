// Visual integration smoke test in a disposable Chrome profile against the production build.
// Sets building levels only in this test scene; never loads the user's browser or save.
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
const root=import.meta.dirname;
const chrome=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
if(!chrome)throw Error('Chrome not found');
const profile=fs.mkdtempSync(path.join(root,'.integration-profile-'));
const preview=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4182','--strictPort'],{cwd:path.resolve(root,'..'),stdio:'pipe',windowsHide:true});
const browser=spawn(chrome,['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','about:blank'],{stdio:'ignore',windowsHide:true});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let socket;const errors=[],results=[];
try{
  let port;for(let n=0;n<100&&!port;n++){try{port=Number(fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);}catch{}if(!port)await delay(100);}
  if(!port)throw Error('Chrome timeout');
  for(let n=0;n<50;n++){try{if((await fetch('http://127.0.0.1:4182/')).ok)break;}catch{}if(n===49)throw Error('Preview timeout');await delay(100);}
  const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await once(socket,'open');
  let id=0;const pending=new Map();
  socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const h=pending.get(m.id);pending.delete(m.id);clearTimeout(h.timer);m.error?h.reject(Error(m.error.message)):h.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')errors.push(m.params.entry.text+' '+(m.params.entry.url||''));});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const mid=++id;const timer=setTimeout(()=>{pending.delete(mid);reject(Error(`Timeout ${method}`));},20000);pending.set(mid,{resolve,reject,timer});socket.send(JSON.stringify({id:mid,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  const inScene=fn=>evaluate(`(async()=>{const s=window.__LENDAS__.scene.getScene('GameScene');return (${fn.toString()})(s);})()`);
  const wait=async expression=>{for(let n=0;n<450;n++){try{if(await evaluate(`Boolean(${expression})`))return;}catch{}await delay(100);}console.error('Startup diagnostics',errors,await evaluate("({title:document.title,text:document.body.innerText.slice(0,1000),game:!!window.__LENDAS__,scenes:window.__LENDAS__?.scene?.getScenes(false)?.map(s=>s.sys.settings.key)})"));throw Error('Scene startup timeout');};
  await send('Page.enable');await send('Runtime.enable');await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:4182/?splash=0'});
  await wait("window.__LENDAS__?.scene.getScene('GameScene')?.camp?.defense && window.__LENDAS__.scene.getScene('GameScene').player");
  await inScene(s=>{
    s.campaign?.ui?.closeChapter?.();s.campaign?.ui?.closeDialogue?.();
    s.camp.levels.forge=4;s.camp.levels.tower=4;s.camp.levels.wall=4;
    s.camp.defense.onLevelChanged('wall');s.camp.defense.onLevelChanged('tower');s.camp.applyVisual('forge');
    s.cameras.main.stopFollow();
    return true;
  });
  await delay(8000); // Let legitimate upgrade/NPC arrival notices leave the capture.
  // Capture the real textures loaded by Phaser, not just files on disk.
  const textures=await inScene(async s=>{
    const out=[];
    for(const [key,name]of [['tower-stone','__BASE'],['buildings','forge'],['nature','oak-tree'],['nature','bush'],['nature','detail-flowers']]){
      const t=s.textures.get(key),f=t.get(name),canvas=document.createElement('canvas');canvas.width=f.cutWidth;canvas.height=f.cutHeight;
      canvas.getContext('2d').drawImage(f.source.image,f.cutX,f.cutY,f.cutWidth,f.cutHeight,0,0,f.cutWidth,f.cutHeight);
      const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      const digest=await crypto.subtle.digest('SHA-256',pixels);
      out.push({key,name,width:canvas.width,height:canvas.height,sha256:[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('')});
    }
    return out;
  });
  const v=PNG.sync.read(fs.readFileSync(path.join(root,'proposals/vegetation/v1/proposed.png')));
  const expected=[PNG.sync.read(fs.readFileSync(path.join(root,'proposals/tower-stone/v1/proposed.png'))),PNG.sync.read(fs.readFileSync(path.join(root,'proposals/forge/v1/proposed.png')))];
  for(const [x,y,w,h]of [[0,0,72,88],[72,58,40,30],[112,72,20,16]]){const p=new PNG({width:w,height:h});PNG.bitblt(v,p,x,y,w,h,0,0);expected.push(p);}
  textures.forEach((t,i)=>assert.equal(t.sha256,createHash('sha256').update(expected[i].data).digest('hex'),t.name));
  for(const [name,width,height,mobile]of [['desktop',1280,800,false],['mobile-horizontal',844,390,true]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});await delay(300);
    if(mobile){
      await send('Page.navigate',{url:'http://127.0.0.1:4182/?splash=0&toque=1'});
      await wait("window.__LENDAS__?.scene.getScene('GameScene')?.camp?.defense && window.__LENDAS__.scene.getScene('GameScene').player");
      await inScene(s=>{s.campaign?.ui?.closeChapter?.();s.campaign?.ui?.closeDialogue?.();s.camp.levels.forge=4;s.camp.levels.tower=4;s.camp.levels.wall=4;s.camp.defense.onLevelChanged('wall');s.camp.defense.onLevelChanged('tower');s.camp.applyVisual('forge');s.cameras.main.stopFollow();return true;});
      await delay(8000);
    }
    for(const target of ['camp','tower','vegetation']){
      await evaluate(`(()=>{const s=window.__LENDAS__.scene.getScene('GameScene');const target=${JSON.stringify(target)};let x=s.camp.x,y=s.camp.y-110;if(target==='tower'){const t=s.camp.buildings.tower.sprite;x=t.x;y=t.y-80;}if(target==='vegetation'){const t=s.world.treeSprites.find(t=>t.frame.name==='oak-tree');x=t.x;y=t.y-40;}s.cameras.main.setZoom(target==='camp'?.8:1.5);s.cameras.main.centerOn(x,y);})()`);
      await delay(250);const shot=await send('Page.captureScreenshot',{format:'png'});
      fs.writeFileSync(path.join(root,'reports',`integracao-${name}-${target}.png`),Buffer.from(shot.data,'base64'));
    }
    results.push(await inScene(s=>({viewport:{width:innerWidth,height:innerHeight},forge:{frame:s.camp.buildings.forge.sprite.frame.name,origin:s.camp.buildings.forge.sprite.originY},tower:{texture:s.camp.buildings.tower.sprite.texture.key,origin:s.camp.buildings.tower.sprite.originY},fps:s.game.loop.actualFps,renderer:s.game.renderer.type,textureLimit:s.game.renderer.gl?.getParameter(s.game.renderer.gl.MAX_TEXTURE_SIZE)})));
  }
  const collisionStart=await inScene(s=>{const z=s.camp.buildings.forge.obstacles[0];s.player.body.reset(z.x,z.body.bottom+55);s.cameras.main.centerOn(z.x,z.y);return {y:s.player.y,bottom:z.body.bottom,width:z.body.width,height:z.body.height};});
  await send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyW',key:'w',windowsVirtualKeyCode:87});await delay(1000);
  await send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyW',key:'w',windowsVirtualKeyCode:87});
  const collisionEnd=await inScene(s=>({y:s.player.y,top:s.player.body.top,bottom:s.camp.buildings.forge.obstacles[0].body.bottom}));
  assert.ok(collisionStart.y-collisionEnd.y>10,'Player did not move during collision test');
  assert.ok(collisionEnd.top>=collisionEnd.bottom-.5,'Player crossed forge footprint');
  assert.equal(collisionStart.width,116);assert.equal(collisionStart.height,22);
  const depth=[];
  for(const offset of [-50,50]){
    await evaluate(`(()=>{const s=window.__LENDAS__.scene.getScene('GameScene'),f=s.camp.buildings.forge.sprite;s.player.body.reset(f.x,f.y+${offset});s.cameras.main.setZoom(1.5);s.cameras.main.centerOn(f.x,f.y-65);})()`);await delay(100);
    const d=await inScene(s=>({player:s.player.depth,forge:s.camp.buildings.forge.sprite.depth}));depth.push(d);
    assert.ok(offset<0?d.player<d.forge:d.player>d.forge,'Depth order mismatch');
    const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'reports',offset<0?'integracao-atras-ferreiro.png':'integracao-frente-ferreiro.png'),Buffer.from(shot.data,'base64'));
  }
  const result={date:new Date().toISOString(),browser:await send('Browser.getVersion'),fixture:'Isolated profile, building levels set to 4 for visual testing; not campaign progress',textures,results,collision:{start:collisionStart,end:collisionEnd},depth,errors};
  fs.writeFileSync(path.join(root,'reports/integration-runtime.json'),JSON.stringify(result,null,2));assert.deepEqual(errors,[]);console.log(JSON.stringify(result,null,2));
}finally{
  socket?.close();browser.kill();preview.kill();await delay(500);
  if(path.dirname(path.resolve(profile))!==root)throw Error('Unsafe cleanup');
  try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:150});}catch{console.warn('QA profile still held by Chrome:',profile);}
}
