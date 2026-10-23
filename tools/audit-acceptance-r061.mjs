import {readFileSync,writeFileSync,readdirSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,relative,join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=process.cwd(),dest=process.env.DIALER_EVIDENCE_DIR;assert.ok(dest);mkdirSync(dest,{recursive:true});
const json=p=>JSON.parse(readFileSync(resolve(root,p),'utf8').replace(/^\uFEFF/,''));
const digest=p=>createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex');
const checks=[];
function verify(label,map){const mismatch=Object.entries(map).filter(([p,h])=>!existsSync(resolve(root,p))||digest(p)!==h).map(([p])=>p);checks.push({label,files:Object.keys(map).length,mismatch});assert.deepEqual(mismatch,[]);}
function walk(p){return readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(e.name==='node_modules'?[]:walk(join(p,e.name))):[relative(root,join(p,e.name)).replaceAll('\\','/')]);}
const regression=json('evidence/binding-setup/regression/run.json');assert.equal(regression.exitCode,0);assert.equal(regression.summary.pass,489);assert.equal(regression.summary.fail,0);verify('489 regression current core',regression.sourceHashes);assert.deepEqual(walk(resolve('packages/core')).sort(),Object.keys(regression.sourceHashes).sort());
const syntax=json('evidence/binding-setup/syntax/run.json');assert.equal(syntax.exitCode,0);verify('syntax current core',syntax.sourceHashes);
const actual=json('evidence/binding-setup/actual-preflight/run.json');assert.equal(actual.exitCode,0);verify('actual target HTTP USB historical evidence current core',actual.sourceHashes);const outcome=json('evidence/binding-setup/actual-preflight/live-preflight.json');assert.equal(outcome.result.ready,true);assert.equal(outcome.result.callAuthorization,'DENY');assert.equal(outcome.actualPhoneCalls,0);assert.equal(outcome.timerRunning,false);
const native=json('evidence/native-db-check/source-manifest.json');verify('historical native build source and APK',native.hashes);
const pkg=json('packages/core/package.json');for(const key of ['test','check','workbench','test:controlled-records','test:controlled-workspace','test:capacity'])assert.ok(pkg.scripts[key]);
const pages={};for(const route of ['/','/contacts','/controlled','/observed']){const response=await fetch('http://127.0.0.1:8787'+route);pages[route]=response.status;assert.equal(response.status,200);}
const report={at:new Date().toISOString(),verdict:'LOCAL_SUBSCOPE_PASS_FULL_PRODUCT_INSUFFICIENT_EVIDENCE',checks,pages,reusedCoreTests:489,reusedSyntax:true,nativeBuildEvidence:'Historical source matches; no new build or device inspection',newPhoneCalls:0,limitations:['Production authentication absent; local own-list import implemented','Real controlled records not configured','Actual target read-only binding verified; real calling E2E not verified','No new phone authorization; previous three calls consumed','iPhone deferred; original automation scope retained']};
writeFileSync(join(dest,'audit.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
