import {readFileSync} from 'node:fs';import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {AdbSyntheticTransport} from '../packages/core/src/adb-synthetic-transport.mjs';
import {contactReadOnlyProvider} from '../packages/core/src/contact-android-config.mjs';
import {prepareContactBinding,saveContactBinding} from '../packages/core/src/contact-binding-setup.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),args=process.argv.slice(2);
if(args.length===1&&args[0]==='--help'){console.log('node tools/prepare-contact-binding.mjs preview TARGET-ID DEVICE-SERIAL\nnode tools/prepare-contact-binding.mjs save TARGET-ID DEVICE-SERIAL PREVIEW-TOKEN\nReads existing own contact and designated 电销卡. No calls. Existing config is never overwritten.');}
else{try{const [mode,targetId,serial,token]=args;if(!['preview','save'].includes(mode)||args.length!==(mode==='preview'?3:4)||!/^TARGET-[A-Za-z0-9-]{1,100}$/.test(targetId)||!serial||(mode==='save'&&!/^[a-f0-9]{64}$/.test(token)))throw Error('INVALID_ARGUMENTS');
 const expectedApkHash=createHash('sha256').update(readFileSync(resolve(root,'prototypes/android/app/build/outputs/apk/debug/app-debug.apk'))).digest('hex');
 const provider=contactReadOnlyProvider(new AdbSyntheticTransport({adbPath:resolve(root,'.tooling/android-sdk/platform-tools/adb.exe'),serial}),expectedApkHash);
 const prepared=await prepareContactBinding({dbPath:resolve(root,'.local/workbench.db.contacts.db'),actor:{tenantId:'LOCAL-PERSONAL',salesId:'LOCAL-SELF'},targetId,provider,serial,expectedApkHash});
 console.log(JSON.stringify(mode==='preview'?prepared.preview:saveContactBinding({root,prepared,expectedToken:token})));
 }catch(e){const allowed=['INVALID_ARGUMENTS','TARGET_NOT_ELIGIBLE','TARGET_CHANGED','DEVICE_MISMATCH','DEVICE_CHANGED','CARD_NOT_READY_OR_AMBIGUOUS','OBSERVATION_EXPIRED','PREVIEW_CHANGED','CONFIG_PATH_INVALID','CONFIG_ALREADY_EXISTS','CONFIG_WRITE_FAILED'];console.log(JSON.stringify({saved:false,reason:allowed.includes(e.message)?e.message:'DEVICE_CHECK_FAILED',realCallsEnabled:false}));process.exitCode=1;}}
