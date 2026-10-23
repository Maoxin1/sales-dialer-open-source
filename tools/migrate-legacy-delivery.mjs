import {readFileSync,writeFileSync,existsSync,mkdirSync,copyFileSync} from 'node:fs';import {resolve,join} from 'node:path';import {createHash} from 'node:crypto';import {DatabaseSync} from 'node:sqlite';import {AdbSyntheticTransport} from '../packages/core/src/adb-synthetic-transport.mjs';import {collectNativePermitSnapshot} from '../packages/core/src/native-permit-collector.mjs';import {migrateLegacyDelivery} from '../packages/core/src/legacy-delivery-migration.mjs';import {encodeNativeCallCommand} from '../packages/core/src/native-call-protocol.mjs';
let host;
try{
 if(process.argv.slice(2).join()!=='--migrate-local-metadata')throw Error('EXPLICIT_LOCAL_MIGRATION_FLAG_REQUIRED');
 const local=resolve('.local'),path=join(local,'contact-controlled-delivery.db'),m=JSON.parse(readFileSync(join(local,'contact-android.json'),'utf8')),old=JSON.parse(readFileSync(join(local,'contact-controlled-session.closed-20261016.json'),'utf8'));
 const expected={deviceKey:m.deviceKey,apkSha256:m.apkSha256,accountKey:m.accountKey,installationKey:old.transportPermit.installationKey};
 host=new DatabaseSync(join(local,'workbench.db.contacts.db'),{readOnly:true});
 const readHostRecords=()=>host.prepare('SELECT a.device,a.account,a.state,d.finished,d.digest,d.command FROM contact_controlled_attempts a JOIN contact_controlled_delivery d ON d.attempt=a.id').all().map(r=>{const encoded=encodeNativeCallCommand(JSON.parse(r.command));if(encoded.digest!==r.digest||encoded.command.accountKey!==r.account)throw Error('HOST_CONFLICT');return {attempt:encoded.command.attemptId,digest:r.digest,finished:r.finished===1&&r.state==='FINISHED',deviceKey:r.device,accountKey:r.account,installationKey:encoded.command.installationKey};});
 // Backup local journal bytes and sidecars without overwriting any prior backup.
 const backup=join(local,'legacy-migration-backup-'+Date.now());mkdirSync(backup);const fingerprints={};
 for(const suffix of ['','-wal','-journal']){const source=path+suffix;if(existsSync(source)){const digest=createHash('sha256').update(readFileSync(source)).digest('hex');copyFileSync(source,join(backup,'contact-controlled-delivery.db'+suffix));if(createHash('sha256').update(readFileSync(source)).digest('hex')!==digest)throw Error('BACKUP_CHANGED');fingerprints[suffix||'database']=digest;}}
 writeFileSync(join(backup,'manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),fingerprints},null,2));
 const transport=new AdbSyntheticTransport({adbPath:resolve('.tooling/android-sdk/platform-tools/adb.exe'),serial:m.serial});
 const result=await migrateLegacyDelivery({journalPath:path,expected,readHostRecords,collect:()=>collectNativePermitSnapshot({transport,expected,snapshotDirectory:local})});
 console.log(JSON.stringify({...result,backupCreated:true,actualPhoneCalls:0},null,2));if(result.decision!=='MIGRATED')process.exitCode=1;
}catch{console.log(JSON.stringify({decision:'DENY',reason:'LOCAL_MIGRATION_CHECK_FAILED',realCallsEnabled:false,actualPhoneCalls:0}));process.exitCode=1;}finally{host?.close();}
