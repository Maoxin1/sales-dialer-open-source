import {readFileSync,writeFileSync,existsSync,mkdirSync,renameSync} from 'node:fs';import {resolve,join} from 'node:path';import {randomUUID,createHash} from 'node:crypto';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {ContactWorkspace} from '../packages/core/src/contact-workspace.mjs';import {AdbControlledCallTransport} from '../packages/core/src/adb-controlled-call-transport.mjs';import {ContactControlledCoordinator} from '../packages/core/src/contact-controlled-coordinator.mjs';import {ContactControlledSchedule} from '../packages/core/src/contact-controlled-schedule.mjs';import {ControlledRun} from '../packages/core/src/controlled-run.mjs';
const local=resolve('.local'),owner=join(local,'contact-timer-owner'),statePath=join(owner,'state.json'),pkg='com.mantou.salesdialer.spike',exec=promisify(execFile),op=process.argv[2]??'status',print=r=>console.log(JSON.stringify(r));
const read=name=>JSON.parse(readFileSync(join(local,name),'utf8')),files=['contact-controlled-session.json','contact-android.json','contact-controlled-next-permit.json','contact-controlled-deployment.json'];
const fingerprint=()=>createHash('sha256').update(JSON.stringify(files.map(f=>readFileSync(join(local,f),'utf8')))).digest('hex');
function state(){if(!existsSync(owner))return {state:'STOPPED',activeOwner:false};try{const s=JSON.parse(readFileSync(statePath,'utf8'));return {state:s.state,runId:s.runId,pid:s.pid,updatedAt:s.updatedAt,activeOwner:'NOT_CHECKED'};}catch{return {state:'REVIEW',reason:'OWNER_METADATA_UNAVAILABLE'};}}
function publish(s){writeFileSync(join(owner,'state.next.json'),JSON.stringify(s),{mode:0o600});renameSync(join(owner,'state.next.json'),statePath);}
let workspace,port,schedule,lifecycle,owned=false,runId,stopRequested=false,interval;
const stop=()=>{stopRequested=true;lifecycle?.stop();};
try{
 if(process.argv.length>3||!['status','stop','start-approved'].includes(op))throw Error('USE_STATUS_STOP_START_APPROVED');
 if(op==='status')print({...state(),realCallsEnabled:false});
 else if(op==='stop'){const s=state();if(s.state==='STOPPED')print(s);else if(!s.runId)throw Error('OWNER_REVIEW_REQUIRED');else{writeFileSync(join(owner,'stop.json'),JSON.stringify({runId:s.runId}),{mode:0o600});print({decision:'STOP_REQUESTED',runId:s.runId,note:'Wait for owner confirmation; not proof of stopped device'});}}
 else{
  if(!existsSync(join(local,files[0])))throw Error('CURRENT_SESSION_REQUIRED');
  const s=read(files[0]),m=read(files[1]),p=s.permit,now=Date.now();if(p?.source!=='EXPLICIT_CONTROLLED_CALL'||now<p.notBefore||now>=p.expiresAt||m.tenantId!=='LOCAL-PERSONAL'||m.salesId!=='LOCAL-SELF')throw Error('CURRENT_SESSION_REQUIRED');
  const original=fingerprint();runId=randomUUID();mkdirSync(owner);owned=true;publish({state:'CHECKING',runId,pid:process.pid,updatedAt:Date.now()});process.on('SIGINT',stop);process.on('SIGTERM',stop);
  // Reuse the existing read-only composition. It checks durable host state and live phone state.
  const preview=await exec(process.execPath,[resolve('tools/deploy-contact-permit.mjs'),'--preview'],{timeout:30000,maxBuffer:16384,windowsHide:true});const proof=JSON.parse(preview.stdout);if(proof.decision!=='PREVIEW'||proof.changeRequired!==false||fingerprint()!==original||stopRequested)throw Error('DEPLOYED_CURRENT_SESSION_REQUIRED');
  const actor={tenantId:m.tenantId,salesId:m.salesId,permissions:['read','plan','trigger','reconcile']};
  workspace=new ContactWorkspace({path:join(local,'workbench.db.contacts.db'),actor,androidPreflight:{mapping:m},controlledPermit:p});
  class EnabledPort extends AdbControlledCallTransport{async submit(c,o){try{await this.run(['shell','run-as',pkg,'pm','enable',pkg+'/.ControlledCallActivity']);return await super.submit(c,o);}finally{await this.run(['shell','run-as',pkg,'pm','disable',pkg+'/.ControlledCallActivity']);}}}
  port=new EnabledPort({adbPath:resolve('.tooling/android-sdk/platform-tools/adb.exe'),serial:m.serial,journalPath:join(local,'contact-controlled-delivery.db'),permit:s.transportPermit,expectedApkHash:m.apkSha256,hostDeviceKey:m.deviceKey});
  const current=()=>{try{if(existsSync(join(owner,'stop.json'))&&JSON.parse(readFileSync(join(owner,'stop.json'),'utf8')).runId===runId)stopRequested=true;return !stopRequested&&Date.now()<p.expiresAt&&fingerprint()===original;}catch{return false;}};
  schedule=new ContactControlledSchedule({coordinators:[new ContactControlledCoordinator({workspace,port})],isCurrent:current});
  lifecycle=new ControlledRun({workspace,schedule,validate:async()=>current(),disable:async()=>{for(const c of ['ControlledCallActivity','ControlledReconcileActivity']){const out=await port.run(['shell','run-as',pkg,'pm','disable',pkg+'/.'+c]);if(!out.includes('new state: disabled'))throw Error('DISABLE_UNCONFIRMED');}},close:()=>{port.close();workspace.close();}});
  const started=await lifecycle.start();print(started);if(started.decision!=='OK')stopRequested=true;
  while(true){if(existsSync(join(owner,'stop.json'))){const request=JSON.parse(readFileSync(join(owner,'stop.json'),'utf8'));if(request.runId===runId)stopRequested=true;}
   const status=schedule.status();if(stopRequested||!current()||!status.running||(!status.pending&&!status.inflight)){lifecycle.stop();const done=await lifecycle.finish();if(done.decision!=='DRAINING'){publish({...done,runId,pid:process.pid,updatedAt:Date.now()});print(done);if(done.state==='CLOSED'){const history=join(local,'contact-timer-history');mkdirSync(history,{recursive:true});renameSync(owner,join(history,runId));owned=false;}else process.exitCode=1;break;}}
   publish({...lifecycle.status(),runId,pid:process.pid,updatedAt:Date.now()});await new Promise(r=>{interval=setTimeout(r,200);});
  }
 }
}catch{if(owned){lifecycle?.stop();publish({state:'REVIEW',runId,pid:process.pid,updatedAt:Date.now()});}print({decision:'DENY',reason:owned?'OWNER_REVIEW_REQUIRED':'CURRENT_SESSION_OR_COMMAND_REQUIRED',automaticRetry:false});process.exitCode=1;}
finally{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);if(interval)clearTimeout(interval);if(lifecycle&&!['CLOSED','NEEDS_RECONCILIATION','REVIEW'].includes(lifecycle.status().state)){try{const done=await lifecycle.finish();if(owned)publish({...done,runId,pid:process.pid,updatedAt:Date.now()});}catch{}}}
