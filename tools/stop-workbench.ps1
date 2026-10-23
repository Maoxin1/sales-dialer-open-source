[CmdletBinding(SupportsShouldProcess=$true)]
param()
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$record=Join-Path $projectRoot '.local/workbench-service.json'
if(-not (Test-Path -LiteralPath $record)){Write-Output 'No recorded background workbench. For foreground npm, use Ctrl+C.';return}
$saved=Get-Content -LiteralPath $record -Raw | ConvertFrom-Json
$process=Get-CimInstance Win32_Process -Filter ('ProcessId=' + [int]$saved.Pid)
if(-not $process){Write-Output 'Recorded workbench is already stopped.';return}
$entry=Join-Path $projectRoot 'packages/core/src/workbench-cli.mjs'
if($process.Name -ne 'node.exe' -or -not $process.CommandLine.Contains($entry)){throw 'PID no longer identifies this project workbench; nothing stopped.'}
if($PSCmdlet.ShouldProcess(('PID '+$saved.Pid),'Stop project-local simulation workbench')) {
    Stop-Process -Id ([int]$saved.Pid)
    Write-Output 'Workbench stopped. The local SQLite database is preserved.'
}
