import {createHash,randomBytes,randomUUID} from 'node:crypto';import {existsSync,mkdirSync,writeFileSync} from 'node:fs';import {join,resolve} from 'node:path';import {contactWireId} from './contact-wire-id.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function validatePreparationApproval(a,now){if(!a||a.confirmed!==true||a.deploymentApproved!==true||!/^CONTROLLED-[A-Z0-9-]{1,100}$/.test(a.reference)||!Number.isSafeInteger(a.at)||!Number.isSafeInteger(a.expiresAt)||now<a.at||now>=a.expiresAt||a.expiresAt-a.at>900000||!Number.isSafeInteger(a.maxAttempts)||a.maxAttempts<1||!/^1[3-9][0-9]{9}$/.test(a.receiverNumber)||!['deviceKey','accountKey'].every(k=>/^[a-f0-9]{64}$/.test(a[k]))||typeof a.targetId!=='string'||!a.targetId||typeof a.cardLabel!=='string'||!a.cardLabel)throw Error('CURRENT_APPROVAL_REQUIRED');}
/** Local-only preparation. Partial publication retains a durable claim; never retries automatically. */
export function prepareLocalControlledSession({directory,approval:a,mapping:m,contact:c,device:d,register,now=Date.now,fault=()=>{}}){
 const at=now();validatePreparationApproval(a,at);
 if(!m||!c||!d||typeof register!=='function'||['deviceKey','accountKey','targetId'].some(k=>m[k]!==a[k])||c.number!==a.receiverNumber||c.qualification!=='CONFIRMED'||c.refused!==0||!['deviceKey','apkSha256','accountKey'].every(k=>d[k]===m[k])||!/^([a-f0-9]{64})$/.test(d.installationKey)||d.componentsDisabled!==true||d.inCall!==false||d.permissionsGranted!==true||d.accountEnabled!==true||!Number.isSafeInteger(d.observedAt)||at<d.observedAt||at-d.observedAt>=10000||!Number.isSafeInteger(d.bootCount)||d.bootCount<0||!Number.isSafeInteger(d.elapsed)||d.elapsed<0)throw Error('PREPARATION_SCOPE_BLOCKED');
 const dir=resolve(directory),files=['contact-controlled-next-permit.json','contact-controlled-deployment.json','contact-controlled-session.json'];
 if(files.some(f=>existsSync(join(dir,f))))throw Error('PREPARATION_FILES_EXIST');
 // Persistent one-use reference protects even after an active session is archived.
 const claim=join(dir,'session-preparation-'+hash(a.reference));mkdirSync(claim);fault('CLAIMED');
 const expiresAt=Math.min(a.expiresAt,at+840000),permitId='SESSION-'+randomUUID();
 const permit={permitId,tenantId:m.tenantId,salesId:m.salesId,targetId:m.targetId,deviceKey:m.deviceKey,accountKey:m.accountKey,notBefore:at,expiresAt,maxAttempts:a.maxAttempts,source:'EXPLICIT_CONTROLLED_CALL',consentRef:a.reference};
 const transportPermit={mode:'LOCAL_CONTROLLED_CALL',approvalRef:a.reference,token:randomBytes(32).toString('hex'),notBefore:at,expiresAt,permitId:contactWireId('PERMIT',permitId),tenantId:contactWireId('TENANT',m.tenantId),salesId:contactWireId('SALES',m.salesId),targetKey:contactWireId('TARGET',m.targetId),installationKey:d.installationKey,accountKey:m.accountKey};
 const nativeBytes=JSON.stringify({schemaVersion:1,...transportPermit,enabled:true,targetNumber:c.number,maxAttempts:a.maxAttempts,bootCount:d.bootCount,issuedElapsed:d.elapsed,expiresElapsed:d.elapsed+(expiresAt-at)}),session={permit,transportPermit};
 const grant={mode:'EXPLICIT_CONTROLLED_DEPLOYMENT',reference:a.reference,candidateSha256:hash(nativeBytes),deviceKey:m.deviceKey,targetId:m.targetId,maxAttempts:a.maxAttempts,notBefore:at,expiresAt};
 writeFileSync(join(claim,'intent.json'),JSON.stringify({session,grant,nativeBytes}),{flag:'wx',mode:0o600});fault('INTENT');
 validatePreparationApproval(a,now());register(permit);fault('REGISTERED');
 writeFileSync(join(dir,files[0]),nativeBytes,{flag:'wx',mode:0o600});fault('CANDIDATE');
 writeFileSync(join(dir,files[1]),JSON.stringify(grant),{flag:'wx',mode:0o600});fault('GRANT');
 validatePreparationApproval(a,now());writeFileSync(join(dir,files[2]),JSON.stringify(session),{flag:'wx',mode:0o600});fault('SESSION');
 writeFileSync(join(claim,'complete.json'),JSON.stringify({permitId,candidateSha256:grant.candidateSha256}),{flag:'wx'});
 return {decision:'PREPARED',permitId,candidateSha256:grant.candidateSha256,expiresAt,maxAttempts:a.maxAttempts,nativePermitWrites:0,actualPhoneCalls:0,realCallsEnabled:false};
}
