import './timer-cli-offline.mjs';
import {registerHooks} from 'node:module';
const target=new URL('../src/adb-session-close-port.mjs',import.meta.url).href;
registerHooks({load(url,context,next){
 if(url!==target)return next(url,context);
 return {format:'module',shortCircuit:true,source:`
 import {readFileSync,writeFileSync,appendFileSync,existsSync} from 'node:fs';
 import {join} from 'node:path';
 import {createHash} from 'node:crypto';
 export class AdbSessionClosePort {
  constructor({directory,mapping}){this.dir=directory;this.mapping=mapping;}
  async disable(){appendFileSync(join(this.dir,'close-port.jsonl'),'"DISABLE_COMPONENTS"\\n');}
  async collect(session){return {decision:'COLLECTED',snapshot:{nativeBytes:readFileSync(join(this.dir,'fake-native.json'),'utf8'),device:{deviceKey:this.mapping.deviceKey,accountKey:this.mapping.accountKey,installationKey:session.transportPermit.installationKey,observedAt:Date.now(),componentsDisabled:true,inCall:false},ledger:{schemaVersion:2,requests:[],permits:[]}}};}
  async disablePermit({expectedFingerprint,nextBytes}){
   const path=join(this.dir,'fake-native.json');
   if(createHash('sha256').update(readFileSync(path)).digest('hex')!==expectedFingerprint||JSON.parse(nextBytes).enabled!==false)throw Error('BAD_WRITE');
   writeFileSync(path,nextBytes);appendFileSync(join(this.dir,'close-port.jsonl'),'"DISABLE_PERMIT"\\n');
   if(existsSync(join(this.dir,'stall-after-write'))){writeFileSync(join(this.dir,'write-complete'),'READY');await new Promise(()=>setInterval(()=>{},1000));}
  }
 }
 `};
}});
