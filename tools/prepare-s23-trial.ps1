$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$report=[ordered]@{status='NOT_READY';realCallsStarted=0;taskCreated=$false;permitCreated=$false}
function Invoke-Phone([string[]]$Arguments){
    $output=& $script:adbPath -s $script:deviceSerial @Arguments 2>&1
    if($LASTEXITCODE -ne 0){throw 'PHONE_COMMAND_FAILED'}
    return ($output -join "`n").Trim()
}
try{
    $binding=Get-Content -LiteralPath (Join-Path $projectRoot '.local/contact-android.json') -Raw | ConvertFrom-Json
    $script:deviceSerial=[string]$binding.serial
    if($script:deviceSerial -notmatch '^[A-Za-z0-9_-]+$'){throw 'INVALID_BOUND_DEVICE'}
    $script:adbPath=Join-Path $projectRoot '.tooling/android-sdk/platform-tools/adb.exe'
    if((Invoke-Phone @('get-state')) -ne 'device'){throw 'CONNECT_BOUND_S23_AND_ALLOW_USB_DEBUGGING'}
    if((Invoke-Phone @('shell','am','get-current-user')) -ne '0'){throw 'PERSONAL_PROFILE_REQUIRED'}
    $report.deviceConnected=$true
    $pkg='com.mantou.salesdialer.pilot'
    $apkPath=Invoke-Phone @('shell','pm','path','--user','0',$pkg)
    if($apkPath -notmatch '^package:/[^\r\n]+$'){throw 'PILOT_PACKAGE_NOT_FOUND'}
    $installedHash=(Invoke-Phone @('shell','sha256sum',$apkPath.Substring(8))).Split(' ')[0]
    $expectedHash=(Get-FileHash -LiteralPath (Join-Path $projectRoot 'prototypes/android/pilot/build/outputs/apk/debug/pilot-debug.apk') -Algorithm SHA256).Hash.ToLowerInvariant()
    if($installedHash -ne $expectedHash){throw 'INSTALLED_APK_MISMATCH_NO_AUTOMATIC_INSTALL'}
    $report.apkMatches=$true
    $files=(Invoke-Phone @('shell','run-as',$pkg,'ls','files')) -split '\s+'
    $report.phonePermitPresent='enterprise-live-permit.json' -in $files
    $report.operatorBatchPresent='enterprise-operator-batch.json' -in $files
    $report.serverPermitPresent=Test-Path -LiteralPath (Join-Path $projectRoot '.local/enterprise/live-permit.json')
    $report.alarmState='ABSENT'
    if('enterprise-alarm.json' -in $files){
        $ticket=Invoke-Phone @('shell','run-as',$pkg,'cat','files/enterprise-alarm.json') | ConvertFrom-Json
        $report.alarmState=[string]$ticket.state
    }
    $callStates=[regex]::Matches((Invoke-Phone @('shell','dumpsys','telephony.registry')),'mCallState=(\d+)')
    $report.phoneIdle=($callStates.Count -gt 0 -and @($callStates | Where-Object {$_.Groups[1].Value -ne '0'}).Count -eq 0)
    # Only a connection helper: never open/restart the app or alter an existing queue.
    & pwsh -NoProfile -File (Join-Path $PSScriptRoot 'start-enterprise.ps1') | Out-Null
    if($LASTEXITCODE -ne 0){throw 'LOCAL_SERVICE_NOT_READY'}
    $health=Invoke-RestMethod -Uri 'http://127.0.0.1:8790/health' -TimeoutSec 5
    if($health.service -ne 'sales-dialer-local-enterprise' -or !$health.ok){throw 'LOCAL_SERVICE_IDENTITY_MISMATCH'}
    $report.serviceReady=$true
    Invoke-Phone @('reverse','tcp:8790','tcp:8790') | Out-Null
    $reverse=Invoke-Phone @('reverse','--list')
    if($reverse -notmatch '(?m)\btcp:8790\s+tcp:8790\s*$'){throw 'USB_FORWARD_NOT_CONFIRMED'}
    $report.usbForwardReady=$true
    $report.status='CONNECTION_READY_NOT_CALL_AUTHORIZATION'
    Write-Output '电脑服务和S23连接已就绪。手机打开“销售拨号·受控试点 → 企业账号与自动队列”。'
    Write-Output '本操作不登录、不创建计划、不授予拨号许可、不恢复或启动队列。'
    if($report.phonePermitPresent -or $report.operatorBatchPresent -or $report.serverPermitPresent -or $report.alarmState -eq 'READY'){
        Write-Output '检测到已有许可或定时票据；本工具未改变它们，请先核对当前任务。'
    }
    if(!$report.phoneIdle){Write-Output '手机当前忙碌或状态未知；连接成功不代表允许开始任务。'}
}catch{
    $message=$_.Exception.Message
    $report.error=if($message -match '^[A-Z_]+$'){$message}else{'PREPARATION_FAILED_CHECK_USB_AND_LOCAL_SERVICE'}
    Write-Output ('准备未完成：'+$report.error)
}
finally{
    if($env:DIALER_EVIDENCE_DIR){
        $report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $env:DIALER_EVIDENCE_DIR 's23-trial-preparation.json') -Encoding utf8NoBOM
    }
}
if($report.status -ne 'CONNECTION_READY_NOT_CALL_AUTHORIZATION'){exit 1}
