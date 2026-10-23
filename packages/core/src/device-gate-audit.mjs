import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync,existsSync,realpathSync,statSync} from 'node:fs';
import {join,basename,dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gateOwner} from './device-gate.mjs';
import {encodeNativeCallCommand} from './native-call-protocol.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
/** Read-only audit. Never constructs DeviceGate, migrates schema, releases claims, reads
 * raw contacts, or treats archived native evidence as current authorization. */
export function auditDeviceGate({directory,nativeSnapshotPath=null}={}){
 const deny=reason=>({decision:'DENY',reason,canRecover:false,realCallsEnabled:false});
 try{
  const root=realpathSync(directory);let native=null;
  if(nativeSnapshotPath){native=realpathSync(nativeSnapshotPath);if(dirname(native)!==root)return deny('NATIVE_SNAPSHOT_OUTSIDE_DIRECTORY');}
  const enumerate=()=>readdirSync(root).filter(x=>x.endsWith('.db')).sort();
  const names=enumerate();if(names.length>200)return deny('AUDIT_LIMIT');
  const fingerprint=()=>{const entries={};for(const name of enumerate()){for(const suffix of ['','-wal','-journal']){const p=join(root,name+suffix);if(existsSync(p)){if(dirname(realpathSync(p))!==root||statSync(p).size>32*1024*1024)throw Error('AUDIT_LIMIT');entries[name+suffix]=hash(readFileSync(p));}}}return entries;};
  const relevant=new Set(),before=fingerprint(),business=new Map(),gates=[],hosts=[],nativeRows=[],findings=[];
  const add=(code,owner,extra={})=>findings.push({code,recordRef:hash(owner),...extra});
  for(const name of names){const path=join(root,name);let db;try{
   db=new DatabaseSync(path,{readOnly:true});db.exec('PRAGMA query_only=ON; BEGIN');
   const tables=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name));
   if(tables.has('closures')||tables.has('delivery')||tables.has('permit_switches')||tables.has('contact_controlled_delivery')||name==='native-device-gate.db'||path===native)relevant.add(name);
   const rows=sql=>{const r=db.prepare(sql+' LIMIT 10001').all();if(r.length>10000)throw Error('AUDIT_LIMIT');return r;};
   if(tables.has('delivery'))for(const r of rows('SELECT * FROM delivery')){
    if(typeof r.attempt!=='string'||!hex(r.digest)||('reconciled' in r&&![0,1].includes(r.reconciled)))throw Error('INVALID_JOURNAL');
    const owner=gateOwner('CALL',path,r.attempt);business.set(owner,{kind:'CALL',digest:r.digest,terminal:r.reconciled===1,attempt:r.attempt});
    if(!('reconciled' in r))add('LEGACY_RECONCILIATION_UNRECORDED',owner);
    else if(r.reconciled!==1)add('CALL_RECONCILIATION_REQUIRED',owner);
   }
   if(tables.has('permit_switches'))for(const r of rows('SELECT id,device,next,state FROM permit_switches')){
    if(typeof r.id!=='string'||!hex(r.next)||!['PRECHECK','WRITING','REVIEW','VERIFIED','ABORTED'].includes(r.state))throw Error('INVALID_JOURNAL');
    const owner=gateOwner('SWITCH',path,r.id),terminal=['VERIFIED','ABORTED'].includes(r.state);business.set(owner,{kind:'SWITCH',digest:r.next,terminal});if(!terminal)add('SWITCH_READBACK_REQUIRED',owner);
   }
   if(tables.has('closures'))for(const r of rows('SELECT id,digest,state FROM closures')){const owner=gateOwner('SWITCH',path,r.id);if(r.digest===null){add('CLOSURE_PREPARATION_INCOMPLETE',owner);continue;}if(!hex(r.digest)||!['PREPARING','CLOSING','CLOSED'].includes(r.state))throw Error('INVALID_JOURNAL');business.set(owner,{kind:'SWITCH',digest:r.digest,terminal:r.state==='CLOSED',needsGate:r.state!=='PREPARING'});if(r.state!=='CLOSED')add(r.state==='PREPARING'?'CLOSURE_PREPARATION_INCOMPLETE':'CLOSURE_READBACK_REQUIRED',owner);}
   if(name==='native-device-gate.db'){
    if(!tables.has('device_claims'))throw Error('INVALID_GATE');
    for(const r of rows('SELECT owner,digest,kind,state FROM device_claims')){if(typeof r.owner!=='string'||!hex(r.digest)||!['CALL','SWITCH'].includes(r.kind)||!['OPEN','RELEASED'].includes(r.state))throw Error('INVALID_GATE');gates.push(r);}
   }
   if(tables.has('contact_controlled_delivery')&&tables.has('contact_controlled_attempts'))for(const r of rows('SELECT d.digest,d.command,d.finished,a.state FROM contact_controlled_delivery d JOIN contact_controlled_attempts a ON a.id=d.attempt')){
    const c=encodeNativeCallCommand(JSON.parse(r.command));if(c.digest!==r.digest)throw Error('HOST_DIGEST_MISMATCH');hosts.push({digest:r.digest,attempt:c.command.attemptId,finished:r.finished===1&&r.state==='FINISHED'});
   }
   if(path===native){if(!tables.has('requests'))throw Error('INVALID_NATIVE_SNAPSHOT');for(const r of rows('SELECT request,digest,status FROM requests')){if(typeof r.request!=='string'||!hex(r.digest)||typeof r.status!=='string')throw Error('INVALID_NATIVE_SNAPSHOT');nativeRows.push(r);}}
   db.exec('COMMIT');
  }finally{db?.close();}}
  const indexed=new Map(gates.map(g=>[g.owner,g]));if(indexed.size!==gates.length)throw Error('INVALID_GATE');
  let matchedHost=0,matchedArchivedNative=0;
  for(const [owner,b] of business){const g=indexed.get(owner);
   if(!g&&!b.terminal&&b.needsGate!==false)add('MISSING_GATE_FOR_UNRESOLVED',owner);
   if(b.kind==='CALL'){
    const matches=hosts.filter(h=>h.digest===b.digest&&h.attempt===b.attempt);
    if(matches.length===1&&matches[0].finished){matchedHost++;add('HOST_FINISHED_EVIDENCE',owner,{currentNativeProof:false});}else if(matches.length>1)add('AMBIGUOUS_HOST_EVIDENCE',owner);
    const previous=nativeRows.filter(n=>n.digest===b.digest&&n.request===b.attempt);if(previous.length===1&&previous[0].status==='RECONCILED'){matchedArchivedNative++;add('ARCHIVED_NATIVE_RECONCILED_EVIDENCE',owner,{currentNativeProof:false});}
   }
  }
  for(const g of gates){const b=business.get(g.owner);
   if(!b){add(g.state==='OPEN'?'ORPHAN_OPEN_GATE':'ORPHAN_RELEASED_GATE',g.owner);continue;}
   if(g.digest!==b.digest||g.kind!==b.kind)add('GATE_BUSINESS_CONFLICT',g.owner);
   else if(g.state==='OPEN'&&b.terminal)add('TERMINAL_GATE_HELD',g.owner);
   else if(g.state==='RELEASED'&&!b.terminal)add('RELEASED_GATE_WITH_UNRESOLVED_BUSINESS',g.owner);
  }
  const filter=entries=>Object.fromEntries(Object.entries(entries).filter(([name])=>relevant.has(name.replace(/-(wal|journal)$/,''))));const after=fingerprint();if(JSON.stringify(names)!==JSON.stringify(enumerate())||JSON.stringify(filter(before))!==JSON.stringify(filter(after)))return deny('AUDIT_CHANGED_DURING_READ');
  return {decision:'AUDITED',scope:'LOCAL_READ_ONLY_NOT_ATOMIC_WITH_DEVICE',gateExists:names.includes('native-device-gate.db'),businessRecords:business.size,gateRecords:gates.length,hostFinishedMatches:matchedHost,archivedNativeReconciledMatches:matchedArchivedNative,nativeEvidence:native?'ARCHIVED_LOCAL_SNAPSHOT_NOT_LIVE':'NOT_READ',findings,filesUnchanged:true,canRecover:false,realCallsEnabled:false,recoveryRule:'Preserve unknown claims; require matched current native reconciliation or locked switch readback. This report grants no unlock.',evidenceFingerprint:hash(JSON.stringify(filter(before)))};
 }catch{return deny('AUDIT_INPUT_UNAVAILABLE_OR_INVALID');}
}
