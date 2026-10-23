import fs from 'node:fs';import {resolve,join} from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';import {randomBytes,X509Certificate} from 'node:crypto';import {networkInterfaces} from 'node:os';
import {createLanGateway,privateIPv4} from '../packages/enterprise/src/lan-gateway.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),dir=join(root,'.local/lan');fs.mkdirSync(dir,{recursive:true});const configPath=join(dir,'private.json');
const mode=process.argv[2];
if(mode==='init'){
  const host=process.argv[3];if(!privateIPv4(host)||!Object.values(networkInterfaces()).flat().some(a=>a.address===host&&!a.internal))throw Error('LOCAL_PRIVATE_LAN_ADDRESS_REQUIRED');
  if(fs.existsSync(configPath)){const old=JSON.parse(fs.readFileSync(configPath));if(old.host!==host)throw Error('LAN_ADDRESS_CHANGED_REPAIR_REQUIRED');console.log('LAN_ALREADY_CONFIGURED');}
  else{
    const javaDir=fs.readdirSync(join(root,'.tooling/java')).find(n=>n.startsWith('jdk-'));if(!javaDir)throw Error('PROJECT_KEYTOOL_REQUIRED');
    const passphrase=randomBytes(24).toString('base64url'),pairingKey=randomBytes(32).toString('base64url');
    execFileSync(join(root,'.tooling/java',javaDir,'bin/keytool.exe'),['-genkeypair','-alias','sales-lan','-keyalg','RSA','-keysize','2048','-validity','365','-dname','CN=Sales Dialer LAN','-ext','SAN=IP:'+host,'-ext','EKU=serverAuth','-storetype','PKCS12','-keystore',join(dir,'server.p12'),'-storepass:env','SALES_LAN_KEY_PASSWORD'],{env:{...process.env,SALES_LAN_KEY_PASSWORD:passphrase},windowsHide:true,stdio:'pipe'});
    const cert=execFileSync(join(root,'.tooling/java',javaDir,'bin/keytool.exe'),['-exportcert','-rfc','-alias','sales-lan','-keystore',join(dir,'server.p12'),'-storepass:env','SALES_LAN_KEY_PASSWORD'],{env:{...process.env,SALES_LAN_KEY_PASSWORD:passphrase},windowsHide:true,stdio:'pipe'});
    fs.writeFileSync(join(dir,'certificate.pem'),cert);const x=new X509Certificate(cert),fingerprint=x.fingerprint256.replaceAll(':','').toLowerCase();
    const config={schema:1,host,port:8791,passphrase,pairingKey,fingerprint,certificateExpires:x.validTo};fs.writeFileSync(configPath,JSON.stringify(config,null,2),{mode:0o600,flag:'wx'});
    const phone={schema:1,origin:'https://'+host+':8791',fingerprint,key:pairingKey};const code='DIALER-LAN-1.'+Buffer.from(JSON.stringify(phone)).toString('base64url');fs.writeFileSync(join(dir,'pairing-code.txt'),code,{mode:0o600});fs.writeFileSync(join(dir,'phone-config.json'),JSON.stringify(phone),{mode:0o600});console.log('LAN_CONFIGURED_PAIRING_CODE_STORED_PRIVATELY');
  }
}else if(mode==='start'){
  const c=JSON.parse(fs.readFileSync(configPath));const health=await(await fetch('http://127.0.0.1:8790/health')).json();if(health.service!=='sales-dialer-local-enterprise')throw Error('LOCAL_ENTERPRISE_SERVICE_REQUIRED');
  const app=await createLanGateway({host:c.host,port:c.port,pairingKey:c.pairingKey,pfx:fs.readFileSync(join(dir,'server.p12')),passphrase:c.passphrase});fs.writeFileSync(join(dir,'ready.json'),JSON.stringify({pid:process.pid,url:app.url,host:c.host,port:c.port}));console.log('LAN_READY '+app.url);
  let closing=false;const stop=async()=>{if(closing)return;closing=true;await app.close();process.exit(0);};process.on('SIGTERM',stop);process.on('SIGINT',stop);process.stdin.on('data',d=>{if(d.toString().trim()==='stop')stop();});
}else throw Error('USE_INIT_OR_START');
