param([string]$Address='')
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $projectRoot
try{
    $localReady=$false
    try{$health=Invoke-RestMethod -Uri 'http://127.0.0.1:8790/health' -TimeoutSec 2;$localReady=($health.ok -and $health.service -eq 'sales-dialer-local-enterprise')}catch{}
    if(!$localReady){& pwsh -NoProfile -File tools/start-enterprise.ps1;if($LASTEXITCODE -ne 0){throw 'ENTERPRISE_START_FAILED'}}
    $lanDir=Join-Path $projectRoot '.local/lan'
    if(!(Test-Path -LiteralPath (Join-Path $lanDir 'private.json'))){
        if(!$Address){throw 'FIRST_START_REQUIRES_LAN_IPV4_ADDRESS'}
        & node tools/lan-service.mjs init $Address
        if($LASTEXITCODE -ne 0){throw 'LAN_INIT_FAILED'}
    }
    $identitySid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    & icacls.exe $lanDir /inheritance:r /grant:r ('*'+$identitySid+':(OI)(CI)F') '*S-1-5-18:(OI)(CI)F' | Out-Null
    if($LASTEXITCODE -ne 0){throw 'LAN_PRIVATE_ACL_FAILED'}
    $readyPath=Join-Path $lanDir 'ready.json';$entry=Join-Path $projectRoot 'tools/lan-service.mjs'
    if(Test-Path -LiteralPath $readyPath){$ready=Get-Content -LiteralPath $readyPath -Raw | ConvertFrom-Json;$owner=Get-CimInstance Win32_Process -Filter ('ProcessId='+[int]$ready.pid);if($owner -and $owner.Name -eq 'node.exe' -and $owner.CommandLine.Contains($entry)){Write-Output ('WIFI_SERVICE_RUNNING '+$ready.url);exit 0}}
    $nodePath=(Get-Command node).Source
    $child=Start-Process -FilePath $nodePath -ArgumentList @('"'+$entry+'"','start') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $lanDir 'stdout.log') -RedirectStandardError (Join-Path $lanDir 'stderr.log')
    $limit=(Get-Date).AddSeconds(8)
    while((Get-Date) -lt $limit){if($child.HasExited){throw 'LAN_START_FAILED_CHECK_PRIVATE_LOG'};if(Test-Path -LiteralPath $readyPath){$ready=Get-Content -LiteralPath $readyPath -Raw | ConvertFrom-Json;if($ready.pid -eq $child.Id){Write-Output ('WIFI_READY '+$ready.url);Write-Output '配对码保存在 .local/lan/pairing-code.txt，请勿转发。';exit 0}};Start-Sleep -Milliseconds 200}
    throw 'LAN_START_TIMEOUT'
}finally{Pop-Location}
