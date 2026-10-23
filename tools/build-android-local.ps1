param([switch]$Lint,[switch]$ExistingTools,[string]$RecordPrefix=((Get-Date -Format 'yyyyMMdd-HHmmss-fff')+'-'))
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$projectRoot = Split-Path -Parent $PSScriptRoot
$env:JAVA_HOME = (Get-ChildItem -LiteralPath (Join-Path $projectRoot '.tooling/java') -Directory | Select-Object -First 1).FullName
$env:ANDROID_HOME = Join-Path $projectRoot '.tooling/android-sdk'
$env:ANDROID_USER_HOME = Join-Path $projectRoot '.tooling/android-user'
$env:GRADLE_USER_HOME = Join-Path $projectRoot '.tooling/gradle-home'
$localUserHome = Join-Path $projectRoot '.tooling/java-user-home'
New-Item -ItemType Directory -Force -Path $env:ANDROID_USER_HOME,$localUserHome | Out-Null
$env:JAVA_TOOL_OPTIONS = '-Duser.home=' + $localUserHome
$env:PATH = (Join-Path $env:JAVA_HOME 'bin') + [IO.Path]::PathSeparator + $env:PATH
$sdkManager = Join-Path $env:ANDROID_HOME 'cmdline-package/cmdline-tools/bin/sdkmanager.bat'
$records = [System.Collections.Generic.List[object]]::new()
function Record-LocalCommand([string]$Name,[string]$Executable,[string[]]$CommandArgs,[string]$InputText='') {
    $Name = $RecordPrefix + $Name
    if(Test-Path -LiteralPath (Join-Path $projectRoot ('evidence/continuation-1/' + $Name + '.json'))) { throw 'Existing evidence is preserved; use a new RecordPrefix.' }
    $started = Get-Date
    if($InputText) { $output = @($InputText | & $Executable @CommandArgs 2>&1) }
    else { $output = @(& $Executable @CommandArgs 2>&1) }
    $code = $LASTEXITCODE
    $text = ($output | ForEach-Object ToString) -join "`n"
    $record = @{Name=$Name;StartedAt=$started.ToString('o');EndedAt=(Get-Date).ToString('o');Command=$Executable;Arguments=$CommandArgs;ExitCode=$code;Output=$text}
    $records.Add($record)
    $dest = Join-Path $projectRoot ('evidence/continuation-1/' + $Name + '.json')
    $record | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $dest -Encoding utf8NoBOM
    $text | Set-Content -LiteralPath ($dest -replace '\.json$','.log') -Encoding utf8NoBOM
    Write-Output "$Name exit=$code"
    if($code -ne 0){throw "$Name failed; see project evidence log"}
}
Push-Location -LiteralPath $projectRoot
try {
    if($Lint) {
        Record-LocalCommand 'android-lint' (Join-Path $projectRoot 'prototypes/android/gradlew.bat') @('-p','prototypes/android',':app:lintDebug','--no-daemon','--console=plain')
        return
    }
    if($ExistingTools) {
        Record-LocalCommand 'android-assemble' (Join-Path $projectRoot 'prototypes/android/gradlew.bat') @('-p','prototypes/android',':app:assembleDebug','--no-daemon','--console=plain')
        return
    }
    Record-LocalCommand 'java-version' (Join-Path $env:JAVA_HOME 'bin/java.exe') @('-version')
    Record-LocalCommand 'sdk-licenses' $sdkManager @("--sdk_root=$env:ANDROID_HOME",'--licenses') ((1..30 | ForEach-Object {'y'}) -join "`n")
    Record-LocalCommand 'sdk-packages' $sdkManager @("--sdk_root=$env:ANDROID_HOME",'platforms;android-36','build-tools;35.0.0','platform-tools')
    Record-LocalCommand 'adb-version' (Join-Path $env:ANDROID_HOME 'platform-tools/adb.exe') @('version')
    Record-LocalCommand 'android-assemble' (Join-Path $projectRoot 'prototypes/android/gradlew.bat') @('-p','prototypes/android',':app:assembleDebug','--no-daemon','--console=plain')
} finally { Pop-Location }
