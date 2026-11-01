import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PNG} from 'pngjs';
import {createHash} from 'node:crypto';
import {bakedBuilding} from '../src/art/bakedBuildings.js';
import {bakedNature} from '../src/art/bakedNature.js';
const root=new URL('../',import.meta.url),review=new URL('./',import.meta.url);
const read=f=>PNG.sync.read(fs.readFileSync(new URL(f,root)));
const proposed=id=>read(`art-review/proposals/${id}/v1/proposed.png`);
function crop(p,x,y,w,h){const out=new PNG({width:w,height:h});PNG.bitblt(p,out,x,y,w,h,0,0);return out;}
const v=proposed('vegetation');
const entries={'tower-stone':proposed('tower-stone'),forge:proposed('forge'),'oak-tree':crop(v,0,0,72,88),bush:crop(v,72,58,40,30),'detail-flowers':crop(v,112,72,20,16)};
test('runtime baked matches every approved pixel',()=>{
  for(const [id,p]of Object.entries(entries)){
    const actual=['forge','tower-stone'].includes(id)?bakedBuilding(id):bakedNature(id);
    assert.equal(actual.width,p.width);assert.equal(actual.height,p.height);
    assert.deepEqual(Buffer.from(actual.data),p.data,id);
  }
});
test('only approved atlas rectangles changed; frame geometry untouched',()=>{
  for(const [atlas,names]of [['buildings/camp',['forge']],['nature/nature',['oak-tree','bush','detail-flowers']]]){
    const file=`public/assets/${atlas}-atlas.png`;
    const now=read(file),before=read(`art-review/backups/approved-v1/${file}`);
    assert.equal(now.width,before.width);assert.equal(now.height,before.height);
    const meta=JSON.parse(fs.readFileSync(new URL(`public/assets/${atlas}-atlas.json`,root)));
    const allowed=new Uint8Array(now.width*now.height);
    for(const name of names){const f=meta.frames[name].frame;assert.deepEqual(crop(now,f.x,f.y,f.w,f.h).data,entries[name].data,name);for(let y=f.y;y<f.y+f.h;y++)for(let x=f.x;x<f.x+f.w;x++)allowed[y*now.width+x]=1;}
    for(let i=0;i<allowed.length;i++)if(!allowed[i])assert.equal(now.data.readUInt32BE(i*4),before.data.readUInt32BE(i*4),`unexpected change at ${atlas}:${i}`);
  }
});
test('backup and integrated files match recorded hashes',()=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('backups/approved-v1/manifest.json',review)));
  const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  for(const entry of manifest.files){assert.equal(hash(new URL(`backups/approved-v1/${entry.file}`,review)),entry.before);assert.equal(hash(new URL(entry.file,root)),entry.after);}
  for(const entry of manifest.added)assert.equal(hash(new URL(entry.file,root)),entry.after);
});
