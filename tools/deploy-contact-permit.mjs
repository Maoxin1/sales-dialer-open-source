import {readFileSync,existsSync} from 'node:fs';import {resolve} from 'node:path';import {DatabaseSync} from 'node:sqlite';
import {runControlledPermitDeployment} from '../packages/core/src/controlled-permit-deployment.mjs';import {AdbPermitDeployment} from '../packages/core/src/adb-permit-deployment.mjs';import {AdbSyntheticTransport} from '../packages/core/src/adb-synthetic-transport.mjs';import {collectNativePermitSnapshot} from '../packages/core/src/native-permit-collector.mjs';
const local=resolve('.local'),journalPath=resolve(local,'contact-permit-switch.db'),read=name=>JSON.parse(readFileSync(resolve(local,name),'utf8'));
const args=process.argv.slice(2);let mode='preview',operationId;
if(args.length&&args[0]==='--deploy'&&args.length===2&&/^SWITCH-[A-Z0-9-]{4,100}$/.test(args[1])){mode='deploy';operationId=args[1];}else if(args.length&&!(args.length===1&&args[0]==='--preview')){console.log(JSON.stringify({decision:'DENY',reason:'USAGE_PREVIEW_OR_DEPLOY_OPERATION_ID',realCallsEnabled:false}));process.exit(1);}
let mapping;
const load=()=>{
 if(!existsSync(resolve(local,'contact-controlled-session.json')))throw Error('CURRENT_SESSION_REQUIRED');
 const session=read('contact-controlled-session.json'),p=session.permit;mapping=read('contact-android.json');let db;
 try{db=new DatabaseSync(resolve(local,'workbench.db.contacts.db'),{readOnly:true});const row=db.prepare('SELECT config,used FROM contact_controlled_permits WHERE id=?').get(p.permitId),c=db.prepare('SELECT number,qualification,refused FROM contacts WHERE id=? AND tenant=? AND seller=?').get(p.targetId,p.tenantId,p.salesId);
 return {session,mapping,savedPermit:row?Object.fromEntries(JSON.parse(row.config)):null,contact:c,nativeBytes:readFileSync(resolve(local,'contact-controlled-next-permit.json'),'utf8'),grant:mode==='deploy'?read('contact-controlled-deployment.json'):null,host:{used:row?.used,pending:db.prepare("SELECT COUNT(*) AS n FROM contact_controlled_attempts WHERE state!='FINISHED'").get().n+db.prepare("SELECT COUNT(*) AS n FROM local_rehearsals WHERE status!='FINISHED'").get().n,qualified:c?.qualification==='CONFIRMED',refused:c?.refused!==0,paused:db.prepare('SELECT paused FROM local_plan_control WHERE tenant=? AND seller=?').get(p.tenantId,p.salesId)?.paused!==0}};
 }finally{db?.close();}
};
const result=await runControlledPermitDeployment({load,mode,journalPath,operationId,createPort:({binding,grant})=>{const options={adbPath:resolve('.tooling/android-sdk/platform-tools/adb.exe'),serial:mapping.serial};if(mode==='deploy')return new AdbPermitDeployment({...options,journalPath,expected:binding,grant});const transport=new AdbSyntheticTransport(options);return {collect:()=>collectNativePermitSnapshot({transport,expected:binding,snapshotDirectory:local})};}});
console.log(JSON.stringify(result,null,2));if(!['PREVIEW','VERIFIED'].includes(result.decision))process.exitCode=1;
