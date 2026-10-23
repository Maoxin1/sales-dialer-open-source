import {readFileSync,writeFileSync,existsSync,openSync,closeSync,unlinkSync,renameSync} from 'node:fs';import {join} from 'node:path';import {randomUUID} from 'node:crypto';
/** Shared preparation/revocation lock. Stale ownership is never guessed or removed automatically. */
export function createPermitPrivateStore(folder){
 const owner={pid:process.pid,nonce:randomUUID(),tag:'enterprise-permit-operation'},lock=join(folder,'prepare-owner.json'),staging=join(folder,'live-stage-private.json'),publishTemp=join(folder,'live-permit-publish.tmp'),permitPath=join(folder,'live-permit.json');let locked=false;const ownedTemporaryFiles=new Set();const requireOwner=()=>{if(!locked)throw Error('PREPARATION_LOCK_REQUIRED');const current=JSON.parse(readFileSync(lock,'utf8'));if(current.nonce!==owner.nonce||current.pid!==owner.pid)throw Error('PREPARATION_LOCK_OWNER_CHANGED');};
 return {
  lock:async()=>{let fd;try{fd=openSync(lock,'wx');writeFileSync(fd,JSON.stringify(owner));locked=true;}catch(e){if(e.code==='EEXIST')throw Error('PREPARATION_BUSY');throw e;}finally{if(fd!==undefined)closeSync(fd);}},
  unlock:async()=>{if(!locked)return;const current=JSON.parse(readFileSync(lock,'utf8'));if(current.nonce!==owner.nonce||current.pid!==owner.pid)throw Error('PREPARATION_LOCK_OWNER_CHANGED');for(const path of ownedTemporaryFiles)if(existsSync(path))unlinkSync(path);unlinkSync(lock);locked=false;},
  read:async()=>existsSync(permitPath)?JSON.parse(readFileSync(permitPath,'utf8')):null,
  trackStaging:()=>{requireOwner();ownedTemporaryFiles.add(staging);},
  publish:async p=>{requireOwner();ownedTemporaryFiles.add(publishTemp);writeFileSync(publishTemp,JSON.stringify(p)+'\n',{mode:0o600});renameSync(publishTemp,permitPath);},
  clear:async id=>{requireOwner();if(!existsSync(permitPath))return;const p=JSON.parse(readFileSync(permitPath,'utf8'));if(p.id!==id)throw Error('SERVER_PERMIT_OWNER_CHANGED');unlinkSync(permitPath);}
 };
}
