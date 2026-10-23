$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$readyPath=Join-Path $projectRoot '.local/lan/ready.json'
if(!(Test-Path -LiteralPath $readyPath)){Write-Output 'WIFI_NOT_RUNNING';exit 0}
$ready=Get-Content -LiteralPath $readyPath -Raw | ConvertFrom-Json
$owner=Get-CimInstance Win32_Process -Filter ('ProcessId='+[int]$ready.pid)
if(!$owner){Write-Output 'WIFI_NOT_RUNNING';exit 0}
$entry=Join-Path $projectRoot 'tools/lan-service.mjs'
if($owner.Name -ne 'node.exe' -or !$owner.CommandLine.Contains($entry)){throw 'LAN_PROCESS_IDENTITY_MISMATCH'}
Stop-Process -Id ([int]$ready.pid)
Write-Output 'STOPPED_PROJECT_WIFI_GATEWAY'
