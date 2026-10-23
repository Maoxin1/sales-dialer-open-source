import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { MemoryStore } from '../src/memory-store.mjs';
import { createWorkbench } from '../src/workbench-server.mjs';
async function server(t){const app=await createWorkbench({store:new MemoryStore(),port:0});t.after(()=>app.close());return app;}
async function command(app,cmd,headers={}){return fetch(app.url+'/api/command',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+app.token,...headers},body:JSON.stringify(cmd)});}
test('T-CALL-101 workbench serves an operable synthetic self-service view and rejects assignment to others',async t=>{
  const app=await server(t);const page=await fetch(app.url);assert.equal(page.status,200);assert.match(await page.text(),/sales-workbench/);
  const response=await command(app,{op:'import',rows:[{raw:'SYNTHETIC-WEB-TARGET',qualification:'CONFIRMED',source:'SYNTHETIC-WEB-SOURCE'}]});assert.equal((await response.json()).rows[0].status,'IMPORTED');
  const args={op:'task',taskId:'SYNTHETIC-WEB-TASK',targetKey:'SYNTHETIC-WEB-TARGET',assignedSalesId:'SYNTHETIC-SALES-B',plannedAt:1791939600000};
  assert.equal((await(await command(app,args)).json()).reason,'FORBIDDEN');args.assignedSalesId='SYNTHETIC-SALES-A';
  assert.equal((await(await command(app,args)).json()).decision,'OK');
  assert.equal((await(await command(app,{op:'trigger',taskId:args.taskId,intentId:'SYNTHETIC-WEB-INTENT',outcome:'UNKNOWN'})).json()).status,'RECONCILE_REQUIRED');
  const status=await(await fetch(app.url+'/api/status',{headers:{Authorization:'Bearer '+app.token}})).json();
  assert.equal(status.metrics.G,1);assert.equal(status.metrics.C,0);assert.equal(status.realPhoneAdapterConnected,false);
});
test('T-CALL-102 missing token, foreign Origin and forged Host cannot access local commands',async t=>{
  const app=await server(t);
  assert.equal((await fetch(app.url+'/api/status')).status,403);
  assert.equal((await command(app,{op:'pause'},{Origin:'https://untrusted.invalid'})).status,403);
  const code=await new Promise((resolve,reject)=>{const req=http.get(app.url,{headers:{Host:'untrusted.invalid'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);});
  assert.equal(code,403);assert.equal((await command(app,{op:'status'})).status,200);
});
test('T-CALL-103 malformed, oversized and unsupported commands do not mutate state or stop the server',async t=>{
  const app=await server(t);const headers={'Content-Type':'application/json',Authorization:'Bearer '+app.token};
  assert.equal((await fetch(app.url+'/api/command',{method:'POST',headers,body:'{bad'})).status,400);
  assert.equal((await fetch(app.url+'/api/command',{method:'POST',headers,body:JSON.stringify({op:'import',rows:[],padding:'x'.repeat(70000)})})).status,413);
  assert.equal((await(await command(app,{op:'quit'})).json()).reason,'UNSUPPORTED_WEB_COMMAND');
  assert.equal((await(await command(app,{op:'status',actorId:'SYNTHETIC-SALES-B'})).json()).reason,'UNSUPPORTED_FIELDS');
  assert.equal((await(await command(app,{op:'status'})).json()).metrics.G,0);
  assert.equal((await fetch(app.url+'/../package.json')).status,404);
});
