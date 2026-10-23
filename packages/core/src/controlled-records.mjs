import {encodeNativeCallCommand,readNativeCallReceipt} from './native-call-protocol.mjs';
import {readFileSync} from 'node:fs';
import {resolve,dirname,isAbsolute} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {AdbSyntheticTransport} from './adb-synthetic-transport.mjs';
import {AdbGuardTransport} from './adb-guard-transport.mjs';
const keys=['schema','mode','storePath','actorId','permitId','serial','deviceKey','installationKey','accountKey','expectedApkHash'];
const binding=['deviceKey','installationKey','accountKey','expectedApkHash'];
const exact=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join()===k.slice().sort().join();
const deny=reason=>({decision:'DENY',reason,readOnly:true,realCallsEnabled:false});
const blocked=reason=>({status:()=>deny(reason),execute:async()=>deny(reason),close(){}});
/** No coordinator construction: no registration, recovery writes, grants or delivery journal. */
export function openControlledRecords(configPath,{now=Date.now,inspect,readReceipt}={}){
 let c,db;
 try{c=JSON.parse(readFileSync(configPath,'utf8').replace(/^\uFEFF/,''));}catch{return blocked('CONFIG_UNAVAILABLE');}
 if(!exact(c,keys)||c.schema!==1||c.mode!=='LOCAL_CONTROLLED_READ_ONLY'||!['storePath','actorId','permitId','serial'].every(k=>typeof c[k]==='string'&&c[k].length>0)||!binding.every(k=>typeof c[k]==='string'&&/^[a-f0-9]{64}$/.test(c[k]))||!/^[A-Za-z0-9_.:-]{1,100}$/.test(c.serial))return blocked('CONFIG_INVALID');
 try{db=new DatabaseSync(resolve(dirname(resolve(configPath)),c.storePath),{readOnly:true});db.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=3000;');}catch{db?.close();return blocked('STORE_UNAVAILABLE');}
 const observations=new Map();
 let connection='NOT_CHECKED',checkedAt=null,closed=false;
 function status(){
  if(closed)return deny('STORE_UNAVAILABLE');
  try{const s=JSON.parse(db.prepare('SELECT data FROM simulation_state WHERE id=1').get().data),p=s.localControlledPermits?.[c.permitId],actor=s.actors?.[c.actorId];
   if(s.schema!==1||s.controlledWorkspace?.mode==='RECORDING_DEMO'||p?.mode!=='LOCAL_CONTROLLED_CALL')return deny('STORE_TYPE_MISMATCH');
   if(!actor?.permissions?.includes('read')||p.salesId!==c.actorId||actor.tenantId!==p.tenantId)return deny('FORBIDDEN');
   if(binding.some(k=>p[k]!==c[k]))return deny('BINDING_MISMATCH');
   const rounds=s.trialBudget?.rounds?.filter(r=>r.config.roundId===c.permitId);if(rounds?.length!==1)return deny('LEDGER_MISMATCH');
   const r=rounds[0],b=r.config;
   if(b.source!=='LOCAL_CONTROLLED_CALL'||b.tenantId!==p.tenantId||b.salesId!==p.salesId||b.deviceId!=='SYNTHETIC-DEVICE-'+p.deviceKey.toUpperCase()||b.accountId!=='SYNTHETIC-SIM-'+p.accountKey.toUpperCase()||b.maxAttempts!==p.maxAttempts||b.expiresAt!==p.expiresAt||b.notBefore!==p.notBefore||b.targets.length!==1||b.targets[0]!==p.targetKey||!Number.isSafeInteger(r.used)||r.used<0||r.used>b.maxAttempts)return deny('LEDGER_MISMATCH');
   const time=now();return {decision:'OK',mode:c.mode,readOnly:true,receiptReadAvailable:typeof readReceipt==='function',realCallsEnabled:false,sendAvailable:false,sendReason:'READ_ONLY',permitId:c.permitId,
    connection:connection==='MATCHED'&&(time<checkedAt||time-checkedAt>10000)?'STALE':connection,checkedAt,
    permitState:r.revoked?'REVOKED':time>=p.expiresAt?'EXPIRED':time<p.notBefore?'NOT_STARTED':'WITHIN_WINDOW',
    binding:{device:p.deviceKey.slice(-8),installation:p.installationKey.slice(-8),account:p.accountKey.slice(-8)},used:r.used,limit:b.maxAttempts,remaining:b.maxAttempts-r.used,expiresAt:b.expiresAt,
    attempts:Object.values(s.attempts).filter(a=>a.tenantId===p.tenantId&&a.salesId===c.actorId&&a.localControlledCall?.permitId===c.permitId).map(a=>({attemptId:a.attemptId,taskId:a.taskId,targetKey:a.targetKey,status:a.status,apiSubmission:a.apiSubmission??'UNKNOWN',outgoingConfirmed:null,connectedConfirmed:null,manualResult:a.manualResults?.at(-1)?.result??null,nativeReconciled:a.localControlledCall.nativeReconciled===true,receiptObservation:observations.get(a.attemptId)?.digest===a.localControlledCall.digest?observations.get(a.attemptId).view:null}))};
  }catch{return deny('STORE_INVALID');}
 }
 function saved(attemptId){
  const s=JSON.parse(db.prepare('SELECT data FROM simulation_state WHERE id=1').get().data),a=s.attempts?.[attemptId],p=s.localControlledPermits?.[c.permitId];
  if(!a||a.tenantId!==p.tenantId||a.salesId!==c.actorId||a.localControlledCall?.permitId!==c.permitId)throw Error('FORBIDDEN');
  const e=encodeNativeCallCommand(a.localControlledCall.command),cmd=e.command;
  if(e.digest!==a.localControlledCall.digest||cmd.attemptId!==a.attemptId||cmd.ticketId!==a.trialTicketId||['permitId','tenantId','salesId','targetKey','installationKey','accountKey'].some(k=>cmd[k]!==p[k])||a.targetKey!==p.targetKey||a.trialRoundId!==p.permitId||typeof p.journalPath!=='string'||!isAbsolute(p.journalPath)||a.localControlledCall.journalPath!==p.journalPath)throw Error('RECORD_MISMATCH');
  const journal=new DatabaseSync(p.journalPath,{readOnly:true});try{const row=journal.prepare('SELECT digest FROM delivery WHERE attempt=?').get(a.attemptId);if(row?.digest!==e.digest)throw Error('DELIVERY_UNCONFIRMED');}finally{journal.close();}
  return {command:e.command,digest:e.digest,fingerprint:JSON.stringify([p,a.localControlledCall,a.trialTicketId,a.trialRoundId,a.targetKey]),config:Object.freeze({...c})};
 }
 async function refresh(attemptId){
  let before;try{before=saved(attemptId);}catch{return deny('DELIVERY_UNCONFIRMED');}
  if(typeof readReceipt!=='function')return deny('RECEIPT_READER_UNAVAILABLE');
  let raw=null;try{raw=await readReceipt(before.config,before.command);}catch{}
  const current=status();if(current.decision!=='OK')return current;
  let after;try{after=saved(attemptId);}catch{return deny('DELIVERY_UNCONFIRMED');}
  if(after.fingerprint!==before.fingerprint)return deny('RECORD_CHANGED');
  const parsed=readNativeCallReceipt(before.command,raw),previous=observations.get(attemptId),matched=parsed.nativeStatus!==null,at=now();
  const retained=previous?.digest===before.digest&&previous.view.apiSubmission==='SUBMITTED';
  observations.set(attemptId,{digest:before.digest,view:{apiSubmission:retained||parsed.apiSubmission==='SUBMITTED'?'SUBMITTED':'UNKNOWN',latestRead:matched?'MATCHED':'UNKNOWN',readAt:at,submittedObservedAt:parsed.apiSubmission==='SUBMITTED'?at:retained?previous.view.submittedObservedAt:null,source:'READ_ONLY_NATIVE_RECEIPT',persistent:false}});
  return {decision:'OK',readOnly:true,latestRead:matched?'MATCHED':'UNKNOWN'};
 }
 return {status,async execute(cmd){
  if(!['status','inspect','refresh'].includes(cmd?.op))return deny('READ_ONLY');
  if(!exact(cmd,cmd.op==='refresh'?['op','attemptId']:['op']))return deny('UNSUPPORTED_FIELDS');
  const s=status();if(s.decision!=='OK'||cmd.op==='status')return s;
  if(cmd.op==='refresh')return refresh(cmd.attemptId);
  connection='DEVICE_UNAVAILABLE';checkedAt=null;
  try{const start=now(),d=await inspect?.(Object.freeze({...c})),end=now();connection=d&&binding.every(k=>d[k]===c[k])&&d.serial===c.serial?'MATCHED':'BINDING_MISMATCH';if(!d)connection='DEVICE_UNAVAILABLE';if(end<start||end-start>10000)connection='STALE';checkedAt=start;}catch{connection='DEVICE_UNAVAILABLE';}
  return status();
 },close(){if(!closed){closed=true;db.close();}}};
}
/** Only identity/account observations; never constructs a call transport or opens a send journal. */
export function createControlledRecordInspector(adbPath){return async c=>{
 const t=new AdbSyntheticTransport({adbPath,serial:c.serial});
 const installationKey=await AdbGuardTransport.identity(t,c.expectedApkHash,c.deviceKey);
 const snapshot=await t.readPhoneCapabilities(c.expectedApkHash);
 const account=snapshot.accounts?.filter(a=>a.key===c.accountKey)??[];
 if(snapshot.source!=='ANDROID_READ_ONLY'||snapshot.accountsStatus!=='KNOWN'||account.length!==1)throw Error('ACCOUNT_UNAVAILABLE');
 return {serial:c.serial,deviceKey:snapshot.deviceKey,installationKey,accountKey:account[0].key,expectedApkHash:c.expectedApkHash};
};}

/** Reads only an existing receipt file. No call transport, permit token, lease or reconciliation. */
export function createControlledReceiptReader(adbPath,{transportFactory=options=>new AdbSyntheticTransport(options),identity=AdbGuardTransport.identity}={}){return async(c,command)=>{
 const e=encodeNativeCallCommand(command),t=transportFactory({adbPath,serial:c.serial});
 if(command.installationKey!==c.installationKey||command.accountKey!==c.accountKey||command.permitId!==c.permitId||command.salesId!==c.actorId)throw Error('RECEIPT_SCOPE_MISMATCH');
 if(await identity(t,c.expectedApkHash,c.deviceKey)!==c.installationKey)throw Error('INSTALLATION_CHANGED');
 const raw=await t.run(['shell','run-as','com.mantou.salesdialer.spike','cat','files/controlled-call-'+e.digest+'.json']);
 if(await identity(t,c.expectedApkHash,c.deviceKey)!==c.installationKey)throw Error('INSTALLATION_CHANGED');
 return raw;
};}
