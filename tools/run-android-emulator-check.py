"""Owned AOSP emulator only. Synthetic target, no telephone API or real numbers."""
from pathlib import Path
import subprocess, os, time, json, socket, re, xml.etree.ElementTree as ET, datetime, argparse
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--evidence');options=parser.parse_args()
run_id=datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f');avd_name='SalesDialerProbeAPI36-'+run_id
OUT=(ROOT/options.evidence).resolve() if options.evidence else ROOT/'evidence/android-emulator'/run_id
if not OUT.is_relative_to(ROOT/'evidence'):raise RuntimeError('EVIDENCE_OUTSIDE_PROJECT')
OUT.mkdir(parents=True,exist_ok=False)
sdk=ROOT/'.tooling/android-sdk'; adb=sdk/'platform-tools/adb.exe'; emu=sdk/'emulator/emulator.exe'
env=os.environ.copy();env.update(JAVA_HOME=str(next((ROOT/'.tooling/java').iterdir())),ANDROID_HOME=str(sdk),ANDROID_SDK_ROOT=str(sdk),ANDROID_USER_HOME=str(ROOT/'.tooling/android-user'),ANDROID_EMULATOR_HOME=str(ROOT/'.tooling/android-user'),ANDROID_SDK_HOME=str(ROOT/'.tooling/java-user-home'),ANDROID_AVD_HOME=str(ROOT/'.tooling/avd'),JAVA_TOOL_OPTIONS='-Duser.home='+str(ROOT/'.tooling/java-user-home'))
Path(env['ANDROID_AVD_HOME']).mkdir(exist_ok=True)
serial='emulator-5580'; package='com.mantou.salesdialer.spike'; commands=[];checks=[];child=None
def run(args,timeout=60,input=None,required=True):
    result=subprocess.run([str(a) for a in args],input=input,capture_output=True,text=True,encoding='utf-8',errors='replace',env=env,timeout=timeout,creationflags=subprocess.CREATE_NO_WINDOW)
    commands.append({'command':[str(a) for a in args],'exitCode':result.returncode,'stdout':result.stdout,'stderr':result.stderr})
    if required and result.returncode:raise RuntimeError('COMMAND_FAILED: '+str(args))
    return result
def device(*args,**kw):return run([adb,'-s',serial,*args],**kw)
def events():
    text=device('shell','run-as',package,'cat','files/events.jsonl').stdout
    return [json.loads(line) for line in text.splitlines() if line.strip()]
def check(name,condition):
    checks.append({'name':name,'passed':bool(condition)})
    if not condition:raise AssertionError(name)
def click(label):
    device('shell','uiautomator','dump','/sdcard/sales-dialer-window.xml')
    xml=device('shell','cat','/sdcard/sales-dialer-window.xml').stdout
    nodes=ET.fromstring(xml).iter('node');node=next((n for n in nodes if n.attrib.get('text')==label),None)
    if node is None:raise RuntimeError('UI_LABEL_NOT_FOUND: '+label)
    x1,y1,x2,y2=map(int,re.findall(r'\d+',node.attrib['bounds']));device('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(.6)
report={'startedAt':datetime.datetime.now().astimezone().isoformat(),'scope':'AOSP API36 emulator, synthetic mode only; not SIM/caller-ID/voice/real-call acceptance','realPhoneCalls':0}
try:
    run([adb,'devices','-l'])
    for port in [5580,5581]:
        with socket.socket() as s:
            if s.connect_ex(('127.0.0.1',port))==0:raise RuntimeError('EMULATOR_PORT_ALREADY_USED')
    run([sdk/'cmdline-package/cmdline-tools/bin/avdmanager.bat','create','avd','--name',avd_name,'--package','system-images;android-36;default;x86_64','--path',ROOT/'.tooling/avd'/(avd_name+'.avd'),'--device','pixel_6'],input='no\n',timeout=90)
    acceleration=run([emu,'-accel-check'],required=False)
    output=(OUT/'emulator-process.log').open('w',encoding='utf-8')
    child=subprocess.Popen([str(emu),'-avd',avd_name,'-port','5580','-no-window','-no-audio','-no-boot-anim','-no-snapshot','-gpu','swiftshader','-accel','on' if acceleration.returncode==0 else 'off'],env=env,stdout=output,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
    until=time.monotonic()+300
    while time.monotonic()<until:
        if child.poll() is not None:raise RuntimeError('EMULATOR_EXITED: '+str(child.returncode))
        if device('shell','getprop','sys.boot_completed',timeout=10,required=False).stdout.strip()=='1':break
        time.sleep(2)
    else:raise RuntimeError('BOOT_TIMEOUT_300_SECONDS')
    report['device']=device('shell','getprop','ro.build.fingerprint').stdout.strip()
    device('install','-r',ROOT/'prototypes/android/app/build/outputs/apk/debug/app-debug.apk',timeout=90)
    device('shell','am','start','-W','-n',package+'/.MainActivity');time.sleep(2)
    click('应用实验配置（会取消旧计划）');click('人工触发一次')
    rows=events();check('manual_synthetic_request',sum(r['event']=='simulated_request' for r in rows)==1)
    device('shell','appops','set',package,'SCHEDULE_EXACT_ALARM','allow')
    click('30秒后触发一次');click('暂停并取消计划');time.sleep(35)
    rows=events();check('paused_timer_no_additional_request',sum(r['event']=='simulated_request' for r in rows)==1)
    click('人工触发一次');check('manual_while_paused_blocked',any(r['event']=='attempt_blocked' and r['detail']=='paused' for r in events()))
    click('应用实验配置（会取消旧计划）');click('30秒后触发一次');device('shell','input','keyevent','KEYCODE_HOME');time.sleep(40)
    rows=events();check('background_timer_synthetic_request',sum(r['event']=='simulated_request' for r in rows)==2)
    check('no_phone_api_submission',not any(r['event'] in ['request_about_to_submit','request_submitted'] for r in rows))
    (OUT/'events.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows),encoding='utf-8')
    device('shell','am','start','-W','-n',package+'/.MainActivity');time.sleep(1)
    device('shell','screencap','-p','/sdcard/sales-dialer-check.png');device('pull','/sdcard/sales-dialer-check.png',OUT/'android-simulation.png')
    report['passed']=True
except Exception as e:
    report['passed']=False;report['error']=repr(e)
finally:
    if child:
        if child.poll() is None:
            run([adb,'-s',serial,'emu','kill'],required=False)
            try:child.wait(timeout=15)
            except subprocess.TimeoutExpired:child.terminate()
    report.update(endedAt=datetime.datetime.now().astimezone().isoformat(),commands=commands,checks=checks)
    (OUT/'result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'passed':report['passed'],'checks':checks,'error':report.get('error')},ensure_ascii=False))
raise SystemExit(0 if report['passed'] else 1)
