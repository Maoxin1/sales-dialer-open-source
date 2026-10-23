import {ContactControlledCoordinator,contactWireId} from './contact-controlled-coordinator.mjs';
import {CONTROLLED_SCHEDULE_POLICY} from './contact-schedule-ledger.mjs';
const deny=reason=>({decision:'DENY',reason,realCallsEnabled:false});
/** Explicit future snapshot of trusted per-target routes. No startup catch-up or auto-retry. */
export class ContactControlledSchedule {
 constructor({coordinators,now=Date.now,timers=globalThis,policy=CONTROLLED_SCHEDULE_POLICY,isCurrent=()=>true}){
  if(!Array.isArray(coordinators)||!coordinators.length||coordinators.some(c=>!(c instanceof ContactControlledCoordinator)))throw Error('TRUSTED_ROUTES_REQUIRED');
  const scopes=coordinators.map(c=>({store:c.workspace.controlledStorageIdentity(),permit:c.workspace.controlledContext().permit}));
  if(scopes.some(s=>!s.permit||s.store!==scopes[0].store||s.permit.tenantId!==scopes[0].permit.tenantId||s.permit.salesId!==scopes[0].permit.salesId)||new Set(scopes.map(s=>s.permit.targetId)).size!==scopes.length)throw Error('ROUTE_SCOPE_MISMATCH');
  this.isCurrent=isCurrent;this.coordinators=[...coordinators];this.now=now;this.timers=timers;this.policy=Object.freeze({...policy});this.pending=new Map();this.running=false;this.generation=0;this.inflight=0;
 }
 status(){return {running:this.running,pending:this.pending.size,inflight:this.inflight,policy:this.policy,realCallsEnabled:false};}
 stop(){this.running=false;this.generation++;for(const h of this.pending.values())this.timers.clearTimeout(h);this.pending.clear();return {decision:'OK',realCallsEnabled:false};}
 start(){if(!this.isCurrent())return deny('CONFIG_CHANGED');if(this.running)return {decision:'OK',realCallsEnabled:false};const now=this.now();if(!Number.isSafeInteger(now)||now<0)return deny('INVALID_TIME');
 const entries=[];for(const c of this.coordinators){if(!c.binding('trigger'))return deny('PORT_BINDING_MISMATCH');const s=c.workspace.status();if(s.decision!=='OK')return deny('FORBIDDEN');if(s.paused)return deny('PAUSED');const target=c.workspace.controlledContext().permit.targetId;
 for(const p of s.plans){if(p.targetId!==target||p.plannedAt<=now||p.blockers.some(r=>!['NOT_DUE','REAL_ADAPTER_DISABLED'].includes(r))||s.controlledSchedule.some(e=>e.planId===p.planId&&e.version===p.version))continue;entries.push({c,p});}}
 this.running=true;const generation=++this.generation;for(const e of entries)this.arm(e,generation);return {decision:'OK',scheduled:entries.length,realCallsEnabled:false};}
 arm(e,generation){const key=e.p.planId;const callback=async()=>{if(!this.running||generation!==this.generation)return;this.pending.delete(key);if(!this.isCurrent()){this.stop();return;}if(Number.isSafeInteger(this.now())&&this.now()<e.p.plannedAt){this.arm(e,generation);return;}this.inflight++;
 try{await e.c.submitScheduled({planId:key,expectedVersion:e.p.version,requestId:contactWireId('SCHEDULE',key+':'+e.p.version)},this.policy,()=>this.running&&this.generation===generation&&this.isCurrent());}catch{this.stop();}finally{this.inflight--;}};
 const delay=Math.min(2147483647,Math.max(1,e.p.plannedAt-this.now())),h=this.timers.setTimeout(callback,delay);h?.unref?.();this.pending.set(key,h);
 }
 close(){this.stop();}
}
