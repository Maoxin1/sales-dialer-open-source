$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$readyPath=Join-Path $projectRoot '.local/enterprise/ready.json'
if(!(Test-Path -LiteralPath $readyPath)){Write-Output 'NOT_RUNNING';exit 0}
$ready=Get-Content -LiteralPath $readyPath -Raw | ConvertFrom-Json
$process=Get-CimInstance Win32_Process -Filter ('ProcessId='+[int]$ready.pid)
if(!$process){Write-Output 'NOT_RUNNING';exit 0}
$entry=Join-Path $projectRoot 'packages/enterprise/src/server.mjs'
if(!$process.CommandLine.Contains($entry) -or $process.Name -ne 'node.exe'){throw 'PROCESS_IDENTITY_MISMATCH_NO_STOP'}
Stop-Process -Id ([int]$ready.pid)
Write-Output 'STOPPED_PROJECT_ENTERPRISE_SERVER'
