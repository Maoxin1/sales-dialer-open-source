import {AdbSyntheticTransport} from './adb-synthetic-transport.mjs';
import {collectNativePermitSnapshot} from './native-permit-collector.mjs';
import {gateOwner} from './device-gate.mjs';
import {DatabaseSync} from 'node:sqlite';
import {createHash,randomBytes} from 'node:crypto';
import {execFile} from 'node:child_process';
import {resolve,dirname,join} from 'node:path';
const hash=s=>createHash('sha256').update(s).digest('hex'),hex=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const keys=['deviceKey','apkSha256','installationKey','accountKey'];
/** Explicit deployment only; never enables components or submits calls. No automatic retry. */
export class AdbPermitDeployment extends AdbSyntheticTransport {
 #path;#binding;#grant;#clock;
 constructor({adbPath,serial,journalPath,expected,grant,now=Date.now}){
  super({adbPath,serial});
  if(typeof journalPath!=='string'||journalPath===':memory:'||!keys.every(k=>hex(expected?.[k]))||grant?.mode!=='EXPLICIT_CONTROLLED_DEPLOYMENT'||!hex(grant.candidateSha256)||typeof grant.reference!=='string'||!grant.reference.trim()||!Number.isSafeInteger(grant.notBefore)||!Number.isSafeInteger(grant.expiresAt)||grant.expiresAt<=grant.notBefore)throw Error('EXPLICIT_DEPLOYMENT_GRANT_REQUIRED');
  this.#path=resolve(journalPath);this.#binding=Object.freeze(Object.fromEntries(keys.map(k=>[k,expected[k]])));this.#grant=Object.freeze({...grant});this.#clock=now;
 }
 matches(path,binding=this.#binding){return resolve(path)===this.#path&&keys.every(k=>binding[k]===this.#binding[k]);}
 async collect(){return collectNativePermitSnapshot({transport:this,expected:this.#binding,snapshotDirectory:dirname(this.#path),now:this.#clock});}
 async runScript(script){return new Promise((ok,fail)=>{const child=execFile(this.adbPath,['-s',this.serial,'shell','-T','sh','-s'],{timeout:15000,maxBuffer:16384,windowsHide:true,encoding:'utf8'},(e,out)=>e?fail(Error('DEPLOYMENT_IO_UNKNOWN')):ok(out));child.stdin.on('error',()=>{});child.stdin.end(script);});}
 async replace({operationId,expectedFingerprint,nextBytes,validUntil,recheck}){
  const now=this.#clock(),g=this.#grant,digest=typeof nextBytes==='string'?hash(nextBytes):'';
  if(!hex(expectedFingerprint)||digest!==g.candidateSha256||now<g.notBefore||now>=g.expiresAt||!Number.isSafeInteger(validUntil)||validUntil<=now||typeof recheck!=='function')throw Error('DEPLOYMENT_NOT_AUTHORIZED');
  let db,gate;
  try{db=new DatabaseSync(this.#path,{readOnly:true});gate=new DatabaseSync(join(dirname(this.#path),'native-device-gate.db'),{readOnly:true});
   const row=db.prepare('SELECT * FROM permit_switches WHERE id=?').get(operationId),claim=gate.prepare('SELECT * FROM device_claims WHERE owner=?').get(gateOwner('SWITCH',this.#path,operationId));
   if(!row||row.state!=='WRITING'||row.active!==1||row.pid!==process.pid||row.next!==digest||row.previous!==expectedFingerprint||row.binding!==JSON.stringify(this.#binding)||claim?.state!=='OPEN'||claim.kind!=='SWITCH'||claim.device!==this.#binding.deviceKey||claim.digest!==digest)throw Error('DEPLOYMENT_GATE_REQUIRED');
  }finally{gate?.close();db?.close();}
  const fresh=await this.collect(),s=fresh?.snapshot;
  if(fresh?.decision!=='COLLECTED'||!s||hash(s.nativeBytes)!==expectedFingerprint||!this.matches(this.#path,s.device)||s.device.componentsDisabled!==true||s.device.inCall!==false)throw Error('DEPLOYMENT_SNAPSHOT_CHANGED');
  const checked=await recheck(s),at=this.#clock();
  if(checked?.decision!=='READY'||!Number.isSafeInteger(checked.validUntil)||at<s.device.observedAt||at-s.device.observedAt>=10000)throw Error('DEPLOYMENT_RECHECK_DENIED');
  const end=Math.min(validUntil,checked.validUntil,g.expiresAt),permit=JSON.parse(nextBytes),mono=Math.min(permit.expiresElapsed,s.device.elapsed+end-at-(at-s.device.observedAt));
  if(at<g.notBefore||at>=end||![mono,permit.bootCount,end].every(Number.isSafeInteger))throw Error('DEPLOYMENT_EXPIRED');
  const stage='files/.controlled-permit-'+randomBytes(12).toString('hex')+'.tmp',payload=Buffer.from(nextBytes).toString('base64');
  const script=`set -eu
pkg='com.mantou.salesdialer.spike'
run-as "$pkg" sh -s <<'STAGE'
set -eu
umask 077
stage='${stage}'
printf %s '${payload}' | base64 -d > "$stage"
sum=$(sha256sum "$stage")
sum=\${sum%% *}
[ "$sum" = '${digest}' ]
chmod 600 "$stage"
sync
STAGE
[ "$(settings get global boot_count)" = '${permit.bootCount}' ]
read uptime rest < /proc/uptime
[ $(( (\${uptime%%.*} + 1) * 1000 )) -lt ${mono} ]
[ $(( ($(date +%s) + 1) * 1000 )) -lt ${permit.expiresAt} ]
[ $(( $(date +%s) * 1000 )) -ge ${permit.notBefore} ]
run-as "$pkg" sh -s <<'COMMIT'
set -eu
stage='${stage}'
dest='files/controlled-call-permit.json'
trap 'rm -f "$stage"' EXIT
old=$(sha256sum "$dest")
old=\${old%% *}
[ "$old" = '${expectedFingerprint}' ]
[ $(( ($(date +%s) + 1) * 1000 )) -lt ${permit.expiresAt} ]
mv -f "$stage" "$dest"
sync
printf 'DEPLOYED\n'
COMMIT
`;

  if((await this.runScript(script)).trim()!=='DEPLOYED')throw Error('DEPLOYMENT_IO_UNKNOWN');
 }
}
