import {createHash,randomUUID} from 'node:crypto';
import {signLivePermit} from './live-permit.mjs';
const fail=code=>{throw Error(code);};
const working=now=>{const d=new Date(now+28800000);return d.getUTCDay()>=1&&d.getUTCDay()<=5&&d.getUTCHours()>=9&&d.getUTCHours()<18;};
const dayEnd=now=>{const d=new Date(now+28800000);return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),18)-28800000;};
/** The caller cannot inject a schedule: consent is recent, and this only prepares a 15-second-start queue. */
export function validateLiveRequest(r,now){
 if(!Number.isSafeInteger(now)||!working(now)&&r?.allowOutOfHours!==true)fail('OUTSIDE_ACCEPTED_WORKING_WINDOW');
 const paired=Array.isArray(r?.receivers),receivers=paired?r.receivers:[r?.receiver];
 const keys=['authorizationId',paired?'receivers':'receiver','maxAttempts','confirmedAt','recipientConsentsNow','operatorConfirmsNow'];if(r?.allowOutOfHours===true)keys.push('allowOutOfHours');
 if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).sort().join()!==keys.sort().join()||typeof r.authorizationId!=='string'||r.authorizationId.length<8||r.authorizationId.length>100||!receivers.every(n=>typeof n==='string'&&/^1[3-9][0-9]{9}$/.test(n))||paired&&(receivers.length!==2||new Set(receivers).size!==2||r.maxAttempts<2||r.allowOutOfHours===true)||!Number.isSafeInteger(r.maxAttempts)||r.maxAttempts<1||r.maxAttempts>10||!Number.isSafeInteger(r.confirmedAt)||r.confirmedAt>now||now-r.confirmedAt>300000||r.recipientConsentsNow!==true||r.operatorConfirmsNow!==true)fail('CURRENT_BOUNDED_CONSENT_FIELDS_REQUIRED');
 if(r.allowOutOfHours!==true&&now+15000>=dayEnd(now))fail('START_TOO_CLOSE_TO_WINDOW_END');
}
/** No claim/start/telephone operation exists on this workflow. All ports are injectable for isolated tests. */
export async function prepareLiveValidation({request,api,device,store,key,clock=Date.now}){
 validateLiveRequest(request,clock());if(!Buffer.isBuffer(key)||key.length!==32)fail('PERMIT_KEY_REQUIRED');
 const id='CONTROLLED-'+createHash('sha256').update(request.authorizationId).digest('hex');let queue,queueRequested=false,staged=false,publishAttempted=false,locked=false;
 const cleanup=async()=>{const issues=[];if(publishAttempted)try{await store.clear(id);}catch{issues.push('SERVER_PERMIT');}if(staged)try{await device.clear(id);}catch{issues.push('DEVICE_PERMIT');}if(queue)try{const s=await api('status');if(s.queue?.id===queue.id&&!['STOPPED','FINISHED'].includes(s.queue.state))await api('pause',{queueId:queue.id,expectedVersion:s.queue.version});}catch{issues.push('QUEUE_STATE');}else if(queueRequested)issues.push('QUEUE_PREPARATION_RECEIPT');return issues;};
 try{
  await store.lock();locked=true;const old=await store.read();if(old&&(!Number.isSafeInteger(old.notAfter)||old.notAfter>=clock()))fail('CURRENT_LIVE_PERMIT_ALREADY_PRESENT');
  const s=await api('status'),a=s.actor;if(s.mode!=='LIVE'||a?.mode!=='LIVE'||a.role!=='SALES')fail('LIVE_SALES_REQUIRED');if(s.metrics.pending!==0)fail('PENDING_RECONCILIATION');if(!s.deviceBound)fail('PHONE_MUST_LOGIN_LIVE_AND_BIND_SELECTED_SIM_FIRST');
  const phone=await device.inspect();if(phone.user!==0)fail('DEVICE_USER_MISMATCH');if(!phone.apkMatches)fail('PHONE_APK_MISMATCH');if(!phone.protectedSessionPresent)fail('PHONE_SESSION_REQUIRED');if(typeof phone.deviceId!=='string'||phone.deviceId.length<8||typeof phone.accountKey!=='string'||!/^[a-f0-9]{64}$/.test(phone.accountKey))fail('INVALID_DEVICE');
  const receivers=request.receivers??[request.receiver],contacts=[];
  const imported=await api('import',{rows:receivers,source:'USER_AUTHORIZED_CONTROLLED_RECEIVER',qualification:'CONFIRMED'});
  if(!Array.isArray(imported.rows)||imported.rows.length!==receivers.length)fail('CONTROLLED_TARGET_NOT_ELIGIBLE');
  for(let index=0;index<receivers.length;index++){
   const row=imported.rows[index],receiver=receivers[index];if(!row?.targetId||!['IMPORTED','DUPLICATE'].includes(row.status))fail('CONTROLLED_TARGET_NOT_ELIGIBLE');
   let contact=s.contacts.find(c=>c.id===row.targetId),cursor=0;
   while(!contact){const page=await api('listContacts',{cursor,limit:200,query:receiver.slice(0,3)+'****'+receiver.slice(-4),filter:'ALL'});contact=page.contacts.find(c=>c.id===row.targetId);if(contact||page.nextCursor===null)break;if(!Number.isSafeInteger(page.nextCursor)||page.nextCursor<=cursor)fail('INVALID_CONTACT_PAGE');cursor=page.nextCursor;}
   if(!contact||contact.refused||contact.erased||contact.qualification!=='CONFIRMED')fail('CONTROLLED_TARGET_NOT_ELIGIBLE');contacts.push(contact);
  }
  if(new Set(contacts.map(c=>c.id)).size!==receivers.length)fail('CONTROLLED_TARGET_NOT_ELIGIBLE');
  const targetIds=contacts.map(c=>c.id),expectedContacts=Object.fromEntries(contacts.map(c=>[c.id,c.revision])),masked=receivers.map(n=>n.slice(0,3)+'****'+n.slice(-4)),receiverMasked=masked.length===1?masked[0]:masked;
  const latest=await api('status');if(latest.actor.userId!==a.userId||latest.actor.tenantId!==a.tenantId||latest.metrics.pending!==0)fail('OWNER_OR_PENDING_CHANGED');validateLiveRequest(request,clock());const now=clock();
  if(request.allowOutOfHours===true){const p=signLivePermit({schema:2,id,purpose:'CONTROLLED_LIVE_VALIDATION',tenantId:a.tenantId,ownerId:a.userId,queueId:'QUEUE-'+randomUUID(),deviceId:phone.deviceId,accountKey:phone.accountKey,targetIds,notBefore:now,notAfter:now+600000,maxAttempts:request.maxAttempts,allowOutOfHours:true,requestId:id+'-'+latest.queueVersion},key);staged=true;await device.stage(p);await device.activate(p);publishAttempted=true;await store.publish(p);queueRequested=true;queue=await api('prepareQueue',{requestId:p.requestId,targetIds,expectedContacts,startAt:now+15000,expectedVersion:latest.queueVersion});if(queue.id!==p.queueId)fail('PREPARED_QUEUE_SCOPE_MISMATCH');return {decision:'PREPARED_ONLY_NOT_ARMED',receiverMasked,maxAttempts:request.maxAttempts,expiresAt:new Date(p.notAfter).toISOString(),queueId:queue.id,actualPhoneCalls:0,requiresExplicitPhoneStart:true,outOfHoursException:true};}
  queueRequested=true;queue=await api('prepareQueue',{requestId:id+'-'+latest.queueVersion,targetIds,expectedContacts,startAt:now+15000,expectedVersion:latest.queueVersion});
  validateLiveRequest(request,clock());const p=signLivePermit({schema:1,id,purpose:'CONTROLLED_LIVE_VALIDATION',tenantId:a.tenantId,ownerId:a.userId,queueId:queue.id,deviceId:phone.deviceId,accountKey:phone.accountKey,targetIds,notBefore:now,notAfter:Math.min(now+600000,dayEnd(now)-1),maxAttempts:request.maxAttempts},key);
  staged=true;await device.stage(p);await device.activate(p);publishAttempted=true;await store.publish(p);
  return {decision:'PREPARED_ONLY_NOT_ARMED',receiverMasked,maxAttempts:request.maxAttempts,expiresAt:new Date(p.notAfter).toISOString(),queueId:queue.id,actualPhoneCalls:0,requiresExplicitPhoneStart:true};
 }catch(error){
  const issues=await cleanup();if(issues.length){const e=Error('LIVE_PREPARATION_FAILED_CLEANUP_REQUIRED');e.cleanupRequired=issues;throw e;}throw error;
 }finally{if(locked)try{await store.unlock();}catch{const e=Error('LIVE_PREPARATION_FAILED_CLEANUP_REQUIRED');e.cleanupRequired=['PREPARATION_LOCK',...await cleanup()];throw e;}}
}
