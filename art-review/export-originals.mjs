// Read-only extraction of game art. Writes exclusively to art-review/originals.
import fs from 'node:fs';
import { PNG } from 'pngjs';
import { bakedBuilding } from '../src/art/bakedBuildings.js';
import { createHash } from 'node:crypto';
const root = new URL('./', import.meta.url);
fs.mkdirSync(new URL('originals/', root), { recursive: true });
function write(name, pixels) {
  const png = new PNG({width:pixels.width,height:pixels.height});
  png.data.set(pixels.data);
  fs.writeFileSync(new URL(`originals/${name}.png`,root),PNG.sync.write(png));
}
function atlas(folder,name,frames,out) {
  const base = new URL(`../public/assets/${folder}/${name}-atlas`,root);
  const png=PNG.sync.read(fs.readFileSync(new URL(`${base.href}.png`)));
  const meta=JSON.parse(fs.readFileSync(new URL(`${base.href}.json`)));
  const entries=frames.map(n=>meta.frames[n].frame);
  const target=new PNG({width:entries.reduce((s,f)=>s+f.w,0),height:Math.max(...entries.map(f=>f.h))});
  let offset=0;
  for(const f of entries){ PNG.bitblt(png,target,f.x,f.y,f.w,f.h,offset,target.height-f.h); offset+=f.w; }
  write(out,target);
}
write('tower-4',bakedBuilding('tower-stone'));
atlas('buildings','camp',['forge'],'forge-4');
atlas('nature','nature',['oak-tree','bush','detail-flowers'],'vegetation');
const files=['src/art/buildingSprites.js','public/assets/buildings/camp-atlas.png','public/assets/buildings/camp-atlas.json','public/assets/nature/nature-atlas.png','public/assets/nature/nature-atlas.json'];
const hashes=files.map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(new URL(`../${file}`,root))).digest('hex')}));
fs.writeFileSync(new URL('originals/source-hashes.json',root),JSON.stringify(hashes,null,2)+'\n');
