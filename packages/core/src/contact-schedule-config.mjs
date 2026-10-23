import {readFileSync,realpathSync,statSync,lstatSync} from 'node:fs';import {resolve,relative,isAbsolute} from 'node:path';import {createHash} from 'node:crypto';
const exact=(o,fields)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join()===fields.slice().sort().join();
const text=v=>typeof v==='string'&&v.length>0&&v.length<=200;
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export function loadContactScheduleConfig({root,actor}){
 const path=resolve(root,'.local/contact-schedule-routes.json');try{lstatSync(path);}catch(e){if(e.code==='ENOENT')return null;throw Error('SCHEDULE_CONFIG_INVALID');}
 try{const base=realpathSync(root),local=realpathSync(resolve(root,'.local')),file=realpathSync(path);for(const [parent,child] of [[base,local],[local,file]]){const r=relative(parent,child);if(!r||r.startsWith('..')||isAbsolute(r))throw Error('PATH');}
 if(!statSync(file).isFile()||statSync(file).size>65536)throw Error('SIZE');const raw=readFileSync(file);if(raw.length>65536)throw Error('SIZE');const c=JSON.parse(raw.toString('utf8').replace(/^\uFEFF/,''));
 if(!exact(c,['schemaVersion','tenantId','salesId','source','routes'])||c.schemaVersion!==1||![c.tenantId,c.salesId].every(text)||c.tenantId!==actor.tenantId||c.salesId!==actor.salesId||!['CONTROLLED_FIXTURE','EXPLICIT_CONTROLLED_CALL'].includes(c.source)||!Array.isArray(c.routes)||c.routes.length<1||c.routes.length>200)throw Error('CONFIG');
 const targets=new Set(),permits=new Set();for(const r of c.routes){if(!exact(r,['targetId','permitId','deviceKey','accountKey'])||!text(r.targetId)||!/^TARGET-[A-Za-z0-9-]+$/.test(r.targetId)||!text(r.permitId)||! /^[A-Za-z0-9-]+$/.test(r.permitId)||![r.deviceKey,r.accountKey].every(hash)||targets.has(r.targetId)||permits.has(r.permitId))throw Error('ROUTE');targets.add(r.targetId);permits.add(r.permitId);Object.freeze(r);}
 Object.freeze(c.routes);Object.freeze(c);return Object.freeze({config:c,digest:createHash('sha256').update(raw).digest('hex')});
 }catch{throw Error('SCHEDULE_CONFIG_INVALID');}
}
