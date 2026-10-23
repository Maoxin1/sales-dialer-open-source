import {DatabaseSync} from 'node:sqlite';
import {dirname,join,resolve} from 'node:path';
import {readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
export const gateOwner=(kind,path,id)=>kind+':'+hash(resolve(path))+':'+id;
/** Project-local cooperating-process gate. Legacy rows without device attribution block
 * every device conservatively until matched reconciliation. No lease expiry or takeover. */
export class DeviceGate {
 #db;
 constructor(journalPath){const directory=dirname(resolve(journalPath)),path=join(directory,'native-device-gate.db');
  this.#db=new DatabaseSync(path);this.#db.exec("PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS device_claims(owner TEXT PRIMARY KEY,device TEXT NOT NULL,digest TEXT NOT NULL,kind TEXT NOT NULL,state TEXT NOT NULL)");
  const columns=this.#db.prepare('PRAGMA table_info(device_claims)').all().map(r=>r.name);if(!columns.includes('active'))this.#db.exec('ALTER TABLE device_claims ADD COLUMN active INTEGER NOT NULL DEFAULT 0');if(!columns.includes('pid'))this.#db.exec('ALTER TABLE device_claims ADD COLUMN pid INTEGER NOT NULL DEFAULT 0');
  try{for(const entry of readdirSync(directory)){if(!entry.endsWith('.db')||entry==='native-device-gate.db')continue;let old;try{const file=join(directory,entry);old=new DatabaseSync(file,{readOnly:true});const tables=old.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name);
   if(tables.includes('delivery')){const cols=old.prepare('PRAGMA table_info(delivery)').all().map(r=>r.name);if(cols.includes('attempt')&&cols.includes('digest')){const rows=old.prepare('SELECT * FROM delivery').all();for(const r of rows)this.#import(gateOwner('CALL',file,r.attempt),r.device??'*',r.digest,'CALL',r.reconciled===1?'RELEASED':'OPEN');}}
   if(tables.includes('closures'))for(const r of old.prepare('SELECT id,digest,device,state FROM closures').all()){if(r.digest&&r.device&&r.state!=='PREPARING')this.#import(gateOwner('SWITCH',file,r.id),r.device,r.digest,'SWITCH',r.state==='CLOSED'?'RELEASED':'OPEN');}
   if(tables.includes('permit_switches'))for(const r of old.prepare('SELECT * FROM permit_switches').all())this.#import(gateOwner('SWITCH',file,r.id),r.device,r.next,'SWITCH',['PRECHECK','WRITING','REVIEW'].includes(r.state)?'OPEN':'RELEASED');
  }finally{old?.close();}}}catch(e){this.#db.close();throw e;}
 }
 #import(owner,device,digest,kind,state){this.#db.prepare('INSERT OR IGNORE INTO device_claims(owner,device,digest,kind,state) VALUES(?,?,?,?,?)').run(owner,device,digest,kind,state);}
 acquire({owner,device,digest,kind}){
  this.#db.exec('BEGIN IMMEDIATE');try{const old=this.#db.prepare('SELECT * FROM device_claims WHERE owner=?').get(owner);let result;
   if(old&&(old.digest!==digest||old.kind!==kind))result='CONFLICT';
   else if(old?.state==='RELEASED')result='FINISHED';
   else if(this.#db.prepare("SELECT owner FROM device_claims WHERE state='OPEN' AND owner!=? AND (device=? OR device='*' OR ?='*')").get(owner,device,device))result='BUSY';
   else if(old)result='HELD';else{this.#import(owner,device,digest,kind,'OPEN');if(kind==='CALL')this.#db.prepare('UPDATE device_claims SET active=1,pid=? WHERE owner=?').run(process.pid,owner);result='ACQUIRED';}
   this.#db.exec('COMMIT');return result;
  }catch(e){this.#db.exec('ROLLBACK');throw e;}
 }
 end(owner){this.#db.prepare('UPDATE device_claims SET active=0 WHERE owner=? AND pid=?').run(owner,process.pid);}
 beginReconcile(owner){this.#db.exec('BEGIN IMMEDIATE');try{const r=this.#db.prepare('SELECT * FROM device_claims WHERE owner=?').get(owner);let allowed=!!r;if(r?.active){try{process.kill(r.pid,0);allowed=false;}catch(e){if(e.code!=='ESRCH')allowed=false;}}if(allowed&&this.#db.prepare("SELECT owner FROM device_claims WHERE state='OPEN' AND kind='SWITCH' AND owner!=? AND (device=? OR device='*' OR ?='*')").get(owner,r.device,r.device))allowed=false;if(allowed)this.#db.prepare('UPDATE device_claims SET active=1,pid=? WHERE owner=?').run(process.pid,owner);this.#db.exec('COMMIT');return allowed;}catch(e){this.#db.exec('ROLLBACK');throw e;}}


 beginMigration(records){this.#db.exec('BEGIN IMMEDIATE');try{const owners=new Set(records.map(r=>r.owner));const all=this.#db.prepare('SELECT * FROM device_claims').all();let allowed=true;for(const row of all){if(row.state==='OPEN'&&!owners.has(row.owner)){allowed=false;break;}}
  for(const record of records){const row=all.find(r=>r.owner===record.owner);if(!row||row.kind!=='CALL'||row.digest!==record.digest||(row.state==='RELEASED'&&!record.alreadyReconciled)){allowed=false;break;}if(row.active){try{process.kill(row.pid,0);allowed=false;}catch(e){if(e.code!=='ESRCH')allowed=false;}}}
  if(allowed)for(const record of records)this.#db.prepare("UPDATE device_claims SET state='OPEN',active=1,pid=? WHERE owner=?").run(process.pid,record.owner);this.#db.exec('COMMIT');return allowed;
 }catch(e){this.#db.exec('ROLLBACK');throw e;}}
 release(owner,digest){return this.#db.prepare("UPDATE device_claims SET state='RELEASED' WHERE owner=? AND digest=?").run(owner,digest).changes===1;}
 close(){this.#db.close();}
}
