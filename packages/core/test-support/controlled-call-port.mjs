import {checkControlledCallContract} from '../src/controlled-call-contract.mjs';
/** Records every eligible invocation. No OS/network/callback; not durable and not a dedup service. */
export class ControlledCallPort {
 #requests=[];#outcome;
 constructor({outcome='SUBMITTED'}={}){if(!['SUBMITTED','NOT_SUBMITTED','LOST_RECEIPT'].includes(outcome))throw Error('INVALID_TEST_OUTCOME');this.#outcome=outcome;}
 get requests(){return structuredClone(this.#requests);}
 submit(input){
  const checked=checkControlledCallContract(input);if(checked.decision!=='READY_FOR_ADAPTER')return checked;
  this.#requests.push(structuredClone(checked.handoff));
  return {decision:'OK',source:'TEST_DOUBLE',attemptId:checked.handoff.attemptId,apiSubmission:this.#outcome==='LOST_RECEIPT'?'UNKNOWN':this.#outcome,
   state:this.#outcome==='NOT_SUBMITTED'?'NOT_SUBMITTED':'RECONCILE_REQUIRED',outgoingConfirmed:null,connectedConfirmed:null,manualResult:null,
   actualPhoneApiCalls:0,realCallsEnabled:false,callAuthorization:'DENY'};
 }
}
