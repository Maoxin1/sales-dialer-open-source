import {loadContactAndroidConfig,contactReadOnlyProvider} from './contact-android-config.mjs';
import {ContactWorkspace} from './contact-workspace.mjs';
import {openControlledRecords,createControlledRecordInspector,createControlledReceiptReader} from './controlled-records.mjs';
import {createControlledDemo} from './controlled-workspace.mjs';
import { createAdbGuardFactory } from './adb-guard-transport.mjs';
import { mkdirSync,readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ObservedTrial } from './observed-trial.mjs';
import { TrialWorkspace } from './trial-workspace.mjs';
import { AndroidWorkspace } from './android-workspace.mjs';
import { AndroidDeviceBinding } from './android-device-binding.mjs';
import { AdbSyntheticTransport } from './adb-synthetic-transport.mjs';
import { PhoneCapabilities } from './phone-capabilities.mjs';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SQLiteStore } from './sqlite-store.mjs';
import { createWorkbench } from './workbench-server.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const args=process.argv.slice(2);let controlledConfig,port=8787,db=resolve(root,'.local/workbench.db'),serial;
for(let i=0;i<args.length;i++) {
  if(args[i]==='--port'&&/^\d+$/.test(args[i+1]??''))port=Number(args[++i]);
  else if(args[i]==='--db'&&args[i+1])db=resolve(args[++i]);
  else if(args[i]==='--controlled-config'&&args[i+1])controlledConfig=resolve(args[++i]);
  else if(args[i]==='--android-serial'&&args[i+1])serial=args[++i];
  else throw new Error('Usage: workbench-cli.mjs [--port 0..65535] [--db path] [--android-serial serial] [--controlled-config path]');
}
if(!Number.isInteger(port)||port<0||port>65535)throw new Error('INVALID_PORT');
mkdirSync(dirname(db),{recursive:true});const store=new SQLiteStore(db);
try {
  let android=null,observed=null,contactProvider=null;
  const contactActor={tenantId:'LOCAL-PERSONAL',salesId:'LOCAL-SELF',permissions:['read','import','qualify','refuse','plan','trigger','reconcile']};
  const expectedApkHash=serial?createHash('sha256').update(readFileSync(resolve(root,'prototypes/android/app/build/outputs/apk/debug/app-debug.apk'))).digest('hex'):null;
  // Project binding belongs only to the primary contact store, never a --db sandbox.
  const contactMapping=db===resolve(root,'.local/workbench.db')?loadContactAndroidConfig({root,actor:contactActor,serial,expectedApkHash}):null;
  if(serial){
    const transport=new AdbSyntheticTransport({adbPath:resolve(root,'.tooling/android-sdk/platform-tools/adb.exe'),serial});
    if(contactMapping)contactProvider=contactReadOnlyProvider(transport,expectedApkHash);
    observed=new ObservedTrial({guardFactory:createAdbGuardFactory(transport,expectedApkHash),store:new SQLiteStore(db+'.observed.db'),phone:new PhoneCapabilities({read:()=>transport.readPhoneCapabilities(expectedApkHash)})});
    android=new AndroidWorkspace({store:new SQLiteStore(db+'.android.db'),binding:new AndroidDeviceBinding({transport,expectedApkHash}),phone:new PhoneCapabilities({read:()=>transport.readPhoneCapabilities(expectedApkHash)})});
  }
  const controlled=controlledConfig?openControlledRecords(controlledConfig,{readReceipt:createControlledReceiptReader(resolve(root,'.tooling/android-sdk/platform-tools/adb.exe')),inspect:createControlledRecordInspector(resolve(root,'.tooling/android-sdk/platform-tools/adb.exe'))}):await createControlledDemo({store:new SQLiteStore(db+'.controlled-demo.db'),journalPath:db+'.controlled-delivery.db'});
  const app=await createWorkbench({store,port,android,observed,controlled,contacts:new ContactWorkspace({path:db+'.contacts.db',actor:contactActor,androidPreflight:contactMapping?{mapping:contactMapping,provider:contactProvider}:null}),trial:new TrialWorkspace(new SQLiteStore(db+'.trial.db'))});
  console.log(JSON.stringify({url:app.url,mode:'simulation-only',database:db,profile:'self-service',realPhoneAdapterConnected:false,contactPreflightConfigured:!!contactMapping}));
  console.log('在浏览器打开上述地址。Ctrl+C停止；数据保存在项目本地。没有真实外呼。');
  let closing=false;const stop=async()=>{if(closing)return;closing=true;await app.close();process.exitCode=0;};
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
}catch(error){store.close();console.error(error.message);process.exitCode=1;}
