import {readFileSync,realpathSync,statSync,lstatSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {AdbSyntheticTransport} from './adb-synthetic-transport.mjs';
const fields=['tenantId','salesId','targetId','serial','apkSha256','bootId','sdk','deviceKey','accountKey'];
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export function loadContactAndroidConfig({root,actor,serial,expectedApkHash}){
 const path=resolve(root,'.local/contact-android.json');
 try{lstatSync(path);}catch(e){if(e.code==='ENOENT')return null;throw Error('CONTACT_ANDROID_CONFIG_INVALID');}
 try{const local=realpathSync(resolve(root,'.local')),file=realpathSync(path),base=realpathSync(root);for(const [parent,child] of [[base,local],[local,file]]){const rel=relative(parent,child);if(!rel||rel.startsWith('..')||isAbsolute(rel))throw Error('PATH');}
 const stat=statSync(file);if(!stat.isFile()||stat.size>8192)throw Error('SIZE');const m=JSON.parse(readFileSync(file,'utf8').replace(/^\uFEFF/,''));
 if(!m||Array.isArray(m)||Object.keys(m).sort().join()!==fields.slice().sort().join()||m.tenantId!==actor.tenantId||m.salesId!==actor.salesId||m.serial!==serial||m.apkSha256!==expectedApkHash||![m.apkSha256,m.deviceKey,m.accountKey].every(hash)||!/^TARGET-[A-Za-z0-9-]{1,100}$/.test(m.targetId)||typeof m.serial!=='string'||!/^[A-Za-z0-9_.:-]{1,100}$/.test(m.serial)||typeof m.bootId!=='string'||!m.bootId||m.bootId.length>100||!Number.isInteger(m.sdk)||m.sdk<31||m.sdk>100)throw Error('FIELDS');return structuredClone(m);
 }catch{throw Error('CONTACT_ANDROID_CONFIG_INVALID');}
}
export function contactReadOnlyProvider(transport,expectedApkHash){
 if(!(transport instanceof AdbSyntheticTransport)||!hash(expectedApkHash))throw Error('CONTACT_ANDROID_PROVIDER_INVALID');
 return Object.freeze({inspect:()=>transport.inspect(),readPhone:async hash=>{if(hash!==expectedApkHash)throw Error('CONTACT_ANDROID_APK_MISMATCH');return transport.readPhoneCapabilities(expectedApkHash);}});
}
