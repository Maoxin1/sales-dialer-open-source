const page=await fetch('http://127.0.0.1:8787/controlled'),html=await page.text();
const token=html.match(/name="session-token" content="([^"]+)"/)[1];
const r=await fetch('http://127.0.0.1:8787/api/controlled/status',{headers:{Authorization:'Bearer '+token}}),s=await r.json();
if(page.status!==200||s.mode!=='RECORDING_DEMO'||s.realCallsEnabled!==false||s.attempts[0]?.status!=='RECONCILE_REQUIRED')throw Error('LIVE_CHECK_FAILED');
console.log(JSON.stringify({url:'http://127.0.0.1:8787/controlled',httpStatus:page.status,mode:s.mode,used:s.used,attemptCount:s.attempts.length,status:s.attempts[0].status,realCallsEnabled:s.realCallsEnabled}));
