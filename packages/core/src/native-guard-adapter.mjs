import {createHash} from 'node:crypto';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const key=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const ids=['tenantId','salesId','taskId','attemptId','intentId','targetKey','trialTicketId','trialRoundId'];
const versions=['cycle','planVersion','policyVersion','qualificationRevision'];
/** Trusted local dry-run transport only. Payload cannot contain a dial target.
 * READY proves a check, never submission. Business occupancy requires reconciliation. */
export class NativeGuardAdapter {
 #binding;#transport;#now;#requests=[];
 constructor({hostDeviceKey,deviceKey,accountKey,transport,now=Date.now}){
  if(![hostDeviceKey,deviceKey,accountKey].every(key)||typeof transport?.send!=='function'||typeof now!=='function')throw Error('INVALID_GUARD_BINDING');
  this.#binding=Object.freeze({hostDeviceKey,deviceKey,accountKey});this.#transport=transport;this.#now=now;
 }
 describe(){return {...this.#binding};}
 get requests(){return structuredClone(this.#requests);}
 createCommand(a,now){
  if(ids.some(k=>typeof a[k]!=='string'||!/^SYNTHETIC-[A-Z0-9-]+$/.test(a[k]))||versions.some(k=>!Number.isSafeInteger(a[k])||a[k]<1)||!Number.isSafeInteger(now)||!Number.isSafeInteger(a.trialExpiresAt)||a.trialExpiresAt<=now)throw Error('INVALID_GUARD_LINK');
  const link=Object.fromEntries([...ids,...versions].map(k=>[k,a[k]]));
  const issuedAt=now,expiresAt=Math.min(now+60000,a.trialExpiresAt);
  const binding=this.describe(),requestId='SYNTHETIC-GUARD-'+hash({link,binding,issuedAt,expiresAt}).toUpperCase();
  const command={schemaVersion:1,mode:'dry-run',requestId,deviceKey:binding.deviceKey,accountKey:binding.accountKey};
  return {link,binding,issuedAt,expiresAt,command,commandDigest:hash(command)};
 }
 async submit(envelope){
  const e=structuredClone(envelope),now=this.#now();
  const expected=this.createCommand({...e.link,trialExpiresAt:e.expiresAt},e.issuedAt);
  if(JSON.stringify(e)!==JSON.stringify(expected)||!Number.isSafeInteger(now)||now<e.issuedAt||now>=e.expiresAt)throw Error('INVALID_OR_EXPIRED_GUARD_LINK');
  this.#requests.push(structuredClone(e.command));
  const r=await this.#transport.send(structuredClone(e.command),e.expiresAt-now);
  const valid=r?.source==='ANDROID_GUARD_DRY_RUN'&&r.commandDigest===e.commandDigest&&r.actualPhoneApiCalls===0&&r.realCallsEnabled===false&&r.status==='DRY_RUN_READY'&&typeof r.duplicate==='boolean'&&r.checksForRequest===1;
  return {attemptId:e.link.attemptId,status:'UNKNOWN',source:'SIMULATION',...(valid?{nativeGuardReceipt:{source:r.source,commandDigest:r.commandDigest,status:r.status,actualPhoneApiCalls:0,realCallsEnabled:false,duplicate:r.duplicate,checksForRequest:1}}:{})};
 }
}
