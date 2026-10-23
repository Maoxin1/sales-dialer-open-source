"""Project-local, checksum-verified Android build tools; requires recorded SDK consent."""
from pathlib import Path
import hashlib, json, re, urllib.request, zipfile, datetime
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'.tooling'; DEST.mkdir(exist_ok=True)
EVIDENCE=ROOT/'evidence/continuation-1'; EVIDENCE.mkdir(exist_ok=True)
def fetch(url):
    req=urllib.request.Request(url,headers={'User-Agent':'sales-dialer-local-build'})
    return urllib.request.urlopen(req,timeout=60)
def download(url,path,checksum):
    if not path.exists():
        with fetch(url) as src,path.open('wb') as out:
            while chunk:=src.read(1024*1024):out.write(chunk)
    actual=hashlib.file_digest(path.open('rb'),'sha256').hexdigest()
    if actual!=checksum:raise RuntimeError('CHECKSUM_MISMATCH: '+str(path))
    return {'url':url,'path':str(path.relative_to(ROOT)),'sha256':actual,'bytes':path.stat().st_size}
def extract(archive,target):
    target.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(archive) as z:
        for name in z.namelist():
            if not (target/name).resolve().is_relative_to(target.resolve()):raise RuntimeError('INVALID_ZIP_PATH')
        z.extractall(target)
report={'startedAt':datetime.datetime.now().astimezone().isoformat(),'sdkConsent':'mantou explicitly accepted Android SDK license and authorized project-local install in this conversation','globalChanges':False,'downloads':[]}
try:
    release=json.loads((EVIDENCE/'jdk-github-release.json').read_text(encoding='utf-8'))
    asset=next(x for x in release['assets'] if 'jdk_x64_windows_hotspot' in x['name'] and x['name'].endswith('.zip'))
    with fetch(asset['browser_download_url']+'.sha256.txt') as r:checksum=r.read().decode().split()[0]
    archive=DEST/asset['name'];report['downloads'].append(download(asset['browser_download_url'],archive,checksum));extract(archive,DEST/'java')
    print('JAVA_EXTRACTED',flush=True)
    with fetch('https://developer.android.com/studio') as r:html=r.read().decode()
    (EVIDENCE/'android-download-page.html').write_text(html,encoding='utf-8')
    match=re.search(r'(commandlinetools-win-\d+_latest\.zip).*?([a-f0-9]{64})',html,re.S)
    if not match:raise RuntimeError('OFFICIAL_SDK_CHECKSUM_NOT_FOUND')
    name,checksum=match.groups();archive=DEST/name
    report['downloads'].append(download('https://dl.google.com/android/repository/'+name,archive,checksum))
    extract(archive,DEST/'android-sdk/cmdline-package')
    print('ANDROID_COMMAND_TOOLS_EXTRACTED',flush=True)
    report['success']=True
except Exception as error:
    report['success']=False;report['error']=repr(error);raise
finally:
    report['endedAt']=datetime.datetime.now().astimezone().isoformat()
    (EVIDENCE/'toolchain-downloads.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
