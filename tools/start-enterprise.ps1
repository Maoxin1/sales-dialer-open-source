$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$privateDir=Join-Path $projectRoot '.local/enterprise'
$entry=Join-Path $projectRoot 'packages/enterprise/src/server.mjs'
$nodePath=(Get-Command node).Source
if(!(Test-Path -LiteralPath $privateDir)){New-Item -ItemType Directory -Path $privateDir | Out-Null}
$resolvedPrivate=(Resolve-Path -LiteralPath $privateDir).Path
if($resolvedPrivate -ne [System.IO.Path]::GetFullPath($privateDir)){throw 'PRIVATE_DIRECTORY_MISMATCH'}
$identitySid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
& icacls.exe $resolvedPrivate /inheritance:r /grant:r ('*'+$identitySid+':(OI)(CI)F') '*S-1-5-18:(OI)(CI)F' | Out-Null
if($LASTEXITCODE -ne 0){throw 'PRIVATE_DIRECTORY_ACL_FAILED'}
$readyPath=Join-Path $privateDir 'ready.json'
if(Test-Path -LiteralPath $readyPath){
    $ready=Get-Content -LiteralPath $readyPath -Raw | ConvertFrom-Json
    $existing=Get-CimInstance Win32_Process -Filter ('ProcessId='+[int]$ready.pid)
    if($existing -and $existing.CommandLine.Contains($entry)){
        try{$health=Invoke-RestMethod -Uri ($ready.url+'/health') -TimeoutSec 3;if($health.service -eq 'sales-dialer-local-enterprise'){Write-Output ('READY '+$ready.url);exit 0}}catch{}
        throw 'EXISTING_ENTERPRISE_SERVER_NOT_READY'
    }
}
$stdout=Join-Path $privateDir 'server.stdout.log'
$stderr=Join-Path $privateDir 'server.stderr.log'
$process=Start-Process -FilePath $nodePath -ArgumentList @('"'+$entry+'"') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru
$deadline=(Get-Date).AddSeconds(15)
while((Get-Date) -lt $deadline){
    if($process.HasExited){throw 'ENTERPRISE_SERVER_START_FAILED_CHECK_PRIVATE_STDERR'}
    if(Test-Path -LiteralPath $readyPath){$ready=Get-Content -LiteralPath $readyPath -Raw | ConvertFrom-Json;if([int]$ready.pid -eq $process.Id){
        if($env:DIALER_EVIDENCE_DIR){@{decision='STARTED_LOCAL_ONLY';pid=$process.Id;url=$ready.url;credentialsStoredPrivately=$true;privateAclApplied=$true;realCallsEnabled=$false} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $env:DIALER_EVIDENCE_DIR 'enterprise-start.json') -Encoding utf8NoBOM}
        Write-Output ('READY '+$ready.url);exit 0
    }}
    Start-Sleep -Milliseconds 200
}
throw 'ENTERPRISE_SERVER_START_TIMEOUT'
