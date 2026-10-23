import {AdbPermitDeployment} from './adb-permit-deployment.mjs';
import {DeviceGate,gateOwner} from './device-gate.mjs';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {inspectNativePermitSwitch} from './native-permit-readiness.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const result=(decision,extra={})=>({decision,...extra,realCallsEnabled:false});
const live=pid=>{try{process.kill(pid,0);return true;}catch(e){return e.code!=='ESRCH';}};
/** Durable deployment orchestration. All cooperating processes must share one journal.
 * Persistent gate has no timeout takeover. USB requires an explicit bound deployment grant. No component enabling or call API. */
export class NativePermitSwitch {
 #gate;#path;#db;#port;#now;#inflight=0;
 constructor({path,port,now=Date.now}){
  if(typeof path!=='string'||path===':memory:'||(port?.kind!=='CONTROLLED_FIXTURE'&&!(port instanceof AdbPermitDeployment))||typeof port.collect!=='function'||typeof port.replace!=='function')throw Error('FIXTURE_AND_DURABLE_JOURNAL_REQUIRED');
  if(port instanceof AdbPermitDeployment&&!port.matches(path))throw Error('DEPLOYMENT_JOURNAL_MISMATCH');
  this.#path=path;this.#db=new DatabaseSync(path);this.#port=port;this.#now=now;
  this.#db.exec(`PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL;
   CREATE TABLE IF NOT EXISTS permit_switches(id TEXT PRIMARY KEY,device TEXT NOT NULL,next TEXT NOT NULL,previous TEXT,binding TEXT NOT NULL,state TEXT NOT NULL,pid INTEGER NOT NULL,active INTEGER NOT NULL);
   CREATE UNIQUE INDEX IF NOT EXISTS permit_switch_gate ON permit_switches(device) WHERE state IN ('PRECHECK','WRITING','REVIEW');`);
  this.#gate=new DeviceGate(path);
 }
 status(id){const row=this.#db.prepare('SELECT id AS operationId,state FROM permit_switches WHERE id=?').get(id);return row?result(row.state,{operationId:row.operationId}):result('DENY',{reason:'NOT_FOUND'});}
 #snapshot(r,binding){const s=r?.snapshot,d=s?.device,at=this.#now();if(r?.decision!=='COLLECTED'||!d||!Object.entries(binding).every(([k,v])=>d[k]===v)||d.componentsDisabled!==true||d.inCall!==false||!Number.isSafeInteger(d.observedAt)||d.observedAt>at||at-d.observedAt>=10000||s.ledger?.schemaVersion!==2||!Array.isArray(s.ledger.requests)||s.ledger.requests.some(x=>x.status!=='RECONCILED')||typeof s.nativeBytes!=='string')throw Error('SNAPSHOT_BLOCKED');return s;}
 async prepare({operationId,nativeBytes,expected,host,deadline}){
  if(typeof operationId!=='string'||!/^SWITCH-[A-Z0-9-]{4,100}$/.test(operationId)||typeof nativeBytes!=='string'||Buffer.byteLength(nativeBytes)>8192||typeof host!=='function'||!expected||!['deviceKey','apkSha256','installationKey','accountKey'].every(k=>/^[a-f0-9]{64}$/.test(expected[k])))return result('DENY',{reason:'INVALID_INPUT'});
  // Snapshot all request data before the first await; caller mutations cannot retarget an intent.
  const bytes=nativeBytes,e=structuredClone(expected),binding=Object.fromEntries(['deviceKey','apkSha256','installationKey','accountKey'].map(k=>[k,e[k]])),fingerprint=hash(bytes);
  if(this.#port instanceof AdbPermitDeployment&&!this.#port.matches(this.#path,binding))return result('DENY',{reason:'DEPLOYMENT_BINDING_MISMATCH'});
  this.#db.exec('BEGIN IMMEDIATE');try{
   const old=this.#db.prepare('SELECT * FROM permit_switches WHERE id=?').get(operationId);
   if(old){this.#db.exec('COMMIT');return old.device===e.deviceKey&&old.next===fingerprint&&old.binding===JSON.stringify(binding)?this.status(operationId):result('DENY',{reason:'INTENT_CONFLICT'});}
   if(this.#db.prepare("SELECT id FROM permit_switches WHERE device=? AND state IN ('PRECHECK','WRITING','REVIEW')").get(e.deviceKey)){this.#db.exec('COMMIT');return result('DENY',{reason:'DEVICE_BUSY'});}
   const held=this.#gate.acquire({owner:gateOwner('SWITCH',this.#path,operationId),device:e.deviceKey,digest:fingerprint,kind:'SWITCH'});if(!['ACQUIRED','HELD'].includes(held)){this.#db.exec('COMMIT');return result('DENY',{reason:'DEVICE_BUSY'});}
   this.#db.prepare("INSERT INTO permit_switches VALUES(?,?,?,NULL,?,'PRECHECK',?,1)").run(operationId,e.deviceKey,fingerprint,JSON.stringify(binding),process.pid);this.#db.exec('COMMIT');
  }catch(error){this.#db.exec('ROLLBACK');throw error;}
  this.#inflight++;
  try{
   const s=this.#snapshot(await this.#port.collect(),binding),checked=inspectNativePermitSwitch({now:this.#now(),deadline,nativeBytes:bytes,expected:e,host:await host(),device:s.device,ledger:s.ledger});
   if(checked.decision!=='READY'){this.#db.prepare("UPDATE permit_switches SET state='ABORTED' WHERE id=?").run(operationId);return result('DENY',{reason:checked.reason});}
   // Commit uncertain state before the external write. Failure can never make this operation retryable.
   const previous=hash(s.nativeBytes);this.#db.prepare("UPDATE permit_switches SET state='WRITING',previous=? WHERE id=?").run(previous,operationId);
   if(this.#now()>=checked.validUntil)throw Error('EXPIRED');
   await this.#port.replace({expectedFingerprint:previous,nextBytes:bytes,validUntil:checked.validUntil,operationId,recheck:async snapshot=>inspectNativePermitSwitch({now:this.#now(),deadline:checked.validUntil,nativeBytes:bytes,expected:e,host:await host(),device:snapshot.device,ledger:snapshot.ledger})});
   const after=this.#snapshot(await this.#port.collect(),binding);
   if(hash(after.nativeBytes)!==fingerprint)throw Error('READBACK_MISMATCH');
   this.#db.prepare("UPDATE permit_switches SET state='VERIFIED' WHERE id=?").run(operationId);return this.status(operationId);
  }catch{this.#db.prepare("UPDATE permit_switches SET state='REVIEW' WHERE id=?").run(operationId);return result('REVIEW',{operationId,reason:'EXPLICIT_READBACK_REQUIRED'});}
  finally{this.#db.prepare('UPDATE permit_switches SET active=0 WHERE id=?').run(operationId);const row=this.#db.prepare('SELECT state,next FROM permit_switches WHERE id=?').get(operationId);if(['VERIFIED','ABORTED'].includes(row.state))this.#gate.release(gateOwner('SWITCH',this.#path,operationId),row.next);this.#inflight--;}
 }
 async reconcile({operationId,confirmed}={}){
  if(confirmed!==true)return result('DENY',{reason:'EXPLICIT_RECONCILIATION_REQUIRED'});
  this.#db.exec('BEGIN IMMEDIATE');let row;
  try{row=this.#db.prepare('SELECT * FROM permit_switches WHERE id=?').get(operationId);if(!row||!['PRECHECK','WRITING','REVIEW'].includes(row.state)){this.#db.exec('COMMIT');if(row&&['VERIFIED','ABORTED'].includes(row.state))this.#gate.release(gateOwner('SWITCH',this.#path,operationId),row.next);return this.status(operationId);}
   if(row.active&&live(row.pid)){this.#db.exec('COMMIT');return result('DENY',{reason:'OWNER_ACTIVE'});}
   const held=this.#gate.acquire({owner:gateOwner('SWITCH',this.#path,operationId),device:row.device,digest:row.next,kind:'SWITCH'});if(!['ACQUIRED','HELD'].includes(held)){this.#db.exec('COMMIT');return result('DENY',{reason:'DEVICE_BUSY'});}
   this.#db.prepare("UPDATE permit_switches SET state='REVIEW',active=1,pid=? WHERE id=?").run(process.pid,operationId);this.#db.exec('COMMIT');
  }catch(e){this.#db.exec('ROLLBACK');throw e;}
  this.#inflight++;
  try{const s=this.#snapshot(await this.#port.collect(),JSON.parse(row.binding)),current=hash(s.nativeBytes);
   // No write took place before PRECHECK; otherwise accept only one of the two recorded digests.
   const state=current===row.next?'VERIFIED':row.previous===current||row.state==='PRECHECK'?'ABORTED':'REVIEW';
   this.#db.prepare('UPDATE permit_switches SET state=? WHERE id=?').run(state,operationId);return this.status(operationId);
  }catch{return result('REVIEW',{operationId,reason:'READBACK_UNAVAILABLE'});}
  finally{this.#db.prepare('UPDATE permit_switches SET active=0 WHERE id=?').run(operationId);const row=this.#db.prepare('SELECT state,next FROM permit_switches WHERE id=?').get(operationId);if(['VERIFIED','ABORTED'].includes(row.state))this.#gate.release(gateOwner('SWITCH',this.#path,operationId),row.next);this.#inflight--;}
 }
 close(){if(this.#inflight)throw Error('IN_FLIGHT');this.#gate.close();this.#db.close();}
}
