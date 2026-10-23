import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {realpathSync,writeFileSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {PhoneCapabilities} from './phone-capabilities.mjs';
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export async function prepareContactBinding({dbPath,actor,targetId,provider,serial,expectedApkHash,accountLabel='电销卡',now=Date.now}){
 const read=()=>{let db;try{db=new DatabaseSync(dbPath,{readOnly:true});const c=db.prepare('SELECT id,number,qualification,refused,revision FROM contacts WHERE id=? AND tenant=? AND seller=?').get(targetId,actor.tenantId,actor.salesId);if(!c||c.refused||c.qualification!=='CONFIRMED')throw Error('TARGET_NOT_ELIGIBLE');return c;}catch{throw Error('TARGET_NOT_ELIGIBLE');}finally{db?.close();}};
 const contact=read(),identity=await provider.inspect();if(identity.serial!==serial||identity.apkSha256!==expectedApkHash||!Number.isInteger(identity.sdk)||identity.sdk<31||!identity.bootId)throw Error('DEVICE_MISMATCH');
 const phone=new PhoneCapabilities({read:()=>provider.readPhone(expectedApkHash),now});await phone.refresh();const snapshot=phone.status().snapshot,cards=snapshot.accounts.filter(a=>a.label===accountLabel&&a.enabled);if(cards.length!==1||phone.select(cards[0].key).decision!=='OK')throw Error('CARD_NOT_READY_OR_AMBIGUOUS');
 if(digest(identity)!==digest(await provider.inspect()))throw Error('DEVICE_CHANGED');if(digest(contact)!==digest(read()))throw Error('TARGET_CHANGED');
 if(now()<snapshot.observedAt||now()-snapshot.observedAt>=10000)throw Error('OBSERVATION_EXPIRED');
 const mapping={tenantId:actor.tenantId,salesId:actor.salesId,targetId,serial,apkSha256:expectedApkHash,bootId:identity.bootId,sdk:identity.sdk,deviceKey:snapshot.deviceKey,accountKey:cards[0].key};
 const token=digest({mapping,revision:contact.revision});
 return {mapping,token,expiresAt:snapshot.observedAt+10000,preview:{targetId,maskedNumber:contact.number.slice(0,3)+'****'+contact.number.slice(-4),accountLabel,model:identity.model??'UNKNOWN',sdk:identity.sdk,token,realCallsEnabled:false},validate:()=>{if(digest(contact)!==digest(read()))throw Error('TARGET_CHANGED');}};
}
export function saveContactBinding({root,prepared,expectedToken,now=Date.now}){
 if(expectedToken!==prepared.token)throw Error('PREVIEW_CHANGED');if(now()>=prepared.expiresAt||now()<prepared.expiresAt-10000)throw Error('OBSERVATION_EXPIRED');prepared.validate();
 const base=realpathSync(root),local=realpathSync(resolve(root,'.local')),rel=relative(base,local);if(!rel||rel.startsWith('..')||isAbsolute(rel))throw Error('CONFIG_PATH_INVALID');
 // Exclusive creation: an existing binding is never silently replaced.
 try{writeFileSync(resolve(local,'contact-android.json'),JSON.stringify(prepared.mapping,null,2)+'\n',{flag:'wx',mode:0o600});}catch(e){if(e.code==='EEXIST')throw Error('CONFIG_ALREADY_EXISTS');throw Error('CONFIG_WRITE_FAILED');}
 return {saved:true,restartRequired:true,realCallsEnabled:false};
}
