# 当前需要环境的操作与回传

2026-10-18 10:45（R100/R101）：已连续交付本机批量草稿预览/明确原子创建，以及不同目标、授权尝试、API确认、人工结果分离的累计/北京时间今日统计。689 Java断言、600解析向量、398 S23隔离断言、批量UI44驱动检查、新版只读UI43驱动检查及20配置/停用断言通过。试点0.3-batch-metrics已安装S23；本轮0真实电话，实际区0联系人/0尝试/plan0暂停/许可停用，格式区2生成记录/2草稿/plan2暂停。原资料/权限/电销卡保留；整体仍部分通过，新包真实通话、自动批量队列、企业身份与全天多机型尚未验收，iPhone暂缓。当前继续步骤5可独立实现项；真实通话条件只影响该部分。

当前本地操作/测试与回传见[批量与统计](android-batch-metrics.md)。本轮不需要用户再次设置权限、同意验收或提供资格证明；真实通话维持独立未运行。

历史接续（2026-10-16 R093）：用户已解锁，S23可操作合成工作区的导入→计划/立即模拟→结果核对/未知关闭→下一次及两种强停重开已实际通过，无需为该子项再要求人工验收同意。真实号码/原许可保持关闭，本轮0电话；iPhone暂停。以下按日期保留历史环境缺口，当前下一步见next-action。

## R093已运行入口与其它环境回传

已安装“销售任务仿真”，手机点“打开合成任务工作区”。输入只接受SIM-三位数字，时间为北京时间yyyy-MM-dd HH:mm；当前计划到点仍手动模拟，不是自动电话。联系人操作内可模拟资格、拒绝及明确草稿刷新；“结果仍未知”保留占用，关闭须勾选合成无活动/待处理确认，不能冒充手机真实状态。

项目根先运行pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test及-Mode Build。UI E2E：node tools/record-core-run.mjs evidence/workspace-ui-new-run R-CALL-093 node tools/check-workspace-ui-device.mjs --run；每次换新目录。需USB/本地绑定、解锁、实际工作日09:00–18:00、原DEMO暂停及工作区无未知待核对。会追加两条未使用SIM-900～999及两次模拟尝试，失败时保留历史，不清库重跑。独立fixture用相同包装器执行tools/check-workspace-fixture-device.mjs --run，需已有工作区，可锁屏。相关回归node tools/check-synthetic-loop-device.mjs --run；手机命令顺序执行。

回传run.json/output.log、workspace-ui-cases.json及pending/history/workspace-final PNG/XML；固定fixture附workspace-fixture.json。S23本轮30驱动检查、21隔离断言及97原闭环回归通过；其它机型/系统版本、locale与真实通话环境未运行。当前最终4合成联系人/3尝试/待核对0/暂停，原DEMO12目标7尝试字节不变，旧真实app不改。新工作区定时器、设备占用/双卡权限/真实发送器尚未连接，真实试点仍需具体新授权，不自动重拨任何接收端。

> 当前真机接续（2026-10-15）：S23 Ultra已连接并完成本轮3次受控通话，已恢复仿真/暂停。设备日志与用户接收端确认见[S23 Ultra真机报告](spikes/ANDROID-S23U-2026-10-15.md)。下方旧的无设备/接收端条件保留为历史；本轮追加呼叫额度已用尽。

更新：2026-10-14。用户报告暂无真机；中国电信销售拨出SIM、受控测试同意已报告。接收端号码尚未提供，Mac/Xcode未提供可访问环境。当前无APK/iOS app构建产物，无拨号执行。仅在满足对应条件后按下列步骤补证。

## 最少输入

1. 一个双方同意的受控接收端号码；说明它与已提供的销售拨出SIM不同，以及接听人员/可测试时段。销售号已保存，不需要重发。
2. 实际双卡Android/iPhone机型、系统、设备所在地区与可访问方式；用户当前暂无真机，步骤4测试准备已完成，共用实现可继续。
3. 可用于构建的JDK17/SDK36及Mac/Xcode路径/版本；没有则安排项目内工具/验证环境，账号或签名不足只等待对应安装项。

本文件的30秒、15分钟、迟到5秒及单手机号均是探索参数，不是生产行为规范。真实接收端未确认前只使用`SYNTHETIC-001`仿真，销售拨出号不会自动导入目标字段。

## Android：工具、构建与安装

当前缺Java、Android SDK/adb。可提供已有安装路径；若按项目工具目录准备JDK17根目录`.tooling/jdk-17`、SDK根目录`.tooling/android-sdk`，可在项目根运行以下命令。这里只改当前进程变量，不写全局配置。

```powershell
Set-Location -LiteralPath 'D:\mx\AI-Workspace\Projects\sales-dialer'
$env:JAVA_HOME = Join-Path (Get-Location) '.tooling\jdk-17'
$env:ANDROID_SDK_ROOT = Join-Path (Get-Location) '.tooling\android-sdk'
$env:GRADLE_USER_HOME = Join-Path (Get-Location) '.tooling\gradle'
& "$env:JAVA_HOME\bin\java.exe" -version
& "$env:ANDROID_SDK_ROOT\cmdline-tools\latest\bin\sdkmanager.bat" --licenses
& "$env:ANDROID_SDK_ROOT\cmdline-tools\latest\bin\sdkmanager.bat" 'platform-tools' 'platforms;android-36' 'build-tools;35.0.0'
& .\prototypes\android\gradlew.bat -p prototypes/android :app:assembleDebug --no-daemon --console=plain
```

目录目前未准备；SDK许可证由使用者逐项阅读并决定，不自动接受。也可使用已有Android Studio的对应工具；将实际路径/版本记录到environment。Android17/API37仍在原覆盖探索范围内，本工程compile/target36不证明其兼容性。

构建成功、设备开启开发者选项/USB调试并同意此电脑连接后，将下列adb换成实际SDK的platform-tools入口或加入当前进程PATH：

```powershell
adb devices -l
adb shell getprop ro.product.model
adb shell getprop ro.build.version.release
adb shell getprop ro.build.version.sdk
adb install -r prototypes/android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.mantou.salesdialer.spike/.MainActivity
```

多个设备时显式指定要验证的设备序列号；不要自动选第一台。记录安装日志、退出码、机型、系统、地区、网络、双卡配置和电信SIM标签；不回传完整SIM账户ID/客户名单。

## Android：一次实验的操作

先验证仿真：保留默认`SYNTHETIC-001`和仿真勾选，应用配置；人工一次→查看simulated_request；定时一次→查看scheduled/alarm_delivered/simulated_request；再定时并在到点前暂停，查看暂停后没有新提交。所有这些设备操作目前未运行。

真实条件满足后：授予电话/状态/号码权限→刷新SIM→选择销售中国电信卡→填受控接收端→取消仿真→确认双方同意→应用配置。字段变化会自动暂停，改完需重新应用。人工或定时每次只启用一通，提交后标记待核对。

| 场景ID | 操作 | 必须分开观察/记录 | 当前状态 |
|---|---|---|---|
| M-AND-01 | 前台人工触发一次 | 请求ID、是否真实呼出、所用SIM、接收端显号、双方语音/接通 | 未运行 |
| M-AND-02 | 前台30秒一次定时 | due/实际事件时刻、exact/inexact、系统提交与实际呼出 | 未运行 |
| M-AND-03 | 启用定时后回桌面；另一次锁屏 | alarm是否送达、Activity可见/锁屏、请求/失败、是否需要操作 | 未运行 |
| M-AND-04 | 定时前让设备处于受控来电/通话占用 | busy条件是否阻止新请求；不同SIM占用分别记录 | 未运行 |
| M-AND-05 | 对另一张卡重复单次实验；移除/停用所选卡 | 显式账户是否匹配实际卡、不可用时是否停止、没有自动换卡 | 未运行 |
| M-AND-06 | 定时前撤回CALL_PHONE或READ_PHONE_STATE；另测精确闹钟权限撤回 | 权限变化、进程/闹钟状态、是否出现新的请求；不得自动补拨 | 未运行 |
| M-AND-07 | 定时后暂停、改目标、改SIM，观察旧时刻 | 旧planId失效及新提交数，不只看界面状态 | 未运行 |
| M-AND-08 | 第一通结束后回app，核对后解除待核对，再启用第二次同目标 | 是否误把OFFHOOK记接通、未知结果是否自动重放、下一次可控请求 | 未运行；完整自动下一条队列尚未实现 |
| M-AND-09 | 请求提交附近杀进程/重开 | 待核对标记、是否重新启用/自动重放；不破坏其他通话 | 未运行 |

以上占用、撤权、崩溃实验均使用受控设备/号码，不涉及企业客户。暂停撤销待执行请求，不挂断已经提交的系统电话。

## iPhone：Mac构建与设备安装

固定主项目仍在Windows；在Mac使用验证副本，回传结果后写回该固定项目。下列命令从Mac副本根运行；当前并未传输副本或访问Mac。

```sh
xcodebuild -version
xcodebuild -project prototypes/ios/DialerProbe.xcodeproj -list
xcodebuild -project prototypes/ios/DialerProbe.xcodeproj -scheme DialerProbe \
  -sdk iphonesimulator -configuration Debug \
  -derivedDataPath prototypes/ios/build CODE_SIGNING_ALLOWED=NO build
```

