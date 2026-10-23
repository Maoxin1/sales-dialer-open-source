import {resolve} from 'node:path';
import {ContactScheduleLedger} from './contact-schedule-ledger.mjs';
import {ContactControlledLedger} from './contact-controlled-ledger.mjs';
import {ContactPreflight} from './contact-preflight.mjs';
import {ContactTimer} from './contact-timer.mjs';
import {ContactAttempts,rehearsalFields} from './contact-attempts.mjs';
import {ContactPlans,planFields} from './contact-plans.mjs';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
const exact=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join()===k.slice().sort().join();
const deny=reason=>({decision:'DENY',reason,realCallsEnabled:false});
const qualifies=v=>['UNKNOWN','CONFIRMED','WITHDRAWN'].includes(v);
const text=v=>typeof v==='string'&&v.trim().length>0&&v.length<=200;
const mask=v=>v.slice(0,3)+'****'+v.slice(-4);
export function parseLocalNumber(raw){
 if(typeof raw!=='string'||raw.length>128)return {status:'INVALID'};
 const v=raw.trim();if(/^1[3-9][0-9]{9}$/.test(v))return {status:'VALID',canonical:v};
 return {status:/^[+0-9() .#-]+$/.test(v)&&v.length>=7?'UNSUPPORTED':'INVALID'};
}
/** Local intake only; no task engine, phone transport or permission to dial. Trusted actor is injected, never read from HTTP. */
export class ContactWorkspace {
 #db;#actor;#now;#plans;#attempts;#timer;#preflight;#controlled;#schedule;#storageIdentity;
 constructor({path,actor,now=Date.now,fault=()=>{},timers=globalThis,androidPreflight=null,controlledPermit=null}){
  if(!actor||!text(actor.tenantId)||!text(actor.salesId)||!Array.isArray(actor.permissions))throw Error('TRUSTED_CONTACT_ACTOR_REQUIRED');
  this.#storageIdentity=path===':memory:'?randomUUID():resolve(path);this.#actor=structuredClone(actor);this.#now=now;this.#db=new DatabaseSync(path);
  try{const tables=this.#db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
   if(tables.length&&!tables.some(t=>t.name==='contact_meta'))throw Error('CONTACT_STORE_TYPE_MISMATCH');
   if(tables.length&&this.#db.prepare('SELECT version FROM contact_meta').get()?.version!==1)throw Error('CONTACT_STORE_SCHEMA_MISMATCH');
   this.#db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS contact_meta(version INTEGER PRIMARY KEY CHECK(version=1)); INSERT OR IGNORE INTO contact_meta VALUES(1);
    CREATE TABLE IF NOT EXISTS contacts(id TEXT PRIMARY KEY,tenant TEXT NOT NULL,seller TEXT NOT NULL,number TEXT NOT NULL,qualification TEXT NOT NULL,refused INTEGER NOT NULL DEFAULT 0,revision INTEGER NOT NULL,created INTEGER NOT NULL,UNIQUE(tenant,number));
    CREATE TABLE IF NOT EXISTS contact_batches(id TEXT PRIMARY KEY,tenant TEXT NOT NULL,seller TEXT NOT NULL,source TEXT NOT NULL,qualification TEXT NOT NULL,created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS contact_rows(batch TEXT NOT NULL,position INTEGER NOT NULL,raw TEXT NOT NULL,status TEXT NOT NULL,target TEXT,PRIMARY KEY(batch,position));
    CREATE TABLE IF NOT EXISTS contact_events(seq INTEGER PRIMARY KEY,tenant TEXT NOT NULL,seller TEXT NOT NULL,target TEXT NOT NULL,kind TEXT NOT NULL,revision INTEGER NOT NULL,source TEXT,created INTEGER NOT NULL);`);
  this.#plans=new ContactPlans(this.#db,this.#actor,this.#now);
  this.#attempts=new ContactAttempts(this.#db,this.#actor,this.#now,this.#plans,fault);
  this.#controlled=new ContactControlledLedger(this.#db,this.#actor,this.#now,this.#plans,controlledPermit,androidPreflight?.mapping,fault);
  this.#schedule=new ContactScheduleLedger(this.#db,this.#actor,this.#now);
  this.#timer=new ContactTimer(this.#db,this.#actor,this.#now,this.#plans,this.#attempts,timers);
  this.#preflight=new ContactPreflight({actor:this.#actor,mapping:androidPreflight?.mapping,provider:androidPreflight?.provider,status:()=>this.status(),now:this.#now});
  }catch(e){this.close();throw e;}
 }
 #can(p){return this.#actor.permissions.includes(p);}
 #tx(fn){this.#db.exec('BEGIN IMMEDIATE');try{const result=fn();this.#db.exec('COMMIT');return result;}catch(e){this.#db.exec('ROLLBACK');throw e;}}
 #owned(id){return this.#db.prepare('SELECT * FROM contacts WHERE id=? AND tenant=? AND seller=?').get(id,this.#actor.tenantId,this.#actor.salesId);}
 #event(c,kind,source){this.#db.prepare('INSERT INTO contact_events(tenant,seller,target,kind,revision,source,created) VALUES(?,?,?,?,?,?,?)').run(this.#actor.tenantId,this.#actor.salesId,c.id,kind,c.revision,source??null,this.#now());}
 #counts(){const a=this.#actor;
 const attempts=this.#db.prepare("SELECT COUNT(*) AS recordingAttempts,COUNT(DISTINCT p.target) AS distinctAttemptTargets,COALESCE(SUM(r.status='FINISHED'),0) AS finished,COALESCE(SUM(r.status!='FINISHED'),0) AS pending FROM local_rehearsals r JOIN local_plans p ON p.id=r.plan WHERE r.tenant=? AND r.seller=?").get(a.tenantId,a.salesId);
 const timer=this.#db.prepare("SELECT COUNT(*) AS timerTriggered,COALESCE(SUM(outcome NOT IN ('OK','CHECK_REQUIRED')),0) AS timerRejected,COALESCE(SUM(outcome='CHECK_REQUIRED'),0) AS timerCheckRequired FROM local_timer_events WHERE tenant=? AND seller=?").get(a.tenantId,a.salesId);
 return {scope:'ALL_TIME_CURRENT_SALES',source:'LOCAL_RECORDING',...attempts,...timer,actualOutgoing:null,actualConnected:null};
 }
 status(){if(!this.#can('read'))return deny('FORBIDDEN');const rows=this.#db.prepare('SELECT * FROM contacts WHERE tenant=? AND seller=? ORDER BY created,id').all(this.#actor.tenantId,this.#actor.salesId);return {decision:'OK',mode:'LOCAL_INTAKE_ONLY',...this.#controlled.view(),controlledSchedule:this.#schedule.view(),counts:this.#counts(),...this.#timer.view(),...this.#plans.view(),...this.#attempts.view(),realCallsEnabled:false,productionAuthenticated:false,contacts:rows.map(c=>({targetId:c.id,maskedNumber:mask(c.number),qualification:c.qualification,refused:!!c.refused,revision:c.revision,dialable:false})),total:rows.length};}
 controlledActorIdentity(){return {tenantId:this.#actor.tenantId,salesId:this.#actor.salesId};}
 controlledStorageIdentity(){return this.#storageIdentity;}
 controlledContext(){return this.#controlled.context();}
 claimControlledDelivery(id,command){return this.#controlled.claim(id,command);}
 controlledDelivery(id){return this.#controlled.delivery(id);}
 recordControlledReceipt(id,r){return this.#controlled.receipt(id,r);}
 finishControlled(id,r){return this.#controlled.finish(id,r);}
 claimControlledSchedule(cmd,policy){return this.#schedule.claim(cmd,policy);}
 completeControlledSchedule(cmd,outcome){return this.#schedule.complete(cmd,outcome);}
 reserveScheduledControlled(cmd){const ticket=this.#schedule.ticket(cmd);return ticket?this.#controlled.reserve(cmd,ticket):deny('SCHEDULE_TICKET_REQUIRED');}
 reserveControlled(cmd){return this.#controlled.reserve(cmd);}
 execute(cmd){
  const fields={preflight:['op','planId','expectedVersion'],startTimer:['op'],stopTimer:['op'],...rehearsalFields,...planFields,import:['op','rows','source','qualification'],qualify:['op','targetId','qualification','source'],refuse:['op','targetId'],status:['op']};
  if(!fields[cmd?.op]||!exact(cmd,fields[cmd.op]))return deny('UNSUPPORTED_FIELDS');
  if(cmd.op==='preflight')return this.#preflight.check(cmd);
  if(['startTimer','stopTimer'].includes(cmd.op))return this.#timer.execute(cmd.op);
  if(rehearsalFields[cmd.op])return this.#attempts.execute(cmd);
  if(planFields[cmd.op]){const result=this.#plans.execute(cmd);if(cmd.op==='pausePlans'&&result.decision==='OK')this.#timer.stop();return result;}
  if(cmd.op==='status')return this.status();if(!this.#can(cmd.op==='qualify'?'qualify':cmd.op))return deny('FORBIDDEN');
  if(cmd.op==='import'){
   if(!Array.isArray(cmd.rows)||cmd.rows.length<1||cmd.rows.length>200||!cmd.rows.every(r=>typeof r==='string'&&r.length<=128)||!text(cmd.source)||!qualifies(cmd.qualification))return deny('INVALID_INPUT');
   return this.#tx(()=>{const a=this.#actor,batch=randomUUID();this.#db.prepare('INSERT INTO contact_batches VALUES(?,?,?,?,?,?)').run(batch,a.tenantId,a.salesId,cmd.source,cmd.qualification,this.#now());const results=cmd.rows.map((raw,i)=>{
    const parsed=parseLocalNumber(raw);let status=parsed.status,target=null;
    if(status==='VALID'){const old=this.#db.prepare('SELECT * FROM contacts WHERE tenant=? AND number=?').get(a.tenantId,parsed.canonical);
     if(old){status=old.seller===a.salesId?'DUPLICATE':'CONFLICT';if(status==='DUPLICATE')target=old.id;}
     else{target='TARGET-'+randomUUID();this.#db.prepare('INSERT INTO contacts VALUES(?,?,?,?,?,0,1,?)').run(target,a.tenantId,a.salesId,parsed.canonical,cmd.qualification,this.#now());this.#event({id:target,revision:1},'IMPORTED',cmd.source);status='IMPORTED';}
    }
    this.#db.prepare('INSERT INTO contact_rows VALUES(?,?,?,?,?)').run(batch,i+1,raw,status,target);
    return {row:i+1,status,...(target?{targetId:target}:{} )};
   });return {decision:'OK',batchId:batch,rows:results,realCallsEnabled:false};});
  }
  if(typeof cmd.targetId!=='string'||cmd.targetId.length>100)return deny('INVALID_INPUT');
  if(cmd.op==='qualify'&&(!qualifies(cmd.qualification)||!text(cmd.source)))return deny('INVALID_INPUT');
  return this.#tx(()=>{const c=this.#owned(cmd.targetId);if(!c)return deny('FORBIDDEN');
   if(cmd.op==='qualify'){if(c.refused)return deny('DO_NOT_CONTACT');this.#db.prepare('UPDATE contacts SET qualification=?,revision=revision+1 WHERE id=?').run(cmd.qualification,c.id);this.#event({...c,revision:c.revision+1},'QUALIFICATION_'+cmd.qualification,cmd.source);}
   else if(!c.refused){this.#db.prepare('UPDATE contacts SET refused=1,revision=revision+1 WHERE id=?').run(c.id);this.#event({...c,revision:c.revision+1},'REFUSED');}
   return {decision:'OK',realCallsEnabled:false};
  });
 }
 close(){this.#timer?.stop();if(this.#db){this.#db.close();this.#db=null;}}
}
