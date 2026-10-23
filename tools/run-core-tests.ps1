param(
    [ValidateSet('All','Window','Support','CLI','Business','Capacity','Sequences')][string]$Suite = 'All',
    [string]$EvidenceDirectory = ('evidence/core-tests/' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
)
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$projectRoot = Split-Path -Parent $PSScriptRoot
$evidenceParent = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'evidence'))
$evidenceRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $EvidenceDirectory))
if (-not $evidenceRoot.StartsWith($evidenceParent + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'EvidenceDirectory must resolve inside this project/evidence.'
}
if ((Test-Path -LiteralPath $evidenceRoot) -and @(Get-ChildItem -LiteralPath $evidenceRoot -Force).Count -gt 0) {
    throw 'Use a new evidence directory; existing evidence is preserved.'
}
New-Item -ItemType Directory -Path $evidenceRoot -Force | Out-Null
$results = [System.Collections.Generic.List[object]]::new()

function Invoke-CoreCheck {
    param([string]$Name,[string[]]$ToolArgs,[string]$Scope)
    $started = Get-Date
    Push-Location -LiteralPath $projectRoot
    try {
        $output = @(& node @ToolArgs 2>&1)
        $exitCode = $LASTEXITCODE
        $outputText = ($output | ForEach-Object { $_.ToString() }) -join "`n"
    } finally { Pop-Location }
    $summary = @{}
    foreach ($metric in @('tests','pass','fail','cancelled','skipped','todo')) {
        $match = [regex]::Match($outputText, '(?m)^# ' + $metric + ' (\d+)\r?$')
        if ($match.Success) { $summary[$metric] = [int]$match.Groups[1].Value }
    }
    $ids = @([regex]::Matches($outputText,'T-CALL-\d{3}') | ForEach-Object Value | Sort-Object -Unique)
    $item = [pscustomobject]@{
        Name=$Name;StartedAt=$started.ToString('o');EndedAt=(Get-Date).ToString('o')
        WorkingDirectory=$projectRoot;Command='node';Arguments=$ToolArgs;ExitCode=$exitCode
        Scope=$Scope;TestIds=$ids;Summary=$summary;Output=$outputText
    }
    $results.Add($item)
    $item | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $evidenceRoot ($Name + '.json')) -Encoding utf8NoBOM
    $outputText | Set-Content -LiteralPath (Join-Path $evidenceRoot ($Name + '.log')) -Encoding utf8NoBOM
    Write-Output ($Name + ': exit=' + $exitCode + ' ' + ($summary | ConvertTo-Json -Compress))
}

Invoke-CoreCheck 'node-version' @('--version') 'runtime version only'
$files = @(Get-ChildItem -LiteralPath (Join-Path $projectRoot 'packages/core') -Recurse -File -Filter '*.mjs' |
    Sort-Object FullName | ForEach-Object { [IO.Path]::GetRelativePath($projectRoot, $_.FullName).Replace('\','/') })
for ($i=0; $i -lt $files.Count; $i++) {
    Invoke-CoreCheck ('syntax-' + ($i+1)) @('--check',$files[$i]) 'JavaScript syntax only'
}
Invoke-CoreCheck 'module-entry' @('--input-type=module','-e',
    'import assert from "node:assert/strict"; import {checkDialWindow} from "./packages/core/src/dial-window.mjs"; import {FakeClock} from "./packages/core/test-support/fake-clock.mjs"; import {FakeDialAdapter} from "./packages/core/test-support/fake-dial-adapter.mjs"; assert.equal(typeof checkDialWindow,"function"); assert.equal(typeof FakeClock,"function"); assert.equal(typeof FakeDialAdapter,"function"); console.log("ES module entry loaded; no behavior acceptance");') 'loadability only, no product behavior acceptance'
if (@($results | Where-Object ExitCode -ne 0).Count -eq 0) {
    if ($Suite -in @('All','Support')) {
        Invoke-CoreCheck 'support-tests' @('--test','--test-reporter=tap','packages/core/test/test-support.test.mjs') 'synthetic test helper checks only'
    }
    if ($Suite -in @('All','Window')) {
        Invoke-CoreCheck 'window-tests' @('--test','--test-reporter=tap','packages/core/test/dial-window.test.mjs','packages/core/test/dial-window-extra.test.mjs') 'R-CALL-006 behavior assertions, date range and narrow purity checks'
    }
    if ($Suite -in @('All','CLI')) {
        Invoke-CoreCheck 'cli-tests' @('--test','--test-reporter=tap','packages/core/test/window-cli.test.mjs') 'M-CALL-001 classification CLI only; no dialing or task loop'
    }
    if ($Suite -in @('All','Business')) {
        $business = @('eligibility','scheduler','persistence','process-recovery','results','regressions','management','simulation-cli','acceptance-regressions','self-service','weekday-policy','workbench','android-handoff','android-binding','android-workspace','android-scheduler','phone-capabilities','android-time-lease','trial-budget','controlled-trial','trial-workspace','observed-trial','observed-web','native-guard-link','observed-native','controlled-call-contract','controlled-call-coordinator') |
            ForEach-Object { 'packages/core/test/' + $_ + '.test.mjs' }
        Invoke-CoreCheck 'business-tests' (@('--test','--test-reporter=tap') + $business) 'synthetic application, SQLite transactions, process recovery and CLI; no real phones'
    }
    if ($Suite -in @('All','Capacity')) {
        Invoke-CoreCheck 'capacity-tests' @('--test','--test-reporter=tap','packages/core/test/capacity.test.mjs','packages/core/test/task-capacity.test.mjs') '50 synthetic targets, 200 attempts, 10 duplicates and attempt 201; local file store only'
    }
    if ($Suite -in @('All','Sequences')) {
        Invoke-CoreCheck 'sequence-tests' @('--test','--test-reporter=tap','packages/core/test/state-sequences.test.mjs') 'fixed seed, 32 sequences x 50 operations, synthetic invariant checks only'
    }
}
$hashes = @{}
foreach ($relative in @($files + 'packages/core/package.json')) {
    $hashes[$relative] = (Get-FileHash -LiteralPath (Join-Path $projectRoot $relative) -Algorithm SHA256).Hash.ToLowerInvariant()
}
$report = [pscustomobject]@{
    RecordedAt=(Get-Date).ToString('o');Suite=$Suite;RealDialAdapterConnected=$false
    EvidenceDirectory=$evidenceRoot;SourceHashes=$hashes;Checks=$results.ToArray()
    Scope='Local synthetic software checks including file-store/process recovery and synthetic capacity; no native mobile acceptance'
}
$report | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $evidenceRoot 'checks.json') -Encoding utf8NoBOM
if (@($results | Where-Object ExitCode -ne 0).Count -gt 0) { exit 1 }
exit 0
