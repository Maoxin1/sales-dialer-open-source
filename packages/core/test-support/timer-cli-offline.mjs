// Test-only preload: exact transport replacement; no production simulation switch.
import {registerHooks} from 'node:module';
const transport=new URL('../src/adb-controlled-call-transport.mjs',import.meta.url).href;
const started=performance.now();
Date.now=()=>Date.parse('2026-10-16T02:00:00Z')+Math.floor(performance.now()-started);
registerHooks({load(url,context,next){
 if(url!==transport)return next(url,context);
 return {format:'module',shortCircuit:true,source:`
 import {appendFileSync} from 'node:fs';
 import {AdbControlledCallTransport as Real} from ${JSON.stringify(transport+'?offline-base')};
 export class AdbControlledCallTransport extends Real {
  async run(args){
   appendFileSync('.local/offline-port.jsonl',JSON.stringify(args)+'\\n');
   if(args.includes('disable'))return 'new state: disabled';
   throw Error('OFFLINE_NO_PHONE_ACCESS');
  }
  async readControlledDevice(){throw Error('OFFLINE_NO_PHONE_ACCESS');}
 }
 `};
}});
