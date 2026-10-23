import { readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const files=[];
function walk(path){for(const e of readdirSync(path,{withFileTypes:true})){const p=join(path,e.name);if(e.isDirectory())walk(p);else if(p.endsWith('.mjs'))files.push(p);}}
walk(join(root,'packages/core'));
for(const file of files){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status!==0){console.error(r.stderr);process.exit(r.status??1);}}
console.log(JSON.stringify({node:process.version,syntaxFiles:files.length,passed:true,scope:'JavaScript syntax only; no native mobile build'}));
