[CmdletBinding()]
param([switch]$OpenBrowser,[ValidatePattern('^[A-Za-z0-9_.:-]{1,100}$')][string]$AndroidSerial)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$entry=Join-Path $projectRoot 'packages/core/src/workbench-cli.mjs'
$local=Join-Path $projectRoot '.local'
$url='http://127.0.0.1:8787'
$listeners=@(Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue)
if($listeners.Count){
    foreach($listener in $listeners){
        $owner=Get-CimInstance Win32_Process -Filter ('ProcessId='+$listener.OwningProcess)
        if($owner.Name -ne 'node.exe' -or -not $owner.CommandLine.Contains($entry)){
            throw 'Port 8787 is occupied by another program. Nothing was stopped.'
        }
        if($AndroidSerial -and -not $owner.CommandLine.Contains('--android-serial '+$AndroidSerial)){
            throw 'Existing workbench has different Android settings. Run tools/stop-workbench.ps1 first, then restart with -AndroidSerial.'
        }
    }
    $servicePid=$listeners[0].OwningProcess
}else{
    New-Item -ItemType Directory -Path $local -Force | Out-Null
    $stamp=Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    $stdout=Join-Path $local ('workbench-'+$stamp+'.stdout.log')
    $stderr=Join-Path $local ('workbench-'+$stamp+'.stderr.log')
    $node=(Get-Command node -CommandType Application | Select-Object -First 1).Source
    $launchArgs='"'+$entry+'"'
    if($AndroidSerial){$launchArgs+=' --android-serial '+$AndroidSerial}
    $child=Start-Process -FilePath $node -ArgumentList $launchArgs -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
    $servicePid=$child.Id
    @{Url=$url;Pid=$servicePid;Entry=$entry;StartedAt=(Get-Date).ToString('o');Stdout=$stdout;Stderr=$stderr} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $local 'workbench-service.json') -Encoding utf8
}
$ready=$false
for($i=0;$i -lt 30;$i++){
    try{
        $response=Invoke-WebRequest -Uri $url -TimeoutSec 2
        if($response.StatusCode -eq 200 -and $response.Content.Contains('/app.mjs')){$ready=$true;break}
    }catch{}
    if(-not (Get-Process -Id $servicePid -ErrorAction SilentlyContinue)){break}
    Start-Sleep -Milliseconds 200
}
if(-not $ready){throw ('Workbench did not become ready. Inspect logs in '+$local)}
Write-Output ('Workbench ready: '+$url+' (PID '+$servicePid+')')
if($OpenBrowser){Start-Process $url}
