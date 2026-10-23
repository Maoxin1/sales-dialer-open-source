$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$apkPath=Join-Path $projectRoot 'prototypes/android/pilot/build/outputs/apk/debug/pilot-debug.apk'
$buildTools=Get-ChildItem -LiteralPath (Join-Path $projectRoot '.tooling/android-sdk/build-tools') -Directory | Sort-Object Name -Descending | Select-Object -First 1
$aaptPath=Join-Path $buildTools.FullName 'aapt.exe'
$lines=& $aaptPath dump permissions $apkPath
if($LASTEXITCODE -ne 0){throw 'PILOT_APK_PERMISSION_INSPECTION_FAILED'}
$permissions=@($lines | ForEach-Object {if($_ -match "uses-permission: name='([^']+)'"){$Matches[1]}} | Sort-Object)
$expected=@('android.permission.INTERNET','android.permission.CALL_PHONE','android.permission.READ_PHONE_NUMBERS','android.permission.READ_PHONE_STATE','android.permission.SCHEDULE_EXACT_ALARM' | Sort-Object)
if(Compare-Object $permissions $expected){throw 'UNEXPECTED_PILOT_PERMISSION'}
$xml=& $aaptPath dump xmltree $apkPath AndroidManifest.xml
if($LASTEXITCODE -ne 0){throw 'PILOT_MANIFEST_INSPECTION_FAILED'}
if(($xml -join "`n") -notmatch 'allowBackup[^\r\n]*0x0'){throw 'PILOT_BACKUP_BOUNDARY_CHANGED'}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive=[System.IO.Compression.ZipFile]::OpenRead($apkPath)
$spikeClasses=[System.Collections.Generic.HashSet[string]]::new();$runtimePresent=$false;$telephonePresent=$false
$bundledAssets=0
try{
    foreach($name in @('index.html','app.js','flow.js','style.css','workbook.js','vendor/read-excel-file.min.js')){
        $asset=$archive.GetEntry('assets/enterprise/'+$name)
        if(!$asset){throw 'ENTERPRISE_ASSET_MISSING'}
        $stream=$asset.Open();$hasher=[System.Security.Cryptography.SHA256]::Create()
        try{$assetHash=[Convert]::ToHexString($hasher.ComputeHash($stream))}finally{$stream.Dispose();$hasher.Dispose()}
        if($assetHash -ne (Get-FileHash -LiteralPath (Join-Path $projectRoot ('packages/enterprise/web/'+$name))).Hash){throw 'ENTERPRISE_TRUSTED_ASSET_MISMATCH'}
        $bundledAssets++
    }
    foreach($entry in $archive.Entries){
        if($entry.FullName -notmatch '^classes[0-9]*\.dex$'){continue}
        $stream=$entry.Open();$memory=[System.IO.MemoryStream]::new()
        try{$stream.CopyTo($memory);$dex=[System.Text.Encoding]::ASCII.GetString($memory.ToArray())}finally{$stream.Dispose();$memory.Dispose()}
        $runtimePresent=$runtimePresent -or $dex.Contains('Lcom/mantou/salesdialer/contacts/PilotPhoneRuntime;')
        $telephonePresent=$telephonePresent -or $dex.Contains('Landroid/telecom/TelecomManager;')
        foreach($match in [regex]::Matches($dex,'Lcom/mantou/salesdialer/spike/[A-Za-z0-9_$]+;')){[void]$spikeClasses.Add($match.Value)}
    }
}finally{$archive.Dispose()}
if(!$runtimePresent -or !$telephonePresent){throw 'CONTROLLED_PILOT_ADAPTER_MISSING'}
foreach($class in $spikeClasses){if($class -notmatch '^Lcom/mantou/salesdialer/spike/ControlledCallExecutor(?:\$[A-Za-z0-9_]+)?;$'){throw 'UNRELATED_SPIKE_ENTRY_INCLUDED'}}
$shared=Get-ChildItem -LiteralPath (Join-Path $projectRoot 'prototypes/android/pilot/build/generated/shared-core/com/mantou/salesdialer/contacts') -Filter '*.java'
if($shared.Count -ne 13){throw 'PILOT_SHARED_SOURCE_SET_CHANGED'}
foreach($file in $shared){$original=Join-Path $projectRoot ('prototypes/android/standalone/src/main/java/com/mantou/salesdialer/contacts/'+$file.Name);if((Get-FileHash -LiteralPath $file.FullName).Hash -ne (Get-FileHash -LiteralPath $original).Hash){throw 'PILOT_SHARED_SOURCE_COPY_MISMATCH'}}
$report=[ordered]@{decision='PASSED';apkSha256=(Get-FileHash -LiteralPath $apkPath -Algorithm SHA256).Hash.ToLowerInvariant();permissions=$permissions;sharedCoreFiles=$shared.Count;trustedBundledAssets=$bundledAssets;oldSpikeEntriesIncluded=$false;backupAllowed=$false;actualPhoneCalls=0}
$json=$report | ConvertTo-Json -Depth 5
if($env:DIALER_EVIDENCE_DIR){Set-Content -LiteralPath (Join-Path $env:DIALER_EVIDENCE_DIR 'pilot-package-boundary.json') -Value $json -Encoding utf8NoBOM}
$json
