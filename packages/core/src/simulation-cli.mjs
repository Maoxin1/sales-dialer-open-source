import { createInterface } from 'node:readline';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SQLiteStore } from './sqlite-store.mjs';
import { MemoryStore } from './memory-store.mjs';
import { SimulationSession, commandFields } from './simulation-session.mjs';
import { SALES, TARGET, TASK, NOW } from '../test-support/simulation-fixture.mjs';

const print=value=>console.log(JSON.stringify(value));
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
async function main() {
  const args=process.argv.slice(2);let db=resolve(root,'.local/simulation.db'),demo=false;
  for(let i=0;i<args.length;i++) {
    if(args[i]==='--help') { print({usage:'node packages/core/src/simulation-cli.mjs [--db path | --demo]',commands:commandFields,mode:'simulation-only'});return; }
    if(args[i]==='--demo')demo=true;
    else if(args[i]==='--db'&&args[i+1])db=resolve(args[++i]);
    else if(args[i]==='--mode') { print({decision:'DENY',reason:'REAL_ADAPTER_UNAVAILABLE'});process.exitCode=2;return; }
    else { print({decision:'DENY',reason:'INVALID_ARGUMENTS'});process.exitCode=2;return; }
  }
  if(!demo)mkdirSync(dirname(db),{recursive:true});
  const store=demo?new MemoryStore():new SQLiteStore(db);
  try {
    const session=new SimulationSession(store);
    console.error('本地合成仿真；无真实外呼。初始虚拟时间为2026-10-14北京时间09:00；用time/advance推进，用tick投递定时事件。输入JSON命令；help查看命令，quit退出。');
    if(demo) {
      const commands=[{op:'import',rows:[{raw:TARGET,qualification:'CONFIRMED',source:'SYNTHETIC-ATTESTATION'},{raw:'SYNTHETIC-TARGET-2',qualification:'CONFIRMED',source:'SYNTHETIC-ATTESTATION'}]},
        {op:'task',taskId:TASK,targetKey:TARGET,assignedSalesId:SALES,plannedAt:NOW},
        {op:'task',taskId:'SYNTHETIC-TASK-2',targetKey:'SYNTHETIC-TARGET-2',assignedSalesId:SALES,plannedAt:NOW},
        {op:'tick',taskId:TASK,planVersion:1,policyVersion:1,intentId:'SYNTHETIC-DEMO-I-1'}];
      for(const cmd of commands)print(await session.execute(cmd));
      const first=session.engine.snapshot({actorId:SALES}).attempts[0];
      print(await session.execute({op:'reconcile',attemptId:first.attemptId,noActiveCall:true,result:'NO_ANSWER'}));
      print(await session.execute({op:'next',taskIds:['SYNTHETIC-TASK-2'],intentId:'SYNTHETIC-DEMO-I-2',outcome:'UNKNOWN'}));
      print(session.status());return;
    }
    const input=createInterface({input:process.stdin,crlfDelay:Infinity});
    try {
      for await(const line of input) {
        if(!line.trim())continue;
        let command;
        try { if(line.length>65536)throw new Error();command=JSON.parse(line); }
        catch {print({decision:'DENY',reason:'INVALID_JSON'});process.exitCode=2;continue;}
        try {
          const result=await session.execute(command);print(result);
          if(result.stopped)break;
        }catch {print({decision:'DENY',reason:'COMMAND_FAILED_STATE_PRESERVED'});process.exitCode=2;}
      }
    }finally{input.close();}
  } finally {store.close();}
}
try {await main();}catch {print({decision:'DENY',reason:'SIMULATION_START_FAILED'});process.exitCode=2;}
