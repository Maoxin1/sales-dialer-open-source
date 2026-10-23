$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$apkPath=Join-Path $projectRoot 'prototypes/android/standalone/build/outputs/apk/debug/standalone-debug.apk'
$buildTools=Get-ChildItem -LiteralPath (Join-Path $projectRoot '.tooling/android-sdk/build-tools') -Directory | Sort-Object Name -Descending | Select-Object -First 1
$aaptPath=Join-Path $buildTools.FullName 'aapt.exe'
$permissionLines=& $aaptPath dump permissions $apkPath
if($LASTEXITCODE -ne 0){throw 'APK_PERMISSION_INSPECTION_FAILED'}
$permissions=@($permissionLines | ForEach-Object {if($_ -match "uses-permission: name='([^']+)'"){$Matches[1]}})
if($permissions.Count -ne 1 -or $permissions[0] -ne 'android.permission.SCHEDULE_EXACT_ALARM'){throw 'SIMULATION_PERMISSION_BOUNDARY_CHANGED'}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive=[System.IO.Compression.ZipFile]::OpenRead($apkPath)
$spikeClasses=[System.Collections.Generic.HashSet[string]]::new()
try{
    foreach($entry in $archive.Entries){
        if($entry.FullName -notmatch '^classes[0-9]*\.dex$'){continue}
        $stream=$entry.Open();$memory=[System.IO.MemoryStream]::new()
        try{$stream.CopyTo($memory);$dexText=[System.Text.Encoding]::ASCII.GetString($memory.ToArray())}finally{$stream.Dispose();$memory.Dispose()}
        if($dexText.Contains('Landroid/telecom/TelecomManager;') -or $dexText.Contains('Landroid/telephony/TelephonyManager;')){throw 'SIMULATION_TELEPHONE_API_INCLUDED'}
        foreach($match in [regex]::Matches($dexText,'Lcom/mantou/salesdialer/spike/[A-Za-z0-9_$]+;')){[void]$spikeClasses.Add($match.Value)}
    }
}finally{$archive.Dispose()}
if(!$spikeClasses.Contains('Lcom/mantou/salesdialer/spike/ControlledCallExecutor;')){throw 'SHARED_PURE_EXECUTOR_MISSING'}
foreach($class in $spikeClasses){if($class -notmatch '^Lcom/mantou/salesdialer/spike/ControlledCallExecutor(?:\$[A-Za-z0-9_]+)?;$'){throw 'UNRELATED_SPIKE_CLASS_INCLUDED'}}
$original=Get-FileHash -LiteralPath (Join-Path $projectRoot 'prototypes/android/app/src/main/java/com/mantou/salesdialer/spike/ControlledCallExecutor.java') -Algorithm SHA256
$generated=Get-FileHash -LiteralPath (Join-Path $projectRoot 'prototypes/android/standalone/build/generated/shared-executor/com/mantou/salesdialer/spike/ControlledCallExecutor.java') -Algorithm SHA256
if($original.Hash -ne $generated.Hash){throw 'SHARED_EXECUTOR_COPY_MISMATCH'}
$report=[ordered]@{decision='PASSED';apkSha256=(Get-FileHash -LiteralPath $apkPath -Algorithm SHA256).Hash.ToLowerInvariant();permissions=$permissions;spikeClasses=@($spikeClasses | Sort-Object);telephoneApisIncluded=$false;sharedExecutorMatchesSource=$true;actualPhoneCalls=0}
$json=$report | ConvertTo-Json -Depth 5
if($env:DIALER_EVIDENCE_DIR){Set-Content -LiteralPath (Join-Path $env:DIALER_EVIDENCE_DIR 'package-boundary.json') -Value $json -Encoding utf8NoBOM}
$json
