// Explicit real-device UI test of the separate simulation package; never calls a phone API.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
const pkg='com.mantou.salesdialer.standalone',adb=resolve('.tooling/android-sdk/platform-tools/adb.exe');
if(process.argv.slice(2).join()!=='--run')throw Error('EXPLICIT_RUN_REQUIRED');
const {serial}=JSON.parse(readFileSync('.local/contact-android.json','utf8'));
const run=args=>execFileSync(adb,['-s',serial,...args],{encoding:'utf8',timeout:20000,windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();
const xml=()=>{run(['shell','uiautomator','dump','/data/local/tmp/standalone-ui.xml']);return run(['shell','cat','/data/local/tmp/standalone-ui.xml']);};
async function click(text){const page=xml();const nodes=page.match(/<node\b[^>]+>/g)??[];const node=nodes.find(n=>n.includes('text="'+text+'"'));assert.ok(node,'visible button: '+text);const m=node.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);assert.ok(m);run(['shell','input','tap',String(Math.floor((+m[1]+ +m[3])/2)),String(Math.floor((+m[2]+ +m[4])/2))]);await delay(250);}
function check(fragment){assert.ok(xml().includes(fragment),'UI contains '+fragment);}
const oldPath=run(['shell','pm','path','com.mantou.salesdialer.spike']).replace(/^package:/,'');
const originalHash=run(['shell','sha256sum',oldPath]).split(/\s+/)[0];
console.log(JSON.stringify({phase:'before',originalApkSha256:originalHash}));
assert.equal(run(['get-state']),'device');
assert.match(run(['install','-r',resolve('prototypes/android/standalone/build/outputs/apk/debug/standalone-debug.apk')]),/Success/);
const open=()=>run(['shell','am','start','-W','-n',pkg+'/.MainActivity']);
assert.match(open(),/Status: ok/);await delay(300);check('演示目标 0');
await click('创建3条演示任务');check('演示目标 3');await click('重新安排剩余任务');await click('模拟下一条');check('待核对 1');check('真实呼出 0');
run(['shell','am','force-stop',pkg]);assert.match(open(),/Status: ok/);await delay(300);check('待核对 1');check('DEMO-001');
await click('模拟下一条');check('OCCUPIED');check('尝试 1');await click('模拟结果：未接');check('完成 1');
await click('暂停并作废旧计划');check('已暂停');await click('模拟下一条');check('没有可执行计划');check('尝试 1');
await click('重新安排剩余任务');await click('下一条拒绝联系');await click('模拟下一条');check('DEMO-003');check('尝试 2');
await click('核对为未知结果');check('待核对 0');check('完成 2');await click('暂停并作废旧计划');check('已暂停');
const finalHash=run(['shell','sha256sum',oldPath]).split(/\s+/)[0];assert.equal(finalHash,originalHash);
console.log(JSON.stringify({decision:'PASSED',test:'T-CALL-539',device:'S23',syntheticTargets:3,syntheticAttempts:2,finished:2,refusedTargets:1,restartPreservedPending:true,duplicateBlocked:true,paused:true,originalApkUnchanged:true,actualPhoneCalls:0,boundary:'Independent simulation package; no real dial adapter or background timer'}));
