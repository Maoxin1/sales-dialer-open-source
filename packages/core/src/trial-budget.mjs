import { randomUUID } from 'node:crypto';
const id = value => typeof value === 'string' && /^SYNTHETIC-[A-Z0-9-]{1,100}$/.test(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const result = (code, extra={}) => ({code,...extra,realCallsEnabled:false,callAuthorization:'DENY'});
function exact(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join() !== [...keys].sort().join()) throw Error('INVALID_TRIAL_INPUT');
}
function ledger(state) { return state.trialBudget ??= {schema:1,rounds:[],tickets:[],lastObservedAt:0}; }
const owner = (a,b) => a.tenantId===b.tenantId && a.salesId===b.salesId;

/** Trusted local fixture or explicit controlled-round accounting. A reservation is an additional budget
 * hold, NOT business eligibility, consent, device readiness or call permission.
 * No transport exists here. Persist before any future handoff; never refund an
 * unknown hold. Production authorization and authenticated actors are separate. */
export class TrialBudget {
  #store; #now;
  constructor({store,now=Date.now}) { this.#store=store; this.#now=now; }
  register(input) {
    exact(input,['roundId','tenantId','salesId','deviceId','accountId','targets','notBefore','expiresAt','maxAttempts','source']);
    const r=structuredClone(input);
    if (!['roundId','tenantId','salesId','deviceId','accountId'].every(k=>id(r[k])) || !['SIMULATION_FIXTURE','LOCAL_CONTROLLED_CALL'].includes(r.source) || !Array.isArray(r.targets) || !r.targets.length || !r.targets.every(id) || new Set(r.targets).size!==r.targets.length || !integer(r.notBefore) || !integer(r.expiresAt) || r.expiresAt<=r.notBefore || !Number.isSafeInteger(r.maxAttempts) || r.maxAttempts<1) throw Error('INVALID_TRIAL_ROUND');
    r.targets.sort();
    return this.#store.transaction(state=>{
      const l=ledger(state),old=l.rounds.find(x=>x.config.roundId===r.roundId);
      if(old) return result(Object.keys(r).every(k=>JSON.stringify(r[k])===JSON.stringify(old.config[k]))?'EXISTS':'ROUND_CONFLICT');
      l.rounds.push({config:r,used:0,revoked:false});return result('REGISTERED');
    });
  }
  reserve(r) {
    exact(r,['roundId','tenantId','salesId','deviceId','accountId','targetKey','intentId','taskId','cycle']);
    if (!Object.entries(r).every(([k,v])=>k==='cycle'?Number.isSafeInteger(v)&&v>0:id(v))) throw Error('INVALID_TRIAL_REQUEST');
    const now=this.#now();
    return this.#store.transaction(state=>{
      const l=ledger(state),round=l.rounds.find(x=>x.config.roundId===r.roundId);
      if(!round) return result('ROUND_UNKNOWN');
      const c=round.config;
      if(!owner(c,r)||c.deviceId!==r.deviceId||c.accountId!==r.accountId||!c.targets.includes(r.targetKey))return result('SCOPE_MISMATCH');
      if(!integer(now)||now<l.lastObservedAt)return result('TIME_BLOCKED');
      l.lastObservedAt=now;
      if(now<c.notBefore||now>=c.expiresAt)return result('TIME_BLOCKED');
      if(round.revoked)return result('REVOKED');
      // Cross-round dedup prevents a new fixture from replaying an old intent.
      if(l.tickets.some(t=>t.tenantId===r.tenantId&&(t.intentId===r.intentId||(t.taskId===r.taskId&&t.cycle===r.cycle))))return result('DUPLICATE');
      if(l.tickets.some(t=>t.state==='HELD_UNKNOWN'&&(owner(t,r)||t.deviceId===r.deviceId)))return result('OCCUPIED');
      if(round.used>=c.maxAttempts)return result('BUDGET_EXHAUSTED');
      const ticketId='SYNTHETIC-'+randomUUID().toUpperCase();
      l.tickets.push({...structuredClone(r),ticketId,heldAt:now,state:'HELD_UNKNOWN',outcome:null});
      round.used++;
      return result('RESERVED',{ticketId});
    });
  }
  reconcile(r) {
    exact(r,['tenantId','salesId','ticketId','noActiveCall','outcome']);
    return this.#store.transaction(state=>{
      const t=ledger(state).tickets.find(t=>t.ticketId===r.ticketId);
      if(!t||!owner(t,r))return result('SCOPE_MISMATCH');
      const source=ledger(state).rounds.find(x=>x.config.roundId===t.roundId)?.config.source;
      const allowed=source==='LOCAL_CONTROLLED_CALL'?['NATIVE_RECONCILED']:['SIMULATED_FINISHED','SIMULATED_NOT_SENT'];
      if(r.noActiveCall!==true||!allowed.includes(r.outcome))return result('RECONCILIATION_REQUIRED');
      if(t.state==='RECONCILED')return result('ALREADY_RECONCILED');
      t.state='RECONCILED';t.outcome=r.outcome;
      // Resolving occupancy never restores the per-round attempt budget.
      return result('RECONCILED');
    });
  }
  revoke(r) {
    exact(r,['roundId','tenantId','salesId']);
    return this.#store.transaction(state=>{
      const round=ledger(state).rounds.find(x=>x.config.roundId===r.roundId);
      if(!round||!owner(round.config,r))return result('SCOPE_MISMATCH');
      round.revoked=true;return result('REVOKED');
    });
  }
  status() {
    const l=this.#store.read().trialBudget??{rounds:[],tickets:[]};
    return result(l.rounds.some(r=>r.config.source==='LOCAL_CONTROLLED_CALL')?'LOCAL_ACCOUNTING_ONLY':'SIMULATION_ONLY',{rounds:l.rounds,tickets:l.tickets});
  }
}
