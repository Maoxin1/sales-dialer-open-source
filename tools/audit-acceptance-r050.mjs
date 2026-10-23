import {readFileSync,writeFileSync,readdirSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,relative,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {AdbSyntheticTransport} from '../packages/core/src/adb-synthetic-transport.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dest=process.env.DIALER_EVIDENCE_DIR??join(root,'evidence','acceptance-r050-'+Date.now());mkdirSync(dest,{recursive:true});
const json=p=>JSON.parse(readFileSync(resolve(root,p),'utf8').replace(/^\uFEFF/,''));
const digest=p=>createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex');
const checks=[];
function verifyHashes(label,map){const mismatch=Object.entries(map).filter(([p,h])=>!existsSync(resolve(root,p))||digest(p)!==h).map(([p])=>p);checks.push({label,files:Object.keys(map).length,mismatch});assert.deepEqual(mismatch,[],label);}
const regression=json('evidence/local-coordinator/regression/run.json');assert.equal(regression.exitCode,0);assert.equal(regression.summary.pass,412);assert.equal(regression.summary.fail,0);verifyHashes('core regression source snapshot',regression.sourceHashes);
function walk(path){return readdirSync(path,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(e.name==='node_modules'?[]:walk(join(path,e.name))):[relative(root,join(path,e.name)).replaceAll('\\','/')]);}
assert.deepEqual(walk(join(root,'packages/core')).sort(),Object.keys(regression.sourceHashes).sort(),'No untested core files added');
const native=json('evidence/native-db-check/source-manifest.json');verifyHashes('native/tool/APK snapshot',native.hashes);
const device=json('evidence/native-db-check/device/device-report.json');assert.equal(device.passed,true);assert.equal(device.assertionCount,36);assert.ok(device.assertions.every(x=>x.passed));
for(const file of ['evidence/native-db-check/device/run.json','evidence/native-db-check/browser/run.json','evidence/native-db-check/service-health/run.json'])assert.equal(json(file).exitCode,0);
const browser=JSON.parse(readFileSync(resolve(root,'evidence/native-db-check/browser/output.log'),'utf8').trim().split(/\r?\n/).find(x=>x.startsWith('{')));assert.equal(browser.checks,34);assert.equal(browser.passed,true);
for(const name of ['assemble','lint'])assert.equal(json('evidence/continuation-1/native-db-check-final-android-'+name+'.json').ExitCode,0);
const capacity=json('evidence/local-coordinator/regression/task-capacity.json');assert.equal(capacity.taskCount,200);assert.equal(capacity.unexpectedErrors,0);assert.equal(capacity.actualPhoneCalls,0);
const pkg=json('packages/core/package.json');for(const name of ['workbench','local-controlled:demo','test','check','test:local-controlled','test:capacity'])assert.equal(typeof pkg.scripts[name],'string');
const transport=new AdbSyntheticTransport({adbPath:resolve(root,'.tooling/android-sdk/platform-tools/adb.exe'),serial:'YOUR_DEVICE_SERIAL'});
const installed=await transport.inspect();assert.equal(installed.apkSha256,digest('prototypes/android/app/build/outputs/apk/debug/app-debug.apk'));
const response=await fetch('http://127.0.0.1:8787/observed');assert.equal(response.status,200);
const report={at:new Date().toISOString(),verdict:'PARTIAL_ACCEPTANCE_NO_CALL_SUBSCOPE',checks,reused:{coreTests:412,androidSqliteAssertions:36,browserChecks:34,build:true,lint:native.lint},capacity,installed,httpStatus:response.status,newPhoneCalls:0,testsRerun:false,limitations:['No new ControlledCallActivity phone E2E','No actual incoming-call or permission-revocation evidence','Close/reopen is not OS kill or power loss','No production authentication or real list import','iPhone deferred; original automatic scope retained']};
writeFileSync(join(dest,'audit.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({verdict:report.verdict,checks,coreTests:412,sqliteAssertions:36,browserChecks:34,httpStatus:response.status,newPhoneCalls:0}));
