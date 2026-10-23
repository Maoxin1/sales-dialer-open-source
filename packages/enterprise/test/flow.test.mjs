import test from 'node:test';import assert from 'node:assert/strict';import '../web/flow.js';const flow=globalThis.SalesFlow;
const base={mode:'LIVE',metrics:{pending:0},queue:null,contacts:[]};
test('T847 one next action for empty, selected, prepared, armed, pending and disconnected states',()=>{
 assert.equal(flow.view({status:base}).action,'select');assert.equal(flow.view({status:base,selectedCount:2}).action,'review');
 const planned={...base,queue:{state:'RUNNING'},operatorBatch:{id:'generated'}};assert.equal(flow.view({status:planned,selectedCount:2,diagnostic:{state:'DISABLED'}}).state,'PREPARE');
 assert.equal(flow.view({status:planned,diagnostic:{state:'READY'}}).state,'WAITING');assert.equal(flow.view({status:planned,diagnostic:{state:'CONSUMING'}}).action,'refresh');
 assert.equal(flow.view({status:{...planned,metrics:{pending:1}},diagnostic:{state:'READY'}}).action,'result');
 assert.equal(flow.view({status:planned,connected:false}).action,'refresh');assert.equal(flow.view({status:{...base,queue:{state:'FINISHED'}}}).title,'上一批已完成');assert.equal(flow.view({status:{...base,queue:{state:'STOPPED'}}}).action,'select');
});
test('T848 review snapshot rejects qualification, revision and selection changes',()=>{const c={id:'generated-a',revision:1,qualification:'CONFIRMED'},s={...base,contacts:[c]},ids=[c.id],revisions={[c.id]:1},selected=new Set(ids),rev=new Map([[c.id,1]]);assert.equal(flow.sameSelection(ids,revisions,s,selected,rev),true);for(const change of [{refused:true},{erased:true},{qualification:'WITHDRAWN'},{qualification:'UNKNOWN'},{revision:2}])assert.equal(flow.sameSelection(ids,revisions,{...s,contacts:[{...c,...change}]},selected,rev),false);assert.equal(flow.sameSelection(ids,revisions,s,new Set(),rev),false);assert.equal(flow.sameSelection([],{},s,new Set(),new Map()),false);});
test('T849 UI time explanation preserves Beijing workdays 09 inclusive to18 exclusive',()=>{for(const [at,yes] of [['2026-10-21T00:59:59Z',false],['2026-10-21T01:00:00Z',true],['2026-10-21T09:59:59Z',true],['2026-10-21T10:00:00Z',false],['2026-10-24T02:00:00Z',false]])assert.equal(flow.window(Date.parse(at)),yes);});
