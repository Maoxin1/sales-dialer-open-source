param([ValidateSet('Test','Build','BuildAll')][string]$Mode='Build')
$ErrorActionPreference='Stop'
$PSNativeCommandUseErrorActionPreference=$false
$projectRoot=Split-Path -Parent $PSScriptRoot
if($Mode -eq 'Test'){& (Join-Path $PSScriptRoot 'check-standalone.ps1') -Mode Test;exit $LASTEXITCODE}
$env:JAVA_HOME=(Get-ChildItem -LiteralPath (Join-Path $projectRoot '.tooling/java') -Directory | Select-Object -First 1).FullName
$env:ANDROID_HOME=Join-Path $projectRoot '.tooling/android-sdk'
$env:ANDROID_USER_HOME=Join-Path $projectRoot '.tooling/android-user'
$env:GRADLE_USER_HOME=Join-Path $projectRoot '.tooling/gradle-home'
$env:JAVA_TOOL_OPTIONS='-Duser.home='+(Join-Path $projectRoot '.tooling/java-user-home')
Push-Location -LiteralPath $projectRoot
try{
    & (Join-Path $env:JAVA_HOME 'bin/java.exe') -version
    $nativeBuildTasks=@(':pilot:assembleDebug',':pilot:lintDebug')
    if($Mode -eq 'BuildAll'){$nativeBuildTasks+=@(':standalone:assembleDebug',':standalone:lintDebug')}
    & .\prototypes\android\gradlew.bat -p prototypes/android @nativeBuildTasks --offline --no-daemon --console=plain
    if($LASTEXITCODE -ne 0){throw 'Pilot build/lint failed'}
}finally{Pop-Location}
