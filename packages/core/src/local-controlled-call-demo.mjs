import {mkdirSync,mkdtempSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {SQLiteStore} from './sqlite-store.mjs';
import {AdbControlledCallTransport} from './adb-controlled-call-transport.mjs';
import {LocalControlledCallCoordinator} from './local-controlled-call-coordinator.mjs';
import {fixture,SALES,TENANT,TARGET,NOW} from '../test-support/simulation-fixture.mjs';
const local=resolve(dirname(fileURLToPath(import.meta.url)),'../../../.local');mkdirSync(local,{recursive:true});
const directory=mkdtempSync(join(local,'controlled-local-demo-')),path=join(directory,'business.db');
const permit={mode:'LOCAL_CONTROLLED_CALL',approvalRef:'CONTROLLED-SYNTHETIC-DEMO',token:'c'.repeat(64),notBefore:NOW,expiresAt:NOW+60000,permitId:'SYNTHETIC-DEMO-PERMIT',tenantId:TENANT,salesId:SALES,targetKey:TARGET,installationKey:'a'.repeat(64),accountKey:'b'.repeat(64)};
class RecordingUsb extends AdbControlledCallTransport{
 submissions=0;
 async run(){throw Error('DEMO_DEVICE_ACCESS_DISABLED');}
 async readControlledDevice(){return {deviceKey:'e'.repeat(64),installationKey:permit.installationKey,accountKey:permit.accountKey,observedAt:NOW,inCall:false,permissionsGranted:true,accountEnabled:true};}
 async submit(){this.submissions++;return {apiSubmission:'UNKNOWN'};}
 async readReceipt(){return {apiSubmission:'UNKNOWN'};}
 async reconcile(){return {nativeReconciled:true,hostReconciled:false};}
}
const port=new RecordingUsb({adbPath:'DEMO-DISABLED',serial:'SYNTHETIC-DEMO',journalPath:join(directory,'delivery.db'),permit,expectedApkHash:'d'.repeat(64),hostDeviceKey:'e'.repeat(64)});
let store=new SQLiteStore(path);
try{
 const f=fixture({store});store.transaction(s=>s.policy.controlledPermitId=permit.permitId);
 const grant=f.engine.authorize(f.request()),config={...port.binding(),maxAttempts:1},req={actorId:SALES,attemptId:grant.attemptId,permitId:permit.permitId};
 let service=new LocalControlledCallCoordinator({store,clock:f.clock,permit:config,port});
 await service.submit(req);assert.equal(port.submissions,1);store.close();store=new SQLiteStore(path);
 service=new LocalControlledCallCoordinator({store,clock:f.clock,permit:config,port});service.recover();assert.equal((await service.submit(req)).decision,'DENY');await service.refresh(req);assert.equal(port.submissions,1);
 await service.reconcile({...req,noActiveCall:true,result:'UNKNOWN'});const state=store.read();assert.equal(state.trialBudget.rounds[0].used,1);assert.equal(state.attempts[req.attemptId].status,'FINISHED');
 console.log(JSON.stringify({source:'SYNTHETIC_DEMO',directory,recordedSubmissions:port.submissions,realPhoneCalls:0,unknownNotReplayed:true,usedAttempts:1,finalStatus:'FINISHED',nativeReconciliation:'TEST_DOUBLE_ONLY'},null,2));
}finally{store.close();port.close();}
