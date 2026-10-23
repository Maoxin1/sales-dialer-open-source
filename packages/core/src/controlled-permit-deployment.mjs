import {createHash} from 'node:crypto';
import {contactWireId} from './contact-wire-id.mjs';
import {previewNativePermitDeployment} from './native-permit-preview.mjs';
import {NativePermitSwitch} from './native-permit-switch.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
/** Trusted local composition. load must re-read the active session and durable host state. */
function checked(v,now,deploy){
 const {session,mapping:m,savedPermit,contact:c,host:h,nativeBytes,grant:g}=v??{},p=session?.permit,t=session?.transportPermit;
 if(!p||!t||!m||!c||!savedPermit||!h||typeof nativeBytes!=='string')throw Error('CURRENT_SESSION_REQUIRED');
 if(p.source!=='EXPLICIT_CONTROLLED_CALL'||Object.keys(p).length!==Object.keys(savedPermit).length||Object.keys(p).some(k=>p[k]!==savedPermit[k])||['tenantId','salesId','targetId','deviceKey','accountKey'].some(k=>p[k]!==m[k]))throw Error('SESSION_BINDING_MISMATCH');
 if(['tenantId','salesId','permitId'].some(k=>t[k]!==contactWireId({tenantId:'TENANT',salesId:'SALES',permitId:'PERMIT'}[k],p[k]))||t.targetKey!==contactWireId('TARGET',p.targetId)||t.accountKey!==p.accountKey||t.notBefore!==p.notBefore||t.expiresAt!==p.expiresAt||t.approvalRef!==p.consentRef)throw Error('SESSION_BINDING_MISMATCH');
 if(!Number.isSafeInteger(p.notBefore)||!Number.isSafeInteger(p.expiresAt)||now<p.notBefore||now>=p.expiresAt||!Number.isSafeInteger(p.maxAttempts)||p.maxAttempts<1||!Number.isSafeInteger(h.used)||h.used<0||h.used>=p.maxAttempts)throw Error('SESSION_EXPIRED_OR_EXHAUSTED');
 const n=JSON.parse(nativeBytes),binding={deviceKey:m.deviceKey,apkSha256:m.apkSha256,accountKey:m.accountKey,installationKey:t.installationKey};
 const expected={schemaVersion:1,...t,enabled:true,targetNumber:c.number,maxAttempts:p.maxAttempts,bootCount:n.bootCount,issuedElapsed:n.issuedElapsed,expiresElapsed:n.expiresElapsed,...binding};
 if(deploy&&(!g||g.mode!=='EXPLICIT_CONTROLLED_DEPLOYMENT'||g.reference!==p.consentRef||g.candidateSha256!==hash(nativeBytes)||g.deviceKey!==p.deviceKey||g.targetId!==p.targetId||g.maxAttempts!==p.maxAttempts||!Number.isSafeInteger(g.notBefore)||!Number.isSafeInteger(g.expiresAt)||g.notBefore<p.notBefore||g.expiresAt>p.expiresAt||now<g.notBefore||now>=g.expiresAt))throw Error('CURRENT_DEPLOYMENT_GRANT_REQUIRED');
 return {nativeBytes,expected,binding,host:h,grant:g,identity:hash(JSON.stringify({nativeBytes,expected,p,grant:deploy?g:null}))};
}
export async function runControlledPermitDeployment({load,mode='preview',createPort,journalPath,operationId,now=Date.now}){
 let sw;
 try{
  if(!['preview','deploy'].includes(mode)||typeof load!=='function'||typeof createPort!=='function')throw Error('INVALID_MODE');
  const c=checked(await load(),now(),mode==='deploy'),port=createPort({binding:c.binding,grant:c.grant}),deadline=Math.min(now()+30000,c.expected.expiresAt);
  const host=async()=>{const fresh=checked(await load(),now(),mode==='deploy');if(fresh.identity!==c.identity)throw Error('SESSION_CHANGED');return fresh.host;};
  if(mode==='preview')return await previewNativePermitDeployment({candidate:{nativeBytes:c.nativeBytes,expected:c.expected,deadline},collect:()=>port.collect(),host,now});
  sw=new NativePermitSwitch({path:journalPath,port,now});
  return await sw.prepare({operationId,nativeBytes:c.nativeBytes,expected:c.expected,deadline,host});
 }catch(e){return {decision:'DENY',reason:['CURRENT_SESSION_REQUIRED','SESSION_BINDING_MISMATCH','SESSION_EXPIRED_OR_EXHAUSTED','CURRENT_DEPLOYMENT_GRANT_REQUIRED','INVALID_MODE'].includes(e.message)?e.message:'DEPLOYMENT_INPUT_UNAVAILABLE',realCallsEnabled:false};}finally{sw?.close();}
}
