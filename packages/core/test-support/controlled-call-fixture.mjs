export const CALL_NOW=Date.parse('2026-10-15T01:00:00Z');
export function controlledCallFixture(){
 const scope={tenantId:'SYNTHETIC-TENANT',salesId:'SYNTHETIC-SALES',deviceKey:'a'.repeat(64),installationKey:'b'.repeat(64),accountKey:'c'.repeat(64),targetKey:'SYNTHETIC-RECEIVER'};
 return {now:CALL_NOW,permit:{schemaVersion:1,purpose:'CONTROLLED_CALL',source:'TEST_FIXTURE',permitId:'SYNTHETIC-PERMIT',approvalRef:'SYNTHETIC-APPROVAL',...scope,notBefore:CALL_NOW,expiresAt:CALL_NOW+60000,maxAttempts:1,revoked:false},
  context:{...scope,attemptId:'SYNTHETIC-ATTEMPT',ticketId:'SYNTHETIC-TICKET',intentId:'SYNTHETIC-INTENT',taskId:'SYNTHETIC-TASK',cycle:1,planVersion:1,currentPlanVersion:1,policyVersion:1,currentPolicyVersion:1,qualificationRevision:1,currentQualificationRevision:1,qualification:'CONFIRMED',doNotContact:false,paused:false,occupiedBy:'SYNTHETIC-ATTEMPT',attemptStatus:'AUTHORIZED',ticketState:'HELD_UNKNOWN',phoneInCall:false,permissionsGranted:true,accountEnabled:true,observedAt:CALL_NOW,usedAttempts:0,lastObservedAt:CALL_NOW}};
}
