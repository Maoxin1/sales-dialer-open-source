import {checkDialWindow} from './dial-window.mjs';
const ids=['tenantId','salesId','targetKey'];
const keys=['deviceKey','installationKey','accountKey'];
const scope=[...ids,...keys];
const permitFields=['schemaVersion','purpose','source','permitId','approvalRef',...scope,'notBefore','expiresAt','maxAttempts','revoked'];
const contextFields=[...scope,'attemptId','ticketId','intentId','taskId','cycle','planVersion','currentPlanVersion','policyVersion','currentPolicyVersion','qualificationRevision','currentQualificationRevision','qualification','doNotContact','paused','occupiedBy','attemptStatus','ticketState','phoneInCall','permissionsGranted','accountEnabled','observedAt','usedAttempts','lastObservedAt'];
const id=v=>typeof v==='string'&&/^SYNTHETIC-[A-Z0-9-]{1,120}$/.test(v);
const key=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const integer=v=>Number.isSafeInteger(v)&&v>=0;
const time=v=>integer(v)&&v<=8640000000000000;
const exact=(o,fields)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join()===fields.slice().sort().join();
const closed=r=>({...r,realCallsEnabled:false,callAuthorization:'DENY'});
const deny=reason=>closed({decision:'DENY',reason});
const weekday=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Shanghai',weekday:'short'});
export function validControlledCallPermit(p){
 return !!(exact(p,permitFields)&&p.schemaVersion===1&&p.purpose==='CONTROLLED_CALL'&&p.source==='TEST_FIXTURE'
  &&[p.permitId,p.approvalRef,...ids.map(k=>p[k])].every(id)&&keys.every(k=>key(p[k]))
  &&[p.notBefore,p.expiresAt].every(time)&&p.expiresAt>p.notBefore&&integer(p.maxAttempts)&&p.maxAttempts>0&&typeof p.revoked==='boolean');
}
/** Pure controlled-call boundary contract, exercised only with TEST_FIXTURE permits.
 * context must eventually be read by the coordinator from a single trusted transaction,
 * not HTTP readiness flags. This does not reserve quota, persist a claim, authenticate
 * consent, issue a reusable permission token, or invoke a telephone API. */
export function checkControlledCallContract(input){
 if(!exact(input,['permit','context','now']))return deny('INVALID_CONTRACT');
 const {permit:p,context:c,now}=input;
 if(!exact(p,permitFields)||!exact(c,contextFields)||p.schemaVersion!==1||p.purpose!=='CONTROLLED_CALL'||p.source!=='TEST_FIXTURE'
  ||![p.permitId,p.approvalRef,...ids.map(k=>p[k]),...ids.map(k=>c[k]),c.attemptId,c.ticketId,c.intentId,c.taskId].every(id)
  ||!keys.every(k=>key(p[k])&&key(c[k]))||![now,p.notBefore,p.expiresAt,c.observedAt,c.lastObservedAt].every(time)
  ||p.expiresAt<=p.notBefore||!integer(p.maxAttempts)||p.maxAttempts<1||!integer(c.usedAttempts)
  ||!['cycle','planVersion','currentPlanVersion','policyVersion','currentPolicyVersion','qualificationRevision','currentQualificationRevision'].every(k=>integer(c[k])&&c[k]>0)
  ||![p.revoked,c.doNotContact,c.paused,c.permissionsGranted,c.accountEnabled].every(v=>typeof v==='boolean')
  ||![true,false,null].includes(c.phoneInCall)||!(c.occupiedBy===null||id(c.occupiedBy))
  ||!['CONFIRMED','UNKNOWN','REVOKED'].includes(c.qualification)
  ||!['AUTHORIZED','HANDOFF_UNKNOWN','RECONCILE_REQUIRED','SUBMITTED','FINISHED','CANCELLED'].includes(c.attemptStatus)
  ||!['HELD_UNKNOWN','RECONCILED'].includes(c.ticketState))return deny('INVALID_CONTRACT');
 if(scope.some(k=>p[k]!==c[k]))return deny('PERMIT_SCOPE_MISMATCH');
 if(p.revoked)return deny('PERMIT_REVOKED');
 if(now<p.notBefore||now>=p.expiresAt||now<c.lastObservedAt)return deny('TIME_BLOCKED');
 if(p.maxAttempts<=c.usedAttempts)return deny('PERMIT_EXHAUSTED');
 if(checkDialWindow({atEpochMs:now,trigger:'manual_now'}).decision!=='WINDOW_OK'||['Sat','Sun'].includes(weekday.format(now)))return deny('WINDOW_CLOSED');
 if(c.planVersion!==c.currentPlanVersion||c.policyVersion!==c.currentPolicyVersion||c.qualificationRevision!==c.currentQualificationRevision)return deny('STALE_BUSINESS_VERSION');
 if(c.doNotContact||c.qualification!=='CONFIRMED')return deny('CONTACT_BLOCKED');
 if(c.paused||c.occupiedBy!==c.attemptId||c.attemptStatus!=='AUTHORIZED'||c.ticketState!=='HELD_UNKNOWN')return deny('BUSINESS_BLOCKED');
 if(c.phoneInCall!==false||!c.permissionsGranted||!c.accountEnabled)return deny('DEVICE_BLOCKED');
 if(now<c.observedAt||now-c.observedAt>10000)return deny('DEVICE_OBSERVATION_EXPIRED');
 return closed({decision:'READY_FOR_ADAPTER',handoff:{schemaVersion:1,mode:'contract-test',permitId:p.permitId,approvalRef:p.approvalRef,
  ...Object.fromEntries([...scope,'attemptId','ticketId','intentId','taskId','cycle','planVersion','policyVersion','qualificationRevision'].map(k=>[k,c[k]])),
  issuedAt:now,expiresAt:Math.min(p.expiresAt,now+60000)}});
}
