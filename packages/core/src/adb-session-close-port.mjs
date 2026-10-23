import {AdbSyntheticTransport} from './adb-synthetic-transport.mjs';import {collectNativePermitSnapshot} from './native-permit-collector.mjs';import {execFile} from 'node:child_process';import {randomBytes,createHash} from 'node:crypto';
const pkg='com.mantou.salesdialer.spike',hash=s=>createHash('sha256').update(s).digest('hex');
export class AdbSessionClosePort extends AdbSyntheticTransport{
 constructor({adbPath,serial,mapping,directory}){super({adbPath,serial});this.mapping=Object.freeze({...mapping});this.directory=directory;}
 async disable(session){const e=this.mapping;if(session.permit.deviceKey!==e.deviceKey||session.permit.accountKey!==e.accountKey)throw Error('BINDING');const before=await this.inspect();if(before.apkSha256!==e.apkSha256||hash(JSON.stringify(before))!==e.deviceKey)throw Error('DEVICE_CHANGED');for(const c of ['ControlledCallActivity','ControlledReconcileActivity'])if(!(await this.run(['shell','run-as',pkg,'pm','disable',pkg+'/.'+c])).includes('new state: disabled'))throw Error('DISABLE_UNCONFIRMED');}
 collect(session){return collectNativePermitSnapshot({transport:this,expected:{deviceKey:this.mapping.deviceKey,apkSha256:this.mapping.apkSha256,accountKey:this.mapping.accountKey,installationKey:session.transportPermit.installationKey},snapshotDirectory:this.directory});}
 async disablePermit({expectedFingerprint,nextBytes}){const p=JSON.parse(nextBytes);if(p.enabled!==false||!/^[a-f0-9]{64}$/.test(expectedFingerprint))throw Error('DISABLE_ONLY');const stage='files/.close-'+randomBytes(12).toString('hex');const script=`set -eu
umask 077
stage='${stage}'
trap 'rm -f "$stage"' EXIT
printf %s '${Buffer.from(nextBytes).toString('base64')}' | base64 -d > "$stage"
sum=$(sha256sum "$stage")
[ "\${sum%% *}" = '${hash(nextBytes)}' ]
old=$(sha256sum files/controlled-call-permit.json)
[ "\${old%% *}" = '${expectedFingerprint}' ]
chmod 600 "$stage"
sync
mv -f "$stage" files/controlled-call-permit.json
sync
printf 'DISABLED\\n'
`;
 const out=await new Promise((ok,fail)=>{const child=execFile(this.adbPath,['-s',this.serial,'shell','-T','run-as',pkg,'sh','-s'],{timeout:15000,maxBuffer:16384,encoding:'utf8',windowsHide:true},(e,out)=>e?fail(Error('DISABLE_RESULT_UNKNOWN')):ok(out));child.stdin.on('error',()=>{});child.stdin.end(script);});if(out.trim()!=='DISABLED')throw Error('DISABLE_RESULT_UNKNOWN');}
}
