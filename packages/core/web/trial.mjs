const $=id=>document.getElementById(id),token=document.querySelector('meta[name="session-token"]').content;
const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
async function refresh(){const r=await fetch('/api/trial/status',{headers});if(!r.ok)throw Error('读取失败，请刷新页面');const s=await r.json();$('trial-quota').textContent=`剩余 ${s.remaining} / ${s.limit} · 已使用 ${s.used}`;$('trial-account').textContent=s.selected?'已选择演练卡（模拟）':'尚未选择演练卡';$('trial-state').textContent=({RECONCILE_REQUIRED:'结果未知，待核对',FINISHED:'已核对，额度不返还'})[s.attempt?.status]??'尚未提交';}
const messages={PHONE_PREREQUISITES_NOT_MET:'请先选择演练卡。',DUPLICATE:'已处理过此任务，不会再次提交。',ACTIVE_CALL_NOT_CLEARED:'请先勾选核对确认。',NO_ATTEMPT:'尚未提交任务，无需核对。'};
for(const [id,op] of [['trial-select','select'],['trial-submit','submit'],['trial-reconcile','reconcile'],['trial-refresh','status']])$(id).onclick=async()=>{
 const buttons=[...document.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
 try{const c={op};if(op==='reconcile')c.noActiveCall=$('trial-confirm').checked;const r=await fetch('/api/trial/command',{method:'POST',headers,body:JSON.stringify(c)});if(!r.ok)throw Error('请求未完成，请刷新记录后核对');const result=await r.json();$('trial-message').textContent=result.decision==='DENY'?(messages[result.reason]??'条件未满足，未提交新任务。'):op==='submit'?'模拟提交完成，回执未知，请核对。':'记录已更新。';if(op==='reconcile'&&result.decision==='OK')$('trial-confirm').checked=false;await refresh();}catch(e){$('trial-message').textContent=e.message;}finally{buttons.forEach(b=>b.disabled=false);}
};
refresh().then(()=>$('trial-message').textContent='可以开始演练。').catch(e=>$('trial-message').textContent=e.message);
