import subprocess,json,uuid,xml.etree.ElementTree as ET,sqlite3,datetime
from pathlib import Path
root=Path(__file__).resolve().parent.parent
adb=root/'.tooling/android-sdk/platform-tools/adb.exe';serial='YOUR_DEVICE_SERIAL';pkg='com.mantou.salesdialer.spike';commands=[]
def run(args):
 p=subprocess.run([str(adb),'-s',serial,*args],capture_output=True,text=True,encoding='utf-8',timeout=20);commands.append({'args':args,'exitCode':p.returncode})
 if p.returncode:raise RuntimeError('ADB_FAILED')
 return p.stdout
nonce=uuid.uuid4().hex
run(['shell','am','start','-W','-n',pkg+'/.PhoneCapabilitiesActivity','--es','nonce',nonce])
snapshot=json.loads(run(['shell','run-as',pkg,'cat','files/phone-capabilities.json']))
assert snapshot['nonce']==nonce
prefs=ET.fromstring(run(['shell','run-as',pkg,'cat','shared_prefs/controlled_probe.xml']))
flags={x.get('name'):x.get('value') for x in prefs if x.tag=='boolean' and x.get('name') in ['dryRun','paused','armed']}
appPath=run(['shell','pm','path',pkg]).strip().removeprefix('package:');apkHash=run(['shell','sha256sum',appPath]).split()[0]
stores=[]
for name in ['workbench.db','workbench.db.android.db','workbench.db.observed.db','workbench.db.trial.db']:
 p=root/'.local'/name
 with sqlite3.connect(p.as_uri()+'?mode=ro',uri=True) as db:s=json.loads(db.execute('SELECT data FROM simulation_state WHERE id=1').fetchone()[0])
 stores.append({'name':name,'topKeys':list(s),'activeAttempts':sum(a.get('status') in ['AUTHORIZED','HANDOFF_UNKNOWN','SUBMITTED','RECONCILE_REQUIRED'] for a in s.get('attempts',{}).values()),'scheduledTasks':sum(a.get('status') in ['PLANNED','SCHEDULED','READY','AUTHORIZED','HANDOFF_UNKNOWN','SUBMITTED','RECONCILE_REQUIRED'] for a in s.get('tasks',{}).values())})
report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'device':serial,'model':'SM-S9180','nonceMatched':True,'inCall':snapshot.get('inCall'),'permissions':snapshot.get('permissions'),'probe':flags,'installedApkSha256':apkHash,'stores':stores,'commands':commands}
(root/('evidence/native-db-check/preflight-'+nonce+'.json')).write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps(report))
