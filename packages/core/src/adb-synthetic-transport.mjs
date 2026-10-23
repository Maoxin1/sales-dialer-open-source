import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes,createHash } from 'node:crypto';
import { commandDigest,validateAndroidCommand } from './android-sandbox-adapter.mjs';
import { leaseProof } from './android-time-lease.mjs';
const exec=promisify(execFile),pkg='com.mantou.salesdialer.spike';
/** Explicit USB development device. No TCP exposure, install, dial intent, or real target. */
export class AdbSyntheticTransport {
 constructor({adbPath,serial,record=()=>{},now=()=>Date.now(),monotonic=()=>performance.now()}) {
  if(typeof adbPath!=='string'||typeof serial!=='string'||!/^[A-Za-z0-9_.:-]{1,100}$/.test(serial))throw Error('EXPLICIT_ADB_DEVICE_REQUIRED');
  this.adbPath=adbPath;this.serial=serial;this.record=record;
  this.now=now;this.monotonic=monotonic;
 }
 async run(args) {
  try {const r=await exec(this.adbPath,['-s',this.serial,...args],{timeout:15000,maxBuffer:256*1024,windowsHide:true,encoding:'utf8'});
   this.record({args,exitCode:0,stdout:r.stdout,stderr:r.stderr});return r.stdout;
  }catch(e){this.record({args,exitCode:e.code??null,stdout:e.stdout??'',stderr:e.stderr??'',error:'ADB_TRANSPORT_FAILED'});throw Error('ADB_TRANSPORT_FAILED');}
 }
 async send(command) {
  const c=validateAndroidCommand(command,this.now()),raw=JSON.stringify(c),hash=commandDigest(c);
  const state=(await this.run(['get-state'])).trim();if(state!=='device')throw Error('ADB_DEVICE_NOT_READY');
  const proof=await this.prepareLease(c);
  validateAndroidCommand(c,this.now());
  const launched=await this.run(['shell','am','start','-W','-n',pkg+'/.SyntheticBridgeActivity','--es','command',Buffer.from(raw).toString('base64url'),'--es','leaseToken',proof.nonce,'--es','validUntilElapsed',String(proof.validUntilElapsed)]);
  if(!launched.includes('Status: ok'))throw Error('ANDROID_INBOX_NOT_STARTED');
  const result=await this.run(['shell','run-as',pkg,'cat','files/bridge-'+hash+'.json']);
  return JSON.parse(result);
 }
 async prepareLease(c){
  validateAndroidCommand(c,this.now());const hash=commandDigest(c),remainingAtRequest=c.expiresAt-this.now(),start=this.monotonic();
  const result=await this.run(['shell','am','start','-W','-n',pkg+'/.SyntheticLeaseActivity','--es','digest',hash,'--ei','ttl',String(remainingAtRequest)]);
  if(!result.includes('Status: ok'))throw Error('TIME_LEASE_NOT_STARTED');
  const lease=JSON.parse(await this.run(['shell','run-as',pkg,'cat','files/lease-reply-'+hash+'.json']));
  return leaseProof({lease,digest:hash,remainingAtRequest,roundTripMs:this.monotonic()-start});
 }
 async inspect() {
  if((await this.run(['get-state'])).trim()!=='device')throw Error('ADB_DEVICE_NOT_READY');
  const path=(await this.run(['shell','pm','path',pkg])).trim().replace(/^package:/,'');
  if(!/^\/data\/app\/[A-Za-z0-9_~=/+.-]+\/base\.apk$/.test(path))throw Error('UNEXPECTED_APK_PATH');
  const apkSha256=(await this.run(['shell','sha256sum',path])).trim().split(/\s+/)[0];
  const sdk=Number((await this.run(['shell','getprop','ro.build.version.sdk'])).trim());
  const model=(await this.run(['shell','getprop','ro.product.model'])).trim();
  const bootId=(await this.run(['shell','cat','/proc/sys/kernel/random/boot_id'])).trim();
  return {serial:this.serial,apkSha256,sdk,model,bootId};
 }
 async readPhoneCapabilities(expectedApkHash){
  const before=await this.inspect();if(before.apkSha256!==expectedApkHash)throw Error('PHONE_APK_MISMATCH');
  const nonce=randomBytes(16).toString('hex');
  const startedAt=Date.now();
  const result=await this.run(['shell','am','start','-W','-n',pkg+'/.PhoneCapabilitiesActivity','--es','nonce',nonce]);
  if(!result.includes('Status: ok'))throw Error('PHONE_PROBE_NOT_STARTED');
  const r=JSON.parse(await this.run(['shell','run-as',pkg,'cat','files/phone-capabilities.json']));
  if(r.nonce!==nonce)throw Error('PHONE_SNAPSHOT_NONCE_MISMATCH');
  const after=await this.inspect();if(JSON.stringify(before)!==JSON.stringify(after))throw Error('PHONE_DEVICE_CHANGED');
  if(Date.now()<startedAt||Date.now()-startedAt>10000)throw Error('PHONE_READ_EXPIRED');
  delete r.nonce;r.deviceObservedAt=r.observedAt;r.observedAt=startedAt;
  r.deviceKey=createHash('sha256').update(JSON.stringify(before)).digest('hex');return r;
 }
}
