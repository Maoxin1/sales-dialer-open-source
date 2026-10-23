
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,rmSync,writeFileSync,readFileSync,existsSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {ContactWorkspace} from '../src/contact-workspace.mjs';
import {contactWireId} from '../src/contact-wire-id.mjs';
const cli=fileURLToPath(new URL('../../../tools/run-contact-timer.mjs',import.meta.url));
const preload=new URL('../test-support/timer-cli-offline.mjs',import.meta.url).href;
const root=fileURLToPath(new URL('../../../.local/',import.meta.url));
const base=Date.parse('2026-10-16T02:00:00Z');
export function fixture(t){
 mkdirSync(root,{recursive:true});const dir=mkdtempSync(join(root,'timer-process-')),local=join(dir,'.local'),owner=join(local,'contact-timer-owner');mkdirSync(local);mkdirSync(join(dir,'tools'));
 writeFileSync(join(dir,'tools/deploy-contact-permit.mjs'),`console.log(JSON.stringify({decision:'PREVIEW',changeRequired:false}));`);
 const actor={tenantId:'LOCAL-PERSONAL',salesId:'LOCAL-SELF',permissions:['read','import','plan','trigger','reconcile']};
 const db=join(local,'workbench.db.contacts.db'),w=new ContactWorkspace({path:db,actor,now:()=>base});
 const target=w.execute({op:'import',rows:['19900000001'],source:'SYNTHETIC',qualification:'CONFIRMED'}).rows[0].targetId;
 assert.equal(w.execute({op:'plan',targetId:target,expectedRevision:1,plannedAt:base+300000,requestId:'PLAN-PROCESS-0001'}).decision,'OK');w.close();
 const permit={permitId:'SESSION-PROCESS',tenantId:actor.tenantId,salesId:actor.salesId,targetId:target,deviceKey:'a'.repeat(64),accountKey:'b'.repeat(64),notBefore:base,expiresAt:base+600000,maxAttempts:1,source:'EXPLICIT_CONTROLLED_CALL',consentRef:'CONTROLLED-SYNTHETIC-PROCESS'};
 const transportPermit={mode:'LOCAL_CONTROLLED_CALL',approvalRef:permit.consentRef,token:'c'.repeat(64),notBefore:permit.notBefore,expiresAt:permit.expiresAt,permitId:contactWireId('PERMIT',permit.permitId),tenantId:contactWireId('TENANT',permit.tenantId),salesId:contactWireId('SALES',permit.salesId),targetKey:contactWireId('TARGET',target),installationKey:'d'.repeat(64),accountKey:permit.accountKey};
 for(const [name,value]of Object.entries({'contact-controlled-session.json':{permit,transportPermit},'contact-android.json':{...permit,serial:'SYNTHETIC',apkSha256:'e'.repeat(64)},'contact-controlled-next-permit.json':{synthetic:true},'contact-controlled-deployment.json':{synthetic:true}}))writeFileSync(join(local,name),JSON.stringify(value));
 const children=[];
 t.after(async()=>{for(const c of children)if(c.exitCode===null&&c.signalCode===null){c.kill('SIGKILL');await c.done;}rmSync(dir,{recursive:true,force:true});});
 const start=()=>{const c=spawn(process.execPath,['--import',preload,cli,'start-approved'],{cwd:dir,windowsHide:true});c.output='';c.stderrText='';c.stdout.on('data',b=>c.output+=b);c.stderr.on('data',b=>c.stderrText+=b);c.done=new Promise((resolve,reject)=>{c.once('error',reject);c.once('close',(code,signal)=>resolve({code,signal}));});children.push(c);return c;};
 const command=op=>{const r=spawnSync(process.execPath,['--import',preload,cli,op],{cwd:dir,encoding:'utf8',timeout:10000});assert.ifError(r.error);return {...r,value:JSON.parse(r.stdout.trim().split('\n')[0])};};
 const running=async c=>{for(let i=0;i<100;i++){if(existsSync(join(owner,'state.json'))&&JSON.parse(readFileSync(join(owner,'state.json'))).state==='RUNNING')return JSON.parse(readFileSync(join(owner,'state.json')));if(c.exitCode!==null)throw Error(c.output+c.stderrText);await delay(50);}throw Error('START_TIMEOUT '+c.output);};
 const status=()=>{const w=new ContactWorkspace({path:db,actor,now:()=>base});try{return w.status();}finally{w.close();}};
 const closed=async c=>{const r=await Promise.race([c.done,delay(10000,undefined,{ref:false}).then(()=>{throw Error('EXIT_TIMEOUT');})]);t.diagnostic(JSON.stringify({exit:r,ownerState:'CLOSED',commands:'disable-only'}));assert.equal(r.code,0,c.output+c.stderrText);assert.equal(existsSync(owner),false);const history=readdirSync(join(local,'contact-timer-history'));assert.equal(history.length,1);assert.equal(JSON.parse(readFileSync(join(local,'contact-timer-history',history[0],'state.json'))).state,'CLOSED');assert.equal(status().paused,true);assert.equal(status().controlled.attempts.length,0);const commands=readFileSync(join(local,'offline-port.jsonl'),'utf8').trim().split('\n').map(JSON.parse);assert.equal(commands.length,2);assert.ok(commands.every(a=>a.includes('disable')));return r;};
 return {dir,local,owner,start,command,running,status,closed,track:c=>children.push(c)};
}
