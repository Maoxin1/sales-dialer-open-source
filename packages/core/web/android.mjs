const $=id=>document.getElementById(id),token=document.querySelector('meta[name="session-token"]').content;
let state,selected,busy=false,revision=0,polling=false;
const names={READY:'待提交',NEEDS_REPLAN:'需重新安排',SUBMITTED:'手机已收取（仿真），待核对',RECONCILE_REQUIRED:'结果未知，待核对',FINISHED:'已关闭',CANCELLED:'已取消'};
const reasons={ANDROID_NOT_CONFIGURED:'未配置 USB 手机入口，请按 README 启动。',DEVICE_UNBOUND:'请先绑定手机。',BINDING_EXPIRED:'绑定已过期，请重新绑定。',ADB_TRANSPORT_FAILED:'手机连接不可用；请检查 USB 后重新绑定。',CAPABILITY_NOT_VERIFIED:'手机安装包与本机版本不一致，请先检查安装。',DEVICE_CAPABILITY_CHANGED:'设备状态已变化，请重新绑定。'};
async function api(c){const r=await fetch('/api/android/'+(c?'command':'status'),{method:c?'POST':'GET',headers:{Authorization:'Bearer '+token,...(c?{'Content-Type':'application/json'}:{})},...(c?{body:JSON.stringify(c)}:{})});if(!r.ok)throw Error('请求失败，请刷新页面');return r.json();}
function render(){
 if(!state?.snapshot){$('phone-status').textContent=reasons[state?.reason]??'手机入口不可用';return;}
 const b=state.binding;
 $('phone-status').textContent=(b.state==='BOUND'?`${b.model} · USB ${b.serial} · 绑定至 ${new Date(b.expiresAt).toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai'})}`:'尚未绑定或绑定已失效')+'；真实 SIM 未绑定，真实拨号关闭。';
 $('phone-clock').textContent='手机区使用当前北京时间：'+new Date(state.now).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'});
 const select=$('phone-tasks');select.replaceChildren();
 for(const t of state.snapshot.tasks){const o=document.createElement('option');o.value=t.taskId;o.textContent=t.targetKey+' · '+(names[t.status]??t.status);select.append(o);}
 if(state.snapshot.tasks.some(t=>t.taskId===selected))select.value=selected;else selected=select.value;
 $('phone-count').textContent=`授权 ${state.metrics.G} · 仿真提交 ${state.metrics.Q} · 真实通话未采集`;
 const p=state.schedules?.filter(p=>p.taskId===selected).at(-1);
 const labels={PENDING:'等待到点',DISPATCHING:'正在交接',COMPLETED:'已收到仿真回执',BLOCKED:'未完成，需要检查并重新安排',CANCELLED:'计划已取消',NEEDS_REPLAN:'服务曾重启，需要重新安排'};
 $('phone-schedule-state').textContent=p?`${labels[p.status]??p.status} · ${new Date(p.plannedAt).toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai'})}${p.reason?' · '+p.reason:''}`:'该任务没有定时计划';
 const phone=state.phoneCapabilities,s=phone?.snapshot,accounts=$('phone-accounts'),choice=accounts.value;
 accounts.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='请选择账户（不默认选卡）';accounts.append(empty);
 for(const a of s?.accounts??[]){const option=document.createElement('option');option.value=a.key;option.textContent=a.label+(a.enabled?'':'（停用）');accounts.append(option);}
 if([...accounts.options].some(o=>o.value===choice))accounts.value=choice;
 const flag=v=>v===true?'是':v===false?'否':'未知';
 $('phone-cap-state').textContent=s?`电话权限：${Object.entries(s.permissions).map(([k,v])=>k+'='+flag(v)).join('；')}。系统通话中：${flag(s.inCall)}；精确定时：${flag(s.exactAlarm)}；后台受限制：${flag(s.backgroundRestricted)}；电池优化豁免：${flag(s.ignoringBatteryOptimizations)}。`:'尚无有效快照，请主动读取。';
 $('phone-selected-account').textContent=(phone?.selectedAccount?'只读绑定：'+phone.selectedAccount.label:'电话账户未绑定或绑定已失效')+'。真实外呼关闭；合成任务仍使用 SYNTHETIC-NO-SIM。';
}
async function act(c){if(busy)return;busy=true;revision++;const buttons=[...$('phone-workspace').querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
 try{const r=c?await api(c):null;state=await api();render();if(r)$('phone-result').textContent=r.decision==='DENY'?(reasons[r.reason]??'未提交：'+r.reason):'已保存。'+(r.apiSubmission==='SUBMITTED'?'手机收到合成任务；请核对后关闭本次。':'');}
 catch(e){$('phone-result').textContent=e.message;}finally{busy=false;buttons.forEach(b=>b.disabled=false);}}
$('phone-tasks').onchange=()=>{selected=$('phone-tasks').value;render();};
$('phone-refresh').onclick=()=>act();$('phone-bind').onclick=()=>act({op:'bind'});
$('phone-cap-refresh').onclick=()=>act({op:'phoneRefresh'});
$('phone-account-select').onclick=()=>act({op:'phoneSelect',accountKey:$('phone-accounts').value});
$('phone-create').onclick=()=>act({op:'create',targetKey:$('phone-target').value.trim().toUpperCase()});
$('phone-send').onclick=()=>{if(selected)act({op:'send',taskId:selected,intentId:'SYNTHETIC-WEB-'+selected.slice(10)});};
$('phone-pause').onclick=()=>act({op:'pause'});$('phone-resume').onclick=()=>act({op:'resume'});
$('phone-plan').onclick=()=>selected&&act({op:'plan',taskId:selected});
$('phone-schedule').onclick=()=>selected&&act({op:'schedule',taskId:selected,plannedAt:Date.now()+Number($('phone-delay').value)*1000});
$('phone-refuse').onclick=()=>{const t=state?.snapshot.tasks.find(t=>t.taskId===selected);if(t)act({op:'refuse',targetKey:t.targetKey});};
$('phone-reconcile').onclick=()=>{const a=state?.snapshot.attempts.find(a=>a.taskId===selected&&['SUBMITTED','RECONCILE_REQUIRED','HANDOFF_UNKNOWN'].includes(a.status));
 if(!$('phone-confirm').checked){$('phone-result').textContent='请先核对并勾选确认。';return;}if(a)act({op:'reconcile',attemptId:a.attemptId,noActiveCall:true});else $('phone-result').textContent='没有需要核对的尝试。';$('phone-confirm').checked=false;};
await act();
// Read-only status refresh. A response started before a user action cannot overwrite its result.
setInterval(async()=>{if(busy||polling||!state?.snapshot)return;polling=true;const version=revision;
 try{const next=await api();if(!busy&&version===revision){state=next;render();}}catch{}finally{polling=false;}
},1000);
