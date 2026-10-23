const fail=code=>{throw Error(code);};
/** Revokes capability only. Does not hang up, reconcile UNKNOWN, delete records or reset quotas. */
export async function closeLiveValidation({permitId,store,device,api}){
 if(typeof permitId!=='string'||!/^CONTROLLED-[a-f0-9]{64}$/.test(permitId))fail('EXPLICIT_PERMIT_ID_REQUIRED');
 let locked=false,report;
 try{
  await store.lock();locked=true;const server=await store.read();if(server&&server.id!==permitId)fail('SERVER_PERMIT_OWNER_CHANGED');
  const unverified=[];let serverRevoked=!server;
  if(server)try{await store.clear(permitId);serverRevoked=true;}catch{unverified.push('SERVER_PERMIT');}
  let phone,scope=server,deviceRevoked=false,queueState='NOT_IDENTIFIABLE_NO_RESULT_CHANGES';
  try{phone=await device.inspect();}catch{unverified.push('DEVICE_PERMIT');}
  if(phone){
   const entries=[phone.active,phone.pending].filter(Boolean),foreign=entries.some(p=>p.id!==permitId);
   scope??=entries.find(p=>p.id===permitId);
   if(scope?.deviceId&&phone.deviceId!==scope.deviceId)unverified.push('DEVICE_IDENTITY');
   else if(foreign)unverified.push('DEVICE_PERMIT_OWNER_CHANGED');
   else{
    scope??=entries.find(p=>p.id===permitId);
    if(entries.length){
     if(!scope?.queueId||phone.alarm&&phone.alarm.state!=='DISABLED'&&phone.alarm.queueId!==scope.queueId)unverified.push('DEVICE_OTHER_QUEUE');
     else try{await device.stopAndClear(scope);deviceRevoked=true;}catch{unverified.push('DEVICE_PERMIT');}
    }else deviceRevoked=true;
   }
  }
  if(scope){
   try{
    const status=await api('status'),a=status.actor;if(a?.tenantId!==scope.tenantId||a.userId!==scope.ownerId||a.mode!=='LIVE'||a.role!=='SALES')fail('PERMIT_ACTOR_MISMATCH');
    if(status.queue?.id===scope.queueId){
     queueState=status.queue.state;
     if(!['STOPPED','FINISHED'].includes(queueState)){await api('pause',{queueId:scope.queueId,expectedVersion:status.queue.version});queueState='STOPPED';}
    }else queueState='NOT_CURRENT_PRESERVED';
   }catch{unverified.push('QUEUE_STATE');}
  }
  report={decision:unverified.length?'PARTIALLY_REVOKED':scope?'REVOKED':'ALREADY_ABSENT',permitId,serverRevoked,deviceRevoked,queueState,unverified,pendingResultsUnchanged:true,quotaUnchanged:true,doesNotHangUpExistingCall:true,actualPhoneCalls:0};
 }finally{
  if(locked)try{await store.unlock();}catch{if(!report)fail('CLOSURE_LOCK_CLEANUP_REQUIRED');report.decision='PARTIALLY_REVOKED';report.unverified.push('PREPARATION_LOCK');}
 }
 return report;
}
