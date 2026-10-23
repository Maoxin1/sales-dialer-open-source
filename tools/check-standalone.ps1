param([ValidateSet('Test','Build')][string]$Mode='Test')
$ErrorActionPreference='Stop'
$PSNativeCommandUseErrorActionPreference=$false
$projectRoot=Split-Path -Parent $PSScriptRoot
$env:JAVA_HOME=(Get-ChildItem -LiteralPath (Join-Path $projectRoot '.tooling/java') -Directory | Select-Object -First 1).FullName
$env:ANDROID_HOME=Join-Path $projectRoot '.tooling/android-sdk'
$env:ANDROID_USER_HOME=Join-Path $projectRoot '.tooling/android-user'
$env:GRADLE_USER_HOME=Join-Path $projectRoot '.tooling/gradle-home'
$env:JAVA_TOOL_OPTIONS='-Duser.home='+(Join-Path $projectRoot '.tooling/java-user-home')
Push-Location -LiteralPath $projectRoot
try {
    & (Join-Path $env:JAVA_HOME 'bin/java.exe') -version
    if($Mode -eq 'Build'){
        & .\prototypes\android\gradlew.bat -p prototypes/android :standalone:assembleDebug :standalone:lintDebug --offline --no-daemon --console=plain
        if($LASTEXITCODE -ne 0){throw 'Android build/lint failed'}
    }else{
        $classes=Join-Path $projectRoot '.local/standalone-jvm-classes'
        New-Item -ItemType Directory -Force -Path $classes | Out-Null
        & (Join-Path $env:JAVA_HOME 'bin/javac.exe') -encoding UTF-8 -d $classes prototypes/android/standalone/src/main/java/com/mantou/salesdialer/standalone/TaskEngine.java prototypes/android/standalone/src/main/java/com/mantou/salesdialer/standalone/TaskSubmissionBridge.java prototypes/android/standalone/src/main/java/com/mantou/salesdialer/contacts/ContactTaskModel.java tools/StandaloneTaskCheck.java tools/StandaloneTimerCheck.java tools/StandaloneRetryCheck.java tools/StandaloneImportCheck.java tools/StandaloneBridgeCheck.java tools/ContactTaskModelCheck.java tools/ContactTaskRestoreCheck.java
        if($LASTEXITCODE -ne 0){throw 'Java compile failed'}
        & (Join-Path $env:JAVA_HOME 'bin/javac.exe') -encoding UTF-8 -cp $classes -d $classes tools/ContactDraftRefreshCheck.java
        if($LASTEXITCODE -ne 0){throw 'Java compile failed'}
        & (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp $classes StandaloneTaskCheck
        if($LASTEXITCODE -ne 0){throw 'Native task checks failed'}
        & (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp $classes StandaloneTimerCheck
        if($LASTEXITCODE -ne 0){throw 'Native timer checks failed'}
        & (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp $classes StandaloneRetryCheck
        if($LASTEXITCODE -ne 0){throw 'Native retry checks failed'}
        & (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp $classes StandaloneImportCheck
        if($LASTEXITCODE -ne 0){throw 'Native import checks failed'}
        & (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp $classes StandaloneBridgeCheck
        if($LASTEXITCODE -ne 0){throw 'Native bridge checks failed'}
        & (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp $classes ContactTaskModelCheck
        if($LASTEXITCODE -ne 0){throw 'Contact model checks failed'}
        & (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp $classes com.mantou.salesdialer.contacts.ContactTaskRestoreCheck
        if($LASTEXITCODE -ne 0){throw 'Contact restore checks failed'}
        & (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp $classes com.mantou.salesdialer.contacts.ContactDraftRefreshCheck
        if($LASTEXITCODE -ne 0){throw 'Draft refresh checks failed'}
        & (Join-Path $env:JAVA_HOME 'bin/javac.exe') -encoding UTF-8 -cp $classes -d $classes prototypes/android/standalone/src/main/java/com/mantou/salesdialer/contacts/SalesPlanModel.java tools/SalesPlanCheck.java
        if($LASTEXITCODE -ne 0){throw 'Sales plan compile failed'}
        & (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp $classes com.mantou.salesdialer.contacts.SalesPlanCheck
        if($LASTEXITCODE -ne 0){throw 'Sales plan checks failed'}
        & (Join-Path $env:JAVA_HOME 'bin/javac.exe') -encoding UTF-8 -cp $classes -d $classes prototypes/android/standalone/src/main/java/com/mantou/salesdialer/contacts/SyntheticAttemptModel.java tools/SyntheticAttemptCheck.java
        if($LASTEXITCODE -ne 0){throw 'Synthetic attempt compile failed'}
        & (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp $classes com.mantou.salesdialer.contacts.SyntheticAttemptCheck
        if($LASTEXITCODE -ne 0){throw 'Synthetic attempt checks failed'}
        & (Join-Path $env:JAVA_HOME 'bin/javac.exe') -encoding UTF-8 -cp $classes -d $classes prototypes/android/standalone/src/main/java/com/mantou/salesdialer/contacts/SyntheticWorkspaceModel.java tools/SyntheticWorkspaceCheck.java
        if($LASTEXITCODE -ne 0){throw 'Workspace model compile failed'}
        & (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp $classes com.mantou.salesdialer.contacts.SyntheticWorkspaceCheck
        if($LASTEXITCODE -ne 0){throw 'Workspace model checks failed'}
        if($Mode -eq 'Test'){
            & (Join-Path $env:JAVA_HOME 'bin/javac.exe') -encoding UTF-8 -cp $classes -d $classes prototypes/android/standalone/src/main/java/com/mantou/salesdialer/contacts/WorkspaceTimerModel.java tools/WorkspaceTimerCheck.java
            if($LASTEXITCODE -ne 0){throw 'Workspace timer compile failed'}
            & (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp $classes com.mantou.salesdialer.contacts.WorkspaceTimerCheck
            if($LASTEXITCODE -ne 0){throw 'Workspace timer checks failed'}
            & (Join-Path $env:JAVA_HOME 'bin/javac.exe') -encoding UTF-8 -cp $classes -d $classes prototypes/android/standalone/src/main/java/com/mantou/salesdialer/contacts/PhoneIntakeModel.java tools/PhoneIntakeCheck.java tools/PhoneParserParityCheck.java
            if($LASTEXITCODE -ne 0){throw 'Phone intake compile failed'}
            & (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp $classes com.mantou.salesdialer.contacts.PhoneIntakeCheck
            if($LASTEXITCODE -ne 0){throw 'Phone intake checks failed'}
            & node tools/check-phone-parser-parity.mjs
            if($LASTEXITCODE -ne 0){throw 'Phone parser host parity failed'}
            & (Join-Path $env:JAVA_HOME 'bin/javac.exe') -encoding UTF-8 -cp $classes -d $classes prototypes/android/standalone/src/main/java/com/mantou/salesdialer/contacts/LocalDraftBinding.java tools/LocalDraftBindingCheck.java
            if($LASTEXITCODE -ne 0){throw 'Local draft compile failed'}
            & (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp $classes com.mantou.salesdialer.contacts.LocalDraftBindingCheck
            if($LASTEXITCODE -ne 0){throw 'Local draft checks failed'}
            & (Join-Path $env:JAVA_HOME 'bin/javac.exe') -encoding UTF-8 -cp $classes -d $classes prototypes/android/standalone/src/main/java/com/mantou/salesdialer/contacts/LocalDraftBatch.java tools/LocalDraftBatchCheck.java
            if($LASTEXITCODE -ne 0){throw 'Local batch compile failed'}
            & (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp $classes com.mantou.salesdialer.contacts.LocalDraftBatchCheck
            if($LASTEXITCODE -ne 0){throw 'Local batch behavior checks failed'}
            & (Join-Path $env:JAVA_HOME 'bin/javac.exe') -encoding UTF-8 -cp $classes -d $classes prototypes/android/standalone/src/main/java/com/mantou/salesdialer/contacts/AttemptMetrics.java tools/AttemptMetricsCheck.java
            if($LASTEXITCODE -ne 0){throw 'Attempt metrics compile failed'}
            & (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp $classes com.mantou.salesdialer.contacts.AttemptMetricsCheck
            if($LASTEXITCODE -ne 0){throw 'Attempt metrics behavior checks failed'}
            & (Join-Path $env:JAVA_HOME 'bin/javac.exe') -encoding UTF-8 -cp $classes -d $classes prototypes/android/standalone/src/main/java/com/mantou/salesdialer/contacts/ContactListView.java tools/ContactListViewCheck.java
            if($LASTEXITCODE -ne 0){throw 'Contact view compile failed'}
            & (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp $classes com.mantou.salesdialer.contacts.ContactListViewCheck
            if($LASTEXITCODE -ne 0){throw 'Contact view behavior failed'}
            & (Join-Path $env:JAVA_HOME 'bin/javac.exe') -encoding UTF-8 -cp $classes -d $classes prototypes/android/pilot/src/main/java/com/mantou/salesdialer/contacts/EnterpriseTimerTicket.java tools/EnterpriseTimerCheck.java
            if($LASTEXITCODE -ne 0){throw 'Enterprise timer compile failed'}
            & (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp $classes com.mantou.salesdialer.contacts.EnterpriseTimerCheck
            if($LASTEXITCODE -ne 0){throw 'Enterprise timer checks failed'}
            & (Join-Path $env:JAVA_HOME 'bin/javac.exe') -encoding UTF-8 -cp $classes -d $classes prototypes/android/pilot/src/main/java/com/mantou/salesdialer/contacts/OperatorBatchPolicy.java tools/OperatorBatchPolicyCheck.java
            if($LASTEXITCODE -ne 0){throw 'Operator batch compile failed'}
            & (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp $classes com.mantou.salesdialer.contacts.OperatorBatchPolicyCheck
            if($LASTEXITCODE -ne 0){throw 'Operator batch policy failed'}

            & (Join-Path $env:JAVA_HOME 'bin/javac.exe') -encoding UTF-8 -cp $classes -d $classes tools/LocalPlanCheck.java
            if($LASTEXITCODE -ne 0){throw 'Local plan compile failed'}
            & (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp $classes com.mantou.salesdialer.contacts.LocalPlanCheck
            if($LASTEXITCODE -ne 0){throw 'Local plan checks failed'}
            & (Join-Path $env:JAVA_HOME 'bin/javac.exe') -encoding UTF-8 -cp $classes -d $classes prototypes/android/standalone/src/main/java/com/mantou/salesdialer/contacts/PilotPermit.java prototypes/android/app/src/main/java/com/mantou/salesdialer/spike/ControlledCallExecutor.java tools/PilotPermitCheck.java tools/ControlledCallCheck.java
            if($LASTEXITCODE -ne 0){throw 'Pilot permit compile failed'}
            & (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp $classes com.mantou.salesdialer.contacts.PilotPermitCheck
            if($LASTEXITCODE -ne 0){throw 'Pilot permit checks failed'}
            & (Join-Path $env:JAVA_HOME 'bin/java.exe') -cp $classes ControlledCallCheck
            if($LASTEXITCODE -ne 0){throw 'Shared controlled executor checks failed'}
        }
    }
}finally{Pop-Location}
