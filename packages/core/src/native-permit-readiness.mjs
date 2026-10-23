import {createHash} from 'node:crypto';
const hash=v=>createHash('sha256').update(v).digest('hex');
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const uint=v=>Number.isSafeInteger(v)&&v>=0;
const fields=['schemaVersion','mode','enabled','permitId','approvalRef','token','installationKey','accountKey','tenantId','salesId','targetKey','targetNumber','maxAttempts','notBefore','expiresAt','bootCount','issuedElapsed','expiresElapsed'];
const deny=reason=>({decision:'DENY',reason,realCallsEnabled:false});
/** Pure, trusted-host snapshot inspection. READY is not authorization, provisioning or
 * an atomic device observation. Never changes permit bytes, counts, or native state.
 * Actual deployment must re-observe under an exclusive device gate. */
export function inspectNativePermitSwitch(input){
 try{
  const {now,deadline,nativeBytes,expected:e,host:h,device:d,ledger:l}=input;
  if(!uint(now)||!uint(deadline)||typeof nativeBytes!=='string'||Buffer.byteLength(nativeBytes)>8192||!e||!h||!d||!l)return deny('INVALID_SNAPSHOT');
  const p=JSON.parse(nativeBytes);
  if(!p||Object.keys(p).sort().join()!==fields.slice().sort().join()||p.schemaVersion!==1||p.mode!=='LOCAL_CONTROLLED_CALL'||p.enabled!==true
   ||!['token','installationKey','accountKey'].every(k=>hex(p[k]))||!['permitId','tenantId','salesId','targetKey'].every(k=>typeof p[k]==='string'&&/^[A-Z][A-Z0-9-]{1,120}$/.test(p[k]))
   ||typeof p.approvalRef!=='string'||!/^CONTROLLED-[A-Z0-9-]{1,100}$/.test(p.approvalRef)||typeof p.targetNumber!=='string'||!/^1[3-9][0-9]{9}$/.test(p.targetNumber)
   ||!['maxAttempts','notBefore','expiresAt','bootCount','issuedElapsed','expiresElapsed'].every(k=>uint(p[k]))||p.maxAttempts<1)return deny('INVALID_NATIVE_PERMIT');
  // The expected permit is supplied by trusted host composition, never by HTTP or the device itself.
  if(fields.some(k=>e[k]!==p[k])||!hex(e.deviceKey)||!hex(e.apkSha256))return deny('PERMIT_SCOPE_MISMATCH');
  if(!uint(h.used)||!uint(h.pending)||h.pending!==0||h.qualified!==true||h.refused!==false||h.paused!==false)return deny('HOST_BLOCKED');
  if(!uint(d.observedAt)||d.observedAt>now||now-d.observedAt>=10000||d.deviceKey!==e.deviceKey||d.apkSha256!==e.apkSha256||d.installationKey!==p.installationKey||d.accountKey!==p.accountKey
   ||d.inCall!==false||d.permissionsGranted!==true||d.accountEnabled!==true||d.componentsDisabled!==true||!uint(d.bootCount)||!uint(d.elapsed))return deny('DEVICE_BLOCKED');
  if(p.expiresAt<=p.notBefore||now<p.notBefore||now>=p.expiresAt||deadline<=now||deadline>now+30000||p.bootCount!==d.bootCount||p.expiresElapsed<=p.issuedElapsed||p.expiresElapsed-p.issuedElapsed>900000||d.elapsed<p.issuedElapsed||d.elapsed+(now-d.observedAt)>=p.expiresElapsed)return deny('TIME_BLOCKED');
  const date=new Date(now+8*3600000),day=date.getUTCDay(),hour=date.getUTCHours();
  if(day===0||day===6||hour<9||hour>=18)return deny('OUTSIDE_WINDOW');
  if(l.schemaVersion!==2||!Array.isArray(l.requests)||!Array.isArray(l.permits)||l.requests.some(r=>!r||r.status!=='RECONCILED'))return deny('NATIVE_RECONCILIATION_REQUIRED');
  const ids=new Set();
  for(const row of l.permits){if(!row||typeof row.id!=='string'||ids.has(row.id)||!hex(row.fingerprint)||!uint(row.used))return deny('NATIVE_LEDGER_INVALID');ids.add(row.id);}
  const fingerprint=hash(nativeBytes),existing=l.permits.find(r=>r.id===p.permitId);
  if(existing&&existing.fingerprint!==fingerprint)return deny('PERMIT_CONFLICT');
  const nativeUsed=existing?.used??0;
  // Native submissions cannot legitimately exceed the durable host reservations.
  if(nativeUsed>h.used)return deny('BUDGET_DIVERGED');
  const remainingAttempts=Math.min(p.maxAttempts-h.used,p.maxAttempts-nativeUsed);
  if(remainingAttempts<1)return deny('BUDGET_EXHAUSTED');
  const windowEnd=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate(),10);
  const validUntil=Math.min(deadline,p.expiresAt,now+p.expiresElapsed-d.elapsed-(now-d.observedAt),windowEnd);
  if(validUntil<=now)return deny('TIME_BLOCKED');
  return {decision:'READY',fingerprint,remainingAttempts,validUntil,requiresAtomicRecheck:true,realCallsEnabled:false};
 }catch{return deny('INVALID_SNAPSHOT');}
}
