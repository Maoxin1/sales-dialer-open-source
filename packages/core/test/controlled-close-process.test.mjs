import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,readdirSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {DatabaseSync} from 'node:sqlite';
import {fixture} from '../test-support/timer-process-fixture.mjs';
const cli=fileURLToPath(new URL('../../../tools/close-contact-session.mjs',import.meta.url));
const preload=new URL('../test-support/close-cli-offline.mjs',import.meta.url).href;
const id='CLOSE-PROCESS-0001';
function closing(t){
 const f=fixture(t),session=JSON.parse(readFileSync(join(f.local,'contact-controlled-session.json')));
 const native=JSON.stringify({...session.transportPermit,enabled:true});
 writeFileSync(join(f.local,'contact-controlled-next-permit.json'),native);writeFileSync(join(f.local,'fake-native.json'),native);
 const run=(mode='--close',operation=id)=>{const r=spawnSync(process.execPath,['--import',preload,cli,mode,operation],{cwd:f.dir,encoding:'utf8',timeout:10000});assert.ifError(r.error);const value=JSON.parse(r.stdout);t.diagnostic(JSON.stringify({mode,exit:r.status,decision:value.decision,reason:value.reason,duplicate:value.duplicate}));return {...r,value};};
 const journal=()=>{const db=new DatabaseSync(join(f.local,'contact-session-close.db'),{readOnly:true});try{return db.prepare('SELECT state,active FROM closures WHERE id=?').get(id);}finally{db.close();}};
 const verify=()=>{assert.equal(existsSync(f.owner),false);assert.equal(journal().state,'CLOSED');assert.equal(journal().active,0);const gate=new DatabaseSync(join(f.local,'native-device-gate.db'),{readOnly:true});try{const claims=gate.prepare('SELECT state FROM device_claims').all();assert.equal(claims.length,1);assert.equal(claims[0].state,'RELEASED');}finally{gate.close();}assert.equal(f.status().paused,true);assert.equal(f.status().controlled.attempts.length,0);assert.equal(JSON.parse(readFileSync(join(f.local,'fake-native.json'))).enabled,false);assert.deepEqual(readdirSync(join(f.local,'contact-session-history')),[id]);for(const name of ['contact-controlled-session.json','contact-controlled-next-permit.json','contact-controlled-deployment.json']){assert.equal(existsSync(join(f.local,name)),false);assert.ok(existsSync(join(f.local,'contact-session-history',id,name)));}assert.equal(readFileSync(join(f.local,'close-port.jsonl'),'utf8').split('DISABLE_PERMIT').length-1,1);};
 return {...f,run,journal,verify};
}
test('T526 close CLI rejects live owner then closes killed runner without replay',async t=>{
 const f=closing(t),c=f.start();await f.running(c);const denied=f.run();assert.equal(denied.status,1);assert.equal(denied.value.reason,'RUN_OWNER_ACTIVE');assert.equal(existsSync(join(f.local,'close-port.jsonl')),false);
 c.kill('SIGKILL');t.diagnostic(JSON.stringify({runnerExit:await c.done}));assert.equal(f.run().status,0);f.verify();assert.equal(f.run('--resume').value.duplicate,true);f.verify();
});
test('T527 killed close after device write resumes same ID without repeated write',async t=>{
 const f=closing(t),runner=f.start();await f.running(runner);runner.kill('SIGKILL');await runner.done;
 writeFileSync(join(f.local,'stall-after-write'),'TEST');
 const c=spawn(process.execPath,['--import',preload,cli,'--close',id],{cwd:f.dir,windowsHide:true,stdio:'ignore'});
 const done=new Promise((resolve,reject)=>{c.once('error',reject);c.once('close',(code,signal)=>resolve({code,signal}));});
 c.done=done;f.track(c);
 for(let i=0;!existsSync(join(f.local,'write-complete'));i++){assert.ok(i<100,'write checkpoint timeout');assert.equal(c.exitCode,null);await delay(50);}
 assert.equal(f.journal().state,'CLOSING');assert.equal(f.journal().active,1);c.kill('SIGKILL');t.diagnostic(JSON.stringify({closeExit:await done}));
 unlinkSync(join(f.local,'stall-after-write'));
 assert.equal(f.run('--close','CLOSE-OTHER-0002').status,1);assert.equal(f.run('--close').status,1);assert.equal(f.run('--resume').status,0);f.verify();assert.equal(f.run('--resume').value.duplicate,true);f.verify();
});
