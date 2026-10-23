const $=id=>document.getElementById(id),headers={Authorization:'Bearer '+document.querySelector('meta[name="session-token"]').content,'Content-Type':'application/json'};
let busy=false,polling=false,revision=0,configured=true,native=false;
const reasons={NATIVE_INSTALLATION_CHANGED:'测试应用安装身份已变化；本轮停止提交，保留原记录。',NATIVE_GUARD_UNAVAILABLE:'原生检查未配置，保留待核对记录，不回退模拟。',OUTPUT_MODE_CHANGED:'历史轮次使用模拟输出，不能自动切换检查方式。',OBSERVED_NOT_CONFIGURED:'未配置USB设备，请按README启动。',PHONE_UNAVAILABLE:'手机读取失败；请检查连接后重新读取。',ACCOUNT_NOT_AVAILABLE:'请选择当前可用账户。',OBSERVED_BINDING_REQUIRED:'请先读取手机并明确绑定账户。',PHONE_PREREQUISITES_NOT_MET:'手机条件未知或未满足，请重新读取并检查。',ROUND_BINDING_CHANGED:'本轮已固定设备和账户，不可换卡。',ROUND_EXPIRED:'本轮已到期，不能通过重绑续期。',DUPLICATE:'此任务已处理，不会重复提交。',ACTIVE_CALL_NOT_CLEARED:'请先勾选核对确认。',NO_ATTEMPT:'没有需要核对的尝试。',INVALID_PLAN_TIME:'当前不在允许的工作时段。',TIME_BLOCKED:'轮次已过期或时间异常，停止新提交。'};
async function api(c){const r=await fetch('/api/observed/'+(c?'command':'status'),{method:c?'POST':'GET',headers,...(c?{body:JSON.stringify(c)}:{})});if(!r.ok)throw Error('请求未完成，请刷新记录核对');return r.json();}
function render(s){configured=s.reason!=='OBSERVED_NOT_CONFIGURED';if(!configured){$('observed-message').textContent=reasons[s.reason];document.querySelectorAll('button').forEach(b=>b.disabled=true);return;}
 native=s.mode==='OBSERVED_DEVICE_NATIVE_GUARD';
 $('observed-source').textContent=native?'结果来源：安卓原生检查；业务任务为合成演练。':'结果来源：模拟替身；手机状态为实际观察。';
 $('observed-submit').textContent=native?'检查手机条件（不拨号）':'检查条件并模拟提交';
 const p=s.phone,ss=p?.snapshot,choice=$('observed-accounts').value,flag=v=>v===true?'是':v===false?'否':'未知';
 $('observed-phone').textContent=ss?`电话权限：${flag(ss.permissions.callPhone)}；通话状态读取权限：${flag(ss.permissions.readPhoneState)}；系统通话中：${flag(ss.inCall)}。`:'没有有效手机快照，请主动读取。';
 $('observed-time').textContent=ss?'观察时间：'+new Date(ss.observedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}):'';
 const select=$('observed-accounts');select.replaceChildren();const blank=document.createElement('option');blank.value='';blank.textContent='请选择账户（不默认选卡）';select.append(blank);
 for(const a of ss?.accounts??[]){const o=document.createElement('option');o.value=a.key;o.textContent=a.label+(a.enabled?'':'（停用）');o.disabled=!a.enabled;select.append(o);}if([...select.options].some(o=>o.value===choice))select.value=choice;
 $('observed-selected').textContent=p?.selectedAccount?'观察绑定：'+p.selectedAccount.label:'账户尚未绑定或观察已失效';
 $('observed-quota').textContent=s.expiresAt?`已使用 ${s.used} / 1 · 剩余 ${s.remaining} · ${s.expired?'已到期':'截止 '+new Date(s.expiresAt).toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai'})}`:'尚未建立轮次';
 $('observed-result').textContent=({RECONCILE_REQUIRED:native?(s.attempt?.nativeGuardReceipt?.status==='DRY_RUN_READY'?'原生检查就绪，待核对；尚未拨号':'原生检查回执未知，待核对；不会自动重发'):'模拟结果未知，待核对',FINISHED:'模拟占用已关闭，额度不返还'})[s.attempt?.status]??'尚未提交';
}
async function act(c){if(busy)return;busy=true;revision++;const buttons=[...document.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);try{const r=c?await api(c):null;if(r)$('observed-message').textContent=r.decision==='DENY'?(reasons[r.reason]??'条件未满足：'+r.reason):(c.op==='submit'?(native?'原生检查已结束，请核对记录；没有拨号。':'已完成模拟提交，没有真实呼叫。'):'记录已更新。');if(c?.op==='reconcile'&&r.decision==='OK')$('observed-confirm').checked=false;render(await api());}catch(e){$('observed-message').textContent=e.message;}finally{busy=false;buttons.forEach(b=>b.disabled=!configured);}}
$('observed-refresh').onclick=()=>act({op:'refresh'});$('observed-bind').onclick=()=>act({op:'bind',accountKey:$('observed-accounts').value});$('observed-submit').onclick=()=>act({op:'submit'});$('observed-reconcile').onclick=()=>act({op:'reconcile',noActiveCall:$('observed-confirm').checked});
await act();
// Local status only: polling does not touch the phone or launch an Activity.
setInterval(async()=>{if(busy||polling)return;polling=true;const v=revision;try{const s=await api();if(!busy&&v===revision)render(s);}catch{}finally{polling=false;}},2000);
