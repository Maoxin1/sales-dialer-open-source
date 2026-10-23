import test from 'node:test';
import assert from 'node:assert/strict';
import { leaseProof } from '../src/android-time-lease.mjs';
import { AdbSyntheticTransport } from '../src/adb-synthetic-transport.mjs';
import { commandDigest } from '../src/android-sandbox-adapter.mjs';
const hash='a'.repeat(64),nonce='b'.repeat(32);
const lease=()=>({schemaVersion:1,status:'READY',commandDigest:hash,nonce,issuedElapsed:100000,expiresElapsed:160000,bootCount:5});
for(const skew of [-86400000,-27000,0,27000,86400000])test('T-CALL-144 remaining lifetime independent of wall offset '+skew,async()=>{
 const hostNow=1792030000000+skew,c={schemaVersion:1,mode:'simulation',tenantId:'SYNTHETIC-TENANT',salesId:'SYNTHETIC-SALES',taskId:'SYNTHETIC-TASK',attemptId:'SYNTHETIC-ATTEMPT',intentId:'SYNTHETIC-INTENT',targetKey:'SYNTHETIC-TARGET',deviceId:'SYNTHETIC-DEVICE',simId:'SYNTHETIC-NO-SIM',cycle:1,planVersion:1,policyVersion:1,qualificationRevision:1,issuedAt:hostNow,expiresAt:hostNow+60000};
 let mono=0,wire;
 const t=new AdbSyntheticTransport({adbPath:'unused',serial:'TEST',now:()=>hostNow,monotonic:()=>mono});
 t.run=async args=>{if(args[0]==='get-state')return 'device';if(args.includes('start')){if(args.includes('com.mantou.salesdialer.spike/.SyntheticBridgeActivity'))wire=args;return 'Status: ok';}
 if(args.at(-1).includes('lease-reply-')){mono=250;return JSON.stringify({...lease(),commandDigest:commandDigest(c)});}return JSON.stringify({status:'SIMULATED_ACCEPTED'});};
 assert.equal((await t.send(c)).status,'SIMULATED_ACCEPTED');assert.ok(wire.includes(nonce));assert.equal(wire.at(-1),'159750');
 assert.equal(JSON.parse(Buffer.from(wire[wire.indexOf('command')+1],'base64url')).issuedAt,hostNow);
});
test('T-CALL-145 malformed, mismatched, expired or exhausted lease fails closed',()=>{
 for(const change of [{commandDigest:'c'.repeat(64)},{nonce:'bad'},{expiresElapsed:100000},{issuedElapsed:NaN},{status:'REJECTED'},{bootCount:-1}])assert.throws(()=>leaseProof({lease:{...lease(),...change},digest:hash,remainingAtRequest:60000,roundTripMs:250}));
 for(const roundTripMs of [-1,60000,NaN])assert.throws(()=>leaseProof({lease:lease(),digest:hash,remainingAtRequest:60000,roundTripMs}));
});
test('T-CALL-146 reused lease can only shorten deadline, never extend it',()=>{
 assert.equal(leaseProof({lease:lease(),digest:hash,remainingAtRequest:40000,roundTripMs:250}).validUntilElapsed,139750);
 const r=leaseProof({lease:{...lease(),expiresElapsed:110000},digest:hash,remainingAtRequest:60000,roundTripMs:250});assert.equal(r.validUntilElapsed,110000);
});
