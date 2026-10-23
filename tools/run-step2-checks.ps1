param([switch]$StaticOnly)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$evidenceRoot = Join-Path $projectRoot 'evidence\step-2'
$results = [System.Collections.Generic.List[object]]::new()

function Invoke-RecordedCheck {
    param([string]$Name, [string]$Tool, [string[]]$ToolArgs, [string]$WorkingDirectory)
    $started = Get-Date
    Push-Location -LiteralPath $WorkingDirectory
    try {
        $exitCode = 0
        try {
            $output = & $Tool @ToolArgs 2>&1
            $exitCode = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }
            $outputText = ($output | ForEach-Object { $_.ToString() }) -join "`n"
        } catch {
            $exitCode = if ($_.Exception -is [System.Management.Automation.CommandNotFoundException]) { 127 } else { 1 }
            $outputText = $_.ToString()
        }
        $item = [pscustomobject]@{Name=$Name;StartedAt=$started.ToString('o');EndedAt=(Get-Date).ToString('o');WorkingDirectory=$WorkingDirectory;Command=$Tool;Arguments=$ToolArgs;ExitCode=$exitCode;Output=$outputText}
        $results.Add($item)
        $item | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $evidenceRoot ($Name + '.json')) -Encoding utf8NoBOM
        $outputText | Set-Content -LiteralPath (Join-Path $evidenceRoot ($Name + '.log')) -Encoding utf8NoBOM
        Write-Output ($Name + ': exit=' + $exitCode)
    } finally { Pop-Location }
}

if ($StaticOnly) {
    foreach ($item in (Get-Content -LiteralPath (Join-Path $evidenceRoot 'checks.json') -Raw | ConvertFrom-Json)) {
        if ($item.Name -notin @('static-sources','static-metadata')) { $results.Add($item) }
    }
} else {
    Invoke-RecordedCheck 'node-version' 'node' @('--version') $projectRoot
    Invoke-RecordedCheck 'npm-version' 'npm.cmd' @('--version') $projectRoot
    Invoke-RecordedCheck 'python-version' 'py' @('--version') $projectRoot
}
Invoke-RecordedCheck 'static-sources' 'node' @('tools/static-check/check.mjs') $projectRoot
Invoke-RecordedCheck 'static-metadata' 'py' @('tools/static-check/metadata-check.py') $projectRoot
if (-not $StaticOnly) {
Invoke-RecordedCheck 'project-dependencies' 'npm.cmd' @('list','--prefix','tools/static-check','--depth=0','--json') $projectRoot
$previousGradleHome = $env:GRADLE_USER_HOME
try {
    $env:GRADLE_USER_HOME = Join-Path $projectRoot '.tooling\gradle'
    Invoke-RecordedCheck 'android-build-attempt' (Join-Path $projectRoot 'prototypes\android\gradlew.bat') @(':app:assembleDebug','--no-daemon','--console=plain') (Join-Path $projectRoot 'prototypes\android')
} finally { $env:GRADLE_USER_HOME = $previousGradleHome }
Invoke-RecordedCheck 'ios-build-attempt' 'xcodebuild' @('-project','DialerProbe.xcodeproj','-scheme','DialerProbe','-sdk','iphonesimulator','-configuration','Debug','-derivedDataPath','build','CODE_SIGNING_ALLOWED=NO','build') (Join-Path $projectRoot 'prototypes\ios')
Invoke-RecordedCheck 'adb-device-attempt' 'adb' @('devices','-l') $projectRoot
}
$results.ToArray() | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $evidenceRoot 'checks.json') -Encoding utf8NoBOM
if (@($results | Where-Object { $_.Name -in @('static-sources','static-metadata') -and $_.ExitCode -ne 0 }).Count -gt 0) { exit 1 }
