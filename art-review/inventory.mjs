import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { BAKED_BUILDINGS } from '../src/art/buildingSprites.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const rows=[];
function walk(dir){for(const entry of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){
  const name=`${dir}/${entry.name}`;
  if(entry.isDirectory())walk(name);
  else if(entry.name.endsWith('.png')){const data=fs.readFileSync(path.join(root,name));const p=PNG.sync.read(data);rows.push({file:name,width:p.width,height:p.height,bytes:data.length});}
}}
walk('public/assets');walk('src/ui-skin');
const table=['# Inventário físico de PNGs','', 'Extraído por leitura; uso, perspectiva, escala e riscos por família na [auditoria](./auditoria-grafica.md). Não inclui fontes de geração, screenshots ou imagens do laboratório.','', '| Arquivo | Dimensões | Bytes |','|---|---:|---:|',...rows.map(r=>`| [${r.file}](../../${r.file}) | ${r.width}×${r.height} | ${r.bytes} |`),'','## Registros de edifícios em código','', '| Identificador | Dimensões | Frames |','|---|---:|---:|',...Object.entries(BAKED_BUILDINGS).map(([key,v])=>`| ${key} | ${v.w}×${v.h} | ${v.frames} |`),''];
fs.writeFileSync(new URL('reports/inventario-assets.md',import.meta.url),table.join('\n'));
console.log(`${rows.length} PNGs; ${Object.keys(BAKED_BUILDINGS).length} registros baked`);
