import { appendFileSync } from 'node:fs';
import { SQLiteStore } from '../src/sqlite-store.mjs';
import { SimulationEngine } from '../src/simulation-engine.mjs';
import { FakeClock } from './fake-clock.mjs';
import { FakeDialAdapter } from './fake-dial-adapter.mjs';
import { SALES, TARGET, TASK, NOW } from './simulation-fixture.mjs';

const options=JSON.parse(process.argv[2]);
const store=new SQLiteStore(options.path);
const engine=new SimulationEngine({store,clock:new FakeClock(NOW),fault:point=>{if(point===options.crash)process.exit(77);}});
class RecordingAdapter extends FakeDialAdapter {
  async submit(grant) {
    appendFileSync(options.requestsPath,JSON.stringify(grant)+'\n');
    return super.submit(grant);
  }
}
process.send({ready:true});
process.once('message',async ()=>{
  try {
    let result;
    if(options.action==='refuse')result=engine.refuse({actorId:SALES,targetKey:TARGET});
    else if(options.action==='consume')result=await engine.consume({actorId:SALES,attemptId:options.attemptId},new RecordingAdapter());
    else {
      result=engine.authorize({actorId:SALES,taskId:TASK,planVersion:1,policyVersion:1,intentId:options.intentId??'SYNTHETIC-INTENT-1',trigger:options.trigger??'scheduled'});
      if(options.crash==='after-authorization-commit')process.exit(77);
    }
    console.log(JSON.stringify(result));store.close();process.disconnect();
  }catch(error){console.error(error.stack);store.close();process.exitCode=1;process.disconnect();}
});
