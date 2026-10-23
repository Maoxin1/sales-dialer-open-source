import { createHash } from 'node:crypto';
export const commandDigest=command=>createHash('sha256').update(JSON.stringify(command)).digest('hex');
const ids=['tenantId','salesId','taskId','attemptId','intentId','targetKey','deviceId','simId'];
const versions=['cycle','planVersion','policyVersion','qualificationRevision'];
const fields=['schemaVersion','mode',...ids,...versions,'issuedAt','expiresAt'];
const id=v=>typeof v==='string'&&/^SYNTHETIC-[A-Z0-9-]{1,120}$/.test(v);
export function validateAndroidCommand(c,now) {
 if(!c||Object.keys(c).length!==fields.length||Object.keys(c).some(k=>!fields.includes(k))
   ||c.schemaVersion!==1||c.mode!=='simulation'||ids.some(k=>!id(c[k]))
   ||versions.some(k=>!Number.isSafeInteger(c[k])||c[k]<1)
   ||![c.issuedAt,c.expiresAt,now].every(Number.isSafeInteger)
   ||c.expiresAt<=c.issuedAt||c.expiresAt-c.issuedAt>60000||now<c.issuedAt||now>=c.expiresAt)
   throw new Error('INVALID_OR_EXPIRED_SYNTHETIC_ANDROID_COMMAND');
 return c;
}
/** USB development transport, synthetic targets only; never a real-call adapter.
 * transport is trusted local code, not a user-supplied network callback.
 */
export class AndroidSandboxAdapter {
 #binding; #transport; #now;
 constructor({deviceId,simId,transport,now=()=>Date.now()}) {
  if(!id(deviceId)||!id(simId)||typeof transport?.send!=='function'||typeof now!=='function')throw Error('INVALID_ANDROID_SANDBOX_BINDING');
  this.#binding=Object.freeze({deviceId,simId});this.#transport=transport;this.#now=now;
 }
 describe() { return {...this.#binding}; }
 createCommand(a,now) {
  return validateAndroidCommand({schemaVersion:1,mode:'simulation',tenantId:a.tenantId,salesId:a.salesId,
   taskId:a.taskId,attemptId:a.attemptId,intentId:a.intentId,targetKey:a.targetKey,...this.#binding,
   cycle:a.cycle,planVersion:a.planVersion,policyVersion:a.policyVersion,qualificationRevision:a.qualificationRevision,
   issuedAt:now,expiresAt:now+60000},now);
 }
 async submit(grant) {
  const c=Object.freeze(structuredClone(validateAndroidCommand(grant,this.#now())));
  if(c.deviceId!==this.#binding.deviceId||c.simId!==this.#binding.simId)throw Error('ANDROID_BINDING_MISMATCH');
  const digest=commandDigest(c),r=await this.#transport.send(c);
  const valid=r?.schemaVersion===1&&r.mode==='simulation'&&r.source==='ANDROID_SIMULATION'
   &&r.commandDigest===digest&&r.attemptId===c.attemptId&&r.deviceId===c.deviceId&&r.actualPhoneApiCalls===0
   &&r.status==='SIMULATED_ACCEPTED';
  return {attemptId:c.attemptId,status:valid?'SUBMITTED':'UNKNOWN',source:'SIMULATION',
   ...(valid?{androidReceipt:{schemaVersion:1,mode:'simulation',source:r.source,commandDigest:digest,
    attemptId:c.attemptId,deviceId:c.deviceId,status:r.status,actualPhoneApiCalls:0,duplicate:r.duplicate===true}}:{})};
 }
}
