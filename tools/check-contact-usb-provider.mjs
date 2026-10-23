import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {AdbSyntheticTransport} from '../packages/core/src/adb-synthetic-transport.mjs';
import {contactReadOnlyProvider} from '../packages/core/src/contact-android-config.mjs';
import {PhoneCapabilities} from '../packages/core/src/phone-capabilities.mjs';
const root=process.cwd(),dest=process.env.DIALER_EVIDENCE_DIR;
if(!dest||!process.argv[2])throw Error('EVIDENCE_AND_EXPLICIT_SERIAL_REQUIRED');
mkdirSync(dest,{recursive:true});
const expected=createHash('sha256').update(readFileSync(resolve(root,'prototypes/android/app/build/outputs/apk/debug/app-debug.apk'))).digest('hex');
const transport=new AdbSyntheticTransport({adbPath:resolve(root,'.tooling/android-sdk/platform-tools/adb.exe'),serial:process.argv[2]});
const provider=contactReadOnlyProvider(transport,expected);
let report;
try{const identity=await provider.inspect();if(identity.apkSha256!==expected)throw Error('PHONE_APK_MISMATCH');const phone=new PhoneCapabilities({read:()=>provider.readPhone(expected)});await phone.refresh();const snapshot=phone.status().snapshot;const candidates=snapshot.accounts.filter(a=>a.label==='电销卡'&&a.enabled);let selection='NOT_SELECTED';if(candidates.length===1)selection=phone.select(candidates[0].key).decision;
 const after=await provider.inspect();if(JSON.stringify(identity)!==JSON.stringify(after))throw Error('DEVICE_CHANGED');
 // Observation only: deliberately lacks targetId and is NOT the startup config.
 mkdirSync(resolve(root,'.local'),{recursive:true});writeFileSync(resolve(root,'.local/contact-android-observation.json'),JSON.stringify({identity,snapshot,selectedAccountKey:selection==='OK'?candidates[0].key:null},null,2));
 report={passed:true,checkedAt:new Date().toISOString(),source:'ACTUAL_USB_READ_ONLY',sdk:identity.sdk,model:identity.model,apkMatches:true,permissions:snapshot.permissions,accountsStatus:snapshot.accountsStatus,accountCount:snapshot.accounts.length,designatedCardMatches:candidates.length,selection,inCall:snapshot.inCall,prerequisites:phone.status().prerequisites,observationExpired:Date.now()-snapshot.observedAt>=10000,actualPhoneCalls:0,realCallsEnabled:false,scope:'Provider only; no contact-plan E2E, no runtime target mapping created'};
}catch(e){report={passed:false,reason:['PHONE_APK_MISMATCH','DEVICE_CHANGED','ADB_TRANSPORT_FAILED','PHONE_READ_EXPIRED'].includes(e.message)?e.message:'PHONE_PROVIDER_CHECK_FAILED',actualPhoneCalls:0,realCallsEnabled:false};process.exitCode=1;}
writeFileSync(join(dest,'usb-provider.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
