// Build review-only native-size PNGs and comparison sheets. Never writes game assets.
import fs from 'node:fs';
import { PNG } from 'pngjs';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { quantizePixels } from '../src/art/palette.js';
const root = new URL('./', import.meta.url);
const specs = [
  {id:'tower-stone',original:'tower-4',w:90,h:174},
  {id:'forge',original:'forge-4',w:168,h:176},
  {id:'vegetation',original:'vegetation',w:132,h:88}
];
function bounds(p, x0=0, x1=p.width) {
  let left=x1,top=p.height,right=-1,bottom=-1;
  for(let y=0;y<p.height;y++)for(let x=x0;x<x1;x++) if(p.data[(y*p.width+x)*4+3]>=128){
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  if(right<left)throw new Error('Empty sprite');
  return {x:left,y:top,w:right-left+1,h:bottom-top+1};
}
function fit(source,from,out,to) {
  const scale=Math.min(to.w/from.w,to.h/from.h);
  const w=Math.max(1,Math.round(from.w*scale)),h=Math.max(1,Math.round(from.h*scale));
  const dx=to.x+Math.floor((to.w-w)/2),dy=to.y+to.h-h;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const sx=from.x+Math.min(from.w-1,Math.floor((x+.5)*from.w/w));
    const sy=from.y+Math.min(from.h-1,Math.floor((y+.5)*from.h/h));
    const a=(sy*source.width+sx)*4,b=((dy+y)*out.width+dx+x)*4;
    if(source.data[a+3]<128)continue;
    source.data.copy(out.data,b,a,a+3);out.data[b+3]=255;
  }
}
const grass=await loadImage(new URL('../public/assets/tiles/grass-sheet.png',root).pathname.replace(/^\/(\w:)/,'$1'));
const neighbor=await loadImage(new URL('originals/forge-4.png',root).pathname.replace(/^\/(\w:)/,'$1'));
const metrics=[];
for(const spec of specs){
  const folder=new URL(`proposals/${spec.id}/v1/`,root);
  if(fs.existsSync(new URL('proposed.png',folder)))throw new Error(`${spec.id} v1 already exists; create a new version instead`);
  const original=PNG.sync.read(fs.readFileSync(new URL(`originals/${spec.original}.png`,root)));
  const source=PNG.sync.read(fs.readFileSync(new URL('source.png',folder)));
  const out=new PNG({width:spec.w,height:spec.h});
  if(spec.id==='vegetation'){
    // Explicit piece regions, inspected in the generator output; never slice
    // a generated atlas by an assumed equally-spaced grid.
    for(const [a,b,c,d] of [[0,830,0,72],[830,1300,72,112],[1300,1536,112,132]]) fit(source,bounds(source,a,b),out,bounds(original,c,d));
  } else fit(source,bounds(source),out,bounds(original));
  quantizePixels(out);
  const bytes=PNG.sync.write(out);
  fs.writeFileSync(new URL('proposed.png',folder),bytes);
  const before=await loadImage(PNG.sync.write(original));
  const after=await loadImage(bytes);
  const compare=createCanvas(800,470),ctx=compare.getContext('2d');ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#171d29';ctx.fillRect(0,0,800,470);ctx.font='18px monospace';ctx.fillStyle='#ecd8a4';
  ctx.fillText('ORIGINAL',28,30);ctx.fillText('PROPOSTA v1 — NÃO INTEGRADA',420,30);
  for(let k=0;k<2;k++){
    for(let y=48;y<450;y+=16)for(let x=16+k*400;x<384+k*400;x+=16){ctx.fillStyle=((x-16-k*400)/16+y/16)%2?'#242b36':'#303846';ctx.fillRect(x,y,16,16);}
    ctx.drawImage(k?after:before,200+k*400-spec.w,440-spec.h*2,spec.w*2,spec.h*2);
  }
  fs.writeFileSync(new URL('comparison.png',folder),compare.toBuffer('image/png'));
  const scene=createCanvas(800,470),sc=scene.getContext('2d');sc.imageSmoothingEnabled=false;
  for(let y=0;y<470;y+=48)for(let x=0;x<800;x+=48)sc.drawImage(grass,0,0,48,48,x,y,48,48);
  sc.fillStyle='#8a4836';sc.fillRect(0,370,800,70);
  sc.drawImage(neighbor,12,100,168,176);sc.drawImage(neighbor,412,100,168,176);
  for(let k=0;k<2;k++)sc.drawImage(k?after:before,280+k*400-spec.w/2,365-spec.h,spec.w,spec.h);
  sc.fillStyle='#101923';sc.fillRect(0,0,800,46);sc.fillStyle='#f6ca9f';sc.font='16px monospace';
  sc.fillText('ORIGINAL | CENÁRIO DE TESTE',14,28);sc.fillText('PROPOSTA | MONTAGEM, NÃO PARTIDA',410,28);
  sc.fillStyle='#ecd8a4';sc.fillRect(398,46,4,424);
  fs.writeFileSync(new URL('scene.png',folder),scene.toBuffer('image/png'));
  metrics.push({id:spec.id,width:spec.w,height:spec.h,originalBytes:fs.statSync(new URL(`originals/${spec.original}.png`,root)).size,proposedBytes:bytes.length,rgbaBytes:spec.w*spec.h*4,originalBounds:bounds(original),proposedBounds:bounds(out),colors:new Set(Array.from({length:out.data.length/4},(_,i)=>out.data[i*4+3]?out.data.subarray(i*4,i*4+3).toString('hex'):null).filter(Boolean)).size});
}
fs.writeFileSync(new URL('reports/asset-metrics.json',root),JSON.stringify(metrics,null,2)+'\n');
console.log(metrics);
