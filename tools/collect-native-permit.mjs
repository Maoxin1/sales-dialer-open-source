import {readFileSync,mkdirSync} from 'node:fs';import {resolve} from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {createHash} from 'node:crypto';
import {AdbSyntheticTransport} from '../packages/core/src/adb-synthetic-transport.mjs';import {collectNativePermitSnapshot} from '../packages/core/src/native-permit-collector.mjs';
const exec=promisify(execFile),root=process.cwd();
// Never use the parent raw-output recorder for permit or ledger reads.
class PrivateReadTransport extends AdbSyntheticTransport{async run(args){try{return (await exec(this.adbPath,['-s',this.serial,...args],{encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:1024*1024})).stdout;}catch{throw Error('USB_READ_FAILED');}}}
try{
 if(process.argv.slice(2).join()!=='--read-only')throw Error('READ_ONLY_FLAG_REQUIRED');
 const m=JSON.parse(readFileSync(resolve(root,'.local/contact-android.json'),'utf8'));
 const xmlTransport=new PrivateReadTransport({adbPath:resolve(root,'.tooling/android-sdk/platform-tools/adb.exe'),serial:m.serial});
 // Installation identity is read from the prior trusted binding, not adopted from the current device.
 const session=JSON.parse(readFileSync(resolve(root,'.local/contact-controlled-session.closed-20261016.json'),'utf8'));
 const expected={deviceKey:m.deviceKey,apkSha256:m.apkSha256,accountKey:m.accountKey,installationKey:session.transportPermit.installationKey};
 const directory=resolve(root,'.local');mkdirSync(directory,{recursive:true});
 const r=await collectNativePermitSnapshot({transport:xmlTransport,expected,snapshotDirectory:directory});
 if(r.decision!=='COLLECTED'){console.log(JSON.stringify(r));process.exitCode=1;}
 else{const p=JSON.parse(r.snapshot.nativeBytes);console.log(JSON.stringify({decision:r.decision,source:'ANDROID_USB_READ_ONLY',nativePermitEnabled:p.enabled===true,nativePermitSha256:createHash('sha256').update(r.snapshot.nativeBytes).digest('hex'),nativeRequests:r.snapshot.ledger.requests.length,nativePermits:r.snapshot.ledger.permits.length,allNativeReconciled:true,componentsDisabled:true,realCallsEnabled:false,permitWrites:0,actualPhoneCalls:0,limitations:'Snapshot only; no current host authorization or atomic deployment lock'}));}
}catch{console.log(JSON.stringify({decision:'DENY',reason:'LOCAL_BINDING_OR_USB_UNAVAILABLE',realCallsEnabled:false}));process.exitCode=1;}
