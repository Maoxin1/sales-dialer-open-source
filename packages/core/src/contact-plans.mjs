import {randomUUID} from 'node:crypto';
import {checkDialWindow} from './dial-window.mjs';
const weekday=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Shanghai',weekday:'short'});
const validTime=t=>Number.isSafeInteger(t)&&t>=0&&t<=8640000000000000;
const inWindow=t=>validTime(t)&&checkDialWindow({atEpochMs:t,trigger:'manual_reschedule'}).decision==='WINDOW_OK'&&!['Sat','Sun'].includes(weekday.format(t));
export const planFields={plan:['op','targetId','plannedAt','expectedRevision','requestId'],replan:['op','planId','plannedAt','expectedRevision','expectedVersion','requestId'],cancelPlan:['op','planId','expectedVersion','requestId'],pausePlans:['op'],resumePlans:['op']};
const deny=reason=>({decision:'DENY',reason,realCallsEnabled:false});
/** Plans only: no timer, attempt authorization, telephone transport or production authentication. */
export class ContactPlans {
 constructor(db,actor,now){Object.assign(this,{db,actor,now});db.exec(`
 CREATE TABLE IF NOT EXISTS local_plan_control(tenant TEXT NOT NULL,seller TEXT NOT NULL,paused INTEGER NOT NULL,generation INTEGER NOT NULL,PRIMARY KEY(tenant,seller));
 CREATE TABLE IF NOT EXISTS local_plans(id TEXT PRIMARY KEY,tenant TEXT NOT NULL,seller TEXT NOT NULL,target TEXT NOT NULL,planned INTEGER NOT NULL,version INTEGER NOT NULL,contact_revision INTEGER NOT NULL,generation INTEGER NOT NULL,cancelled INTEGER NOT NULL DEFAULT 0);
 CREATE UNIQUE INDEX IF NOT EXISTS one_open_contact_plan ON local_plans(tenant,target) WHERE cancelled=0;
 CREATE TABLE IF NOT EXISTS local_plan_intents(tenant TEXT NOT NULL,seller TEXT NOT NULL,request TEXT NOT NULL,fingerprint TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(tenant,seller,request));
 CREATE TABLE IF NOT EXISTS local_plan_events(seq INTEGER PRIMARY KEY,tenant TEXT NOT NULL,seller TEXT NOT NULL,plan TEXT,kind TEXT NOT NULL,version INTEGER,at INTEGER NOT NULL);`);}
 control(){return this.db.prepare('SELECT * FROM local_plan_control WHERE tenant=? AND seller=?').get(this.actor.tenantId,this.actor.salesId)??{paused:0,generation:0};}
 ownedContact(id){return this.db.prepare('SELECT * FROM contacts WHERE id=? AND tenant=? AND seller=?').get(id,this.actor.tenantId,this.actor.salesId);}
 view(){const control=this.control(),now=this.now(),rows=this.db.prepare('SELECT * FROM local_plans WHERE tenant=? AND seller=? ORDER BY planned,id').all(this.actor.tenantId,this.actor.salesId);return {paused:!!control.paused,canPlan:this.actor.permissions.includes('plan'),plans:rows.map(p=>{const c=this.ownedContact(p.target),blockers=[];
 if(p.cancelled)blockers.push('CANCELLED');if(!c)blockers.push('CONTACT_UNAVAILABLE');else{if(c.refused)blockers.push('DO_NOT_CONTACT');if(c.qualification!=='CONFIRMED')blockers.push('QUALIFICATION_UNCONFIRMED');if(c.revision!==p.contact_revision)blockers.push('CONTACT_CHANGED');}
 if(control.paused)blockers.push('PAUSED');if(p.generation!==control.generation)blockers.push('REPLAN_REQUIRED');if(!validTime(now))blockers.push('INVALID_TIME');else if(p.planned<now)blockers.push('EXPIRED');else if(p.planned>now)blockers.push('NOT_DUE');
 blockers.push('REAL_ADAPTER_DISABLED');return {planId:p.id,targetId:p.target,maskedNumber:c?c.number.slice(0,3)+'****'+c.number.slice(-4):null,plannedAt:p.planned,version:p.version,contactRevision:p.contact_revision,cancelled:!!p.cancelled,blockers,dialable:false};})};}
 execute(cmd){if(!this.actor.permissions.includes('plan'))return deny('FORBIDDEN');const a=this.actor,now=this.now();if(!validTime(now))return deny('INVALID_TIME');
 const event=(kind,p)=>this.db.prepare('INSERT INTO local_plan_events(tenant,seller,plan,kind,version,at) VALUES(?,?,?,?,?,?)').run(a.tenantId,a.salesId,p?.id??null,kind,p?.version??null,now);
 this.db.exec('BEGIN IMMEDIATE');try{const result=(()=>{
 if(['pausePlans','resumePlans'].includes(cmd.op)){const c=this.control(),pause=cmd.op==='pausePlans';if(!!c.paused!==pause){this.db.prepare('INSERT INTO local_plan_control VALUES(?,?,?,?) ON CONFLICT(tenant,seller) DO UPDATE SET paused=excluded.paused,generation=excluded.generation').run(a.tenantId,a.salesId,Number(pause),c.generation+(pause?1:0));event(pause?'PAUSED':'RESUMED');}return {decision:'OK',realCallsEnabled:false};}
 if(typeof cmd.requestId!=='string'||! /^[A-Za-z0-9-]{8,100}$/.test(cmd.requestId))return deny('INVALID_INPUT');
 const fingerprint=JSON.stringify(Object.keys(cmd).sort().map(k=>[k,cmd[k]]));const prior=this.db.prepare('SELECT * FROM local_plan_intents WHERE tenant=? AND seller=? AND request=?').get(a.tenantId,a.salesId,cmd.requestId);if(prior)return prior.fingerprint===fingerprint?JSON.parse(prior.result):deny('INTENT_CONFLICT');
 let p,c;
 if(cmd.op==='plan'){if(typeof cmd.targetId!=='string')return deny('INVALID_INPUT');c=this.ownedContact(cmd.targetId);if(!c)return deny('FORBIDDEN');}
 else{if(typeof cmd.planId!=='string')return deny('INVALID_INPUT');p=this.db.prepare('SELECT * FROM local_plans WHERE id=? AND tenant=? AND seller=?').get(cmd.planId,a.tenantId,a.salesId);if(!p)return deny('FORBIDDEN');if(p.version!==cmd.expectedVersion)return deny('PLAN_CHANGED');if(p.cancelled)return deny('PLAN_CANCELLED');if(this.db.prepare("SELECT id FROM local_rehearsals WHERE plan=? AND status!='FINISHED'").get(p.id))return deny('ATTEMPT_PENDING');if(this.db.prepare("SELECT id FROM contact_controlled_attempts WHERE plan=? AND state='HELD_UNKNOWN'").get(p.id))return deny('ATTEMPT_PENDING');c=this.ownedContact(p.target);if(!c)return deny('FORBIDDEN');}
 if(cmd.op!=='cancelPlan'){if(c.refused)return deny('DO_NOT_CONTACT');if(c.qualification!=='CONFIRMED')return deny('QUALIFICATION_UNCONFIRMED');if(c.revision!==cmd.expectedRevision)return deny('CONTACT_CHANGED');if(!validTime(cmd.plannedAt))return deny('INVALID_TIME');if(cmd.plannedAt<now)return deny('PAST_PLAN');if(!inWindow(cmd.plannedAt))return deny('OUTSIDE_PLAN_WINDOW');if(this.control().paused)return deny('PAUSED');}
 if(cmd.op==='plan'){if(this.db.prepare('SELECT id FROM local_plans WHERE tenant=? AND target=? AND cancelled=0').get(a.tenantId,c.id))return deny('PLAN_EXISTS');p={id:'PLAN-'+randomUUID(),version:1};this.db.prepare('INSERT INTO local_plans VALUES(?,?,?,?,?,?,?, ?,0)').run(p.id,a.tenantId,a.salesId,c.id,cmd.plannedAt,1,c.revision,this.control().generation);event('CREATED',p);}
 else{p.version++;if(cmd.op==='cancelPlan')this.db.prepare('UPDATE local_plans SET cancelled=1,version=? WHERE id=?').run(p.version,p.id);else this.db.prepare('UPDATE local_plans SET planned=?,version=?,contact_revision=?,generation=? WHERE id=?').run(cmd.plannedAt,p.version,c.revision,this.control().generation,p.id);event(cmd.op==='cancelPlan'?'CANCELLED':'REPLANNED',p);}
 const r={decision:'OK',planId:p.id,version:p.version,realCallsEnabled:false};this.db.prepare('INSERT INTO local_plan_intents VALUES(?,?,?,?,?)').run(a.tenantId,a.salesId,cmd.requestId,fingerprint,JSON.stringify(r));return r;
 })();this.db.exec('COMMIT');return result;}catch(e){this.db.exec('ROLLBACK');throw e;}
 }
}