提供全部输出与退出码。选择支持目标系统的Xcode，参考 [官方Xcode支持表](https://developer.apple.com/support/xcode/)。模拟器没有销售SIM通话证据。真机使用Xcode打开工程，选择实际Team、目标iPhone、启用Developer Mode/信任开发者并Run；具体菜单按目标OS记录。没有签名账号时不代办注册或付费，先继续无签名模拟器构建。

App打开后先保持默认仿真，人工/30秒前台定时/暂停。真实模式需填已同意的接收端、核对系统默认/联系人语音线，再取消仿真、确认同意并应用配置。

| 场景ID | 操作 | 需要回传的观察 | 当前状态 |
|---|---|---|---|
| M-IOS-01 | 前台人工tel请求，分别确认和取消 | 系统弹窗/默认应用、open返回、实际呼出、CXCall UUID/属性、接收端显号/双方语音 | 未运行 |
| M-IOS-02 | 前台30秒timer；再测后台/锁屏到点与过时回前台 | timer/scene事件、是否挂起、prototype_requires_active_scene或timer_expired；不会据原型阻断断言所有系统路径不可能 | 未运行 |
| M-IOS-03 | 有受控来电/通话时请求 | observer调用范围、占用是否阻止、与任务关联仍未验证 | 未运行 |
| M-IOS-04 | 调整默认语音线/联系人优先线、双卡配置后再单次实验 | 实际销售SIM、接收端号码显号；普通tel不程序选SIM | 未运行 |
| M-IOS-05 | 计划到点前暂停或改配置，取消系统确认 | 旧计划与请求未知标记，是否出现重复/补执行 | 未运行 |
| M-IOS-06 | 第一通结束，人工核对再启用第二次；提交附近终止app重开 | 不把其他CXCall自动归属任务；保留未知，不自动重放 | 未运行；自动下一条未实现 |
| M-IOS-07 | 设备限制/电话不可用、系统权限或默认应用条件改变 | 能否open、实际异常、可恢复方式；tel原型无CALL_PHONE式权限开关，不捏造对称测试 | 未运行 |

日志位置为Documents/events.jsonl与request-marker.json。在Xcode Devices and Simulators下载app Container或Finder文件共享导出，存到`evidence/step-2/IOS-EVENTS.jsonl`。附系统版本/机型/地区/默认语音线、操作时间及接收端证据；只将call UUID记为观察事件，不自动证明属于当前客户。

快捷指令的具体独立实验见 [Shortcuts说明](../prototypes/ios/shortcuts/README.md)。App暂停不能关闭系统个人自动化；先显式停用该自动化，避免后续再次触发。地区受限的默认拨号权限不用于假装中国大陆验证。

## 完整产品E2E手动入口

对应[test-matrix](test-matrix.md)的T-CALL-049（E2E-AND-01）与T-CALL-050（E2E-IOS-01）。本地合成任务/管理CLI已实现，但正式手机适配与完整双端产品入口缺失，没有自动化真机E2E target，**未运行**。以下是具体手工协议；原型安装/启动只提供平台探索入口，不证明管理员到下一条的完整链路。

平台探索的实际文件与条件命令：Android在工具/设备具备后按上文构建、`adb install -r prototypes/android/app/build/outputs/apk/debug/app-debug.apk`、`adb shell am start -n com.mantou.salesdialer.spike/.MainActivity`启动；iOS在Mac按上文xcodebuild命令构建，并用Xcode实际Team/目标设备Run。不要对没有测试target的工程执行虚构的xcodebuild test。当前缺工具/设备，步骤4未执行这些命令。

完整手工E2E的进入条件：M-CALL-005/006/008具有实际运行入口；导入/分配权限、工作日/过期/恢复等此次涉及策略明确；受控接收端、设备/SIM/签名/地区与测试授权具备。原型本身不具备这些前提。名单资格已由mantou确认，不索要原始证明；仿真名单与真实受控号码分开配置，不能把合成标识送到电话系统。

1. 记录产品版本/源码哈希、企业/操作者权限、设备/系统/地区、销售SIM标签、试验时段和受控接收端掩码。只使用约定的受控对象，测试企业B作为越权对照。
2. 由有导入权限者输入受控联系人批次并标记企业已确认资格；核对错误/重复/拒绝行。导入本身不得产生呼叫，再由有权限者分配给销售A；销售B/另一企业触发应拒绝。
3. 在北京时间09～18窗口内分别安排一次计划、一次人工下一条和一次改计划，旧版本事件不得授权。人工与定时竞争同一意图时只一份授权/消费；记录grant/intent/version/占用。
4. 在该端实际销售设备验证前台、后台、锁屏、双卡、来电占用和撤权。接收端分别报告是否呼出/显号/接通/双方语音；iPhone逐通确认仍是探索，原自动目标按实际免确认证据判断。
5. 明确本次结束/核对来源后执行下一任务；未接/忙线不自动重拨。暂停、资格变化或拒绝联系后不得新授权；旧版本/重复回调不能发起额外呼叫。
6. 受控交接附近终止进程/重开；未知结果保留待核对，不自动重放。核对前不释放成“未呼出”，记录接收端事实与人工关闭来源。
7. 对照导入、任务、授权、消费、设备、接收端、结果、下一条逐段核对事件和U/G/Q/O/C；保存运行命令/退出码、时间、日志与操作录像/截图（可用时）。缺某段证据记证据不足，不因单通成功标整端通过。

管理员/销售界面尚未实现，以上不虚构按钮或应用可用状态。待具体入口交付时补真实启动路径/界面操作和代码版本，再执行该协议。共用仿真已实现并通过131项回归，命令/证据见README；步骤6可先验收本地范围，不能代替本节真机E2E。

## 回传记录格式

每项保留：场景ID、时间/时区、代码版本或源码哈希、设备/OS/地区、SIM标签与运营商、前置条件、操作、命令及退出码、日志文件、接收端显号/接通观察、实际结果（通过/失败/证据不足）及异常。没有新结果仍保留未运行。完整号码保存在本地忽略文件或设备本地配置，不写进版本化日志。

约200次容量先在步骤4/5用合成数据与测试替身验证。真实日量与计费需要企业/名单/线路授权和试点条件，不由这次单目标实验自动完成。

## 2026-10-15本地软件交接

已可运行的模拟闭环见[simulation-guide.md](simulation-guide.md)。本节M-AND/M-IOS和E2E-AND-01/E2E-IOS-01仍未运行：暂无真机、受控接收端缺，本机JDK/SDK/adb和Mac/Xcode访问缺；原型源码未变，不重复已知缺工具的构建。销售SIM/中国电信/受控同意已确认，无需再次索取。

## 步骤6：双端证据缺口与真实试点协议

2026-10-15环境重探：Java/javac/adb/Gradle/Xcode/xcrun/Swift均未找到；无真机/Mac访问和受控接收端。61源码+8元数据检查通过，但Android/iOS构建、M-AND/M-IOS、E2E-AND-01/E2E-IOS-01均未运行。正式手机适配和生产管理入口也未完成，不把原型安装当完整交付。

| 完整链路环节 | 当前可用证据 | Android / iPhone缺口 |
|---|---|---|
| 有权导入→分配 | 合成能力/导入/分配集成通过 | 生产角色、真实格式和管理入口缺；双端完整E2E未运行 |
| 计划/人工→销售设备 | 虚拟时间/版本/占用/替身通过 | 正式适配、设备/工具/地区权限/双卡策略缺 |
| 设备→接收端显号→讲话 | 无真实证据 | 受控接收端、SIM实际选卡/呼出/双方音频均未运行 |
| 结果→下一条→恢复 | 模拟事件/未知恢复/CLI通过 | 真机关联、后台/锁屏/来电/撤权/重开和接续均未运行 |

每端先按上文命令取得构建结果及受控单次证据；失败时保留退出码/日志，不改原自动要求。下一轮证据使用新的`evidence/platform-validation/日期-平台-场景/`目录，不覆盖早期日志。记录源码哈希、工具/设备/系统/地区、SIM标签、接收端掩码与同意范围、intent/task/plan/grant/API事件、接收端呼出/接通/显号/声音观察、人工关闭及重启前后日志。完整号码继续仅本地忽略配置。

真实试点必须同时满足：两端涉及链路已可运行并验证、当前行为策略明确、指定销售/设备/SIM、已确认资格的受控对象与约定接收端、明确时段/数量/频率/停止条件和线路使用条件。已有名单资格和销售SIM同意不重复索要；仍需约定接收端和具体试点范围，不以这次仿真检查授权200次真实客户外呼。

1. 首轮建议单一受控目标/少量约定次数；先由mantou明确数量与时段，这是待采纳的试点建议，不是新增生产限制。先检查拒绝名单、设备空闲与所选SIM，记录套餐计费单位/余额依据。
2. 北京时间09≤时刻<18，先单次前台闭环并核对接收端，再按约定分组做后台/锁屏/双卡等场景；异常、拒绝、权限失效或未知立即暂停新授权。不要自动重拨失败项。
3. 双端分别记录U（不同目标）、G（授权）、Q（提交）、O（有证据实际呼出）、C（有证据接通）、人工核对/等待/讲话秒数、忙线/未知/异常；记录每通各段起止与运营商账单。没有账单写未核实，不由Q或C推费用。
4. 当组结束核对设备与接收端、未知待核对和授权/提交数量；确认无活动/待处理请求后关闭占用。停用原型闹钟/快捷指令自动化，保留脱敏日志；随后更新estimates及acceptance。

当前没有真实试点结果；[200任务模拟证据](../evidence/step-6/npm-test-verified/task-capacity.json)仅证明本地流程，不代替上述准入或设备试验。

## 持续推进后的工具与操作更新

Android本机已安装项目内工具并构建APK，原“缺JDK/SDK/adb”现在是历史记录。从项目根可直接运行：

```powershell
& .\tools\build-android-local.ps1 -ExistingTools
& .\tools\build-android-local.ps1 -Lint
& .\.tooling\android-sdk\platform-tools\adb.exe devices -l
```

连接经明确允许的物理设备后，使用`adb -s 实际序列号 install -r prototypes/android/app/build/outputs/apk/debug/app-debug.apk`和`adb -s 实际序列号 shell am start -n com.mantou.salesdialer.spike/.MainActivity`，其中adb换成上述项目内完整路径；不要默认选择未知设备。原型默认SYNTHETIC-001与仿真勾选，不输入销售拨出号作为接收端。实际接收端及约定时段/数量仍缺，真实模式不执行。模拟器使用独立AOSP API36/专属AVD及序列号，与物理SIM证据分开。

真实完整链路第一段按D018更新为“销售本人导入→自动归属自己→计划/人工→销售设备→受控接收端→讲话→结果→下一条”。旧管理员分配协议不再是默认产品路径；跨销售操作必须拒绝。D019采用周一至周五窗口、过期不补拨、个人暂停/恢复后重新安排、busy请求不排队；误差阈值/自动排序/真实格式与保留等仍待明确。

浏览器本地操作与E2E见[workbench-guide](workbench-guide.md)，不替代M-AND/M-IOS的真实通话。iOS依旧需要可访问Mac/Xcode及目标设备，未构建未运行。

## Android模拟器实际结果（2026-10-15）

AOSP Android16/API36 x86_64、Emulator37.2.12、独立AVD，06:17:02～06:21:33（东八区），已完成APK安装/启动。5检查通过：人工一次产生simulated_request；定时后暂停，等待35秒无新增请求；暂停时人工触发被挡；重新配置后30秒定时，回桌面后产生第二条模拟请求；全程没有request_about_to_submit/request_submitted事件。精确定时app-op在此自有模拟器上显式允许，不能据此假定用户手机已授权。

[完整命令/退出码/设备/断言](../evidence/continuation-1/emulator/result.json)、[事件](../evidence/continuation-1/emulator/events.jsonl)、[实际截图](../evidence/continuation-1/emulator/android-simulation.png)。模拟器测试完成后已关闭；物理设备列表为空。真实SIM、双卡、显号、接通/讲话、撤权/来电/锁屏实际外呼及全天队列仍未验证，不能标整端通过。

启动时发现模拟器在用户.android生成4个运行缓存。已核对创建时间均属于本次自有模拟器，逐文件移入项目.tooling保留，未碰原有ADB文件；补ANDROID_EMULATOR_HOME与兼容目录配置。[修正记录](../evidence/continuation-1/emulator-cache-correction.json)。此项为工具缓存修正，不是手机业务通过证据。


## S23 Ultra本轮已运行与重测入口

M-AND-01/02/03已按本轮受控范围执行3通并由mantou确认；M-AND-07暂停与M-AND-09持久标记后重开取得部分证据。见[S23 Ultra真机报告](spikes/ANDROID-S23U-2026-10-15.md)。不要重复已完成的3通来消耗新授权。

新一轮仅补M-AND-04来电占用、M-AND-05停卡/换卡、M-AND-06撤权、M-AND-08正式下一任务及M-AND-09交接瞬间故障。需另约受控次数/时间，原最多3通已用尽。仍用项目adb的显式-s序列号，先`devices -l`确认用户设备，先合成仿真后真实；先核查电话/精确闹钟权限，以及设置→应用程序→销售拨号探索→电池→后台运行。本机“不受限制”有成功证据，“受限制”有延迟证据，不能自动认定其他手机相同。

当前手机应用已保留安装、授予的电话/精确定时权限及本应用不受限制设置；最终仿真、暂停、无planId、未授权真实呼出、无待核对。设备全局设置与其他应用未改。系统日志与用户接收端反馈分开，不用OFFHOOK/IDLE推算实际接通时间或话费。


## 安卓交接实现增量（2026-10-15）

本轮新增USB任务仿真手动入口与安装命令见[android-handoff](android-handoff.md)。手机17点闭环和8点接收器检查通过；该入口严格拒绝真实模式/目标，不可代替M-AND真实故障场景。原3次通话额度不增加。


## 网页→S23合成验证入口

见[android-workbench.md](android-workbench.md)。本轮实际20点浏览器/手机检查已通过；真实SIM撤权/停卡/跨SIM来电/长期后台及交接瞬间崩溃仍按前文受控协议待运行。新的真实电话需另约次数/时段；已有3次额度已耗尽。新网页入口没有真实呼叫分支，不输入真实号码。


## 当前定时开发检查

按android-workbench.md新增定时操作，或运行其设备浏览器命令（现共24点，单次人工及单次15秒定时均为合成）。关闭浏览器页面不取消计划；暂停手机区/停止本地服务才会停止后续调度。真实SIM原型三通额度已耗尽，新网页仍无真实调用分支。


## 电话账户只读验证

网页“读取电话能力”→明确选电销卡→“只读绑定选定账户”，或运行android-workbench.md的check-phone-capabilities入口。已实际验证两卡枚举、权限/后台快照和电销卡观察绑定；没有自动选择长治卡，没有读完整号码，没有发真实电话。无需重新提供用户已确认的手机号/资格。

若快照失效先重新读取；若设备/包指纹不符先核对APK和USB。系统权限变更须另做受控实验；本轮没主动撤权/停卡，失败守卫主要由替身验证。真实呼叫须新增明确次数/时段授权，原3次额度仍耗尽。


## R035新增设备证据与剩余边界

S23已完成模拟主机快/慢一天、进程force-stop后去重、token错误/设备elapsed到期/延长截止拒绝；见time-lease/device。未修改系统时间，也未重启整台手机。整机重启、长期休眠和生产身份/通信授权仍待后续受控验证。原真实3次额度仍耗尽，本轮入口只合成。按D023，iPhone相关手工验收最后进行，不阻断安卓部分继续推进。


## 真机只读联合模拟检查（2026-10-15）

连接S23、保持原匹配APK和权限；确保当前没有通话且处于允许工作时段。运行README的check-observed-trial命令，准确传入已确认的电销卡标签。返回result.json、exitCode、checks及commands；不回传真实客户名单。

本轮已实际通过10检查点，首次通话中阻断也留证。未实际执行权限撤回/移除SIM/拔线瞬间交接，相关软件替身已通过。未来真实呼叫必须重新约定次数/时段，不能把这次模拟轮次当作许可。


## R041原生检查回传（2026-10-15）

新APK安装后，确认测试应用仍暂停/模拟/未armed，再按README运行check-native-guard。回传result.json（命令、退出码、安装包指纹、检查点和回执），不要回传完整号码或原始SIM标识。通话中检查脚本会中止，待通话结束再用新证据目录运行，不自动挂断。

本轮S23成功16点。权限撤回/停卡/真实来电竞争、整机重启及电话系统真实交接仍未执行；JVM规则和应用force-stop不替代这些环境。实际真实电话仍需新增明确授权。



## R042原生票据关联演练

在项目目录运行：`node tools/check-guard-link.mjs YOUR_DEVICE_SERIAL 电销卡 evidence/guard-link/新的唯一目录`。使用当前批准APK和USB调试，手机空闲、既定工作时段内；不安装、不拨号、不挂断，依次执行实际权限观察、明确电销卡、一次原生dry-run、重复拒绝、数据库重开及合成核对。每次使用新的证据目录，不能覆盖既有记录。失败查看result.json的result.reason/error及commands；回传整个该目录。若手机正在通话，等用户自然结束后再用新目录执行。

此入口不使用日常工作台数据库，不消耗或增加真实呼叫许可。生产电话链路、拔线丢回执、实际撤销权限/停卡与整机重启另需设备环境和专项步骤；iPhone仍最后验收。


## R043观察页面当前用法

从项目目录执行 `pwsh -NoProfile -File tools/start-workbench.ps1 -AndroidSerial YOUR_DEVICE_SERIAL`，打开 http://127.0.0.1:8787/observed 。读取手机状态，明确选择电销卡，绑定，然后点击“检查手机条件（不拨号）”。成功应显示“原生检查就绪，待核对；尚未拨号”；核对后可关闭合成占用。首次绑定一次/5分钟，不自动续期，反复点击不增加次数；过期或旧Fake轮次拒绝时保留记录，不删库求通过。

停止：`pwsh -NoProfile -File tools/stop-workbench.ps1`；数据库保留。提交只使用合成目标、原生dry-run，无号码输入、不拨号/挂断。需回传故障页面文字及对应证据目录；勿附真实客户名单。实际卸载、权限撤回、停卡、来电占用/整机重启仍需独立验证，iPhone最后。


## 步骤6余缺与真实试点前置（2026-10-15）

当前通过的是合成名单→自助处理→业务规则→指定设备原生检查→回执/核对，不含正式真实电话闭环。销售自行导入已采纳，验收不再强制新增管理员分配。

下一阶段先补受限真实适配：明确测试轮次的设备/安装身份/SIM/接收端/次数/期限；在电话系统调用前完成最新守卫与持久占用；API提交/实际呼出/接通/人工结果分离；提交可能成功但回执丢失一律待核对。未完成该代码与替身测试前不要重复执行旧原型电话实验来冒充闭环。

之后真实受控试点需另确认双方当时可测试和新次数/时段（此前3次已耗尽），再执行前台、定时后台/锁屏、占用与拒绝联系阻断、结束后下一条；保留每条attempt/票据/摘要/设备事件、双方响铃/显号/语音报告、人工操作秒数及实际账单，号码在项目忽略的本地配置保存，公开报告只用掩码。权限撤回/停卡/重启等先做不会外呼的专项，影响设备正常使用的操作需先协调。不得自动批量外呼真实客户。iPhone最后单独取双端证据。

现有无拨号测试命令：npm --prefix packages/core test（含200任务）；npm --prefix packages/core run test:observed-native；实际浏览器E2E入口与环境变量见implementation-plan.md。构建命令pwsh -NoProfile -File tools/build-android-local.ps1 -ExistingTools -RecordPrefix 新的唯一前缀，lint追加-Lint；当前产物有效，本轮复用已成功构建证据。


## R046新原生入口的安装/测试边界

本轮只构建，S23仍使用先前已批准APK；不要直接重启服务后把新构建摘要当已安装摘要，现有ADB入口会因指纹不同而拒绝。新APK路径prototypes/android/app/build/outputs/apk/debug/app-debug.apk；后续先核对设备空闲、待执行计划及旧Probe暂停状态，再安排安装/匹配服务指纹。当前服务未改，不影响当前打开的观察页。

不拨号验证可先核对打包Manifest的ControlledCallActivity enabled=false、无许可文件，并用项目JDK运行ControlledCallCheck。新的启用组件、写真实许可、真实号码测试均留待明确受控授权和主机桥接完成后，不在本轮执行。私有许可文件路径files/controlled-call-permit.json，电脑侧仅放.local内；禁止放docs/evidence或回传原文（含完整号码/secret）。

待补：主机R045到该Activity的受限传输、许可安装撤销和原生显式核对；原生SQLite重开/失回执/竞争、无许可拒绝实机测试；之后才约新接收端可测试时段/次数。API_SUBMITTED只代表系统API返回，必须分别回传响铃/显号/讲话与实际结束；iPhone最后。


## R048新增待验收项（不执行真实呼叫）

新APK同时包含ControlledCallActivity与ControlledReconcileActivity，打包均disabled。当前还未安装，旧网页服务不得直接按新APK指纹重启。下一轮先只读核查S23连接/空闲、Probe为dryRun且暂停、无待执行计划，再协调安装与服务批准指纹更新。

T240需在隔离测试数据上验证原生数据库v1迁移保留次数、缺token_hash旧行不自动关闭；错误token/摘要/安装/权限/忙线/未知拒绝；合法核对只关闭原行、重复幂等、晚到complete不重开、不退次数。原生核对入口不调用电话API，但测试准备仍不得创建可用真实拨号许可或启用ControlledCallActivity。尚缺可复现的原生fixture注入/断言工具，须先补工具再执行，不手改实际通话历史求通过。

回传：APK摘要/设备系统、合成请求ID、迁移前后行数与used（不含token/号码）、拒绝或核对回执、权限/空闲状态来源、测试命令/退出码；真实token与原始系统日志保留本地并脱敏。业务协调器尚未连接，不能用原生一项通过替代完整任务→电话→下一条验收。历史三次真实测试已用完，新增电话另需明确次数和时间授权。


## R049后续无拨号验证准备

主机库已连接受控USB端口，但没有新增网页真实呼叫入口；不要把演示输出中的替身核对当手机证据。先补独立原生测试数据库工具，覆盖迁移保留数据、错误凭据/忙线/权限未知拒绝、核对幂等、不退次数、晚到回执不重开。必须与controlled_calls.db及已有手机历史隔离，并保留默认禁用的ControlledCallActivity。然后按T240检查设备/安装/服务指纹，保存真实命令、回执和脱敏账本断言。

本轮可直接运行的无设备演示：`npm --prefix packages/core run local-controlled:demo`。不需要号码或新许可；该命令不能用于实际电话试打。


## R050已安装后的无拨号复现

已安装APK：cb3691179c5a9fd249ed0ace534bb1a3aaed18862f0a676bc259c347205dd834，S23 Android16/API36。先确保USB连接、手机空闲，旧Probe为仿真/暂停/未armed；实际拨号与核对组件保持禁用。项目根执行：

`node tools/record-core-run.mjs evidence/native-db-新唯一名字 R-CALL-050 node tools/check-native-database.mjs YOUR_DEVICE_SERIAL`

输出保存在新evidence目录中的run.json/output.log/device-report.json/commands.json；回执必须同nonce、36断言通过、actualLedgerUnchanged=true。每次生成3个独立合成数据库，不删除实际记录，无需提供号码，也不配置真实许可。此入口BusyProbe为注入值，不操作真实权限或模拟来电，不做进程强杀。

网页服务用现有start-workbench.ps1启动，后台启动不要包进同步record-core-run捕获器：本轮启动成功但捕获器持有后台管道未退出，已单独结束记录器并保存interruption.json；网页服务保留并以独立HTTP/浏览器证据确认。安装改变APK摘要后旧ObservedTrial绑定可能返回ROUND_BINDING_CHANGED，原数据与旧额度仍保留，不清库自动重绑。

仍需设备场景：真实READ_PHONE_STATE/CALL_PHONE撤回、来电占用及终检竞争、系统进程强杀/设备重启、完整受控Activity交接和人工语音链路。后续先明示场景和影响，受影响操作再协调；新电话须新增授权，旧3次额度不可复用。


## R051受控任务页使用

打开http://127.0.0.1:8787/controlled，当前顶部明确“合成演示”。初次有一条待核对尝试、已用1/1；点击“查询已有回执”不会发送任务。勾选“我已核对本次尝试没有活动通话”，选择人工结果，点击“核对并结束占用”。刷新页面后状态仍已结束，额度仍1/1。演示数据库独立保存，不因重启重新发放额度。

真实拨号按钮始终禁用；这不是正式试点。当前本地页面留待核对任务供mantou操作，浏览器自动测试使用另外的临时数据库，没有替用户完成当前页核对。当前无新号码或电话授权要求。

自动浏览器复现：`npm --prefix packages/core run test:controlled-browser`，自动打开无头浏览器、执行11检查、保存桌面/窄屏截图、关闭退出。默认新evidence目录，使用项目内独立测试库，保持现有服务与用户记录。


## R052本地只读记录操作
1. 准备已有真实受控记录库及其原始actor/permit/设备绑定；不要把演示库去标记后用于实际配置。测试去标记仅用于隔离合成夹具，不能成为用户数据迁移步骤。
2. 在忽略目录.local内写controlled-records.json，字段说明见README。无手机号、token、额度；不创建新许可。
3. 使用README命令以另一个端口启动，打开/controlled。未配/错库会显示不可用；过期记录仍只读。可刷新任务历史，明确点击“检查设备绑定（不拨号）”才启动只读身份/账户观察，可能将应用观察Activity切到前台。
4. 手机回执查询和核对结束在此模式禁用。要回传页面设备状态、检查时间与脱敏错误；不要回传token/完整号码。本轮没有真实记录来源，故设备连接分支未运行；无需为完成只读软件测试重新索要名单资格。


## R053查询已有回执
只读配置启动方式沿R052，页面选择原已有尝试→点击“查询已有回执”。系统先匹配原发送记录，再验证设备/安装并读取对应文件，可能启动只读身份Activity。缺记录时不会访问设备，更不会补发。
观察单独显示；原业务接口返回和待核对状态不改。回执未知时保留任务，禁止用重发探测。回传脱敏的观察状态/最近读取状态及对应attempt ID即可，不发送token或完整号码。当前没有实际受控记录库，真机回执未运行；测试证据是合成夹具。


## R051～R053验收后：真实试点前置条件与执行顺序
当前可运行：项目根`node tools/check-controlled-browser.mjs --records`验证隔离合成记录页面；`npm --prefix packages/core run test:controlled-records`验证配置和只读业务。两个入口均无真实电话。实际只读配置启动见README，缺真实库时不可通过复制演示或删标记制造真实数据。
真实完整试点现在缺的是软件接线与实际记录，不只是手机或电话号码。按以下顺序推进：
1. 步骤5交付真实名单/号码映射、可信销售身份、受控准备/发送入口及记录初始化；现有真机三个原型样本不能自动导入为新受控业务记录。新许可只在用户新增明确授权之后创建。
2. 软件准备可审查后，确认本次接收端仍同意、测试次数和时间；此前电销卡和号码角色沿用，不用重复询问已知内容。当前不请求空泛授权或再次索要名单资格证明。
3. USB连接S23、检查空闲/权限/指定卡/当前APK与安装绑定；新真实试点前后分别留证；失败先停止新尝试，不用换卡/重发探测。各平台缺运行条件保持未运行。
4. 执行一次管理员/销售归属校验→销售导入自身名单→单目标任务→资格/时段/版本→设备→受控接收端→双向讲话→结果核对→明确下一条。逐项记录attempt/票据/时间/回执；响铃、显号和双向语音由接收端报告，不由API状态代填。
5. 扩展来电占用/撤权/崩溃恢复须分别设计受控场景并计入本次授权上限；真实日量试点不得从200条模拟任务自动升级为200通外呼。原iPhone范围最后取证。
需回传：脱敏设备/系统/SIM标识、各步骤日志、接收端观察、不同号码/尝试/呼出/接通统计、实际人工秒数及费用；不要提交token或完整客户名单到证据目录。当前设备链路/电话E2E未运行。


## R054使用本地名单
打开http://127.0.0.1:8787/contacts（从首页“我的名单”也可进入）。每行输入一个明确的11位大陆手机号形式，填写来源说明并选择本批资格；不会索要证明材料，也不会自动拨号。重复和不支持行显示行号结果，输入成功后清空文本框，列表掩码显示。
可显式确认资格、标记撤回或拒绝联系；重新导入保留已有状态，拒绝后按钮禁用且服务端拒绝恢复。批次最多200行，可继续分批；不是日拨号硬限制。国家码/座机/分机当前不转换。
数据保存在.local/workbench.db.contacts.db及SQLite关联文件；原始输入未加密，依赖本机文件访问权限。当前单人资料区不适用于多用户共享登录，未提供删除/保留期清理，不能宣称生产认证完成。不要删库解除拒绝记录。测试入口node tools/check-contact-browser.mjs仅生成独立测试库，用户名单不参与测试。


## R055操作任务计划
打开/contacts，导入并明确确认联系人资格；在“我的任务计划”选择自己的联系人，填写北京时间，点击保存。仅周一至周五09:00含至18:00不含且未过时的时间可保存；导入不会自动安排。
在已有计划下修改时间并点“重新安排”，或取消计划。暂停只当前销售，恢复后计划仍显示须重排；资格撤回/拒绝会即时显示阻挡。按钮并不授权外呼，所有计划仍标真实外呼未开放。页面可刷新保存状态，启动/停止沿README。
本轮手工入口node tools/check-contact-plans-browser.mjs使用独立生成数据及固定测试时钟，不更改用户数据或拨打电话。当前时钟阻挡是预览，后续执行前必须再次原子检查，不能把页面显示当拨号授权。


## R056本地演练操作
在/contacts选择本人已确认资格、未过时且未受暂停等阻挡的计划，点击“立即本地演练（不拨号）”。操作还检查当前北京时间工作日09–18窗口；人工演练可提前于计划时间，过时需重排。
下方显示未知结果；刷新不会重放。勾选明确结束本地演练、选择演练结果并核对，才解除当前销售的演练占用，可处理下一条。未核对期间不能改期/取消该计划。完成不代表电话完成，实际呼出/接通始终无证据。
R056时尚无定时演练；当前已提供R057显式定时演练，见下节。测试入口node tools/check-contact-attempts-browser.mjs使用独立固定时钟/生成数据，不使用用户名单或电话。此前受控3通许可未增加，真实手机测试仍需独立当次授权。


## R057本地定时演练入口（无电话）
访问 http://127.0.0.1:8787/contacts，在独立测试资料区导入合成号码形式、确认演练资格并创建未来工作日09–18北京时间计划。点击“开启本地定时演练”；到点后“刷新执行结果”，查看票据结果和未知记录，明确核对结束后才允许下一条。默认停止；停止/暂停后不会继续触发，新增/改期须停止再开启。服务重开后需明确开启，已过时任务不会补跑。界面1秒容差仅实验参数。
可复现自动检查：npm.cmd --prefix packages/core run test:contact-timer；node tools/check-contact-timer-browser.mjs。测试在独立库/合成夹具进行，不向用户名单注入测试数据。需回传时仅提供掩码/计划版本/时刻/结果日志，不导出原名单。真实手机全流程未运行，新的电话仍需当次次数/时段及受控接收授权；iPhone最后。


## R058分类计数与容量复现
在/contacts点击刷新，可见“我的演练累计（全部历史）”：不同目标、本地尝试、结束/待核对及定时票据。人工演练完成后实际呼出/接通仍应显示暂无证据；这是预期边界。
独立无拨号容量：npm.cmd --prefix packages/core run test:contact-capacity。自动创建临时SQLite库、生成200条格式夹具、模拟时钟及人工核对并清理，不能改为真实客户批量电话。网页回归：node tools/check-contact-attempts-browser.mjs。手机全流程仍缺当次授权与正式绑定证据，iPhone最后。


## R054～058集中验收后的真实E2E缺口
目前/contacts不能启动真实电话，点本地演练不应期待接收端响铃。正式映射与适配完成后，先只读核对目标、设备安装摘要、电销卡、最新空闲/权限及销售绑定；新受控试点再确认接收端与当次次数/时段。不得沿用已耗尽的三通次数。
待真实适配交付后按销售自行导入→建立计划/人工触发→S23指定SIM→受控端响铃/讲话→系统回执与人工结果分别记录→结束后下一条执行，逐段回传掩码目标、plan/version、attempt/command摘要、时间、设备回执以及用户听辨结果；没有接通证据保持未知。权限撤回/双卡变化/占用/锁屏/中断恢复按独立受控场景执行，不直接批量外呼。iPhone需可用设备与Mac/Xcode/签名环境，最后单列，不把tel确认当原自动目标通过。


## R059名单到Android只读预检查
/contacts每条计划新增“检查安卓对应关系（不拨号）”。当前运行服务未设置名单目标映射，正常应显示未配置可信目标、设备与SIM对应关系；权限/过时等本地阻挡可能先显示。不会发送电话、建立尝试或消耗许可。按钮不代替生产授权。
开发组合接口：new ContactWorkspace({path,actor,androidPreflight:{mapping,provider}})，mapping包含tenantId/salesId/targetId/serial/apkSha256/bootId/sdk/deviceKey/accountKey；provider只需inspect()、readPhone(expectedApkHash)，由可信宿主提供。不要从HTTP或名单行加载这些参数。此轮未提供CLI配置文件入口，不能声称当前网页已连真机预检查。
局部测试 npm.cmd --prefix packages/core run test:contact-preflight；页面检查 node tools/check-contact-attempts-browser.mjs。所有数据使用独立生成夹具。下一步接项目内配置和既有USB只读能力后，再记录S23当前观察；真实电话仍需新授权，iPhone最后。


## R060配置与USB只读检查
启动入口仍是 pwsh -NoProfile -File tools/start-workbench.ps1 -AndroidSerial YOUR_DEVICE_SERIAL。CLI固定读取项目.local/contact-android.json；无文件正常启动但预检查缺绑定。已有配置变更后须先运行tools/stop-workbench.ps1再启动，启动脚本不会替换已运行进程内配置。
配置严格字段：tenantId、salesId（当前本机可信身份LOCAL-PERSONAL/LOCAL-SELF）、targetId（现有本人目标ID）、serial、apkSha256、bootId、sdk、deviceKey、accountKey。不得把观察文件直接重命名配置，不填写猜测hash或借用其他目标ID；当前尚未自动生成映射。
仅观察设备：node tools/record-core-run.mjs evidence/usb-check-新编号 R-CALL-060 node tools/check-contact-usb-provider.mjs YOUR_DEVICE_SERIAL。结果写证据目录，详细身份只保存在忽略的.local/contact-android-observation.json；不创建运行配置/计划/电话。观察10秒后不能视为当前状态，必须重新读取。
局部测试npm.cmd --prefix packages/core run test:contact-config；覆盖配置→provider→SQLite目标预检查及重启阻挡。配置工具尚待下一项，真实名单到手机端到端未运行。


## R061准备与保存目标绑定
在项目根执行 node tools/prepare-contact-binding.mjs --help 查看入口。前提：目标已存在于当前销售名单，资格确认且未拒绝；不要求重新提交资格证明。目标ID可从已有计划/本地API查看，不传完整手机号。
预览：node tools/prepare-contact-binding.mjs preview TARGET-ID YOUR_DEVICE_SERIAL。将TARGET-ID替换为已有本人目标ID；工具重新读取手机，输出掩码/卡名/型号及token，不写配置。
核对预览后保存：node tools/prepare-contact-binding.mjs save TARGET-ID YOUR_DEVICE_SERIAL PREVIEW-TOKEN。替换为同次目标ID与预览token；命令再次读取手机和联系人，变化则拒绝。已存在配置不会覆盖。成功后先运行tools/stop-workbench.ps1，再按README启动，让CLI加载新配置；之后页面进行一次只读预检查，不拨号。
局部回归：npm.cmd --prefix packages/core run test:binding-setup。当前用户库为空，不得导入生成夹具来伪装真实验证；实际目标选定前保留未配置。配置替换/重绑当前不自动处理。



2026-10-16更新：用户已选择尾号7214仅作只读目标，已完成实际准备/保存/重启/HTTP预检查。当前.local/contact-android.json已存在，不重复save；需要重新绑定时先核对具体变化，不擅自覆盖。验证计划保持定时器停止，过时后不补拨。再次只读检查需有效计划/资格/工作时段，不代表新增通话授权。


## R061集中验收后的下一验证边界
只读绑定已验收。当前观察若过期、计划若过时，页面阻挡属预期，不能把历史ready直接当许可。原200条本地容量与3通电话原型不是当前真实名单呼叫证据。
下一真实链路必须先交付受控许可与真实尝试账本集成，再取得当次目标/时间/次数许可；在此之前不要启用手机呼叫组件或复用旧许可。需要回传的证据仍为计划版本/attempt摘要、设备/SIM匹配、系统回执、接收端响铃显号/双方讲话、结束核对与下一条，并区分API提交/实际呼出/接通。iPhone最后，固定语音另轮。



## R062受控预留账本（仅本地测试）
局部npm.cmd --prefix packages/core run test:contact-controlled；全量npm.cmd --prefix packages/core test。用例仅独立临时库/CONTROLLED_FIXTURE，无手机或用户数据。
可信组合入口ContactWorkspace({controlledPermit,androidPreflight:{mapping,...}}).reserveControlled({planId,expectedVersion,requestId})，许可字段见R062。没有CLI/HTTP注册许可入口，不要用客户资格或只读预检查结果填造许可。RESERVED是持久占用与额度预留，不代表允许发送。当前HELD_UNKNOWN不能自动解除或退款，下一小项补核对契约。



R062启动修正：--db指向独立数据库时不读取主工作台contact-android.json；主工作台按原启动命令继续加载既有只读绑定。不要通过临时数据库复用真实目标配置。

## R063真机首闭环待执行
当前S23只读通过，不等于真实闭环通过。已询问新最多2次：电销卡尾号9486→尾号7214，每次约10秒挂断。无答复不能创建/部署新许可或拨号。
具备新许可后：固定15分钟以内有效期/同设备安装/同SIM/同接收端/2次额度，保存新的审批引用与本地受控会话；将同配置原生permit安全写入应用私有目录，默认组件禁用，单次运行前启用受控入口。核对当前资格/新计划版本，执行README send，保存脱敏回执；用户确认响铃、显号、双向语音及挂断；执行receipt和reconcile，确认原生与宿主均核对完成后由销售明确安排下一版本，再进行第2次。结束禁用受控调用/核对组件，保留已用额度/账本，不删除未知记录。
需回传：两次呼叫的接收端观察和挂断确认、手机权限/选卡提示、系统回执、人工结果；自动提交返回不能填写实际接通。缺环境或答复时保持未运行。两次同受控目标只证明新版本衔接，不证明全天或不同客户自动队列。

R063实际步骤补充：S23需使用adb shell run-as com.mantou.salesdialer.spike pm enable/disable修改本应用debug组件，普通shell pm disable被系统拒绝。tools/contact-controlled.mjs已在send/reconcile前临时启用对应组件，并在finally恢复禁用；本轮第1次实际执行成功。缺会话默认拒绝；不得重跑prepare覆盖会话或重置额度。

## R064运行与后续真机验证
软件仿真可直接执行README的demo:contact-schedule及test:contact-schedule；使用合成号码、注入时钟、CONTROLLED_FIXTURE，真实电话0。演示自动结束；生成库在项目.local下，独立于工作台。npm test现在自动发现所有test/*.test.mjs。
正式策略已采纳30秒（D027），不需要再确认该行为。真实定时试验仍未运行：需新的受控次数/时间/接收端许可和可信路由配置，不复用已耗尽D026。后续应记录计划due/deadline、手机实际检查/提交时刻、原生与宿主attempt、用户接收端观察、暂停/忙线/超时跳过、核对后下一目标；后台锁屏需分别留证。没有配置或授权时保持停机，不能用仿真结果填真机通过。

## R065仿真运行控制与真实配置状态
项目根运行node tools/contact-schedule-runtime.mjs --simulate后输入status、start、stop、reload、advance 65、reconcile 0、advance 125、reconcile 1、close；advance使用从固定仿真开始起的秒数。顺序演示可用npm.cmd --prefix packages/core run demo:contact-runtime，实际电话始终0。CLI测试和npm演示已运行通过。
node tools/contact-schedule-runtime.mjs status仅检查主配置文件；当前CONFIG_MISSING，未创建真实配置/许可。真实运行需宿主提供匹配的既有协调器；文件不是授权来源。当前CLI不支持真实start，网页也尚未接入新运行控制。
配置变更的检测点是状态读取、定时触发和设备检查后，不声称存在实时文件监控。stop后inflight>0时等其返回，不能立刻close工作区或reload替换；既有未知结果仍需单独核对。后续实际多目标E2E需准备原生逐目标许可切换及新的受控额度，当前禁止复用D026旧许可。

## R066独立网页仿真
项目根执行npm.cmd --prefix packages/core run demo:contact-runtime-web，访问终端打印的webUrl。点击启动，终端输入advance 30推进固定仿真时钟，刷新状态；需要核对时输入reconcile 0或reconcile 1。可检查停止/重载/刷新，输入close关闭。仅独立合成联系人和电话替身，不使用主名单。
主站http://127.0.0.1:8787/contacts当前没有运行会话，启动禁用是预期。真实多目标运行前仍须验证原生许可切换、目标/SIM/额度、上一通核对、30秒截止与中断恢复，取得新受控授权。回传宿主事件、原生回执、接收方观察及最终禁用状态；缺证据保持未运行。iPhone暂停。

## R067就绪检查边界
执行node tools/check-native-permit-readiness.mjs --simulate，仅演示合成快照，无需手机；输出实际电话0、设备访问false、许可写入0。真实采集器/互斥部署尚未实现，不手工复制演示许可到手机。后续受控验证应回传设备安装/卡匹配、全设备未核对记录、双边次数、许可原始摘要、组件禁用及部署回读证据；不得仅凭READY认定已经切换。

## R068实际只读入口
运行node tools/collect-native-permit.mjs --read-only。无需新通话授权，因为不拨号、不改许可或通话账本。S23本轮已采集2条RECONCILED、原生许可关闭、组件禁用；证据evidence/native-permit-collector/device-complete。若USB断连/电话占用/权限未知/存在WAL或非空journal，保持拒绝并回传脱敏reason；不要删除日志或强行清库。后续实际切换前仍须互斥/回读/崩溃恢复和新限定外呼许可。

## R069本地恢复入口与真实边界
运行node tools/demo-native-permit-switch.mjs --simulate，预期first/duplicate为REVIEW、reconciled为VERIFIED、fixtureWrites=1、realPermitWrites=0。子进程崩溃证据由T424保存日志并只读核对；演示不触碰S23。真实USB原子替换及发送端共用设备门尚待实现，不能手工删除未知占用或重置额度绕过。

## R070预览检查
运行node tools/preview-native-permit.mjs --simulate验证合成预览，--preview核对当前真实输入是否齐备。当前实测CURRENT_SESSION_REQUIRED，未访问设备。今后准备活动受控会话后才可取得真实候选预览；需保存新旧摘要/截止/拒绝原因，号码与令牌不写证据。预览不具备写入能力，不可绕过未实现的部署/发送共用锁。

## R071设备门边界
新增门由发送/切换对象构造时加载；本轮只在隔离测试日志验证，没有打开真实活动会话。旧真实delivery缺reconciled字段不能自动当已核对。迁移前需只读审计历史host/native匹配，孤儿门记录不能删除求通过；后续审计工具应输出脱敏关联与明确恢复条件。真实多目标写入与自动定时E2E仍需单独许可及证据。

## R072实际历史核对结果
执行node tools/audit-device-gate.mjs --read-only。当前2条旧发送记录与2个宿主FINISHED和2个归档RECONCILED按命令摘要/attempt匹配。旧delivery未记录reconciled，门尚未创建。此为本地历史证据，不是手机当前状态；恢复前必须持共用门取得当前安装匹配的原生记录，再核对完整关联。不能删除数据库或把归档状态直接写成新许可。

## R073实际迁移结果
S23本次当前request/digest/status与宿主记录匹配后，2条旧发送记录已标记reconciled，2个门记录已释放。没有改手机许可/原生账本或恢复额度。首次CURRENT_DEVICE_PROOF_REQUIRED按预期停止，独立只读采集通过后重新获取新证据迁移成功；不是重放电话。
后续不需为这两条历史记录重复迁移。若其他旧记录出现冲突，保留门与备份，核对当前安装/命令摘要/原生核对状态；归档文件单独不能用于解锁。下一项是真实USB许可部署适配，实际新外呼仍需当次范围授权。

## R074真机待验证
当前无新许可，不执行替换或电话。先完成受控会话组合入口，再核对S23当前安装/SIM/组件禁用/空闲和资格；由新的有界授权绑定候选摘要、次数与窗口。部署后必须回读相同原始字节摘要，记录操作ID、状态、退出码（不记录令牌/完整号码）；断连后只能只读reconcile，不能重发。设备脚本中的base64、sha256sum、settings、uptime、sync及mv尚无本轮执行证据。之后按既有手动定时流程回传响铃、显号、语音、是否确认及挂断结果；不能以部署VERIFIED代替实际通话通过。

## R075命令使用边界
默认预检命令node tools/deploy-contact-permit.mjs已经执行：DENY/CURRENT_SESSION_REQUIRED，退出1，符合当前无活动会话状态。没有访问手机或写入新许可。
真实入口：node tools/deploy-contact-permit.mjs --deploy SWITCH-TEST-0001，仅在新有界授权、准备好的会话与候选、设备空闲/组件禁用等条件满足后运行。回传脱敏决策、操作ID、日志状态及手机侧回读摘要；不得上传许可令牌/完整号码。真实USB脚本及定时闭环尚未运行。旧prepare脚本包含直接push/cp，不得作为新流程准备入口，需要下一小项先拆除直接手机写入。

## R076后续S23验证
准备入口已统一，下一步回步骤2/6真实验证。S23连接可见，但当前通话状态、组件和权限尚需当轮采集。历史3+2次授权耗尽；需要新明确次数/接收端现在同意后才能创建授权记录并执行--prepare-local。先恢复销售并重新安排有效工作时段内计划，再预检、显式部署，继续既有发送/核对流程。部署VERIFIED不等于拨出或接通。
测试结束禁用两个呼叫组件、关闭原生许可、暂停并用新的唯一归档路径收存本轮会话/候选/部署授权，保留一次性引用目录。旧close-contact-controlled-session脚本含历史固定归档名和两通断言，不直接用于新轮次，避免覆盖历史证据。中断时先核对本地残留和原生摘要，禁止自动补拨。

## 2026-10-16定时真实验收已完成
2026-10-16 11:48（北京时间）真实收尾：新授权2次均已完成。S23/电销卡向同一受控接收端，计划版本4/5各30秒后触发，调度领取分别晚16ms/12ms，均在30秒窗口内提交API；原生及宿主2/2已核对，用户分别确认响铃接通、显号尾号9486、双向语音正常、无需选卡/确认且已挂断。结束时许可关闭、两个组件禁用、计划暂停、三份活动文件唯一归档，12个设备门全部RELEASED。
本轮授权已耗尽。再次电话必须新授权；没有授权时只跑本地回归。后续先把一次性运行/收尾流程整合成正式命令并测试停止、异常退出与恢复；本次原脚本副本保留为evidence/controlled-session-preparation/*-runner-source.txt，不作为无授权运行入口。

## R077未运行项
正式命令的真机start-approved、stop、Ctrl+C、断开USB和进程强杀尚未执行。需要新有限授权才执行带实际拨号的流程；本轮只运行无会话拒绝及本地模型/CLI测试。后续验证应保存运行ID、状态、调度日志、组件禁用结果；待核对不得重放。强杀后保留owner目录，下一小项先实现明确恢复/收尾命令，不手工删除锁来继续。

## R078后续验收操作
正式工具：close-contact-session.mjs --close CLOSE-ID；中断用--resume同ID。检查运行器退出、宿主未决0、原生request/digest已核对；只有当前原生许可与会话一致才允许关闭。保存脱敏决策、关闭ID、只读门审计与closure.json；不得上传归档中的令牌/完整号码。
当前已无活动会话，实测命令只返回CURRENT_SESSION_REQUIRED且未访问手机。完整新关闭端口未在S23执行。后续先离线E2E验证正式运行器→停止→核对→关闭组合，再按实际需要取得新有界通话授权验真；不能为测关闭而恢复已耗尽许可。

## R079离线组合已执行
node --test --test-reporter=tap packages/core/test/controlled-lifecycle-e2e.test.mjs已通过6场景。不要将测试中的isAlive替身当真实进程死亡证明。后续CLI组合验收需独立启动/停止进程、保存退出码与运行owner状态，断连或强杀必须保留未知状态；新手机通话仍需新有界许可。

## R080验收边界与接续
离线进程检查入口：`node --test --test-reporter=tap packages/core/test/controlled-run-process.test.mjs`。无需手机或号码，T522～525分别验证停止、竞争、强杀、配置变化。真实新运行器与关闭器组合、USB断连、Windows控制台SIGINT尚未运行。真机验证前需要手机连接且空闲、完整且当前有效的授权会话；历史许可已耗尽，不可恢复。关闭成功需回传脱敏CLI JSON/退出码、owner归档状态及原生禁用回读；日志中不得包含完整号码或许可token。

## R081后真机证据条件
关闭CLI接续强杀与同ID恢复已在Windows子进程通过；本地复现用README的controlled-close-process命令。手机端口仍为替身，当前活动许可不存在，原许可耗尽。
下一步2先核对S23连接、空闲、安装摘要、两个组件禁用和原许可关闭状态，只读整理与当前工具的匹配情况。不得恢复旧许可或为完成验收自动创建真实外呼会话。正式关闭CLI手机成功路径需要完整的当前会话、匹配原生许可、宿主/原生未决均0；缺此条件保持未运行。
后续新一轮受控通话须有新的次数上限和当时接收端同意，再通过正式运行器→核对→关闭。运行器退出/USB断连须保存脱敏CLI输出和退出码、计划版本/尝试ID、关闭记录、原生禁用回读、门审计；中断时不清理owner，恢复使用同一CLOSE-ID。若实际呼出结果未知，先人工核对，不自动重放。当前不要求用户重复提交已有名单资格资料。

## R082已完成与下轮条件
正式运行器两次各1次授权提交、用户确认响铃/未接、NO_ANSWER核对、正式关闭均完成。对应CLOSE-R082-FIRST-20261016/CLOSE-R082-REPEAT-20261016归档不得覆盖，许可均耗尽。下一次真实通话须新授权；不要直接重跑本轮准备/计划脚本。
T530仍未运行：只在专门受控轮次进行真实USB断连或进程终止，先检查无未核对通话、组件与计划状态并记录原操作ID；恢复只读核对后走原ID，不删除owner或重放未知提交。需要回传CLI输出/退出码、原生禁用回读和关闭日志。现有离线SIGKILL证据不等于手机断连通过。

## R083设备操作与可复现入口
独立应用包com.mantou.salesdialer.standalone不申请电话/网络权限；不得把它与com.mantou.salesdialer.spike混用。构建安装说明见android-standalone.md。UI用例需要手机已解锁且演示库为空，首次检查因锁屏停在首屏断言，保留evidence/android-standalone-r083/device。用户解锁后重跑留在device-unlocked，不把锁屏当业务断言失败。
待核对时可正常关闭/强制停止此独立应用，然后重新打开，观察待核对保留且下一条被占用阻挡；先明确模拟结果再继续。结束暂停，保留所有演示数据。此流程没有电话、真实号码或现有许可，不需要外呼授权。

### R084定时安装与执行条件
仅独立“销售任务仿真”需要允许“闹钟和提醒”，并在应用信息→电池允许后台运行/不受限制。安排前程序检查精确闹钟及后台限制，缺任一条件则提示并停止。安装命令为项目工具adb install -r prototypes/android/standalone/build/outputs/apk/debug/standalone-debug.apk；不清空数据。手机解锁后打开应用，点击“30秒后模拟下一条”，回到桌面等待；回到应用核对模拟结果。结束按“暂停并作废旧计划”。合成目标只有DEMO标识，无电话/网络权限。

可自动操作的真机入口：node tools/check-standalone-timer-device.mjs --run。要求本地设备绑定、已解锁、北京时间工作日09–18、无待核对模拟任务；读取保留已有演示库，必要时追加3条。验证后台回调、明确核对与重新安排后的force-stop/重开不补发。失败需回传evidence对应stdout/stderr/运行元数据及是否锁屏、权限状态；不能把SKIPPED_EXPIRED当作成功定时提交。真实通话适配与全天/连续队列另验。

R085真机再次尝试检查：手机解锁且保留现有演示库，选择已核对明确结果的目标（当前可用DEMO-001）准备重试，检查先暂停且旧结果可见；重新安排→模拟下一条→强制停止应用再打开，待核对及A2序号应保留。核对前再次点下一条不得产生新尝试，核对为未接后暂停。选择历史UNKNOWN目标应显示RESULT_UNCERTAIN并保留数据。命令node tools/check-standalone-retry-device.mjs --run自动执行以上合成检查；失败回传对应evidence/run.json及output.log，不清空应用。无电话API。

R087只读真实路线检查：node tools/check-standalone-bridge-device.mjs --run会安装当前standalone APK，保留任务，启动SubmissionBoundaryActivity并读取files/submission-boundary.json。报告应为SIMULATION / REAL_ADAPTER_NOT_LINKED / NOT_SUBMITTED、realCallsEnabled=false；任务字节必须不变。诊断忽略Intent参数，不具有启用权限；无需解锁。普通UI按钮“检查真实拨号状态”可在解锁后查看相同限制。真实链路尚未连接，不能据诊断通过请求真实呼叫。人工与定时改动回归复用check-standalone-retry-device.mjs、check-standalone-timer-device.mjs，仍只合成任务，需解锁和工作时段/闹钟后台权限。

R088固定联系人模型检查：node tools/check-contact-model-device.mjs --run，要求S23已连接、演示任务本来已暂停；无需解锁，不点击任务。脚本安装独立APK，启动ContactModelCheckActivity，读取files/contact-model-check.json；期望fixtureOnly=true、productionAuthenticated=false、persistentContacts=0、realCallsEnabled=false，各模型检查通过、宿主向量匹配、原DEMO字节不变、旧APK摘要不变。结束force-stop仅独立包，保留任务。若报告缺失/失败需回传evidence对应run.json/output.log/contact-model.json；不得手动把枚举来源或可计划结果当真实许可。当前没有联系人数据库，因此无重开持久联系人通过结论。

## R089隔离联系人Store回归
项目根先运行pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test，再用-Mode Build。手机经USB连接并已允许调试，已有.local/contact-android.json设备绑定，独立仿真库保持暂停；运行node tools/check-contact-store-device.mjs --run，可锁屏完成。脚本升级独立仿真包，只操作随机生成的合成fixture库；四阶段检查包含am force-stop，不影响旧受控app或DEMO字节。它不会拨号或开启电话组件。
需回传：命令退出码、stdout单行结果、files/contact-store-check.json；用record-core-run封装时附sqlite-cases.json和run.json。手机菜单“检查联系人存储”只跑all，不能代替脚本的跨进程/中途强停证据。结束独立仿真包已强停，可手动重开，任务仍暂停。S23本轮58断言已通过；其它设备/断电/磁盘满未运行。真实名单与电话适配尚未连接，不能把任何真实号码填入此fixture。

## R090草稿刷新真机检查
项目根先运行pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test及-Mode Build，再顺序运行node tools/check-draft-refresh-device.mjs --run与node tools/check-contact-store-device.mjs --run。需USB调试已授权、.local/contact-android.json设备绑定、原DEMO暂停；可锁屏。安装独立仿真包，固定合成fixture会创建schema1旧格式再迁移，测试脚本仅强停该包，不操作真实许可/拨号。
手机菜单“检查草稿刷新”只跑draft-all；完整脚本另跑提交后新进程、AFTER_DRAFT_UPDATE中途强停与恢复。结束包已强停，可重开且DEMO仍暂停。回传stdout/退出码、files/contact-store-check.json；record-core-run封装时附draft-cases.json、run.json。S23最终63断言已通过；其它机型/断电/磁盘满/并发首次迁移未运行，不记通过。真实号码不要输入此检查。

## R091计划元数据真机检查
项目根先运行pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test及-Mode Build。USB调试已授权、.local/contact-android.json绑定存在且原DEMO暂停时，依次运行node tools/check-sales-plan-device.mjs --run、node tools/check-draft-refresh-device.mjs --run、node tools/check-contact-store-device.mjs --run。可锁屏，不能并发操作手机。全部只用隔离合成库/注入时钟，升级并强停独立仿真包，不触发电话、清原任务或改旧许可。
菜单“检查任务计划”仅执行plan-all；完整脚本另执行提交后新进程→recoverPlan、过期库时钟回退、中途force-stop。结束包已强停，可手动重开，DEMO仍暂停。回传stdout/退出码、files/contact-store-check.json；record-core-run封装时附plan-cases.json、run.json。S23最终62断言已通过；注入的2026-10-19时间不是手机实际定时触发证据，正式运行器/单调时钟/boot、断电、多机型尚未运行。

## R092合成提交闭环与容量
项目根运行pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test和-Mode Build。已授权USB、已有.local/contact-android.json且原DEMO暂停时，依次运行node tools/check-synthetic-loop-device.mjs --run、node tools/check-sales-plan-device.mjs --run、node tools/check-draft-refresh-device.mjs --run、node tools/check-contact-store-device.mjs --run。勿并发控制手机。第一条含完整八阶段、提交前后实际force-stop、50目标200显式模拟尝试及重开；不拨号。固定fixture可锁屏，但已有一次all超时证据，不能承诺后台持续可靠。
手机“检查合成提交闭环”只执行all。脚本升级独立仿真包、创建保留的随机合成库，只删除/重写自己的synthetic-loop-check.json，不改DEMO、旧app或许可。结束强停，手动重开DEMO仍暂停。回传stdout/退出码、files/synthetic-loop-check.json；record-core-run封装另附loop-cases.json、run.json，超时有timeout-<phase>.json限当前进程诊断。UNKNOWN手工结果不能当未呼出，独立关闭须明确无活动/待处理；本轮这些确认仅测试替身，真实状态/真实名单不可输入fixture。


## R094已运行单次定时与后续环境边界
S23已完成前台、桌面后台单次自动模拟、暂停后越过原到时无补发、强停重开取消与模拟普通进程丢失后新进程回调，不需用户再逐项确认。具体入口/命令/预期/回传见android-workspace-timer.md。定时脚本check-workspace-timer-device.mjs --run要求解锁、当前工作日09:00～18:00、已有合格SIM联系人/0待核对/DEMO暂停、允许闹钟及后台运行，会明确安排两次合成并写未接；controls脚本只编辑未来计划/资格与草稿，cold脚本用自身UID杀仿真包进程并验证一次合成回调。均经node及record-core-run使用新证据目录，手机命令顺序运行，不清库、不改真实app/许可/系统设置。
回传workspace-timer-cases.json、controls-cases.json、cold-cases.json及PNG/XML、run.json/output.log；固定fixture附workspace-fixture.json。当前证据evidence/android-workspace-timer-r094，首轮am kill未实际终止进程和fixture错误原因保留，不视为功能失败已修或冷启动通过。实际撤权、锁屏/深度休眠/全天/其它机型仍未运行；测试替身权限阻挡不替代真实撤权。原接收端尾号5235无本轮电话授权，禁止自动试拨。


## R095号码暂存已运行与回传
S23手机入口“销售任务仿真→打开本机号码暂存”；默认本机实际号码资料区（未认证），切换按钮可进入独立格式测试区，不复制记录。当前只保存号码/来源/声明/拒绝，真实发送禁用，无任务计划。用户已解锁，最终UI19检查和隔离30断言通过，不需重复验收确认。
项目根Test/Build仍pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test / -Mode Build。固定检查node tools/record-core-run.mjs evidence/phone-fixture-new-run R-CALL-095 node tools/check-phone-intake-fixture-device.mjs --run；UI使用新目录及check-phone-intake-ui-device.mjs --run。USB/本地绑定已授权，原DEMO暂停、已有合成任务库用于保留比对；fixture可锁屏，UI需解锁，但号码暂存不受拨号时段限制。UI只读实际区，在格式区追加两条生成格式数据及相关批次，保留旧测试历史；不清实际名单，不使用旧受控号码或现有客户数据。脚本最终只强停独立包。
回传phone-fixture.json、phone-ui-cases.json及PNG/XML、run.json/output.log；实际区隔离用含私有slot/全部业务字段摘要，未打开的旧任务库仍比字节。首次锁屏未运行和整文件hash假设失败保留；可变List快照回归另有red/green。当前实际区0、格式区4生成联系人，无任务/真实电话。生产企业登录、真实号码到任务/手机链路、数据加密/保留/迁移及全天多机型未验，iPhone暂停。详见android-phone-intake.md。


## R096/R097本机草稿/计划：已运行与剩余条件

S23固定SQLite98、实际草稿20和计划21界面检查已通过，不需用户逐项同意验收。操作/新evidence命令/回传见android-local-drafts-plans.md。默认本机实际区不写客户，格式区生成记录可明确建测试草稿和计划；强停重开后计划暂停。两区无执行器/请求/电话。实际区0、格式区6联系人/2草稿/version5暂停。原真实APK/DEMO/合成工作区保持。
尚缺本地计划到真实手机适配及完整结果/下一条，真实平台验证必须使用当次授权号码/SIM、最新权限/空闲状态和工作日09:00～18:00；今天周日不试拨。旧许可不续用，尾号5235没有本轮许可。iPhone暂停，批量真实/全天/其它机型未运行。


## 历史R098/R099：09:36时可执行与未运行

2026-10-18：R096～098本机草稿/计划/有界尝试核心已通过记录型验证；R099独立“销售拨号·受控试点”APK已构建安装S23，20条配置与停用路径检查、10项安装/界面检查通过。647条Java断言（含原执行器27）、600解析向量、355条S23隔离检查、旧资料升级/界面10项通过。全部本轮0真实外呼；新APK真实通话/完整队列尚未验证，企业认证仍缺，整体部分通过，iPhone暂停。用户回复“三项已设置”后，09:35～09:36已实测本包3项手机权限、精确闹钟与后台不受限生效；电销卡绑定与旧账户一致，撤权/恢复和格式数据隔离UI共46项驱动检查通过（含新鲜界面采集检查），不是46次通话。实际区仍0联系人/0尝试/计划0暂停，许可停用，结束已强停。本次设置不构成真实外呼授权。

本包系统权限、精确闹钟与后台设置已于09:35～09:36实际核验完成，check-pilot-postgrant-device.mjs --run退出0、46驱动检查通过。旧应用授权没有被用于代替新包权限。不要重复运行要求空格式区的首次驱动；继续从真实通话缺口取证，不需要重做整个流程。具体入口/前提/权限恢复finally、回传见android-controlled-pilot.md。
真实受控E2E T713～715：工作日09:00～18:00、S23指定电销卡、当次明确同意接收端和次数；先前尾号5235目前没有新许可。名单实际区导入→已有资格→显式草稿→计划/立即→一次确认→系统API→受控接收端响铃/显号/双方讲话→挂断→人工核对→下一明确计划。前台/后台/锁屏分别取证；busy/卡变更/撤权/崩溃按有界场景安排，未运行保持未运行。API接受和isInCall不当接通证据。每通结束关闭许可，最终暂停/强停，不自动连续拨200真实客户。
原仿真资料两区已从schema3原子升级5，全部旧业务字段保留，10项用户升级/界面检查通过；355隔离断言含原98与201记录请求。新包20配置/停用与10安装UI通过，另有postgrant46驱动检查通过，三项设置已满足；新包真实通话和原全范围仍未验收。


## 新企业链路R103～105：无真实通话的可重复入口

本轮新正式入口是手机“销售拨号·受控试点→企业账号与自动队列”。完整本机启动/安装/停止/账号文件/测试命令见android-enterprise.md。企业服务127.0.0.1:8790，USB反向同端口；不使用此前8787的旧开发工作台来代表新链路。

先运行tools/start-enterprise.ps1，反向8790，安装pilot-debug.apk。在手机用REHEARSAL演练销售登录、只导入生成数据，声明资格，绑定已选电销卡。勾选两个目标、按导入顺序安排并启动，等第1记录请求产生；不填结果时不得第2次。填测试用“未接听”后等待至少30秒，第2条可在后台到期。强停重开应暂停并保留未知，不自行重发，明确核对后仍须重排。退出会清除手机受保护会话。管理员仅管理本企业销售，实际LIVE初始企业保持空且不配置期限。

自动记录型S23入口tools/check-enterprise-device.mjs --run，通过record-core-run包装且每次换新证据目录，需解锁、USB、明确SIM和既有权限。截图/日志只用掩码；不要回传密码、会话令牌、完整号码或私有密钥。回传enterprise-device.json、enterprise-last-execution.json的去敏副本、包摘要、系统/机型、发生时间；未完成的场景保持未运行。

下一轮真实步骤2：只在已采纳工作日09:00～18:00内，确认当次受控接收端同意和最大次数，再核验手机空闲/三权限/精确提醒/后台/电销卡与最新安装。此前授权已用完，本轮没有新的通话许可。新链路的有界许可准备工具仅准备不启动，当前只有夹具/静态证据；真实两端API与许可部署须先检查再运行。执行管理员/销售→名单→版本计划/手动→指定手机→受控接收端→销售讲话→人工核对→下一条，记录响铃、显号、语音、选卡/确认情况、结束时间；实际呼出/接通以两端证据确认，不由人工点击倒推。

锁屏、来电占用、权限撤回、换卡/停卡、后台限制和断线中断，在记录型和受控电话分别验证；真实状态制造可能影响日常手机，须约定环境再执行，不能按单元替身写真机通过。全天约200尝试、日费用、更多机型/系统仍需试点；iPhone按用户决定暂停，不列成本轮阻断。


2026-10-18 R105准备工具已补自动化流程/恢复验证，命令、5分钟同意字段、互斥/失败标识和回传项见enterprise-permit-validation.md。今天北京时间周日，未准备/部署/启动真实许可；下一次进入步骤2必须工作日当次受控同意。不要把14项隔离检查当手机许可成功部署，实际部署仍待运行。


2026-10-18 R105测试结束后使用 tools/close-enterprise-live-permit.mjs --permit-id <本次完整ID>，无需新实拨许可；完整行为/返回值/故障核对见[关闭许可说明](enterprise-permit-closure.md)。仅REVOKED/ALREADY_ABSENT表明本次已检查范围的许可撤销，不代表系统电话结束或结果核对；先正常挂断后处理UNKNOWN。PARTIALLY_REVOKED保留所有结果/额度，核对unverified后再处理，不清库重试。真实生效许可手机关闭留作下一轮受控电话后的证据项。


2026-10-19 R106：新版0.5已完成当前授权的一次8秒呼出，用户反馈未接；双端许可撤销与结果归档通过，不重跑。常规真实测试仍按原工作日规则。仅获当前明确受控时段例外时，私有请求可增加allowOutOfHours=true，经同一prepare-enterprise-live-permit工具生成签名schema2；无公开UI开关/全局环境绕过，最多10分钟、单一目标、限定次数。许可预发布不设置闹钟。若15秒计划已过，不启动或追赶；撤销后重新准备新版本，沿用同authorizationId持久次数。不可为刷新时效伪造confirmedAt。日志见android-controlled-window.md；本轮仅1次，不自动使用余次。


## 2026-10-19剩余真实环境验收入口（当前不自动执行）

1. 普通生产时段：工作日北京时间09:00～18:00，S23绑定电销卡且空闲、当次受控端同意和新明确次数；按既有私有请求准备，省略allowOutOfHours。保存当前APK/服务摘要、准备/原生执行/两端结果/撤销记录，预期到点30秒内提交，过时不补拨。
2. 真实来电占用：保持双端无实拨许可，用REHEARSAL生成任务准备但不启动；由操作者的已同意另一端向销售手机呼入，观察真实通话非空闲后启动，预期DEVICE_BUSY、队列停止、授权次数不增；结束来电后不得自动重启。回传掩码系统状态、前后计数和事件错误码，不录真实通话内容。没有真实占用就保持未运行，不能伪造状态通过。
3. 卡变化/重启：无实拨许可、合成计划下，操作者明确准备好后停用/移除指定卡，预期不改用另一卡；恢复后不重启。设备重启属于真实手机操作，保存原状态并由操作者安排，预期boot不符停用，不恢复旧计划。不得为测试改变他人线路或静默重启个人手机。
4. 真实自动下一条：至少两个不同且当次同意的受控目标，明确总次数；按导入顺序两条，第一通结束并手工填结果后，至少30秒进入第二条，未知/忙/暂停停。当前单一目标两个独立版本不作为此用例通过；两通旧额度已耗尽。
5. 长时/多机型：先约定受控名单/授权、样机、窗口与运营商条件，先模拟200再受控试点。回传不同目标/授权尝试/实际呼出/人工接通结果/间隔异常/实际费用和设备版本；真实数量不足不称全天可靠。当前本地201模拟不证明真实200全天。

以上本轮未运行者仍证据不足；本轮实际通过前台和后台锁屏各一通/显号用户核对、记录型37/控制13，不要求逐项重复同意既有软件验收。


2026-10-19 09:24：上文剩余项的真实来电RINGING占用、普通工作时段、两个不同受控端自动下一条已实际补齐，不重做；证据见enterprise-busy-device-r106和enterprise-paired-validation-r106。当前SIM停用/物理换卡、真设备重启、长时/更多机型仍缺真实环境。占线脚本只为生成任务准备、不启动真实电话；busyState真实非0才执行start并期望DEVICE_BUSY。

普通时段双目标准备：私有授权请求把receiver替换为receivers数组，恰好两个不同且当下同意的受控接收端，保留authorizationId/maxAttempts/confirmedAt/双确认布尔；不允许同时带receiver、不允许allowOutOfHours。仍运行原prepare-enterprise-live-permit命令，只准备不自动拨号。第二条只能由第一通结束且用户明确结果后同队列自动启动。记录first/next同queueId、至少30秒、最终FINISHED与close工具REVOKED。当前两次已耗尽，不得直接重跑本轮一次性观察脚本。


2026-10-19 D032：不再执行停卡/换卡项。当前重启恢复由操作者安排真实手机重启，开机首次解锁并保持USB；原未来演练票据保留boot299，VERIFY先确认新boot、系统无旧企业闹钟，再恢复reverse8790、打开本应用确认旧队列STOPPED/票据DISABLED/计数不增，退出演练。真实许可始终缺省，无外呼。若手机重启后用户自行先打开本应用，可能已正常清理票据，应记录此事件并按实际可见证据判断，不能伪造“打开前旧票据”的检查。准备证据enterprise-reboot-device-r106/prepare。


2026-10-19：重启恢复T816已实际完成，未来演练票据boot299在实际boot300后不再有系统闹钟，冷开停用并退出，0新增授权。T817有限前台20条节拍演练通过，该一次性脚本仅生成资料/REHEARSAL，自动填写的是测试替身未接结果，不能用于LIVE。临时演练时钟已恢复，不要再次直接运行align脚本或重放旧取证脚本。停卡/换卡按用户决定不推进。全天真实与更多机型另约环境/受控名单/次数，不能以此取代。


## R108新版自主批次的下一次真实验证（尚未运行）

已安装0.6/code5，当前无有效许可/计划。由操作者在手机用合格且当时可接听的受控名单（建议已知两目标各一次）安排未来至少1分钟计划，亲自在原生弹窗确认本批与SIM；挂断后在手机填真实结果，等待至少30秒自动下一条，最后退出核对0待核对。回传只需版本、两条掩码、是否实际呼出/接通/显号/语音、人工结果与是否已挂断；费用和时长没有账单/计量就未知，不回传完整名单/密码。助手代操作真实确认仍需当轮明确授权，之前7次额度全部用完。新版未验证前不自动批量外呼真实客户。

无电话原生E2E的源码和真实命令保存于evidence/operator-batch-r108/operator-native-check.mjs、operator-individual-check.mjs及对应run.json。必须先停止原服务、按用户0撤销本测试应用CALL_PHONE并核对，再启用独立生成LIVE数据库/账号测试服务（operator-fixture-server.mjs），才能运行；不能对真实企业执行自动确认夹具。测试结束stdin输入stop关闭测试服务，恢复原服务和原权限，并执行final-audit原12表/无许可/无会话/停用闹钟核对。REHEARSAL记录E2E用operator-recording-server/check.mjs，绝不调用电话端口。每次新证据目录，原source/run保留；不能仅因脚本文件存在记通过。


2026-10-21 R109无电话E2E复现：先确认S23用户0空闲解锁、无许可/会话；停原服务`pwsh -NoProfile -File tools/stop-enterprise.ps1`。启动`node evidence/result-navigation-r109/operator-recording-server.mjs`保持控制台（独立生成REHEARSAL数据库/账号，不用真实名单）。另一控制台运行`node tools/record-core-run.mjs evidence/result-navigation-recheck R-CALL-109,T-CALL-836 node evidence/result-navigation-r109/result-navigation-check.mjs --run`，用全新证据目录。该夹具仅记录请求，禁止切LIVE；41项含长页入口/定位无写入/清空隐藏、前后台和冷开未知保留。结束在夹具控制台输入`stop`正常退出，然后恢复原服务`pwsh -NoProfile -File tools/start-enterprise.ps1`；核对原真实数据/无会话许可/闹钟停用。自动检查不要求新的真实电话。截图pending-shortcut.png仅生成资料。真实全天、多机型和费用尚未运行；实际试用由操作者按quickstart自主小批进行，回传异常时间/批次及脱敏日志、尝试与人工结果计数、耗时和账单，不上传真实完整名单或账号密码。


D034/R110手工入口见wifi-quickstart.md。S23无电话完整检查源本机.local/enterprise/wifi-recording-check.mjs（43项），断线/错误证书源wifi-native-check.mjs（18项）；只可对独立生成REHEARSAL服务运行，并移除USB8790转接，不能对实际企业运行夹具。先停止原服务，启动operator-recording-server.mjs保持stdin，网关转发8790不变；结束向夹具输入stop，恢复原服务并核对13张业务表、无许可/停用票据。新真实无线通话用例T845未运行：先拔USB刷新确认连接，再在明确当轮目标/次数/接收端同意后由操作者亲自确认本批，挂断后填结果；回传掩码目标、是否响铃/接通/显号/双向讲话和最终0待核对，不上传完整名单/密码。


## R112/0.10用户可用性验收（待运行）

先确认没有未核对真实通话，不启动旧计划。两轮独立操作用隔离REHEARSAL企业演练账号和生成联系人，验证不会进入电话系统；不要把现有LIVE账号当作无电话演练。没有演练账号则先创建隔离演练范围，或只检查LIVE选择/核对预览后取消，后者不能替代完整闭环。

每轮：名单选两条→继续→设未来时间→核对→明确确认→等待记录请求→在拨号页填写生成结果→下一条→填写→结束。记录准备耗时、是否需助手找按钮、状态/结果/暂停是否可见、两条是否只处理一次。合格目标为本人连续两轮独立完成、准备≤60秒、无误授权/重复提交；这是待测目标，不是已通过事实。

自动化生成资料入口见README，实际S23日志在evidence/guided-workspace-r112/device-final；只验证47项演练检查，不代替本人测试或真实通话。T845需另行明确受控目标/次数/当前同意后，拔USB进行Wi-Fi真实拨号→显号/讲话→手机结果→下一条/结束，回传时间、结果、提示和设备诊断；未经当轮授权不执行。


## R113安装后检查（未运行）

按next-action先安全备份、更新服务/schema4和APK。仅在隔离REHEARSAL账号使用生成公司/姓氏/合成号码，先CSV文件载入预览取消验证0导入，再三列粘贴预览确认；检查重复同号不覆盖、公司/姓氏搜索、核对页和结果关联，旧单列仍能用。最后检查正式原记录/待核对/许可未变，退出演练恢复正式服务/账号。保留实际日志/截图与版本，不把浏览器替身当S23结果。无当轮通话授权不使用LIVE队列验证。


2026-10-22：T865/T866已补真机正常路径；实际55项见device-validated。后续本人独立两轮先按新界面操作，不需再次重复安装。手机CSV错误编码/超限路径如遇问题再补对应复现，当前仅静态有界实现与lint，不记真机已通过。真实外呼另按新有界授权执行，不能复用本轮合成演练。


R114/0.12：用户本人将小批合格名单放首表，按Excel模板的电话/公司/姓氏列填写→系统选择文件→预览→来源/资格→确认导入；只做导入不必授予拨号许可。需要真实队列时由用户在手机明确确认批次；助手代执行须当轮授权。正常.xlsx与取消已S23验证，密码/超限/坏编码的其他文件提供程序组合未逐项真机运行。独立两轮T856与真实Wi-Fi T845继续待验。
