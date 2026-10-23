import {readFileSync,existsSync} from 'node:fs';import {resolve} from 'node:path';import {DatabaseSync} from 'node:sqlite';
import {previewNativePermitDeployment} from '../packages/core/src/native-permit-preview.mjs';import {collectNativePermitSnapshot} from '../packages/core/src/native-permit-collector.mjs';import {AdbSyntheticTransport} from '../packages/core/src/adb-synthetic-transport.mjs';import {fixture} from '../packages/core/test-support/native-permit-fixture.mjs';import {contactWireId} from '../packages/core/src/contact-wire-id.mjs';
let db;
try{let result;const mode=process.argv.slice(2).join();
 if(mode==='--simulate'){const x=fixture();result=await previewNativePermitDeployment({candidate:{nativeBytes:x.nativeBytes,expected:x.expected,deadline:x.deadline},host:()=>x.host,now:()=>x.now,collect:async()=>({decision:'COLLECTED',snapshot:{nativeBytes:'{"enabled":false}',device:x.device,ledger:x.ledger}})});}
 else if(mode==='--preview'){
  const local=resolve('.local');if(!existsSync(resolve(local,'contact-controlled-session.json')))throw Error('CURRENT_SESSION_REQUIRED');
  if(!existsSync(resolve(local,'contact-controlled-next-permit.json')))throw Error('CURRENT_CANDIDATE_REQUIRED');
  const session=JSON.parse(readFileSync(resolve(local,'contact-controlled-session.json'),'utf8')),m=JSON.parse(readFileSync(resolve(local,'contact-android.json'),'utf8')),p=session.permit,t=session.transportPermit;
  if(p.source!=='EXPLICIT_CONTROLLED_CALL'||['tenantId','salesId','targetId','deviceKey','accountKey'].some(k=>p[k]!==m[k])||['tenantId','salesId','permitId'].some(k=>t[k]!==contactWireId({tenantId:'TENANT',salesId:'SALES',permitId:'PERMIT'}[k],p[k]))||t.targetKey!==contactWireId('TARGET',p.targetId)||t.accountKey!==p.accountKey||t.notBefore!==p.notBefore||t.expiresAt!==p.expiresAt||t.approvalRef!==p.consentRef)throw Error('SESSION_BINDING_MISMATCH');
  db=new DatabaseSync(resolve(local,'workbench.db.contacts.db'),{readOnly:true});
  const contact=()=>db.prepare('SELECT number,qualification,refused FROM contacts WHERE id=? AND tenant=? AND seller=?').get(p.targetId,p.tenantId,p.salesId);
  const record=db.prepare('SELECT config FROM contact_controlled_permits WHERE id=?').get(p.permitId);if(!record||JSON.stringify(Object.fromEntries(JSON.parse(record.config)))!==JSON.stringify(p)){
   const saved=record?Object.fromEntries(JSON.parse(record.config)):null;if(!saved||Object.keys(saved).length!==Object.keys(p).length||Object.keys(p).some(k=>p[k]!==saved[k]))throw Error('HOST_PERMIT_MISMATCH');
  }
  const raw=readFileSync(resolve(local,'contact-controlled-next-permit.json'),'utf8'),n=JSON.parse(raw),binding={deviceKey:m.deviceKey,apkSha256:m.apkSha256,accountKey:m.accountKey,installationKey:t.installationKey};
  const expected={schemaVersion:1,...t,enabled:true,targetNumber:contact()?.number,maxAttempts:p.maxAttempts,bootCount:n.bootCount,issuedElapsed:n.issuedElapsed,expiresElapsed:n.expiresElapsed,...binding};
  const transport=new AdbSyntheticTransport({adbPath:resolve('.tooling/android-sdk/platform-tools/adb.exe'),serial:m.serial});
  result=await previewNativePermitDeployment({candidate:{nativeBytes:raw,expected,deadline:Date.now()+30000},host:()=>{const c=contact();return {used:db.prepare('SELECT used FROM contact_controlled_permits WHERE id=?').get(p.permitId)?.used,pending:db.prepare("SELECT COUNT(*) AS n FROM contact_controlled_attempts WHERE state!='FINISHED'").get().n+db.prepare("SELECT COUNT(*) AS n FROM local_rehearsals WHERE status!='FINISHED'").get().n,qualified:c?.qualification==='CONFIRMED',refused:c?.refused!==0,paused:db.prepare('SELECT paused FROM local_plan_control WHERE tenant=? AND seller=?').get(p.tenantId,p.salesId)?.paused!==0};},collect:()=>collectNativePermitSnapshot({transport,expected:binding,snapshotDirectory:local})});
 }else throw Error('PREVIEW_MODE_REQUIRED');
 console.log(JSON.stringify(result,null,2));if(result.decision!=='PREVIEW')process.exitCode=1;
}catch(e){console.log(JSON.stringify({decision:'DENY',reason:['CURRENT_SESSION_REQUIRED','CURRENT_CANDIDATE_REQUIRED','SESSION_BINDING_MISMATCH','HOST_PERMIT_MISMATCH','PREVIEW_MODE_REQUIRED'].includes(e.message)?e.message:'PREVIEW_INPUT_UNAVAILABLE',canApply:false,realCallsEnabled:false}));process.exitCode=1;}finally{db?.close();}
