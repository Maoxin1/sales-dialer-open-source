import {NativeGuardAdapter} from './native-guard-adapter.mjs';
import {createHash,randomBytes} from 'node:crypto';
import {AdbSyntheticTransport} from './adb-synthetic-transport.mjs';
import {leaseProof} from './android-time-lease.mjs';
const pkg='com.mantou.salesdialer.spike',hash=s=>createHash('sha256').update(s).digest('hex');
/** USB debug guard only: no phone number, dial intent or call API. */
export class AdbGuardTransport {
 constructor({transport,expectedApkHash,hostDeviceKey,deviceKey}){
  if(!(transport instanceof AdbSyntheticTransport)||![expectedApkHash,hostDeviceKey,deviceKey].every(v=>/^[a-f0-9]{64}$/.test(v)))throw Error('INVALID_USB_GUARD');
  Object.assign(this,{transport,expectedApkHash,hostDeviceKey,deviceKey});
 }
 static async identity(transport,expectedApkHash,hostDeviceKey){
  const before=await transport.inspect();
  if(before.apkSha256!==expectedApkHash||hash(JSON.stringify(before))!==hostDeviceKey)throw Error('GUARD_HOST_CHANGED');
  const nonce=randomBytes(16).toString('hex');
  await transport.run(['shell','am','start','-W','-n',pkg+'/.DeviceGuardActivity','--es','op','identity','--es','nonce',nonce]);
  const r=JSON.parse(await transport.run(['shell','run-as',pkg,'cat','files/guard-identity.json']));
  if(r.nonce!==nonce||r.source!=='ANDROID_GUARD_IDENTITY'||r.actualPhoneApiCalls!==0||!/^[a-f0-9]{64}$/.test(r.deviceKey)||JSON.stringify(before)!==JSON.stringify(await transport.inspect()))throw Error('GUARD_IDENTITY_INVALID');
  return r.deviceKey;
 }
 async send(c,ttl){
  if(!c||Object.keys(c).sort().join()!==['schemaVersion','mode','requestId','deviceKey','accountKey'].sort().join()||c.schemaVersion!==1||c.mode!=='dry-run'||!/^SYNTHETIC-[A-Z0-9-]{1,120}$/.test(c.requestId)||c.deviceKey!==this.deviceKey||!/^[a-f0-9]{64}$/.test(c.accountKey)||!Number.isSafeInteger(ttl)||ttl<1||ttl>60000)throw Error('INVALID_DRY_GUARD_COMMAND');
  const t=this.transport,start=performance.now(),wall=Date.now();
  const identity=await AdbGuardTransport.identity(t,this.expectedApkHash,this.hostDeviceKey);
  if(identity!==this.deviceKey)throw Error('GUARD_INSTALLATION_CHANGED');
  const remaining=ttl-Math.ceil(performance.now()-start),raw=JSON.stringify(c),digest=hash(raw);
  if(remaining<1||Date.now()<wall)throw Error('GUARD_EXPIRED');
  const leaseStart=performance.now();
  await t.run(['shell','am','start','-W','-n',pkg+'/.SyntheticLeaseActivity','--es','digest',digest,'--ei','ttl',String(remaining)]);
  const lease=JSON.parse(await t.run(['shell','run-as',pkg,'cat','files/lease-reply-'+digest+'.json']));
  const proof=leaseProof({lease,digest,remainingAtRequest:remaining,roundTripMs:performance.now()-leaseStart});
  if(performance.now()-start>=ttl||Date.now()<wall||Date.now()-wall>=ttl)throw Error('GUARD_EXPIRED');
  await t.run(['shell','am','start','-W','-n',pkg+'/.DeviceGuardActivity','--es','command',Buffer.from(raw).toString('base64url'),'--es','leaseToken',proof.nonce,'--es','validUntilElapsed',String(proof.validUntilElapsed)]);
  const r=JSON.parse(await t.run(['shell','run-as',pkg,'cat','files/guard-'+digest+'.json']));
  if(hash(JSON.stringify(await t.inspect()))!==this.hostDeviceKey)throw Error('GUARD_DEVICE_CHANGED');
  return r;
 }
}

export function createAdbGuardFactory(transport,expectedApkHash){
 return {
  identity:mapping=>AdbGuardTransport.identity(transport,expectedApkHash,mapping.deviceKey),
  create:(mapping,deviceKey)=>new NativeGuardAdapter({hostDeviceKey:mapping.deviceKey,accountKey:mapping.accountKey,deviceKey,
   transport:new AdbGuardTransport({transport,expectedApkHash,hostDeviceKey:mapping.deviceKey,deviceKey})})
 };
}
