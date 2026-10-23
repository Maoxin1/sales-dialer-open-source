import {DatabaseSync} from 'node:sqlite';
import {existsSync} from 'node:fs';
import {DeviceGate,gateOwner} from './device-gate.mjs';
/** Trusted recovery composition. Never changes native permit, native ledger, quotas or
 * host attempt outcomes. Uses newly collected evidence, not archived snapshots. */
export async function migrateLegacyDelivery({journalPath,expected,collect,readHostRecords,now=Date.now,fault=()=>{}}={}){
 let db,gate,records=[],locked=false,transaction=false,committed=false;
 const deny=reason=>({decision:'DENY',reason,realCallsEnabled:false});
 try{
  if(!existsSync(journalPath)||!expected||!['deviceKey','installationKey','accountKey','apkSha256'].every(k=>/^[a-f0-9]{64}$/.test(expected[k]))||typeof collect!=='function'||typeof readHostRecords!=='function')return deny('INVALID_MIGRATION_INPUT');
  const binding=structuredClone(expected),read=new DatabaseSync(journalPath,{readOnly:true});let rows;try{rows=read.prepare('SELECT * FROM delivery ORDER BY attempt LIMIT 1001').all();}finally{read.close();}
  if(rows.length>1000||rows.some(r=>typeof r.attempt!=='string'||!/^[a-f0-9]{64}$/.test(r.digest)||(r.device!=null&&r.device!==binding.deviceKey)||('reconciled' in r&&![0,1].includes(r.reconciled))))return deny('INVALID_LEGACY_ROWS');
  if(!rows.length)return {decision:'MIGRATED',records:0,realCallsEnabled:false};
  records=rows.map(r=>({owner:gateOwner('CALL',journalPath,r.attempt),digest:r.digest,alreadyReconciled:r.reconciled===1}));
  gate=new DeviceGate(journalPath);locked=gate.beginMigration(records);if(!locked)return deny('DEVICE_BUSY');
  const started=now(),collected=await collect(),host=structuredClone(await readHostRecords()),at=now(),s=collected?.snapshot,d=s?.device;
  if(!['ANDROID_USB_READ_ONLY','CONTROLLED_FIXTURE'].includes(collected?.source)||collected?.decision!=='COLLECTED'||!d||Object.entries(binding).some(([k,v])=>d[k]!==v)||d.inCall!==false||d.componentsDisabled!==true||d.permissionsGranted!==true||d.accountEnabled!==true||!Number.isSafeInteger(d.observedAt)||!Number.isSafeInteger(at)||at<started||at-started>=10000||d.observedAt>at||at-d.observedAt>=10000)return deny('CURRENT_DEVICE_PROOF_REQUIRED');
  if(s.ledger?.schemaVersion!==2||!Array.isArray(s.ledger.requests)||s.ledger.requests.some(r=>r.status!=='RECONCILED')||!Array.isArray(host))return deny('CURRENT_RECONCILIATION_REQUIRED');
  for(const r of rows){const native=s.ledger.requests.filter(n=>n.request===r.attempt&&n.digest===r.digest),matched=host.filter(h=>h.attempt===r.attempt&&h.digest===r.digest);if(native.length!==1||matched.length!==1||matched[0].finished!==true||['deviceKey','installationKey','accountKey'].some(k=>matched[0][k]!==binding[k]))return deny('EVIDENCE_MISMATCH');}
  db=new DatabaseSync(journalPath);db.exec('PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL; BEGIN IMMEDIATE');transaction=true;
  if(JSON.stringify(db.prepare('SELECT * FROM delivery ORDER BY attempt LIMIT 1001').all())!==JSON.stringify(rows))throw Error('ROWS_CHANGED');
  const cols=db.prepare('PRAGMA table_info(delivery)').all().map(r=>r.name);if(!cols.includes('device'))db.exec('ALTER TABLE delivery ADD COLUMN device TEXT');if(!cols.includes('reconciled'))db.exec('ALTER TABLE delivery ADD COLUMN reconciled INTEGER NOT NULL DEFAULT 0');
  for(const r of rows)db.prepare('UPDATE delivery SET device=?,reconciled=1 WHERE attempt=? AND digest=?').run(binding.deviceKey,r.attempt,r.digest);
  if(JSON.stringify(await readHostRecords())!==JSON.stringify(host))throw Error('HOST_CHANGED');
  fault('before-commit');if(now()<at||now()-d.observedAt>=10000)throw Error('EXPIRED');db.exec('COMMIT');transaction=false;committed=true;fault('after-commit');
  for(const r of records)gate.release(r.owner,r.digest);
  return {decision:'MIGRATED',records:rows.length,source:collected.source,quotaChanged:false,nativeWrites:0,realCallsEnabled:false};
 }catch{return {decision:committed?'REVIEW':'DENY',reason:committed?'LOCAL_COMMIT_GATE_REVIEW_REQUIRED':'MIGRATION_BLOCKED',realCallsEnabled:false};}
 finally{if(transaction)db.exec('ROLLBACK');db?.close();if(locked)for(const r of records)gate.end(r.owner);gate?.close();}
}
