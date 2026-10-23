import {DeviceGate,gateOwner} from './device-gate.mjs';
import {AdbSyntheticTransport} from './adb-synthetic-transport.mjs';
import {AdbGuardTransport} from './adb-guard-transport.mjs';
import {encodeNativeCallCommand,readNativeCallReceipt} from './native-call-protocol.mjs';
import {leaseProof} from './android-time-lease.mjs';
import {resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createHash,randomBytes} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile),pkg='com.mantou.salesdialer.spike';
const hash=s=>createHash('sha256').update(s).digest('hex');
const key=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const scope=['permitId','tenantId','salesId','targetKey','installationKey','accountKey'];
/** Developer USB transport only. No HTTP wiring, component enabling, permit provisioning,
 * implicit conversion from TEST_FIXTURE, quota grant or automatic retry. Host business
 * claim must already exist; this journal is an additional delivery barrier, not a counter. */
export class AdbControlledCallTransport extends AdbSyntheticTransport {
 #inflight=0; #gate; #permit; #db; #apk; #host; #audit; #journalPath;
 constructor({adbPath,serial,journalPath,permit,expectedApkHash,hostDeviceKey,record=()=>{}}){
  super({adbPath,serial});
  const fields=['mode','approvalRef','token','notBefore','expiresAt',...scope];
  if(!permit||Object.keys(permit).sort().join()!==fields.sort().join()||permit.mode!=='LOCAL_CONTROLLED_CALL'
   ||typeof permit.approvalRef!=='string'||!/^CONTROLLED-[A-Z0-9-]{1,100}$/.test(permit.approvalRef)
   ||![permit.token,permit.installationKey,permit.accountKey,expectedApkHash,hostDeviceKey].every(key)
   ||!scope.slice(0,4).every(k=>typeof permit[k]==='string'&&/^[A-Z][A-Z0-9-]{1,120}$/.test(permit[k]))
   ||![permit.notBefore,permit.expiresAt].every(Number.isSafeInteger)||permit.notBefore<0||permit.expiresAt<=permit.notBefore
   ||typeof journalPath!=='string'||journalPath===':memory:')throw Error('EXPLICIT_LOCAL_PERMIT_REQUIRED');
  this.#journalPath=resolve(journalPath);this.#permit=Object.freeze({...permit});this.#apk=expectedApkHash;this.#host=hostDeviceKey;this.#audit=record;
  this.#db=new DatabaseSync(this.#journalPath);this.#db.exec('PRAGMA synchronous=FULL; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS delivery(attempt TEXT PRIMARY KEY,digest TEXT NOT NULL)');
  const columns=this.#db.prepare('PRAGMA table_info(delivery)').all().map(r=>r.name);if(!columns.includes('device'))this.#db.exec('ALTER TABLE delivery ADD COLUMN device TEXT');if(!columns.includes('reconciled'))this.#db.exec('ALTER TABLE delivery ADD COLUMN reconciled INTEGER NOT NULL DEFAULT 0');
  this.#gate=new DeviceGate(this.#journalPath);
 }
 binding(){const {token,...permit}=this.#permit;return Object.freeze({...permit,tokenHash:hash(token),deviceKey:this.#host,expectedApkHash:this.#apk,journalPath:this.#journalPath});}
 async readControlledDevice(){
  await this.#identity();const snapshot=await this.readPhoneCapabilities(this.#apk);
  const accounts=snapshot.accounts?.filter(a=>a.key===this.#permit.accountKey)??[];
  if(snapshot.source!=='ANDROID_READ_ONLY'||snapshot.deviceKey!==this.#host)throw Error('DEVICE_OBSERVATION_INVALID');
  return {deviceKey:this.#host,installationKey:this.#permit.installationKey,accountKey:this.#permit.accountKey,observedAt:snapshot.observedAt,inCall:snapshot.inCall,
   permissionsGranted:['callPhone','readPhoneState','readPhoneNumbers'].every(k=>snapshot.permissions?.[k]===true),accountEnabled:snapshot.accountsStatus==='KNOWN'&&accounts.length===1&&accounts[0].enabled===true};
 }
 close(){if(this.#inflight)throw Error('IN_FLIGHT');this.#gate.close();this.#db.close();}
 // Do not use the parent logger: am output may echo permit/lease extras even on failure.
 async run(args){
  try{const r=await exec(this.adbPath,['-s',this.serial,...args],{timeout:15000,maxBuffer:256*1024,windowsHide:true,encoding:'utf8'});
   try{this.#audit({operation:'CONTROLLED_USB',exitCode:0});}catch{}return r.stdout;
  }catch{try{this.#audit({operation:'CONTROLLED_USB',exitCode:null,error:'USB_FAILED'});}catch{}throw Error('USB_FAILED');}
 }
 #command(input){const c=encodeNativeCallCommand(input);if(scope.some(k=>c.command[k]!==this.#permit[k]))throw Error('PERMIT_SCOPE_MISMATCH');return c;}
 async #identity(){if(await AdbGuardTransport.identity(this,this.#apk,this.#host)!==this.#permit.installationKey)throw Error('INSTALLATION_CHANGED');}
 #claimed(c){return this.#db.prepare('SELECT digest FROM delivery WHERE attempt=?').get(c.command.attemptId)?.digest===c.digest;}
 async submit(input,{deadline=this.#permit.expiresAt}={}){
  const c=this.#command(input),unknown=()=>readNativeCallReceipt(c.command,null),start=performance.now(),wall=Date.now();
  if(!Number.isSafeInteger(deadline)||deadline<wall)throw Error('SCHEDULE_EXPIRED');
  if(wall<this.#permit.notBefore||wall>=this.#permit.expiresAt)throw Error('PERMIT_EXPIRED');
  const held=this.#gate.acquire({owner:gateOwner('CALL',this.#journalPath,c.command.attemptId),device:this.#host,digest:c.digest,kind:'CALL'});if(held!=='ACQUIRED')return unknown();
  this.#inflight++;try{
  // Commit UNKNOWN before any device operation. A duplicate, failed or interrupted send is never retried.
  const inserted=this.#db.prepare('INSERT OR IGNORE INTO delivery(attempt,digest,device) VALUES(?,?,?)').run(c.command.attemptId,c.digest,this.#host);
  if(inserted.changes!==1)return unknown();
  try{
   await this.#identity();const ttl=Math.min(60000,Math.min(deadline,this.#permit.expiresAt)-Date.now())-Math.ceil(performance.now()-start);
   if(ttl<1||Date.now()<wall)throw Error('EXPIRED');
   const leaseStart=performance.now();
   await this.run(['shell','am','start','-W','-n',pkg+'/.SyntheticLeaseActivity','--es','digest',c.digest,'--ei','ttl',String(ttl)]);
   const lease=JSON.parse(await this.run(['shell','run-as',pkg,'cat','files/lease-reply-'+c.digest+'.json']));
   const proof=leaseProof({lease,digest:c.digest,remainingAtRequest:ttl,roundTripMs:performance.now()-leaseStart});
   if(Date.now()<wall||Date.now()>=Math.min(deadline,this.#permit.expiresAt)||performance.now()-leaseStart>=ttl)throw Error('EXPIRED');
   await this.run(['shell','am','start','-W','-n',pkg+'/.ControlledCallActivity','--es','command',c.encoded,'--es','permitToken',this.#permit.token,'--es','leaseToken',proof.nonce,'--es','validUntilElapsed',String(proof.validUntilElapsed)]);
   return await this.readReceipt(c.command);
  }catch{return unknown();}
  }finally{if(held==='ACQUIRED')this.#gate.end(gateOwner('CALL',this.#journalPath,c.command.attemptId));this.#inflight--;}
 }
 async readReceipt(input){
  const c=this.#command(input);if(!this.#claimed(c))throw Error('NO_MATCHING_DELIVERY');
  try{await this.#identity();const raw=await this.run(['shell','run-as',pkg,'cat','files/controlled-call-'+c.digest+'.json']);
   if(hash(JSON.stringify(await this.inspect()))!==this.#host)throw Error('DEVICE_CHANGED');return readNativeCallReceipt(c.command,raw);
  }catch{return readNativeCallReceipt(c.command,null);}
 }
 async reconcile(input,{noActiveCall}={}){
  const c=this.#command(input);if(noActiveCall!==true||!this.#claimed(c))throw Error('EXPLICIT_MATCHED_RECONCILIATION_REQUIRED');
  if(!this.#gate.beginReconcile(gateOwner('CALL',this.#journalPath,c.command.attemptId)))return {nativeReconciled:false,hostReconciled:false};
  this.#inflight++;const nonce=randomBytes(16).toString('hex');
  try{await this.#identity();await this.run(['shell','am','start','-W','-n',pkg+'/.ControlledReconcileActivity','--es','command',c.encoded,'--es','permitToken',this.#permit.token,'--es','nonce',nonce,'--ez','noActiveCall','true']);
   const r=JSON.parse(await this.run(['shell','run-as',pkg,'cat','files/controlled-reconcile-'+c.digest+'.json']));
   if(hash(JSON.stringify(await this.inspect()))!==this.#host||Object.keys(r).sort().join()!==['source','nonce','commandDigest','attemptId','ticketId','status'].sort().join()||r.source!=='ANDROID_CONTROLLED_RECONCILE'||r.nonce!==nonce||r.commandDigest!==c.digest||r.attemptId!==c.command.attemptId||r.ticketId!==c.command.ticketId||r.status!=='RECONCILED')throw Error('UNCONFIRMED');
   this.#db.prepare('UPDATE delivery SET reconciled=1 WHERE attempt=? AND digest=?').run(c.command.attemptId,c.digest);
   this.#gate.release(gateOwner('CALL',this.#journalPath,c.command.attemptId),c.digest);
   return {nativeReconciled:true,hostReconciled:false};
  }catch{return {nativeReconciled:false,hostReconciled:false};}finally{this.#gate.end(gateOwner('CALL',this.#journalPath,c.command.attemptId));this.#inflight--;}
 }
}
