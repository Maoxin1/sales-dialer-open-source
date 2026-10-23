import {randomUUID} from 'node:crypto';
// Reversible LOCAL_RECORDING lab parameter, never a production lateness policy.
export const LOCAL_TIMER_GRACE_MS=1000;
export class ContactTimer {
 constructor(db,actor,now,plans,attempts,timers=globalThis){Object.assign(this,{db,actor,now,plans,attempts,timers});this.running=false;this.generation=0;this.pending=new Map();db.exec(`CREATE TABLE IF NOT EXISTS local_timer_events(tenant TEXT NOT NULL,seller TEXT NOT NULL,plan TEXT NOT NULL,version INTEGER NOT NULL,due INTEGER NOT NULL,observed INTEGER NOT NULL,outcome TEXT NOT NULL,PRIMARY KEY(plan,version));`);}
 view(){return {timer:{running:this.running,pending:this.pending.size,labGraceMs:LOCAL_TIMER_GRACE_MS,events:this.db.prepare('SELECT plan AS planId,version,due,observed,outcome FROM local_timer_events WHERE tenant=? AND seller=? ORDER BY observed DESC,rowid DESC LIMIT 50').all(this.actor.tenantId,this.actor.salesId)}};}
 stop(){this.running=false;this.generation++;for(const h of this.pending.values())this.timers.clearTimeout(h);this.pending.clear();}
 execute(op){if(!this.actor.permissions.includes('trigger'))return {decision:'DENY',reason:'FORBIDDEN',realCallsEnabled:false};if(op==='stopTimer'){this.stop();return {decision:'OK',realCallsEnabled:false};}if(this.running)return {decision:'OK',realCallsEnabled:false};if(this.plans.control().paused)return {decision:'DENY',reason:'PAUSED',realCallsEnabled:false};this.running=true;const generation=++this.generation;
 for(const p of this.plans.view().plans){if(p.plannedAt<=this.now()||p.blockers.some(r=>!['NOT_DUE','REAL_ADAPTER_DISABLED'].includes(r)))continue;if(this.db.prepare('SELECT 1 FROM local_timer_events WHERE plan=? AND version=?').get(p.planId,p.version))continue;this.arm(p,generation);}
 return {decision:'OK',realCallsEnabled:false};}
 arm(p,generation){const key=p.planId;const callback=()=>{if(!this.running||generation!==this.generation)return;this.pending.delete(key);const observed=this.now();if(Number.isSafeInteger(observed)&&observed<p.plannedAt){this.arm(p,generation);return;}
 // Consume once before attempting. A crash here leaves CHECK_REQUIRED and never replays.
 const claimed=this.db.prepare("INSERT OR IGNORE INTO local_timer_events VALUES(?,?,?,?,?,?,'CHECK_REQUIRED')").run(this.actor.tenantId,this.actor.salesId,key,p.version,p.plannedAt,Number.isSafeInteger(observed)?observed:0);if(!claimed.changes)return;
 let outcome;try{const r=this.attempts.execute({op:'rehearse',planId:key,expectedVersion:p.version,requestId:'TIMER-'+randomUUID()},{due:p.plannedAt,graceMs:LOCAL_TIMER_GRACE_MS});outcome=r.reason??r.decision;}catch{outcome='CHECK_REQUIRED';this.stop();}
 this.db.prepare('UPDATE local_timer_events SET outcome=? WHERE plan=? AND version=?').run(outcome,key,p.version);
 };const delay=Math.min(2147483647,Math.max(1,p.plannedAt-this.now()));const handle=this.timers.setTimeout(callback,delay);handle?.unref?.();this.pending.set(key,handle);}
}
