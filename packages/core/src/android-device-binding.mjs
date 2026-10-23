import { randomUUID } from 'node:crypto';
import { AndroidSandboxAdapter } from './android-sandbox-adapter.mjs';
/** Local development pairing only. Never a SIM/account or production identity binding. */
export class AndroidDeviceBinding {
 #current=null; #transport; #hash; #now; #generation=0;
 constructor({transport,expectedApkHash,now=()=>Date.now()}){
  if(typeof transport?.inspect!=='function'||typeof transport?.send!=='function'||!/^[a-f0-9]{64}$/.test(expectedApkHash))throw Error('INVALID_BINDING_PROVIDER');
  this.#transport=transport;this.#hash=expectedApkHash;this.#now=now;
 }
 status(){
  if(this.#current&&(this.#now()<this.#current.checkedAt||this.#now()>=this.#current.expiresAt))this.#current=null;
  return structuredClone(this.#current??{state:'UNBOUND',realCallsEnabled:false,realSimBound:false});
 }
 async bind(){
  this.#current=null;const generation=++this.#generation,p=await this.#transport.inspect();
  if(generation!==this.#generation)throw Error('BINDING_CHANGED');
  if(p.serial!==this.#transport.serial||p.apkSha256!==this.#hash||!Number.isSafeInteger(p.sdk)||p.sdk<31||!p.bootId)throw Error('CAPABILITY_NOT_VERIFIED');
  const checkedAt=this.#now();
  this.#current={state:'BOUND',deviceId:'SYNTHETIC-DEVICE-'+randomUUID().toUpperCase(),simId:'SYNTHETIC-NO-SIM',
   ...p,checkedAt,expiresAt:checkedAt+60000,realSimBound:false,realCallsEnabled:false,capabilities:{syntheticInbox:true,realPhonePermissions:'NOT_CHECKED',realSimAccounts:'NOT_BOUND'}};
  return this.status();
 }
 async verify(){
  const b=this.#current;if(!b)throw Error('DEVICE_UNBOUND');
  try{
   if(this.#now()<b.checkedAt||this.#now()>=b.expiresAt)throw Error('BINDING_EXPIRED');
   const p=await this.#transport.inspect();
   if(this.#current!==b)throw Error('BINDING_CHANGED');
   if(p.serial!==b.serial||p.bootId!==b.bootId||p.apkSha256!==b.apkSha256||p.sdk!==b.sdk)throw Error('DEVICE_CAPABILITY_CHANGED');
   if(this.#now()<b.checkedAt||this.#now()>=b.expiresAt)throw Error('BINDING_EXPIRED');
   return structuredClone(b);
  }catch(e){if(this.#current===b)this.#current=null;throw e;}
 }
 adapter(){
  const b=this.status();if(b.state!=='BOUND')throw Error('DEVICE_UNBOUND');
  return new AndroidSandboxAdapter({deviceId:b.deviceId,simId:b.simId,now:this.#now,transport:{send:async c=>{
   if(this.#current?.deviceId!==b.deviceId)throw Error('BINDING_CHANGED');
   await this.verify();return this.#transport.send(c);
  }}});
 }
}
