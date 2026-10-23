import {AdbControlledCallTransport} from './adb-controlled-call-transport.mjs';
import {encodeNativeCallCommand} from './native-call-protocol.mjs';
import {contactWireId} from './contact-wire-id.mjs';
export {contactWireId};
const deny=reason=>({decision:'DENY',reason,realCallsEnabled:false});
/** Trusted developer composition only. Never wired into HTTP or the rehearsal timer. */
export class ContactControlledCoordinator {
 constructor({workspace,port,now=Date.now,fault=()=>{}}){Object.assign(this,{workspace,port,now,fault});if(!(port instanceof AdbControlledCallTransport)&&port?.kind!=='CONTROLLED_FIXTURE')throw Error('EXPLICIT_CONTROLLED_PORT_REQUIRED');}
 binding(capability){const c=this.workspace.controlledContext(),b=this.port.binding();if(!c.permissions.includes(capability)||!c.permit||!c.mapping)return null;const p=c.permit,m=c.mapping;
 if((p.source==='CONTROLLED_FIXTURE')!==(this.port.kind==='CONTROLLED_FIXTURE'))return null;
 const expected={permitId:contactWireId('PERMIT',p.permitId),tenantId:contactWireId('TENANT',p.tenantId),salesId:contactWireId('SALES',p.salesId),targetKey:contactWireId('TARGET',p.targetId),accountKey:p.accountKey,deviceKey:p.deviceKey,expectedApkHash:m.apkSha256,notBefore:p.notBefore,expiresAt:p.expiresAt};
 if(Object.entries(expected).some(([k,v])=>b[k]!==v)||! /^[a-f0-9]{64}$/.test(b.installationKey))return null;return {c,b};}
 matched(attemptId,capability){const bound=this.binding(capability),row=this.workspace.controlledDelivery(attemptId);if(!bound||!row)return null;
 const expected={...Object.fromEntries(['permitId','tenantId','salesId','targetKey','accountKey','installationKey'].map(k=>[k,bound.b[k]])),attemptId:contactWireId('ATTEMPT',attemptId),ticketId:contactWireId('TICKET',attemptId)};
 return Object.entries(expected).every(([k,v])=>row.command[k]===v)?row:null;}
 async submitScheduled(request,policy,isActive=()=>true){const claim=this.workspace.claimControlledSchedule(request,policy);if(claim.decision!=='CLAIMED')return claim;this.fault('after-schedule-claim');let result;try{result=await this.#submit(request,claim,isActive);}catch(e){this.workspace.completeControlledSchedule(request,'CHECK_REQUIRED');throw e;}this.workspace.completeControlledSchedule(request,result.reason??result.decision);return result;}
 submit(request){return this.#submit(request,null,()=>true);}
 async #submit(request,timing,isActive){const bound=this.binding('trigger');if(!bound)return deny('PORT_BINDING_MISMATCH');let d;try{d=await this.port.readControlledDevice();}catch{return deny('DEVICE_UNAVAILABLE');}
 const now=this.now(),b=bound.b;if(!d||['deviceKey','installationKey','accountKey'].some(k=>d[k]!==b[k])||d.inCall!==false||d.permissionsGranted!==true||d.accountEnabled!==true||!Number.isSafeInteger(d.observedAt)||d.observedAt>now||now-d.observedAt>=10000)return deny('DEVICE_BLOCKED');
 if(!isActive())return deny('SCHEDULE_STOPPED');
 const held=timing?this.workspace.reserveScheduledControlled(request):this.workspace.reserveControlled(request);if(held.decision!=='RESERVED'||held.duplicate)return held;
 const command=encodeNativeCallCommand({schemaVersion:1,mode:'controlled-call',permitId:b.permitId,attemptId:contactWireId('ATTEMPT',held.attemptId),ticketId:contactWireId('TICKET',held.attemptId),tenantId:b.tenantId,salesId:b.salesId,targetKey:b.targetKey,installationKey:b.installationKey,accountKey:b.accountKey}).command;
 this.workspace.claimControlledDelivery(held.attemptId,command);this.fault('after-delivery-claim');let receipt;
 try{receipt=await this.port.submit(command,timing?{deadline:timing.deadline}:undefined);}catch{receipt=null;}this.fault('after-port-return');return this.workspace.recordControlledReceipt(held.attemptId,receipt);
 }
 async refresh(attemptId){const row=this.matched(attemptId,'trigger');if(!row)return deny('NO_MATCHED_DELIVERY');let r;try{r=await this.port.readReceipt(row.command);}catch{r=null;}return this.workspace.recordControlledReceipt(attemptId,r);}
 async reconcile({attemptId,noActiveCall,result}){if(noActiveCall!==true||!['UNKNOWN','NO_ANSWER','BUSY','REJECTED','COMPLETED','FAILED'].includes(result))return deny('EXPLICIT_RECONCILIATION_REQUIRED');const row=this.matched(attemptId,'reconcile');if(!row)return deny('NO_MATCHED_DELIVERY');if(row.finished)return {decision:'OK',duplicate:true};
 let native;try{native=await this.port.reconcile(row.command,{noActiveCall:true});}catch{return deny('NATIVE_RECONCILIATION_REQUIRED');}if(native?.nativeReconciled!==true||native.hostReconciled!==false)return deny('NATIVE_RECONCILIATION_REQUIRED');this.fault('after-native-reconcile');return this.workspace.finishControlled(attemptId,result);
 }
}
