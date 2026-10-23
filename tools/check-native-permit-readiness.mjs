import {inspectNativePermitSwitch} from '../packages/core/src/native-permit-readiness.mjs';
import {fixture} from '../packages/core/test-support/native-permit-fixture.mjs';
import {createHash} from 'node:crypto';
if(process.argv.slice(2).join()!=='--simulate'){console.log(JSON.stringify({decision:'DENY',reason:'SIMULATION_FLAG_REQUIRED',actualPhoneCalls:0}));process.exitCode=1;}
else{
 const x=fixture(),initial=inspectNativePermitSwitch(x);
 x.ledger.permits=[{id:x.expected.permitId,fingerprint:createHash('sha256').update(x.nativeBytes).digest('hex'),used:1}];
 const restored=inspectNativePermitSwitch(structuredClone(x));
 x.nativeBytes+='\n';const changed=inspectNativePermitSwitch(x);
 x.nativeBytes=x.nativeBytes.trimEnd();x.ledger.requests=[{status:'HANDOFF_UNKNOWN'}];const pending=inspectNativePermitSwitch(x);
 console.log(JSON.stringify({mode:'SYNTHETIC_SNAPSHOT_ONLY',initial,restored,changed,pending,deviceAccess:false,permitWrites:0,actualPhoneCalls:0},null,2));
}
