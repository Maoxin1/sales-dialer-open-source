const fields=['schemaVersion','source','deviceKey','observedAt','deviceObservedAt','permissions','accountsStatus','accounts','inCall','exactAlarm','backgroundRestricted','ignoringBatteryOptimizations','realCallsEnabled'];
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&Object.keys(v).every(k=>keys.includes(k));
export class PhoneCapabilities {
 #snapshot=null; #selected=null; #fingerprint=null;
 constructor({read,now=()=>Date.now()}){this.read=read;this.now=now;}
 async refresh(){
  this.status();
  try{
   const s=await this.read();
   if(!exact(s,fields)||s.schemaVersion!==1||s.source!=='ANDROID_READ_ONLY'||!hash(s.deviceKey)||s.realCallsEnabled!==false
    ||!Number.isSafeInteger(s.observedAt)||s.observedAt>this.now()||this.now()-s.observedAt>10000
    ||!Number.isSafeInteger(s.deviceObservedAt)||s.deviceObservedAt<0
    ||!exact(s.permissions,['callPhone','readPhoneState','readPhoneNumbers'])||Object.values(s.permissions).some(v=>typeof v!=='boolean')
    ||!['KNOWN','UNKNOWN'].includes(s.accountsStatus)||!Array.isArray(s.accounts)||s.accounts.length>16
    ||s.accounts.some(a=>!exact(a,['key','label','enabled'])||!hash(a.key)||typeof a.label!=='string'||a.label.length>80||typeof a.enabled!=='boolean')
    ||new Set(s.accounts.map(a=>a.key)).size!==s.accounts.length
    ||['inCall','exactAlarm','backgroundRestricted','ignoringBatteryOptimizations'].some(k=>s[k]!==null&&typeof s[k]!=='boolean'))throw Error('INVALID_PHONE_SNAPSHOT');
   const fingerprint=JSON.stringify({...s,observedAt:0,deviceObservedAt:0,accounts:[...s.accounts].sort((a,b)=>a.key.localeCompare(b.key))});
   if(fingerprint!==this.#fingerprint)this.#selected=null;
   this.#fingerprint=fingerprint;this.#snapshot=structuredClone(s);return this.status();
  }catch(e){this.#snapshot=null;this.#selected=null;this.#fingerprint=null;throw e;}
 }
 #ready(){const s=this.#snapshot;return s&&Object.values(s.permissions).every(v=>v===true)&&s.accountsStatus==='KNOWN'&&s.inCall===false&&s.exactAlarm===true&&s.backgroundRestricted===false&&s.ignoringBatteryOptimizations===true;}
 select(key){
  this.status();const a=this.#snapshot?.accounts.find(a=>a.key===key&&a.enabled);
  if(!this.#ready()||!a){this.#selected=null;return {decision:'DENY',reason:'PHONE_PREREQUISITES_NOT_MET'};}
  this.#selected={key:a.key,label:a.label,deviceKey:this.#snapshot.deviceKey};return {decision:'OK',...this.status()};
 }
 status(){
  if(this.#snapshot&&(this.now()<this.#snapshot.observedAt||this.now()-this.#snapshot.observedAt>=60000)){this.#snapshot=null;this.#selected=null;this.#fingerprint=null;}
  return {snapshot:structuredClone(this.#snapshot),selectedAccount:structuredClone(this.#selected),prerequisites:this.#ready()&&this.#selected?'OBSERVED_READY':'BLOCKED_OR_UNKNOWN',realCallsEnabled:false,callAuthorization:'DENY'};
 }
}
