import {createHash} from 'node:crypto';
import {inspectNativePermitSwitch} from './native-permit-readiness.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const deny=reason=>({decision:'DENY',reason,canApply:false,realCallsEnabled:false});
/** Trusted-host composition only. Output deliberately contains neither permit bytes nor
 * shell commands nor a capability to apply. A successful preview is not a device lock. */
export async function previewNativePermitDeployment({candidate,collect,host,now=Date.now}={}){
 try{
  if(!candidate||Object.keys(candidate).sort().join()!==['nativeBytes','expected','deadline'].sort().join()||typeof candidate.nativeBytes!=='string'||Buffer.byteLength(candidate.nativeBytes)>8192||typeof collect!=='function'||typeof host!=='function')return deny('INVALID_PREVIEW_INPUT');
  const c=structuredClone(candidate),started=now();
  const collected=await collect();if(collected?.decision!=='COLLECTED')return deny('COLLECTION_REQUIRED');
  const s=structuredClone(collected.snapshot);if(typeof s?.nativeBytes!=='string'||Buffer.byteLength(s.nativeBytes)>8192)return deny('CURRENT_PERMIT_INVALID');
  const current=JSON.parse(s.nativeBytes);if(!current||typeof current!=='object'||Array.isArray(current)||typeof current.enabled!=='boolean')return deny('CURRENT_PERMIT_INVALID');
  const h=await host(),at=now();if(!Number.isSafeInteger(started)||!Number.isSafeInteger(at)||at<started||at-started>=10000)return deny('PREVIEW_EXPIRED');
  const checked=inspectNativePermitSwitch({now:at,deadline:c.deadline,nativeBytes:c.nativeBytes,expected:c.expected,host:h,device:s.device,ledger:s.ledger});
  if(checked.decision!=='READY')return deny(checked.reason);
  const currentFingerprint=hash(s.nativeBytes),candidateFingerprint=hash(c.nativeBytes),validUntil=checked.validUntil;
  const plan={packageName:'com.mantou.salesdialer.spike',relativePath:'files/controlled-call-permit.json',deviceKey:c.expected.deviceKey,currentFingerprint,candidateFingerprint,validUntil};
  return {decision:'PREVIEW',previewId:hash(JSON.stringify(plan)),...plan,changeRequired:currentFingerprint!==candidateFingerprint,remainingAttempts:checked.remainingAttempts,canApply:false,requiresLockedRecheck:true,realCallsEnabled:false};
 }catch{return deny('PREVIEW_UNAVAILABLE');}
}
