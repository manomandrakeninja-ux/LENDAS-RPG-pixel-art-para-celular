// Explicit rollback; refuses if newer work overlaps. Leaves new data modules intact but unused.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
if(!process.argv.includes('--restore'))throw Error('Use --restore only when rollback is explicitly requested');
const root=new URL('../',import.meta.url),backup=new URL('backups/approved-v1/',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',backup)));
const hash=data=>createHash('sha256').update(data).digest('hex');
for(const entry of manifest.files){
  if(hash(fs.readFileSync(new URL(entry.file,root)))!==entry.after)throw Error(`Newer changes detected: ${entry.file}`);
  if(hash(fs.readFileSync(new URL(entry.file,backup)))!==entry.before)throw Error(`Backup checksum mismatch: ${entry.file}`);
}
for(const entry of manifest.files)fs.copyFileSync(new URL(entry.file,backup),new URL(entry.file,root));
console.log('Restored five original files. New override modules retained, now unused. No saves touched.');
