import {PhoneCapabilities} from './phone-capabilities.mjs';
import {checkDialWindow} from './dial-window.mjs';
const weekday=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Shanghai',weekday:'short'});
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
/** Trusted composition only; provider has inspect/readPhone, never a send method. */
export class ContactPreflight {
 constructor({actor,mapping=null,provider=null,status,now=Date.now}){this.actor=structuredClone(actor);this.mapping=structuredClone(mapping);Object.assign(this,{provider,status,now});}
 async check(cmd){const result={decision:'OK',source:'ANDROID_PREFLIGHT_ONLY',ready:false,blockers:[],realCallsEnabled:false,callAuthorization:'DENY'};
 const local=()=>{const blockers=[];if(!this.actor.permissions.includes('read')||!this.actor.permissions.includes('trigger'))return {blockers:['FORBIDDEN']};const s=this.status(),p=s.plans?.find(p=>p.planId===cmd.planId);if(!p)return {blockers:['PLAN_UNAVAILABLE']};if(p.version!==cmd.expectedVersion)blockers.push('PLAN_CHANGED');blockers.push(...p.blockers.filter(r=>!['REAL_ADAPTER_DISABLED','NOT_DUE'].includes(r)));if(s.rehearsals.some(r=>r.status!=='FINISHED')||s.controlled?.attempts.some(r=>r.state==='HELD_UNKNOWN'))blockers.push('SALES_BUSY');const now=this.now();if(checkDialWindow({atEpochMs:now,trigger:'manual_now'}).decision!=='WINDOW_OK'||['Sat','Sun'].includes(weekday.format(now)))blockers.push('OUTSIDE_WINDOW');return {blockers,p,c:s.contacts.find(c=>c.targetId===p.targetId)};};
 let current=local();if(current.blockers.length)return {...result,blockers:current.blockers};const p=current.p,m=this.mapping;Object.assign(result,{targetId:p.targetId,planId:p.planId,planVersion:p.version,maskedNumber:current.c?.maskedNumber});
 if(!m||m.tenantId!==this.actor.tenantId||m.salesId!==this.actor.salesId||m.targetId!==p.targetId||![m.deviceKey,m.accountKey,m.apkSha256].every(hash)||typeof m.serial!=='string'||!m.serial||typeof m.bootId!=='string'||!m.bootId||!Number.isInteger(m.sdk)||m.sdk<31||typeof this.provider?.inspect!=='function'||typeof this.provider?.readPhone!=='function')return {...result,blockers:['BINDING_MISSING_OR_MISMATCH']};
 const matches=i=>i&&['serial','apkSha256','bootId','sdk'].every(k=>i[k]===m[k]);let phone;
 try{if(!matches(await this.provider.inspect()))throw Error('MISMATCH');}catch{return {...result,blockers:['DEVICE_CHECK_FAILED']};}
 try{phone=new PhoneCapabilities({read:()=>this.provider.readPhone(m.apkSha256),now:this.now});await phone.refresh();if(phone.status().snapshot?.deviceKey!==m.deviceKey||phone.select(m.accountKey).decision!=='OK')throw Error('BLOCKED');}catch{return {...result,blockers:['PHONE_CHECK_FAILED']};}
 try{if(!matches(await this.provider.inspect()))throw Error('MISMATCH');}catch{return {...result,blockers:['DEVICE_CHECK_FAILED']};}
 current=local();if(current.blockers.length)return {...result,blockers:current.blockers};const observed=phone.status().snapshot;if(!observed||this.now()<observed.observedAt||this.now()-observed.observedAt>=10000)return {...result,blockers:['PHONE_CHECK_FAILED']};
 return {...result,ready:true,observedAt:observed.observedAt,expiresAt:observed.observedAt+10000};
 }
}
