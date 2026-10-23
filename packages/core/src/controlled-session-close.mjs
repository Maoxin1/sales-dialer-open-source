import {DatabaseSync} from 'node:sqlite';import {createHash,randomUUID} from 'node:crypto';import {existsSync,mkdirSync,readFileSync,writeFileSync,copyFileSync,unlinkSync,renameSync,constants} from 'node:fs';import {resolve,join} from 'node:path';import {DeviceGate,gateOwner} from './device-gate.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex'),names=['contact-controlled-session.json','contact-controlled-next-permit.json','contact-controlled-deployment.json'];
const live=pid=>{if(!Number.isInteger(pid)||pid<=0)return true;try{process.kill(pid,0);return true;}catch(e){return e.code!=='ESRCH';}};
/** Explicit close/resume only. A failed operation holds the shared device gate. No dial API. */
export async function closeControlledSession({directory,operationId,resume=false,host,pause,port,now=Date.now,fault=()=>{},isAlive=live}){
 if(!/^CLOSE-[A-Z0-9-]{4,100}$/.test(operationId??''))return {decision:'DENY',reason:'INVALID_OPERATION'};
 const dir=resolve(directory),archive=join(dir,'contact-session-history',operationId),owner=join(dir,'contact-timer-owner'),path=join(dir,'contact-session-close.db');let db,gate,claimed=false,digest,device;
 try{
  if(!existsSync(dir)||(!resume&&!names.every(n=>existsSync(join(dir,n)))))return {decision:'DENY',reason:'CURRENT_SESSION_REQUIRED'};
  db=new DatabaseSync(path);db.exec("PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS closures(id TEXT PRIMARY KEY,state TEXT NOT NULL,pid INTEGER NOT NULL,active INTEGER NOT NULL,digest TEXT,device TEXT)");
  db.exec('BEGIN IMMEDIATE');try{const row=db.prepare('SELECT * FROM closures WHERE id=?').get(operationId);
   if(row?.state==='CLOSED'){db.exec('COMMIT');gate=new DeviceGate(path);gate.release(gateOwner('SWITCH',path,operationId),row.digest);return {decision:'CLOSED',duplicate:true};}
   if((row&&!resume)||(!row&&resume)||db.prepare("SELECT id FROM closures WHERE id!=? AND state!='CLOSED'").get(operationId)||row?.active&&isAlive(row.pid))throw Error('CLOSURE_BUSY_OR_RESUME_REQUIRED');
   if(existsSync(owner)){const state=JSON.parse(readFileSync(join(owner,'state.json'),'utf8'));if(isAlive(state.pid))throw Error('RUN_OWNER_ACTIVE');}
   if(!existsSync(owner))mkdirSync(owner);
   writeFileSync(join(owner,'state.json'),JSON.stringify({state:'CLOSING',runId:operationId,pid:process.pid,updatedAt:now()}));
   if(row)db.prepare('UPDATE closures SET active=1,pid=? WHERE id=?').run(process.pid,operationId);else db.prepare("INSERT INTO closures VALUES(?,'PREPARING',?,1,NULL,NULL)").run(operationId,process.pid);
   db.exec('COMMIT');claimed=true;
  }catch(e){db.exec('ROLLBACK');throw e;}
  mkdirSync(archive,{recursive:true});
  for(const name of names){const src=join(dir,name),dst=join(archive,name);if(!existsSync(dst))copyFileSync(src,dst,constants.COPYFILE_EXCL);else if(existsSync(src)&&hash(readFileSync(src))!==hash(readFileSync(dst)))throw Error('ACTIVE_FILE_CHANGED');}
  const session=JSON.parse(readFileSync(join(archive,names[0]),'utf8')),nativeBytes=readFileSync(join(archive,names[1]),'utf8'),permit=JSON.parse(nativeBytes);digest=hash(nativeBytes);device=session.permit.deviceKey;
  if(session.permit.source!=='EXPLICIT_CONTROLLED_CALL'||permit.permitId!==session.transportPermit.permitId||permit.accountKey!==session.permit.accountKey||typeof permit.enabled!=='boolean')throw Error('SESSION_BINDING_MISMATCH');
  db.prepare('UPDATE closures SET digest=?,device=? WHERE id=?').run(digest,device,operationId);
  if(await pause(session)!==true)throw Error('PAUSE_FAILED');
  const h=await host(session);if(!h||h.pending!==0||!Number.isSafeInteger(h.used)||h.used<0||!Array.isArray(h.requests)||h.requests.length!==h.used||new Set(h.requests.map(r=>r.request)).size!==h.requests.length||h.requests.some(r=>r.finished!==true||typeof r.request!=='string'||!/^[a-f0-9]{64}$/.test(r.digest)))throw Error('HOST_RECONCILIATION_REQUIRED');
  gate=new DeviceGate(path);if(!['ACQUIRED','HELD'].includes(gate.acquire({owner:gateOwner('SWITCH',path,operationId),device,digest,kind:'SWITCH'})))throw Error('DEVICE_BUSY');
  db.prepare("UPDATE closures SET state='CLOSING' WHERE id=?").run(operationId);
  fault('CLAIMED');if(JSON.stringify(await host(session))!==JSON.stringify(h))throw Error('HOST_CHANGED');
  await port.disable(session);const snapshot=async()=>{const r=await port.collect(session);if(r?.decision!=='COLLECTED')throw Error('DEVICE_PROOF_REQUIRED');const s=r.snapshot,d=s?.device;if(d?.deviceKey!==device||d.accountKey!==permit.accountKey||d.installationKey!==permit.installationKey||d.componentsDisabled!==true||d.inCall!==false||!Number.isSafeInteger(d.observedAt)||now()<d.observedAt||now()-d.observedAt>=10000)throw Error('DEVICE_PROOF_REQUIRED');if(s.ledger?.schemaVersion!==2||!Array.isArray(s.ledger.requests)||s.ledger.requests.some(r=>r.status!=='RECONCILED')||h.requests.some(r=>!s.ledger.requests.some(n=>n.request===r.request&&n.digest===r.digest&&n.status==='RECONCILED')))throw Error('NATIVE_RECONCILIATION_REQUIRED');const n=s.ledger.permits.find(p=>p.id===permit.permitId);if((n?.used??0)!==h.used||n&&n.fingerprint!==digest)throw Error('COUNT_OR_PERMIT_MISMATCH');return s;};
  const disabledBytes=JSON.stringify({...permit,enabled:false}),s=await snapshot();
  if(![digest,hash(disabledBytes)].includes(hash(s.nativeBytes)))throw Error('NATIVE_PERMIT_CHANGED');
  db.prepare("UPDATE closures SET state='CLOSING' WHERE id=?").run(operationId);fault('BEFORE_WRITE');
  if(hash(s.nativeBytes)!==hash(disabledBytes))await port.disablePermit({expectedFingerprint:hash(s.nativeBytes),nextBytes:disabledBytes});
  fault('AFTER_WRITE');const after=await snapshot();if(hash(after.nativeBytes)!==hash(disabledBytes))throw Error('DISABLED_READBACK_REQUIRED');
  if(JSON.stringify(await host(session))!==JSON.stringify(h))throw Error('HOST_CHANGED');
  writeFileSync(join(archive,'closure.json'),JSON.stringify({operationId,state:'DEVICE_DISABLED',used:h.used,disabledSha256:hash(disabledBytes),at:now()}));
  for(const name of names){const src=join(dir,name);if(existsSync(src)){if(hash(readFileSync(src))!==hash(readFileSync(join(archive,name))))throw Error('ACTIVE_FILE_CHANGED');unlinkSync(src);}fault('ARCHIVE_'+name);}
  renameSync(owner,join(archive,existsSync(join(archive,'timer-owner'))?'timer-owner-'+randomUUID():'timer-owner'));fault('OWNER_ARCHIVED');
  db.prepare("UPDATE closures SET state='CLOSED',active=0 WHERE id=?").run(operationId);gate.release(gateOwner('SWITCH',path,operationId),digest);
  return {decision:'CLOSED',operationId,used:h.used,actualPhoneCalls:0,archive};
 }catch(error){const known=['CLOSURE_BUSY_OR_RESUME_REQUIRED','RUN_OWNER_ACTIVE','ACTIVE_FILE_CHANGED','SESSION_BINDING_MISMATCH','DEVICE_BUSY','PAUSE_FAILED','HOST_RECONCILIATION_REQUIRED','DEVICE_PROOF_REQUIRED','NATIVE_RECONCILIATION_REQUIRED','COUNT_OR_PERMIT_MISMATCH','NATIVE_PERMIT_CHANGED','DISABLED_READBACK_REQUIRED','HOST_CHANGED'];return {decision:'REVIEW',operationId,reason:known.includes(error.message)?error.message:'CLOSURE_CHECK_FAILED',automaticRetry:false};}
 finally{if(claimed){db.prepare('UPDATE closures SET active=0 WHERE id=?').run(operationId);}gate?.close();db?.close();}
}
