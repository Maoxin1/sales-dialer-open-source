import {createHash} from 'node:crypto';
const fields=['schemaVersion','mode','permitId','attemptId','ticketId','tenantId','salesId','targetKey','installationKey','accountKey'];
const receiptFields=['source','commandDigest','attemptId','ticketId','status','outgoingConfirmed','connectedConfirmed','manualResult'];
const exact=(o,keys)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join()===keys.slice().sort().join();
const id=v=>typeof v==='string'&&/^[A-Z][A-Z0-9-]{1,120}$/.test(v);
const key=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
/** Serialization only: no consent inference, token issuance, device access or submission.
 * Caller must supply a separately approved local permit and durably claim before transport.
 * TEST_FIXTURE handoffs must not be converted into real permits by this module. */
export function encodeNativeCallCommand(input){
 if(!exact(input,fields)||input.schemaVersion!==1||input.mode!=='controlled-call'
  ||!['permitId','attemptId','ticketId','tenantId','salesId','targetKey'].every(k=>id(input[k]))
  ||!['installationKey','accountKey'].every(k=>key(input[k])))throw Error('INVALID_NATIVE_COMMAND');
 const command=Object.freeze(Object.fromEntries(fields.map(k=>[k,input[k]])));
 const raw=JSON.stringify(command);
 return Object.freeze({command,encoded:Buffer.from(raw).toString('base64url'),digest:createHash('sha256').update(raw).digest('hex')});
}
const statuses=new Set(['API_SUBMITTED','REJECTED','REQUEST_CONFLICT','PERMIT_CONFLICT','PERMIT_EXHAUSTED','NATIVE_RECONCILIATION_REQUIRED','RECONCILE_REQUIRED','DUPLICATE:API_SUBMITTED','DUPLICATE:HANDOFF_UNKNOWN','DUPLICATE:RECONCILE_REQUIRED','DUPLICATE:RECONCILED']);
/** Only parse a receipt for exactly the bytes encoded above. Even a valid rejection or
 * historical duplicate cannot release host occupancy or refund quota: reconciliation
 * is separate. An API return is deliberately not proof of an outgoing/connected call. */
export function readNativeCallReceipt(command,raw){
 const expected=encodeNativeCallCommand(command);
 const result={apiSubmission:'UNKNOWN',nativeStatus:null,requiresReconciliation:true,retryAllowed:false,
  outgoingConfirmed:null,connectedConfirmed:null,manualResult:null};
 if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>8192)return result;
 let r;try{r=JSON.parse(raw);}catch{return result;}
 if(!exact(r,receiptFields)||r.source!=='ANDROID_CONTROLLED_CALL'||r.commandDigest!==expected.digest
  ||r.attemptId!==command.attemptId||r.ticketId!==command.ticketId||!statuses.has(r.status)
  ||r.outgoingConfirmed!==null||r.connectedConfirmed!==null||r.manualResult!==null)return result;
 return {...result,nativeStatus:r.status,apiSubmission:r.status==='API_SUBMITTED'?'SUBMITTED':'UNKNOWN'};
}
