// Synthetic snapshots only. No phone or customer data access.
export function fixture(){
 const now=Date.parse('2026-10-16T02:00:00Z');
 const permit={schemaVersion:1,mode:'LOCAL_CONTROLLED_CALL',enabled:true,permitId:'PERMIT-A',approvalRef:'CONTROLLED-FIXTURE',token:'a'.repeat(64),installationKey:'b'.repeat(64),accountKey:'c'.repeat(64),tenantId:'TENANT-A',salesId:'SALES-A',targetKey:'TARGET-A',targetNumber:'13900000000',maxAttempts:2,notBefore:now-1000,expiresAt:now+60000,bootCount:7,issuedElapsed:1000,expiresElapsed:62000};
 return {now,deadline:now+30000,nativeBytes:JSON.stringify(permit),expected:{...permit,deviceKey:'d'.repeat(64),apkSha256:'e'.repeat(64)},host:{used:1,pending:0,qualified:true,refused:false,paused:false},device:{deviceKey:'d'.repeat(64),apkSha256:'e'.repeat(64),installationKey:permit.installationKey,accountKey:permit.accountKey,observedAt:now,inCall:false,permissionsGranted:true,accountEnabled:true,componentsDisabled:true,bootCount:7,elapsed:2000},ledger:{schemaVersion:2,requests:[{status:'RECONCILED'}],permits:[]}};
}
