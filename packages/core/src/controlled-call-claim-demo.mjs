import {mkdirSync,mkdtempSync} from 'node:fs';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
import {fixture,SALES,TENANT,TARGET,NOW} from '../test-support/simulation-fixture.mjs';
import {controlledCallFixture} from '../test-support/controlled-call-fixture.mjs';
import {ControlledCallPort} from '../test-support/controlled-call-port.mjs';
import {ControlledCallCoordinator} from './controlled-call-coordinator.mjs';
import {SQLiteStore} from './sqlite-store.mjs';
const root=resolve(import.meta.dirname,'../../..'),base=resolve(root,'.local');mkdirSync(base,{recursive:true});
const path=join(mkdtempSync(join(base,'call-claim-demo-')),'state.db');let store=new SQLiteStore(path);
try{
 const f=fixture({store}),grant=f.engine.authorize(f.request()),permit={...controlledCallFixture().permit,tenantId:TENANT,salesId:SALES,targetKey:TARGET,notBefore:NOW,expiresAt:NOW+60000};
 const readDevice=async()=>({deviceKey:permit.deviceKey,installationKey:permit.installationKey,accountKey:permit.accountKey,observedAt:NOW,inCall:false,permissionsGranted:true,accountEnabled:true});
 const port=new ControlledCallPort({outcome:'LOST_RECEIPT'}),config={store,clock:f.clock,permit,readDevice,port},service=new ControlledCallCoordinator(config),req={actorId:SALES,attemptId:grant.attemptId,permitId:permit.permitId};
 const first=await service.submit(req),duplicate=await service.submit(req);assert.equal(first.status,'RECONCILE_REQUIRED');assert.equal(duplicate.decision,'DENY');assert.equal(port.requests.length,1);
 store.close();store=new SQLiteStore(path);const restoredPort=new ControlledCallPort(),restored=new ControlledCallCoordinator({...config,store,port:restoredPort});restored.recover();const afterRestart=await restored.submit(req);assert.equal(afterRestart.decision,'DENY');assert.equal(restoredPort.requests.length,0);
 console.log(JSON.stringify({mode:'test-double-only',database:path,first,duplicate,afterRestart,used:store.read().trialBudget.rounds[0].used,firstPortRequests:port.requests.length,restartPortRequests:restoredPort.requests.length,actualPhoneApiCalls:0},null,2));
}finally{store.close();}
