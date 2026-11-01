import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {PALETTE} from '../src/art/palette.js';
const root=new URL('./',import.meta.url);
test('fontes originais permanecem com os hashes registrados',()=>{
  const integration=new URL('backups/approved-v1/manifest.json',root);
  const changed=fs.existsSync(integration)?JSON.parse(fs.readFileSync(integration)).files:[];
  for(const {file,sha256} of JSON.parse(fs.readFileSync(new URL('originals/source-hashes.json',root)))) {
    const entry=changed.find(e=>e.file===file);
    const original=entry?new URL(`backups/approved-v1/${file}`,root):new URL(`../${file}`,root);
    assert.equal(createHash('sha256').update(fs.readFileSync(original)).digest('hex'),sha256,file);
  }
});
test('tres propostas: dimensoes iguais, alpha binario, paleta oficial e arquivos de evidencia',()=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('proposals.json',root)));
  assert.equal(manifest.length,3);
  const colors=new Set(PALETTE.map(c=>c.slice(1)));
  for(const p of manifest){
    const file=url=>new URL(url.replace('/art-review/',''),root);
    const a=PNG.sync.read(fs.readFileSync(file(p.original)));
    const b=PNG.sync.read(fs.readFileSync(file(p.proposed)));
    assert.equal(a.width,b.width);assert.equal(a.height,b.height);
    let solid=0,clear=0;
    for(let i=0;i<b.data.length;i+=4){assert.ok(b.data[i+3]===0||b.data[i+3]===255);if(b.data[i+3]){solid++;assert.ok(colors.has(b.data.subarray(i,i+3).toString('hex')));}else clear++;}
    assert.ok(solid>100&&clear>100);
    assert.ok(fs.statSync(file(p.preview)).size>0);assert.ok(fs.statSync(file(p.comparison)).size>0);
  }
});
