# 销售拨号助手：本地仿真软件

> 当前增量：跨端时间校验已改为手机本机经过时间，210项回归及S23时间契约12点通过；iPhone按用户决定最后验收；操作见[安卓网页入口](docs/android-workbench.md)。真实外呼仍关闭。

> 前轮2026-10-15安卓交接增量：合成任务已能通过USB送到手机并取得持久去重回执；159项共用测试、手机17项闭环及8项接收器检查通过，本轮新增真实呼叫0次。运行见[安卓任务交接](docs/android-handoff.md)，这条链路仍只允许仿真。

> 2026-10-15新增：S23 Ultra实测前台人工、前台定时、后台锁屏定时3通，用户确认显号/接通/语音正常；背景设置须符合本机验证条件。原型已恢复仿真并暂停。详见[真机报告](docs/spikes/ANDROID-S23U-2026-10-15.md)，完整自动队列和iPhone仍未完成。

2026-10-15持续推进更新：**本地销售自助工作台已可用，Android探索APK已构建；原双端真实自动拨号产品仍未完成验收。** mantou已决定销售自行导入/处理本人名单，以及周一至周五09:00–18:00、过时不补拨、个人暂停/重新安排、忙线不排队。当前工作台仅合成输入和模拟外呼。

双击项目根 [start-workbench.cmd](start-workbench.cmd) 启动并打开[本机工作台](http://127.0.0.1:8787)。服务退出或电脑重启后需重新启动；仅本机浏览器可访问。操作/配置/停止见[工作台指南](docs/workbench-guide.md)。停止本轮后台服务用`& .\tools\stop-workbench.ps1`；重新以前台启动用`npm.cmd --prefix packages/core run workbench`，Ctrl+C停止。

Android探索安装包：[app-debug.apk](prototypes/android/app/build/outputs/apk/debug/app-debug.apk)（调试签名，单目标原型，不是完整销售产品）；[构建与哈希](evidence/continuation-1/android-apk.json)。Android/iPhone的真实SIM、显号、双卡、讲话、连续队列仍缺真机证据；iOS仍未构建/未运行。以下原步骤6记录保留作历史，当前增量见文末及acceptance。

当前可用：合成名单导入/去重/冲突隔离、显式能力与销售分配、资格/拒绝联系、时间/计划/人工触发、暂停/版本/防重/占用、SQLite持久化和未知待核对、分来源事件与U/G/Q/O/C统计。没有生产登录、真实号码批量导入、正式手机产品安装包或墙钟后台外呼服务；仿真入口只接合成标识和电话替身。

## 安装、启动与停止

固定项目`D:\mx\AI-Workspace\Projects\sales-dialer`。已安装Node.js v24.18.0，core无第三方依赖，不需要npm install。从项目根执行：

```powershell
npm.cmd --prefix packages/core run demo
npm.cmd --prefix packages/core run simulate
```

demo用内存跑两任务后退出，G=2/Q=1/O=0/C=0，待核对1。simulate逐行JSON，输入`{"op":"help"}`或`{"op":"status"}`；`{"op":"quit"}`、EOF或Ctrl+C停止。默认数据库在项目根`.local/simulation.db`，再次启动保留状态；未知结果不会重放。两条启动命令、交互quit/重开均已实跑；EOF有CLI测试，Ctrl+C为终端中断方式，本轮未另作信号专项验收。[操作记录](evidence/step-6/cli-interactive.json)。

配置与完整命令见[运行指南](docs/simulation-guide.md)：固定合成身份/能力，虚拟初始日期2026-10-14北京时间09:00，日期/迟到60000ms/暂停scope/恢复需重计划/显式下一条顺序均为可逆仿真参数，不是生产决定。time/advance推进虚拟时钟，tick显式投递定时事件；真实模式禁用，缺策略默认拒绝新授权。保存时钟失败返回SIMULATION_TIME_SAVE_FAILED且时间不改变。

默认DB路径固定项目根；自定义`--db`相对路径按进程工作目录解析，npm --prefix会进入packages/core。若指定库，使用绝对路径：

```powershell
npm.cmd --prefix packages/core run simulate -- --db D:\mx\AI-Workspace\Projects\sales-dialer\.local\my-simulation.db
```

此绝对路径形式已用独立readme-acceptance.db实际验证status/quit，退出0，见[命令证据](evidence/step-6/absolute-db-command-verified/run.json)。交互检查的相对测试库也已停机移至项目根.local。原时段入口也可运行：`node packages/core/src/window-cli.mjs 1791939600000 scheduled`，WINDOW_OK只表示时间条件，不授予拨号权限。

## 测试与当前证据

```powershell
npm.cmd --prefix packages/core test
npm.cmd --prefix packages/core run check
npm.cmd --prefix packages/core run test:rules
npm.cmd --prefix packages/core run test:integration
npm.cmd --prefix packages/core run test:capacity
npm.cmd --prefix packages/core run test:sequences
& .\tools\run-core-tests.ps1 -Suite All
```

实际全量npm测试**136通过，0失败/跳过/取消，退出0**；check实际检查28个mjs语法，退出0，本包无需转译构建。分组脚本指向同一批已运行测试；本轮不再重复各分组。PowerShell记录入口另用Support实跑11替身+语法/加载通过；All选项已纳入新增回归/容量，未在npm全量通过后重复All。[全量证据](evidence/step-6/npm-test-verified/run.json)、[语法](evidence/step-6/npm-check/run.json)、[记录入口](evidence/step-6/runner-support-detail/checks.json)。

当前136检查覆盖租户/资格/撤回、重投、旧版本、暂停/占用、事务回滚、两进程竞争、5个进程退出点、未知不重放、来源/计数与有限状态序列。seed0x00C0FFEE、32×50=1600操作通过；不能据此宣称所有并发或手机可靠。

容量分开记录：50目标/50任务/200尝试，U/G/Q/O/C=50/200/180/80/0；另有50目标/**200独立任务**/200尝试，50/200/180/180/40。每组10重投未放大，10未知保留历史，人工核对后无待核对；第201次明确尝试允许。O/C均注入模拟，实际电话调用0，真实人工时间和费用未测。[200尝试](evidence/step-6/npm-test-verified/capacity.json)、[200任务](evidence/step-6/npm-test-verified/task-capacity.json)。本机耗时不作生产吞吐承诺，历史异常样本保留。

## 平台静态、构建与设备操作

静态工具现有依赖已安装在tools/static-check（java-parser3.0.1、xcode3.0.1），core不依赖它们。仅新副本缺依赖时，按锁文件执行`npm.cmd ci --prefix tools/static-check --ignore-scripts --no-audit --no-fund`；本轮复用已有依赖，没有重新安装。

从项目根执行以下形式（每次换新的evidence目录，记录器拒绝覆盖）：

```powershell
node tools/record-core-run.mjs evidence/platform-static/new-source R-CALL-020,R-CALL-021 node tools/static-check/check.mjs
node tools/record-core-run.mjs evidence/platform-static/new-metadata R-CALL-020,R-CALL-021 py tools/static-check/metadata-check.py
```

本轮同形式命令已通过61源码+8元数据检查。[源码静态](evidence/step-6/native-static-isolated/run.json)、[元数据](evidence/step-6/native-metadata-isolated/run.json)。Java检查没有Android类型信息；Swift仅词法平衡与项目结构，不检查Swift语法/类型。静态通过不等于平台构建或设备通过。脚本现支持DIALER_EVIDENCE_DIR；记录器自动设置，避免刷新旧报告。直接裸跑旧脚本仍使用step-2输出路径，建议使用上面新目录形式。

Android旧通用命令如下；当前项目内工具已具备，推荐用下方项目内构建脚本。真机安装仍缺设备，**未运行**：

```powershell
& .\prototypes\android\gradlew.bat -p prototypes/android :app:assembleDebug --no-daemon --console=plain
adb install -r prototypes/android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.mantou.salesdialer.spike/.MainActivity
```

Mac验证副本根的iOS无签名模拟器构建（本轮无Mac/Xcode访问，**未运行**）：

```sh
xcodebuild -project prototypes/ios/DialerProbe.xcodeproj -scheme DialerProbe -sdk iphonesimulator -configuration Debug -derivedDataPath prototypes/ios/build CODE_SIGNING_ALLOWED=NO build
```

模拟器不能提供真实SIM/显号证据。两端源码默认仿真，真实单次需设备、受控接收端和显式配置；销售号不作为接收号。完整E2E-AND-01/E2E-IOS-01的安装/操作/退出/日志回传、双卡/锁屏/撤权/接续/崩溃和试点条件见[manual-steps](docs/manual-steps.md)。暂无真机/受控接收端，正式移动链路尚未实现，没有可宣称通过的完整手机E2E。

## 交付记录与下一步

| 文件 | 内容 |
|---|---|
| [acceptance](docs/acceptance.md) | 当前通过/部分通过/证据不足，版本、命令、缺陷修复与证据边界 |
| [规范](docs/spec.md) / [仿真契约](docs/simulation-contract.md) | 27个R-CALL与未决生产策略 |
| [矩阵](docs/test-matrix.md) / [台账](docs/feature-ledger.md) | 97个T场景、稳定13个F；手机未运行不计已验收 |
| [计划](docs/implementation-plan.md) / [下一步](docs/next-action.md) | 先步骤2补平台，相关行为回3，再5接适配、6复验 |
| [执行记录](docs/execution-log.md) / [估算](docs/estimates.md) | 实际检查、费用/时间参数和未测项 |
| [研究](docs/research.md) / [供应商问题](docs/vendor-questions.md) | 已有资料与待用户使用草稿，未对外联系 |
| [固定语音下一轮](docs/next-round-voice.md) | 媒体/意愿/就绪接手/退出/拒绝/计费，先验证媒体链路 |

已确认的09～18东八区、人工同窗口、不自动重拨、约200总尝试、SIM/双卡/销售显号与名单资格保持。生产角色、日期/过期/恢复、保留、真实格式/选卡/主指标等SPEC GAP未被实验参数代替。持续推进无需重复复制步骤：当前步骤2继续补平台真机证据，相关未决生产行为按步骤3澄清，再进入步骤5实现正式适配。没有发布、部署、采购或真实批量外呼。

## 持续推进的最新验证

```powershell
npm.cmd --prefix packages/core run workbench
npm.cmd --prefix packages/core test
npm.cmd --prefix packages/core run test:browser
npm.cmd --prefix packages/core run check
& .\tools\build-android-local.ps1 -ExistingTools
& .\tools\build-android-local.ps1 -Lint
```

上述npm测试入口当前143项通过、34个mjs语法通过；实际Chrome工作台13检查点通过（含390宽度），截图/操作见[工作台指南](docs/workbench-guide.md)。新增自助角色与周一至周五规则已进入工作台；旧CLI legacy-fixture保留早期实验能力，不代表当前产品默认角色。浏览器仅127.0.0.1、随机会话令牌/Host/Origin检查，未替代生产登录。

Android工具由mantou接受SDK许可后安装在.tooling，采用官方来源及SHA-256核对。构建脚本设置项目局部环境，新时间前缀保存每次记录，拒绝覆盖历史。修复后的assembleDebug/lintDebug实际退出0，lint仍10警告（同步commit持久化选择、原型资源/备份等），没有用禁用规则或baseline消除问题。首次4个权限lint错误和修复后结果均保留。[修复构建](evidence/continuation-1/fixed-android-assemble.json)、[修复lint](evidence/continuation-1/fixed-android-lint.json)。

正式手机适配、真实账号/名单格式与保留、受控接收端、iOS构建/两端真机及真实试点仍是必需缺口。固定语音保留独立下一轮。当前状态见[验收更新](docs/acceptance.md)与[接续条件](docs/next-action.md)。

Android模拟器补验已完成：[5项检查与安装/启动证据](evidence/continuation-1/emulator/result.json)。人工模拟、暂停取消、暂停时阻断及回桌面后的30秒定时通过，电话API调用0；模拟器已关闭，不据此声称销售SIM/双卡/显号/讲话通过。


## 安卓任务仿真：本轮可运行入口

在项目根运行。必须用`adb devices -l`中明确选定且允许调试的SERIAL；手机安装本轮debug APK。此命令创建两个新的合成任务，经USB交接、回执、显式模拟核对后退出，不使用真实号码，也不自动执行现有工作台中的任务。

```powershell
npm.cmd --prefix packages/core run android:demo -- --serial SERIAL
npm.cmd --prefix packages/core run test:android-handoff
```

该入口使用本机当前时间，遵守工作日09:00–18:00；窗口外拒绝。脚本运行结束即停止；Ctrl+C可中止，已交接的不确定状态不能自动重放。数据库在`.local/android-demo/`，每次新证据在`evidence/android-handoff-device/`。安装/构建、完整协议与限制见[android-handoff](docs/android-handoff.md)。原工作台仍是独立虚拟时钟模拟入口，尚未加手机选择/发送按钮。正式真实SIM、生产身份和自动接续未交付。


## 当前网页手机入口（2026-10-15）

新增“安卓手机仿真”区：绑定USB设备、核查安装包/启动标识，独立当前时间与任务库，发送合成任务到S23并人工核对关闭。173项回归、43模块语法、实际网页+S23共20点检查通过。本轮新增真实电话0次。真实SIM/生产设备身份未绑定，完整产品仍未验收。

启动/停止/配置/测试的完整操作见[安卓网页入口](docs/android-workbench.md)。项目根执行`tools/start-workbench.ps1 -AndroidSerial YOUR_DEVICE_SERIAL -OpenBrowser`；已有旧服务先执行`tools/stop-workbench.ps1`。运行地址 http://127.0.0.1:8787 。原虚拟工作台保持可用。


手机区现可保存15/30/45秒定时计划，主机服务到点向USB手机发送合成任务；离开网页仍执行。暂停可取消，恢复/服务重启后必须重新安排。没有真实呼叫或自动下一条。详见[定时操作](docs/android-workbench.md)；局部测试`npm.cmd --prefix packages/core run test:android-scheduler`。


“电话能力·只读检查”已接入网页。可读取现有权限、后台设置、两张SIM账户并明确只读绑定电销卡；不会请求新权限或调用电话。只读就绪始终不代表可真实外呼。新APK已构建/安装，说明与局部检查命令见[手机工作台](docs/android-workbench.md)。


### 受控轮次额度演示（合成数据）

在项目根目录运行 `npm --prefix packages/core run trial:demo`，演示一次额度占用、重复拒绝、数据库重开后未知占用、核对及额度耗尽。程序自动退出，临时数据库自动清理；不连接手机、不读取名单、不拨号。此入口暂独立于网页。

局部测试：`npm --prefix packages/core run test:trial-budget`；完整回归：`npm --prefix packages/core test`；语法检查：`npm --prefix packages/core run check`。返回RESERVED仅表示仿真额度已占用，所有真实授权仍DENY。


### 联合条件与未知结果演练（完全仿真）

项目根目录运行 `npm --prefix packages/core run controlled:demo`：使用合成名单和模拟手机快照，演示资格/选卡/额度联合提交、丢失回执、阻断重发、人工核对且不退款。自动结束，无需停止命令，不连接手机或外呼。

局部测试 `npm --prefix packages/core run test:controlled-trial`；完整回归 `npm --prefix packages/core test`；语法 `npm --prefix packages/core run check`。该入口尚未接网页；callAuthorization始终DENY，不能用演练结果判断正式Android链路已验收。


### 可打开的受控演练页面

启动工作台后打开 http://127.0.0.1:8787/trial （主页也有入口）。依次选择演练卡、提交合成任务、查看结果未知、勾选核对、关闭占用。页面不连接手机，真实拨号始终禁用；一次模拟额度用完后刷新/重启不会恢复。时间固定在页面注明的模拟时刻。

启动 `powershell -NoProfile -File tools/start-workbench.ps1`，停止 `powershell -NoProfile -File tools/stop-workbench.ps1`；保留原Android配置的服务更新由工程流程执行。记录单独存于.local/workbench.db.trial.db。局部 `npm --prefix packages/core run test:trial-web`，全量 `npm --prefix packages/core test`，语法 `npm --prefix packages/core run check`，浏览器 `node tools/check-workbench-browser.mjs`。自动浏览器测试使用独立临时数据库，不消费你日常演练页的额度。



### 真机观察与模拟提交（独立检查入口）

`node tools/check-observed-trial.mjs YOUR_DEVICE_SERIAL 电销卡 evidence/observed-trial/新目录`

需S23通过USB连接、已安装匹配的开发APK、权限就绪、当前处于允许工作时段且无活动通话。它读取实际设备与电销卡状态，但目标和提交完全模拟；不会呼叫。检查绑定、一次模拟未知回执、重复阻断、SQLite重开和人工核对。一次/5分钟仅为工程演练参数，证据与SQLite单独保存在新目录，自动结束无需停止服务。遇通话中会停止，不挂断用户通话。

局部 `npm --prefix packages/core run test:observed-trial`。现有/trial页面仍使用纯模拟卡，本入口尚未接入该网页。


### 真机观察演练网页

打开 http://127.0.0.1:8787/observed （主页也有入口）。启动时需明确USB设备：`powershell -NoProfile -File tools/start-workbench.ps1 -AndroidSerial YOUR_DEVICE_SERIAL`。已有不同配置服务时先按原停止方法停止，再以该参数启动；数据库保留。

点击“读取手机状态”，明确选择电销卡，再绑定本轮观察账户、执行原生检查、核对关闭。账户和权限来自实际手机，目标和额度为合成数据；原生回执单独保存，检查就绪不代表拨号。首次绑定起一次/5分钟工程额度；刷新或重启不恢复，页面不提供续期或加额。数据保存于.local/workbench.db.observed.db，与/trial纯模拟及USB任务区独立。页面后台不会自动读取手机或启动Activity。

局部 `npm --prefix packages/core run test:observed-web`；全量 `npm --prefix packages/core test`；浏览器检查方法见docs/implementation-plan.md。真实呼叫始终禁用，iPhone仍待最后验收。



### 安卓原生提交前检查（不拨号）

`node tools/check-native-guard.mjs YOUR_DEVICE_SERIAL 电销卡 evidence/native-guard/新目录`

需要已连接且空闲的S23和匹配新APK。只检查权限、指定账户、设备关联、期限、防重与进程恢复，不接收电话号码，不拨打或挂断电话；会重启测试应用进程。证据目录必须未使用。当前/observed按钮已接原生检查，安装身份和业务票据关联；仍无电话调用。

原生构建/规则测试命令见docs/implementation-plan.md。本轮构建用PowerShell7的pwsh，保留项目内现有SDK/JDK，不修改全局环境。



## 原生检查关联业务票据（R042，开发演练）

可以从持久任务/额度票据发起一次S23原生检查，保存对应摘要和回执。检查成功仍显示待核对，电话API计数为0；当前/observed已接入本检查，明确显示原生来源及待核对状态。

在项目目录运行局部测试：`npm --prefix packages/core run test:guard-link`。全量：`npm --prefix packages/core test`。连接S23并空闲、在既定工作时段内运行：`node tools/check-guard-link.mjs YOUR_DEVICE_SERIAL 电销卡 evidence/guard-link/新的唯一目录`。入口执行完自动退出，无后台服务；报告及独立SQLite在指定目录。无新增依赖、无真实拨号；现有网页启动/停止方法不变。


## 当前观察页（R043）

打开 http://127.0.0.1:8787/observed ，明确读取手机、选择电销卡并绑定后，点击“检查手机条件（不拨号）”。回执可显示“原生检查就绪，待核对；尚未拨号”。安装身份变化、配置缺失或已绑定历史模拟轮次会阻止新提交，保留已有记录。

启动：`pwsh -NoProfile -File tools/start-workbench.ps1 -AndroidSerial YOUR_DEVICE_SERIAL`；停止：`pwsh -NoProfile -File tools/stop-workbench.ps1`。局部测试：`npm --prefix packages/core run test:observed-native`。不需新依赖，当前仍非可对真实客户外呼的正式产品。


## 当前验收状态（2026-10-15）

已通过：本地合成业务规则、200条模拟任务、安卓网页原生检查与持久回执/恢复。本轮完整回归286项通过，已有34项浏览器/S23检查与构建证据经摘要复核继续有效。原真实电话API尚未接入业务闭环，整体产品未验收，不能用于批量真实客户外呼。

使用入口：http://127.0.0.1:8787/observed 。启动/停止、USB配置及测试命令见上文，当前无需新增依赖。下一步实现受限真实适配，实际呼叫另需新轮次许可；iPhone最后。完整判定见docs/acceptance.md顶部。


## 受限电话交接契约演示（R044）

`npm --prefix packages/core run controlled-call:demo` 可查看“撤销许可被拒绝”和“模拟失回执→未知待核对”。程序自动退出，0电话API，无号码输入、不访问S23，不影响日常网页或数据库。

局部测试：`npm --prefix packages/core run test:controlled-call`。该模块只校验合成许可/上下文，未实现持久扣额，也不是实际拨号入口。下一步把它接入现有事务与受限端口；真实呼叫仍需新的明确轮次许可。


## 持久许可交接演示（R045）

运行 `npm --prefix packages/core run controlled-call:claim-demo`：创建项目内独立SQLite，演示首次交接、重复拒绝、重开后未知不重发，最后自动退出。输出数据库位置，既有网页/日常数据不受影响。当前只用合成许可与记录调用替身，真实电话API为0。

局部测试 `npm --prefix packages/core run test:controlled-call-claim`；完整测试 `npm --prefix packages/core test`。交接计数与任务状态已原子持久，真实号码/许可及原生电话调用尚未接入。


## 新原生受控入口（R046，尚未安装）

本地APK已包含ControlledCallActivity，默认disabled；还要求应用私有明确许可文件才能执行。没有自动启用或写许可的入口。当前网页仍只做既有无拨号检查，实际电话任务桥接及原生核对尚未接通。

27条共享原生执行器断言及安卓构建/lint通过，新APK未安装到S23。构建命令和JVM完整运行记录见docs/implementation-plan.md及evidence/native-call；默认禁用已核对打包Manifest。新包安装前，服务重启读取新构建指纹会与旧手机包不匹配并拒绝，先按manual-steps协调安装/指纹更新。请勿把旧三通许可当本入口的新授权。


## 原生传输协议校验（R047）

`npm --prefix packages/core run test:native-call-protocol`运行31项纯逻辑测试并自动退出；`npm --prefix packages/core test`运行全量测试。命令编码不含号码/token，回执必须匹配原任务和摘要；异常结果保留待核对。此模块尚未接入USB发送或网页真实外呼，不改变现有启动/停止及配置方法。


## 受限USB库与手机核对（R048，尚未接入网页）

`npm --prefix packages/core run test:controlled-usb`运行USB替身与协议测试，自动退出，不拨号；全量`npm --prefix packages/core test`。新增USB库会在本地SQLite保存一次性发送记录，丢失回执或重启后不自动重发；核对与已用次数分开。配置只允许显式本地受控许可，不接受TEST_FIXTURE转换，不能把示例合成配置当通话授权。

安卓提交/核对组件仍默认禁用，新包未安装。新代码没有网页真实调用入口，既有网页启动/停止方式不变。实际任务协调器接线和无拨号原生数据库测试完成前，不能按完整产品使用。


## 本地受控协调演示（R049）

运行 `npm --prefix packages/core run local-controlled:demo`。演示使用合成联系人和记录USB替身，在项目.local创建独立数据库；展示提交失回执、重开后不重发、显式核对结束且不退次数，完成后自动退出，无需停止服务。设备调用被演示入口明确禁用。

局部测试：`npm --prefix packages/core run test:local-controlled`；完整回归：`npm --prefix packages/core test`；语法：`npm --prefix packages/core run check`。本轮实测34专项、412全量、80模块语法通过。

实际USB适配已在代码中接到独立受控协调器，仍需要显式本地许可、匹配政策、指定设备/安装/账户和批准APK；不会自动使用演示配置或历史三通授权。没有开放网页真实拨号入口，原生数据库/恢复实机证据仍待补。


## S23原生数据库无拨号检查（R050）

新调试包已安装，网页已恢复：[设备验证页](http://127.0.0.1:8787/observed)。实际拨号入口仍关闭，旧轮次数据保留；APK更新会使旧设备绑定失效，不自动续额或换绑。

项目根运行 `node tools/check-native-database.mjs YOUR_DEVICE_SERIAL`，会在新evidence目录保存检查结果并自动退出。需要连接S23、匹配已构建APK、手机空闲且旧测试入口暂停/仿真。工具只使用独立合成数据库；本轮实测36条SQLite断言和34项浏览器/手机无拨号检查通过。

真实忙线/权限撤回和完整新受控电话闭环仍待验证；这些测试不能证明全天外呼可靠。
