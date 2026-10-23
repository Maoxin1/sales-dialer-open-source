import {readFileSync,realpathSync,statSync} from 'node:fs';import {resolve,relative,isAbsolute} from 'node:path';import {createHash} from 'node:crypto';
import {ContactWorkspace} from '../packages/core/src/contact-workspace.mjs';import {loadContactAndroidConfig} from '../packages/core/src/contact-android-config.mjs';
import {AdbSyntheticTransport} from '../packages/core/src/adb-synthetic-transport.mjs';import {AdbGuardTransport} from '../packages/core/src/adb-guard-transport.mjs';
import {AdbControlledCallTransport} from '../packages/core/src/adb-controlled-call-transport.mjs';import {ContactControlledCoordinator} from '../packages/core/src/contact-controlled-coordinator.mjs';
const root=process.cwd(),[op,...args]=process.argv.slice(2),actor={tenantId:'LOCAL-PERSONAL',salesId:'LOCAL-SELF',permissions:['read','import','qualify','refuse','plan','trigger','reconcile']};let w,port;
try{
 if(!['inspect','send','receipt','reconcile'].includes(op))throw Error('USE_INSPECT_SEND_RECEIPT_RECONCILE');
 const expected=createHash('sha256').update(readFileSync(resolve(root,'prototypes/android/app/build/outputs/apk/debug/app-debug.apk'))).digest('hex');
 const local=realpathSync(resolve(root,'.local'));const readLocal=name=>{const path=realpathSync(resolve(local,name)),r=relative(local,path);if(!r||r.startsWith('..')||isAbsolute(r)||statSync(path).size>8192)throw Error('LOCAL_CONFIG_INVALID');return JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,''));};
 const config=readLocal('contact-android.json'),mapping=loadContactAndroidConfig({root,actor,serial:config.serial,expectedApkHash:expected});if(!mapping)throw Error('BINDING_REQUIRED');
 const adbPath=resolve(root,'.tooling/android-sdk/platform-tools/adb.exe');
 if(op==='inspect'){
  if(args.length)throw Error('INVALID_ARGUMENTS');const t=new AdbSyntheticTransport({adbPath,serial:mapping.serial});await AdbGuardTransport.identity(t,expected,mapping.deviceKey);const phone=await t.readPhoneCapabilities(expected);
  console.log(JSON.stringify({operation:'READ_ONLY_INSPECTION',model:(await t.inspect()).model,installationMatched:true,deviceMatched:phone.deviceKey===mapping.deviceKey,accountMatches:phone.accounts.filter(a=>a.key===mapping.accountKey&&a.enabled).length,inCall:phone.inCall,permissions:phone.permissions,actualPhoneCalls:0}));
 }else{
  // This file must be separately prepared for a newly authorized bounded test. No fallback/default grant.
  let session;try{session=readLocal('contact-controlled-session.json');}catch{throw Error('NEW_CONTROLLED_SESSION_REQUIRED');}
  if(Object.keys(session).sort().join()!=='permit,transportPermit'||session.permit.source!=='EXPLICIT_CONTROLLED_CALL')throw Error('EXPLICIT_SESSION_REQUIRED');
  w=new ContactWorkspace({path:resolve(local,'workbench.db.contacts.db'),actor,androidPreflight:{mapping},controlledPermit:session.permit});
  port=new AdbControlledCallTransport({adbPath,serial:mapping.serial,journalPath:resolve(local,'contact-controlled-delivery.db'),permit:session.transportPermit,expectedApkHash:expected,hostDeviceKey:mapping.deviceKey});
  const c=new ContactControlledCoordinator({workspace:w,port});let result;
  const enabled=async(component,fn)=>{const pkg='com.mantou.salesdialer.spike';try{await port.run(['shell','run-as',pkg,'pm','enable',pkg+'/.'+component]);return await fn();}finally{await port.run(['shell','run-as',pkg,'pm','disable',pkg+'/.'+component]);}};
  if(op==='send'){if(args.length!==3||!/^\d+$/.test(args[1]))throw Error('SEND_REQUIRES_PLAN_VERSION_REQUEST');result=await enabled('ControlledCallActivity',()=>c.submit({planId:args[0],expectedVersion:Number(args[1]),requestId:args[2]}));}
  if(op==='receipt'){if(args.length!==1)throw Error('RECEIPT_REQUIRES_ATTEMPT');result=await c.refresh(args[0]);}
  if(op==='reconcile'){if(args.length!==3||args[2]!=='--confirm-idle')throw Error('RECONCILE_REQUIRES_ATTEMPT_RESULT_CONFIRM_IDLE');result=await enabled('ControlledReconcileActivity',()=>c.reconcile({attemptId:args[0],result:args[1],noActiveCall:true}));}
  console.log(JSON.stringify(result));if(result.decision==='DENY')process.exitCode=1;
 }
}catch(e){const known=['USE_INSPECT_SEND_RECEIPT_RECONCILE','INVALID_ARGUMENTS','LOCAL_CONFIG_INVALID','BINDING_REQUIRED','NEW_CONTROLLED_SESSION_REQUIRED','EXPLICIT_SESSION_REQUIRED','SEND_REQUIRES_PLAN_VERSION_REQUEST','RECEIPT_REQUIRES_ATTEMPT','RECONCILE_REQUIRES_ATTEMPT_RESULT_CONFIRM_IDLE'];console.log(JSON.stringify({decision:'DENY',reason:known.includes(e.message)?e.message:'CONTROLLED_CHECK_FAILED',automaticRetry:false}));process.exitCode=1;}finally{port?.close();w?.close();}
