const $=id=>document.getElementById(id),token=document.querySelector('meta[name="session-token"]').content;
const actor='SYNTHETIC-SALES-A';let state,selected=null,busy=false;
const uid=kind=>'SYNTHETIC-'+kind+'-'+crypto.randomUUID().toUpperCase();
const local=ms=>new Date(ms+8*3600000).toISOString().slice(0,19);
const epoch=value=>Date.parse((value.length===16?value+':00':value)+'+08:00');
const showTime=ms=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',dateStyle:'short',timeStyle:'medium'}).format(ms);
const names={READY:'待触发',NEEDS_REPLAN:'待重新安排',AUTHORIZED:'已授权',SUBMITTED:'已提交，待核对',HANDOFF_UNKNOWN:'交接未知',RECONCILE_REQUIRED:'待核对',FINISHED:'已结束',CANCELLED:'已取消',CONFIRMED:'已确认资格',UNKNOWN:'未知',INVALID:'无资格'};
const eventNames={IMPORTED:'导入我的名单',TASK_CREATED:'创建任务',AUTHORIZED:'通过拨号前检查',HANDOFF_PERSISTED:'保存本次请求',API_RECEIPT:'收到模拟提交结果',PAUSED:'暂停我的任务',RESUMED_REPLAN_REQUIRED:'恢复，等待重新安排',RETIMED:'重新安排任务',MANUALLY_RECONCILED:'保存人工核对',REFUSED:'标记拒绝联系',OBSERVATION:'记录模拟通话观察',DEVICE_OBSERVED:'更新模拟设备状态',QUALIFICATION_CHANGED:'更新联系资格',GRANT_CANCELLED:'撤销未交出的请求',TASK_CANCELLED:'取消任务',MANUAL_RETRY_PLANNED:'安排明确再次尝试'};
function resultText(result){
  if(result.decision==='DENY')return reasons[result.reason]||result.reason;
  if(result.rows){const labels={IMPORTED:'新增',DUPLICATE:'重复',CONFLICT:'冲突，未覆盖',UNSUPPORTED:'格式不支持',INVALID:'输入无效'};return result.rows.map(r=>(r.targetKey||'该行')+'：'+(labels[r.status]||r.status)).join('\n');}
  if(result.status)return '本次状态：'+(names[result.status]||result.status)+'。提交、呼出与接通分别记录。';
  return '操作已保存。';
}
const reasons={PAUSED:'当前已暂停，请恢复并重新安排计划。',STALE_PLAN:'旧计划已经失效，请重新安排。',NEEDS_REPLAN:'请先重新安排计划。',DO_NOT_CONTACT:'该目标已拒绝联系，不能再次尝试。',QUALIFICATION_NOT_CONFIRMED:'联系资格尚未确认。',DEVICE_NOT_IDLE:'设备占用或状态未知，本次请求不会排队。',SALES_OCCUPIED:'请先核对并关闭上一条未结束的请求。',DUPLICATE:'本次任务已授权，重复触发已阻止。',EXPIRED:'计划已经过时，不会自动补拨。',NOT_DUE:'计划尚未到点。',CALENDAR_CLOSED:'仅周一至周五可以触发。',BEFORE_WINDOW:'尚未到北京时间09:00。',AFTER_WINDOW:'已到北京时间18:00，停止新尝试。',INVALID_PLAN_TIME:'请安排在周一至周五09:00–18:00。',RECONCILE_REQUIRED:'先核对当前请求，未知结果不能自动重放。',MANUAL_RETRY_REQUIRED:'已结束任务需要先明确再次尝试。',FORBIDDEN:'无权处理该名单或任务。'};
function message(text,error=false){$('message').textContent=text;$('message').className=error?'error':'';}
function currentTask(){const t=state?.snapshot.tasks.find(t=>t.taskId===selected);if(!t)throw new Error('请先选择一条任务。');return t;}
function attempt(){const a=state.snapshot.attempts.filter(a=>a.taskId===currentTask().taskId).at(-1);if(!a)throw new Error('该任务尚无尝试记录。');return a;}
async function api(command){const response=await fetch(command?'/api/command':'/api/status',{method:command?'POST':'GET',headers:{Authorization:'Bearer '+token,...(command?{'Content-Type':'application/json'}:{})},...(command?{body:JSON.stringify(command)}:{})});const result=await response.json();if(!response.ok)throw new Error(result.reason||'请求失败');return result;}
async function refresh(){state=await api();render();}
async function act(operation){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{const result=await operation();if(result){$('latest-result').textContent=resultText(result);message(result.decision==='DENY'?(reasons[result.reason]||result.reason):'操作已保存。',result.decision==='DENY');}await refresh();}catch(error){message(error.message,true);}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}}
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function render(){
  $('clock').textContent=showTime(state.now);const seller=state.snapshot.sellers.find(s=>s.salesId===actor);$('seller-state').textContent=seller?.paused?'已暂停':seller?.occupiedBy?'当前有未结束请求':'可以检查下一任务';
  const metrics=[['不同目标','U'],['授权尝试','G'],['提交成功','Q'],['模拟呼出','O'],['模拟接通','C'],['待核对','unknownPending']];$('metrics').replaceChildren(...metrics.map(([label,key])=>{const el=node('div',undefined,'metric');el.append(node('small',label),node('strong',String(state.metrics[key])));return el;}));
  $('contact-count').textContent=state.snapshot.contacts.length+' 个目标';$('contacts').replaceChildren(...state.snapshot.contacts.map(c=>{const li=node('li',c.targetKey);li.append(node('small',c.doNotContact?'已拒绝联系':names[c.qualification]));return li;}));
  const prior=$('target').value;$('target').replaceChildren(...state.snapshot.contacts.map(c=>{const option=node('option',c.targetKey);option.value=c.targetKey;return option;}));if([...$('target').options].some(o=>o.value===prior))$('target').value=prior;
  $('tasks').replaceChildren(...state.snapshot.tasks.map(t=>{const tr=node('tr',undefined,selected===t.taskId?'selected':'');const td=node('td');const b=node('button',t.targetKey);b.dataset.taskId=t.taskId;b.addEventListener('click',()=>{selected=t.taskId;render();});td.append(b);tr.append(td,node('td',showTime(t.plannedAt)),node('td',names[t.status]||t.status));return tr;}));$('empty').hidden=state.snapshot.tasks.length>0;
  const a=state.snapshot.attempts.filter(a=>a.taskId===selected).at(-1);$('attempt-state').textContent=a?names[a.status]||a.status:'尚无尝试';
  $('events').replaceChildren(...state.snapshot.events.slice(-10).reverse().map(e=>{const li=node('li');li.append(node('strong',showTime(e.atEpochMs)),node('span',eventNames[e.kind]||'任务状态更新'));return li;}));
  for(const id of ['planned-at','replan-at','virtual-time'])if(!$(id).value)$(id).value=local(state.now);
}
$('sample').onclick=()=>{$('targets').value='SYNTHETIC-TARGET-1\nSYNTHETIC-TARGET-2';};
$('import-form').onsubmit=event=>{event.preventDefault();act(()=>api({op:'import',rows:$('targets').value.split(/\r?\n/).filter(x=>x.trim()).map(raw=>({raw,qualification:$('qualification').value,source:'SYNTHETIC-SELF-ATTESTATION'}))}));};
$('task-form').onsubmit=event=>{event.preventDefault();act(async()=>{const taskId=uid('TASK');const result=await api({op:'task',taskId,targetKey:$('target').value,assignedSalesId:actor,plannedAt:epoch($('planned-at').value)});if(result.decision==='OK')selected=taskId;return result;});};
for(const op of ['pause','resume'])$(op).onclick=()=>act(()=>api({op}));
$('refresh').onclick=()=>act(()=>refresh());
$('trigger').onclick=()=>act(()=>api({op:'trigger',taskId:currentTask().taskId,intentId:uid('INTENT'),outcome:$('outcome').value}));
$('tick').onclick=()=>act(()=>{const t=currentTask();return api({op:'tick',taskId:t.taskId,planVersion:t.planVersion,policyVersion:t.policyVersion,intentId:uid('INTENT'),outcome:$('outcome').value});});
$('replan').onclick=()=>act(()=>api({op:'plan',taskId:currentTask().taskId,plannedAt:epoch($('replan-at').value)}));
$('retry').onclick=()=>act(()=>api({op:'retry',taskId:currentTask().taskId,plannedAt:epoch($('replan-at').value)}));
$('cancel').onclick=()=>act(()=>api({op:'cancel',taskId:currentTask().taskId}));
$('refuse').onclick=()=>act(()=>api({op:'refuse',targetKey:currentTask().targetKey}));
for(const [id,kind] of [['observed-outgoing','OUTGOING_CONFIRMED'],['observed-connected','CONNECTED_CONFIRMED']])$(id).onclick=()=>act(()=>api({op:'observe',attemptId:attempt().attemptId,eventId:uid('OBSERVATION'),kind,binding:'MATCHED',source:'SIMULATED_DEVICE'}));
$('reconcile-form').onsubmit=event=>{event.preventDefault();act(async()=>{const result=await api({op:'reconcile',attemptId:attempt().attemptId,noActiveCall:$('no-active-call').checked,result:$('manual-result').value});$('no-active-call').checked=false;return result;});};
$('set-time').onclick=()=>act(()=>api({op:'time',atEpochMs:epoch($('virtual-time').value)}));
$('set-device').onclick=()=>act(()=>api({op:'device',state:$('device-state').value}));
await act(()=>refresh());
