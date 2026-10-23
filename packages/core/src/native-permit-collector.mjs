import {createHash} from 'node:crypto';
import {mkdtempSync,writeFileSync,unlinkSync,rmdirSync} from 'node:fs';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {AdbSyntheticTransport} from './adb-synthetic-transport.mjs';
const pkg='com.mantou.salesdialer.spike',hash=s=>createHash('sha256').update(s).digest('hex'),hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
function disabled(text){
 const users=('\n'+text).split(/\n\s*User /).filter(x=>/^0:[^\n]*\binstalled=true\b/.test(x));if(users.length!==1)return false;
 const block=users[0].match(/disabledComponents:\s*\n((?:[ \t]+[^\n]+\n?)*)/);if(!block)return false;
 const lines=block[1].split('\n').map(x=>x.trim());
 return ['ControlledCallActivity','ControlledReconcileActivity'].every(c=>lines.includes(pkg+'.'+c));
}
/** Reads permit and call ledger only. PhoneCapabilitiesActivity refreshes its diagnostic
 * file; no permit/ledger mutation, component enabling, call submission or reconciliation.
 * Return snapshot is confidential host memory, never an HTTP response or evidence log. */
export async function collectNativePermitSnapshot({transport:t,expected:e,snapshotDirectory,now=Date.now}){
 let dir,db,file;
 try{
  if(!(t instanceof AdbSyntheticTransport)||!e||!['deviceKey','apkSha256','installationKey','accountKey'].every(k=>hex(e[k])))throw Error('INVALID_BINDING');
  const start=now(),before=await t.inspect();
  if(before.apkSha256!==e.apkSha256||hash(JSON.stringify(before))!==e.deviceKey)throw Error('DEVICE_CHANGED');
  const run=args=>t.run(args),read=path=>run(['shell','run-as',pkg,'cat',path]);
  const components=()=>run(['shell','dumpsys','package',pkg]);
  if(!disabled(await components()))throw Error('COMPONENTS_NOT_DISABLED');
  const identity=await read('shared_prefs/guard_identity.xml');
  const keys=[...identity.matchAll(/<string name="key">([a-f0-9]{64})<\/string>/g)];
  if(keys.length!==1||keys[0][1]!==e.installationKey)throw Error('INSTALLATION_CHANGED');
  const files=async()=>{const names=(await run(['shell','run-as',pkg,'ls','databases'])).trim().split(/\s+/);if(!names.includes('controlled_calls.db')||names.some(x=>/^controlled_calls\.db-(wal|shm)$/.test(x)))throw Error('DATABASE_NOT_QUIESCENT');if(names.includes('controlled_calls.db-journal')){const journal=(await run(['shell','run-as',pkg,'sha256sum','databases/controlled_calls.db-journal'])).trim().split(/\s+/)[0];if(journal!==hash(''))throw Error('DATABASE_NOT_QUIESCENT');}const digest=(await run(['shell','run-as',pkg,'sha256sum','databases/controlled_calls.db'])).trim().split(/\s+/)[0];if(!hex(digest))throw Error('INVALID_DATABASE_HASH');return digest;};
  const original=await files(),nativeBytes=await read('files/controlled-call-permit.json');
  if(Buffer.byteLength(nativeBytes)>8192)throw Error('INVALID_PERMIT');JSON.parse(nativeBytes);
  const encoded=await run(['exec-out','run-as',pkg,'base64','databases/controlled_calls.db']);
  if(encoded.length>1024*1024||!/^[A-Za-z0-9+/=\r\n]+$/.test(encoded))throw Error('INVALID_DATABASE');
  const bytes=Buffer.from(encoded,'base64');if(hash(bytes)!==original)throw Error('DATABASE_CHANGED');
  dir=mkdtempSync(join(snapshotDirectory,'native-read-'));file=join(dir,'snapshot.db');writeFileSync(file,bytes,{flag:'wx'});db=new DatabaseSync(file,{readOnly:true});
  if(db.prepare('PRAGMA user_version').get().user_version!==2||db.prepare('PRAGMA quick_check').get().quick_check!=='ok')throw Error('INVALID_DATABASE');
  const requests=db.prepare('SELECT request,digest,status FROM requests').all(),permits=db.prepare('SELECT id,fingerprint,used FROM permits').all();
  if(requests.some(r=>typeof r.request!=='string'||!hex(r.digest))||new Set(requests.map(r=>r.request)).size!==requests.length)throw Error('INVALID_DATABASE');
  if(requests.some(r=>r.status!=='RECONCILED'))throw Error('NATIVE_RECONCILIATION_REQUIRED');
  if(permits.some(p=>typeof p.id!=='string'||!hex(p.fingerprint)||!Number.isSafeInteger(p.used)||p.used<0)||new Set(permits.map(p=>p.id)).size!==permits.length)throw Error('INVALID_DATABASE');
  const boot=async()=>Number((await run(['shell','settings','get','global','boot_count'])).trim());const bootCount=await boot(),observedAt=now();
  const elapsed=Math.floor(Number((await run(['shell','cat','/proc/uptime'])).trim().split(/\s+/)[0])*1000);
  const phone=await t.readPhoneCapabilities(e.apkSha256),accounts=phone.accounts?.filter(a=>a.key===e.accountKey)??[];
  if(phone.source!=='ANDROID_READ_ONLY'||phone.deviceKey!==e.deviceKey||phone.inCall!==false||phone.accountsStatus!=='KNOWN'||accounts.length!==1||accounts[0].enabled!==true||!['callPhone','readPhoneState','readPhoneNumbers'].every(k=>phone.permissions?.[k]===true))throw Error('DEVICE_BLOCKED');
  if(await files()!==original||await read('files/controlled-call-permit.json')!==nativeBytes)throw Error('SNAPSHOT_CHANGED');
  if(!disabled(await components())||await read('shared_prefs/guard_identity.xml')!==identity||JSON.stringify(await t.inspect())!==JSON.stringify(before)||await boot()!==bootCount)throw Error('DEVICE_CHANGED');
  const end=now();if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||end<start||end-start>=10000||!Number.isSafeInteger(bootCount)||bootCount<0||!Number.isSafeInteger(elapsed)||elapsed<0||!Number.isSafeInteger(phone.observedAt)||phone.observedAt<start||phone.observedAt>end)throw Error('SNAPSHOT_EXPIRED');
  return {source:'ANDROID_USB_READ_ONLY',decision:'COLLECTED',realCallsEnabled:false,requiresAtomicRecheck:true,snapshot:{nativeBytes,ledger:{schemaVersion:2,requests,permits},device:{...e,observedAt,bootCount,elapsed,inCall:false,permissionsGranted:true,accountEnabled:true,componentsDisabled:true}}};
 }catch(error){const known=['INVALID_BINDING','DEVICE_CHANGED','COMPONENTS_NOT_DISABLED','INSTALLATION_CHANGED','DATABASE_NOT_QUIESCENT','INVALID_DATABASE_HASH','INVALID_PERMIT','INVALID_DATABASE','DATABASE_CHANGED','NATIVE_RECONCILIATION_REQUIRED','DEVICE_BLOCKED','SNAPSHOT_CHANGED','SNAPSHOT_EXPIRED'];return {decision:'DENY',reason:known.includes(error.message)?error.message:'COLLECTION_FAILED',realCallsEnabled:false};}
 finally{db?.close();if(file)unlinkSync(file);if(dir)rmdirSync(dir);}
}
