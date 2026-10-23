import {AdbSyntheticTransport} from '../packages/core/src/adb-synthetic-transport.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),serial=process.argv[2];
if(!serial)throw Error('EXPLICIT_USB_SERIAL_REQUIRED');
const dest=process.env.DIALER_EVIDENCE_DIR??join(root,'evidence','native-db-'+Date.now());mkdirSync(dest,{recursive:true});
const commands=[],transport=new AdbSyntheticTransport({adbPath:join(root,'.tooling/android-sdk/platform-tools/adb.exe'),serial,record:r=>commands.push({args:r.args,exitCode:r.exitCode})}),pkg='com.mantou.salesdialer.spike';
const expected=createHash('sha256').update(readFileSync(join(root,'prototypes/android/app/build/outputs/apk/debug/app-debug.apk'))).digest('hex');
async function actualLedger(){
 const names=(await transport.run(['shell','run-as',pkg,'ls','databases'])).split(/\s+/).filter(x=>/^controlled_calls\.db(?:-wal|-shm|-journal)?$/.test(x));
 const hashes={};for(const name of names)hashes[name]=(await transport.run(['shell','run-as',pkg,'sha256sum','databases/'+name])).split(/\s+/)[0];return hashes;
}
let result;
try{
 const before=await transport.inspect();assert.equal(before.apkSha256,expected);
 const snapshot=await transport.readPhoneCapabilities(expected);assert.equal(snapshot.inCall,false,'Phone must be idle before opening debug check');
 const prefs=await transport.run(['shell','run-as',pkg,'cat','shared_prefs/controlled_probe.xml']);
 for(const [k,v] of [['paused','true'],['dryRun','true'],['armed','false']])assert.match(prefs,new RegExp('<boolean name="'+k+'" value="'+v+'"'));
 const original=await actualLedger(),nonce=randomBytes(16).toString('hex');
 await transport.run(['shell','am','start','-W','-n',pkg+'/.NativeDatabaseCheckActivity','--es','nonce',nonce]);
 const report=JSON.parse(await transport.run(['shell','run-as',pkg,'cat','files/native-db-check-'+nonce+'.json']));
 writeFileSync(join(dest,'device-report.json'),JSON.stringify(report,null,2)+'\n');
 assert.equal(report.nonce,nonce);assert.equal(report.source,'ANDROID_SQLITE_ISOLATED_CHECK');assert.equal(report.passed,true);assert.ok(report.assertionCount>=36);assert.ok(report.assertions.every(a=>a.passed));
 assert.deepEqual(await actualLedger(),original,'Actual native call journal must remain untouched');assert.equal((await transport.inspect()).apkSha256,expected);
 result={passed:true,serial,apkSha256:expected,assertionCount:report.assertionCount,actualLedgerUnchanged:true,actualLedgerExisted:Object.keys(original).length>0,phoneApiCalls:0,busyEvidence:'Injected busy/unknown values exercise real SQLite transactions, not actual incoming calls or permission revocation'};
 console.log(JSON.stringify(result));
}finally{writeFileSync(join(dest,'commands.json'),JSON.stringify({commands,result:result??{passed:false}},null,2)+'\n');}
