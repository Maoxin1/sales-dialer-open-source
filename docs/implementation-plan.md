# 实现计划：本地子范围已验收，手机适配待验证

更新：2026-10-15。依据[spec](spec.md)、[仿真契约](simulation-contract.md)、[决定](decisions.md)和[台账](feature-ledger.md)。mantou已授权连续执行步骤5，直到需要步骤6，不再要求逐小项重新发送提示词。

## 当前范围与技术栈

Node.js v24.18.0、JavaScript ES modules、node:test/assert；未增加依赖。MemoryStore用于纯模拟，SQLiteStore使用node:sqlite（SQLite3.53.1，Node接口Release candidate），仅本地仿真存储，未选择生产数据库/鉴权/同步服务。SQLite采用BEGIN IMMEDIATE、WAL/FULL同步、状态及唯一索引/审计/outbox一起提交；整体快照写入有规模限制。

Clock显式注入；FakeDialAdapter记录每次请求，不代产品防重。CLI只接合成数据，real返回REAL_ADAPTER_UNAVAILABLE。真实手机号解析、生产角色映射与所有手机权限问题仍需已确定策略/原生证据。工程细节与示例simulationPolicy见simulation-contract，不当产品决定。

## 小项推进结果

| 小项 | R/F范围 | 当前结果 | 剩余条件 |
|---|---|---|---|
| M-CALL-001 时段 | R006；F005 | 已实现，原43测试转绿，时段48+原CLI6+替身11的旧证据保留 | 日历等其他守卫独立；原窗口接口不授予拨号权 |
| M-CALL-002 资格/拒绝/权限 | R001～005/022/024；F001/010/012 | 纯守卫15项先红后绿；最新Actor能力/销售归属、资格、拒绝及合成导入已接Store | 生产身份、角色/号码格式未定，现有资格声明不重复索要 |
| M-CALL-003 调度/防重/占用 | R007～013；F005/007/011 | 版本/策略/手动定时竞争、单销售占用、暂停撤销、恢复需新计划、明确retry已实现 | 日历、迟到、scope和排序为显式仿真参数；真实策略未采纳 |
| M-CALL-004 持久化/未知恢复 | R014～016/023；F011/013 | SQLite文件重开、原子回滚、两进程授权/消费、5个退出位置、未知不重放已实测 | 未验证生产多机、硬件掉电、真实电话系统交接 |
| M-CALL-005 合成任务闭环 | R017/018/024/026；F005/006/013 | 联系人→任务→资格→调度→替身→独立结果→下一条；可持续CLI已运行 | 不接手机；虚拟tick不是后台手机调度，生产UI后续 |
| M-CALL-006 已验证手机适配 | R019～021；F002/003/004/006/008 | 未实现正式适配，保留原型/研究，未构建未运行 | JDK/SDK/adb、Mac/Xcode、真机/受控接收端与地区/SIM证据 |
| M-CALL-007 真实适配恢复 | R011～017；F011/013 | 共用恢复实验完成；真实设备恢复未运行 | 待M006及受控丢回执/撤权/卡变化取证 |
| M-CALL-008 批量管理/入口 | R001～005/022/023/026；F001/010/012/013 | 合成rows导入、规范化/重复/冲突/原值、能力/分配接口与CLI已实现，修复3个具体Bug | 真实文件格式/号码/角色/保留和完整管理UI待决定 |
| M-CALL-009 容量/兼容/试点 | R020/021/027；F003/004/007 | 50目标200尝试+10重投与第201次；32×50有限状态序列已通过 | 本机性能异常样本保留，不承诺吞吐；兼容/真实日量/费用待试点 |

当前可独立实现的本地软件部分已通过步骤6验收；表中外部条件/产品策略未决部分不假装实现。固定语音/意愿/接手保持下一独立轮次，CRM/完整报表没有加入。

## 已实现接口与边界

- checkDialWindow、checkAccess、checkEligibility：纯必要条件，不授予电话能力。
- SimulationEngine：可信fixture身份、输入/导入、分配/计划、资格/拒绝、授权、暂停/恢复、交接、核对、明确重试、事件与统计。单销售占用及唯一intent/task-cycle在事务与数据库索引双层约束。
- Store：MemoryStore克隆事务仅作替身；SQLiteStore持久化/回滚/唯一约束用进程实验验证。未提交不调用；交接先持久化；未知保留并拒绝原attempt再次消费。迟到回执不重开旧周期。
- SimulationSession/CLI：固定合成能力、JSON命令、虚拟时间、合成电话结果，不提供生产登录/HTTP服务。逐条显式下一任务，不自动重拨。复用[运行指南](simulation-guide.md)。
- Event/metrics：API、OUTGOING、CONNECTED、人工结果分别记录；未绑定状态只观察。按日期是授权日期cohort统计，生产“总拨号”主口径仍未选。

## 可执行命令与真实结果

```powershell
npm.cmd --prefix packages/core run demo
npm.cmd --prefix packages/core run simulate
npm.cmd --prefix packages/core run test:rules
npm.cmd --prefix packages/core run test:integration
npm.cmd --prefix packages/core run test:capacity
npm.cmd --prefix packages/core run test:sequences
npm.cmd --prefix packages/core test
npm.cmd --prefix packages/core run check
& .\tools\run-core-tests.ps1 -Suite All
```

局部新行为先写可加载接口/业务断言，再实现转绿；已有正确行为增加验证直接通过，不伪造红灯。真实总回归：26文件语法、入口加载均退出0；窗口48、替身11、窗口CLI6、业务/持久化/进程/CLI64、容量1、有限序列1，共131通过，0失败/跳过/取消。详见[checks.json](../evidence/step-5/continuation/final-regression/checks.json)。原M001测试/替身及平台文件保留。

每次实际红/绿命令、Node版本、退出码、TAP与源码哈希在evidence/step-5/continuation。通用单次记录：`node tools/record-core-run.mjs evidence/新目录 M-CALL-002,R-CALL-004 node --test --test-reporter=tap packages/core/test/eligibility.test.mjs`。目录不能重用。All亦拒绝覆盖旧记录。

JS包无转译步骤，check不等于Android/iOS编译。两端构建/安装和E2E命令在[manual-steps](manual-steps.md)及[README](../README.md)，当前环境缺工具/设备，本轮未重复已知缺条件的构建。不得用原型确认流程验收原iPhone免逐通确认目标。

## 步骤6的核对重点

以[矩阵](test-matrix.md)与源码/运行证据核对本地已实现行为，复用当前有效回归，必要时补验收缺口。重点看用户操作、拒绝/权限、未知核对与版本恢复；明确本地模拟的通过范围、生产/平台的证据不足。交接及最多3项后续外部输入见[next-action](next-action.md)。

## 步骤6当前状态（2026-10-15）

本地仿真软件已通过验收：136项回归/28模块语法/69项原型静态检查及CLI交互通过，两个缺陷红转绿，新增200独立任务容量场景。原完整产品仍部分通过、双端必需证据不足；平台原型未构建/未运行，正式手机适配未实现。前文“待步骤6/进入验收”是历史进度，以[acceptance](acceptance.md)和[next-action](next-action.md)为当前结论。

下一步2补真机/线路/地区证据；条件未具备时可并行3明确生产角色/格式/日历/过期/恢复/保留等行为，再5实现已验证适配，回6验收。不改变原需求。固定语音独立后续台账见[next-round-voice](next-round-voice.md)。

## 持续推进新增交付

M008按D018增加销售自助权限：assign_self、本人未建任务名单可见、其他导入历史隔离、跨销售操作拒绝，原企业拒绝不变量保留。M005/M008新增浏览器工作台，localhost服务/API与本地SQLite复用，真实适配禁用。M003按D019增加自助profile工作日日历；既有暂停/恢复/忙线不排队继续验证，误差阈值仍仅实验参数。

新增入口`npm.cmd --prefix packages/core run workbench`；`npm.cmd --prefix packages/core run test:browser`用实际浏览器跑双任务流程。143项共用回归、浏览器13检查点通过；新R028/029、T098～107见矩阵。正式账号、真实输入格式/保留和手机适配仍未完成。

M006环境缺口已推进：项目内JDK17.0.20.1、SDK36/BuildTools35/adb37.0.1、Gradle8.13；Android探索APK构建成功，lint4错误已修复，0错误/10警告。剩余警告包括故意同步持久化commit、原型中文文本/图标与备份配置，不以关闭lint或新baseline抹去。模拟器验证与真机边界见Android spike。


## 真机证据后的当前实现顺序

S23 Ultra前台/后台锁屏单次SIM路径已取得本机受控证据，见[S23 Ultra真机报告](spikes/ANDROID-S23U-2026-10-15.md)。下一步5选M006的正式安卓适配小项：先冻结命令/回执契约（R019/020/024，T036～040/045），携带任务/版本/授权ID及选定账户；以替身验证持久交接、防重复、撤销、未知占用及拒绝回放，再接本机已验证的原生路径。权限/精确闹钟/背景限制作为实际前置条件，条件缺失不新外呼。不能直接把原型按钮或placeCall返回当产品队列完成。

自动释放占用/下一条依任务关联、结束证据及生产排序/迟到规范；不清楚的行为按步骤3补最小缺口。正式企业身份、真实输入与保留期限仍未定齐，测试输入继续合成或已约定受控目标。平台撤权/停卡/来电/长期锁屏仍按步骤2单独取证，额外真实次数需另约。本轮仅原型验证，没有实现上述正式适配。


## M006开发交接已实现（2026-10-15）

[安卓交接契约](android-handoff.md)已实现：共享规则消费、持久命令、摘要匹配、USB传输、原生SQLite去重；两合成任务在S23 Ultra完成17点闭环，原生拒绝8点通过，总回归159。M006只完成开发仿真子项，真实外呼/生产认证/实际SIM绑定未接入。下一小项是工作台提供显式设备仿真入口，明确手机墙钟与现有虚拟时钟的隔离，继续将能力条件和同步撤回纳入协议；未定的生产行为先补规范，不打开真实拨号。


## M006：本轮设备绑定与网页入口交付

R031/032已落盘：AndroidDeviceBinding、AdbSyntheticTransport.inspect、AndroidWorkspace独立库及网页手机区。沿用Node内置HTTP/SQLite/crypto与已有ADB，没有新依赖。原生代码未改、五份源哈希与已构建APK证据一致，复用既有构建/lint，本轮没有重复构建。

局部命令：`npm.cmd --prefix packages/core run test:android-binding`；相关回归`npm.cmd --prefix packages/core run test:integration`；总回归`npm.cmd --prefix packages/core test`；语法`npm.cmd --prefix packages/core run check`。实际记录见evidence/android-binding。设备E2E与启动/停止见[网页手机操作](android-workbench.md)。

下一小项：步骤5先补手机区计划/人工触发的持久调度（只合成），将暂停、过期、重启恢复和任务版本通过同一授权守卫；使用D019不补过时任务，开发误差不能变成产品决定。自动下一条排序与真实结束证据未定，不能直接启用连续真实队列。生产身份认证/设备账户绑定、名单格式/保留及真实适配另组推进，iOS仍需步骤2证据。


## M006手机区持久定时交付

R033已实现；AndroidWorkspace串行处理命令与定时、SQLite保存领取/完成/阻断记录、createWorkbench管理定时生命周期、网页保存15/30/45秒合成计划并只读刷新状态。无新依赖，原生代码未变。

直接运行`npm.cmd --prefix packages/core run test:android-scheduler`（16项），总回归`npm.cmd --prefix packages/core test`，语法`npm.cmd --prefix packages/core run check`。实际命令/版本/退出码见evidence/android-scheduler。设备E2E仍用android-workbench说明的DIALER_ANDROID_SERIAL入口，现含关闭页面期间定时交接。

下一小项步骤5：真实电话账户、权限与后台能力的只读快照及显式SIM绑定模型（区分UNKNOWN/不可用/当前选定）。先用替身验证权限撤回/选卡失效不授权，再在S23只读核对已指定电销卡。没有新增真实电话授权时继续禁用呼叫；生产身份与通信认证、移动端长期调度仍是后续必需项。


## M006电话能力只读子项交付

R034已实现PhoneCapabilitiesActivity、PhoneCapabilities模型、nonce/设备指纹传输和网页主动读取/显式选卡。原Probe、MainActivity、DialAlarmReceiver、SyntheticBridgeActivity源码均未变；Manifest增加debug只读入口，APK实际重建安装，lint通过。

局部：`npm.cmd --prefix packages/core run test:phone-capabilities`（14检查）；直接设备检查见android-workbench.md；总测试/语法命令沿用。evidence/phone-capabilities保留红绿、时钟缺陷、首次定时超时、安装和最终检查。

下一步骤5优先补新证据暴露的跨端时间缺口：现有合成命令仍以主机issuedAt/expiresAt与手机墙钟直接比较；读取快照已隔离时钟，但任务协议尚未解决偏差。以固定正负偏差、过期/重复/进程恢复替身测试定义安全时间契约，再补不发真实电话的设备验证。不要调大生产迟到阈值或改变设备时钟掩盖缺口。原生产身份、真实适配和iOS仍需后续实现/证据。


## M006跨端时间契约增量

R035实现设备持久接收期限（SyntheticLease/Activity）、共享原生LeaseWindow守卫、主机单调往返预算与ADB自动握手。命令/任务原摘要、SQLite去重与UNKNOWN处理保持。现有CLI/网页无需换操作方式；原始裸命令需接收凭据才能被新版设备接收。

局部：`npm.cmd --prefix packages/core run test:time-lease`；设备偏差/进程重启/拒绝：`node tools/check-time-lease-device.mjs YOUR_DEVICE_SERIAL evidence/time-lease/新目录`；原生接收器：`node tools/check-android-inbox.mjs YOUR_DEVICE_SERIAL evidence/time-lease/另一新目录`。所有入口只合成，不新增真实呼叫。

验收顺序已按D023改为安卓/共用优先，iPhone最后。下一步骤5可推进安卓受控真实任务适配的本地授权模型（受控目标白名单、次数/期限额度、账户/设备绑定与未知占用），先替身回归、默认关闭真实开关；新的实际拨号必须另获具体次数/时段，不复用已耗尽3次额度。生产身份/通信认证、生产策略和长期队列不能省略。


### 受控额度子项已实现，接续联合预检（2026-10-15）

R036/T151～161：TrialBudget纯逻辑及SQLite持久模型已实现，复用Node24内置工具，无新依赖。独立演示 `npm --prefix packages/core run trial:demo`；局部测试 `npm --prefix packages/core run test:trial-budget`；相关回归 `npm --prefix packages/core run test:integration`；全量 `npm --prefix packages/core test`；语法 `npm --prefix packages/core run check`。演示自动结束/清理临时数据库，无需停止服务。

下一小项输入：既有业务任务与版本、实验轮次、可信只读设备快照及明确账户；预期：只有业务规则与额度同时满足才交给合成替身一次；失败：权限未知/撤回、设备改变、资格变化、暂停、过期不交接，交接未知保持占用。须先补集成红灯，再连接；不能把客户端传入ready/qualified布尔值作为信任依据。真实适配尚禁用；真实测试须新明确次数/时段。iPhone最后。


### R037联合预检已落盘（2026-10-15）

ControlledTrial复用既有规则和内置SQLite事务，提交时刷新只读模型，再原子保存业务授权+额度票据；内部替身记录请求并可模拟UNKNOWN/BUSY/明确未提交。recover与reconcile支持待核对恢复及不退款收尾。局部入口：`npm --prefix packages/core run test:controlled-trial`；演示：`npm --prefix packages/core run controlled:demo`；回归：`npm --prefix packages/core test`；语法：`npm --prefix packages/core run check`。本轮实际运行全部通过，无新依赖。

下一步骤5小项：把已验证的联合流程接入独立受控演练页面/API，支持查看轮次剩余额度、提交合成任务、未知核对，显示真实拨号禁用。继续由可信本地配置建立合成轮次，不能让网页任意创建授权或改次数；演练与现有虚拟/USB任务库隔离。补API越权/重复及浏览器闭环后再考虑真实适配。现有真实轮次3次仍耗尽；真实链路另需新明确授权。


### R038受控演练页面已交付（2026-10-15）

/trial与/api/trial/status、/api/trial/command接入TrialWorkspace；默认服务独立SQLite .trial.db，复用ControlledTrial全部联合检查。开发固定模拟时间、一次额度与UNKNOWN，不接受客户端重置。局部 `npm --prefix packages/core run test:trial-web`；回归 `npm --prefix packages/core test`；语法 `npm --prefix packages/core run check`；浏览器 `node tools/check-workbench-browser.mjs`（默认无设备，本次实际已运行）。

下一步骤5小项：把受控流程的模拟设备快照替换为显式USB设备的真实只读预检，拨号输出仍用替身；绑定前后校验设备/账户、失联/撤权拒绝并保留轮次账本。必须明确区分“真机观察+模拟提交”和真实拨号。原生受控传输最后一刻守卫/真实授权轮次尚需后续实现；不复用耗尽的3次许可。


### R039真实观察联合流程（2026-10-15）

新增ObservedTrial独立持久入口，真实设备观察来自既有ADB只读Activity，所有提交由内部FakeDialAdapter处理。绑定创建任务/范围/额度事务已补失败回归。命令 `node tools/check-observed-trial.mjs YOUR_DEVICE_SERIAL 电销卡 evidence/observed-trial/新目录`；局部 `npm --prefix packages/core run test:observed-trial`；回归 `npm --prefix packages/core test`；语法 `npm --prefix packages/core run check`。需设备已连接、匹配APK、允许时段且无活动通话；目录必须新建，不覆盖证据。

下一步骤5小项：将ObservedTrial接入清楚标识的真机观察演练页面/API，沿可信服务设备配置和独立持久库，列实际账户供显式选择；演练额度仍服务端配置，所有输出继续替身。补失联、过期、重启/API字段篡改及浏览器闭环，避免页面把实际通话状态与模拟结果混为一谈。正式真实适配/新许可在后续单独处理。


### R040真机观察网页交付（2026-10-15）

/observed接ObservedTrial；/api/observed/status与command沿原HTTP保护，CLI指定AndroidSerial时创建独立.observed.db与PhoneCapabilities。状态轮询不访问设备；用户明确操作才只读取证。全量263、语法61、浏览器34通过。

局部 `npm --prefix packages/core run test:observed-web`；回归 `npm --prefix packages/core test`；语法 `npm --prefix packages/core run check`。浏览器在PowerShell设置 `$env:DIALER_OBSERVED_SERIAL='YOUR_DEVICE_SERIAL'` 和 `$env:DIALER_OBSERVED_ACCOUNT='电销卡'`，然后 `node tools/check-workbench-browser.mjs`；测试使用独立数据库，不消耗日常页额度。AndroidSerial旧完整合成接收测试可分开运行。

下一步骤5小项：安卓原生端提交前守卫，先实现受控命令的设备/指定账户、权限、系统占用、期限与持久防重检查，并提供仅检查、不调用电话API的dry-run路径；补构建/守卫回归及S23证据。当前主机快照到实际提交之间仍存在状态变化窗口，不能用网页通过替代原生最终检查。真实调用与新次数/时段授权另行明确。


### R041原生检查已完成（2026-10-15）

DeviceGuardActivity严格dry-run命令、安装key、实际权限/指定账户/系统占用、设备期限、SQLite防重；DeviceGuardRules共用Java测试。没有真实号码/电话API。

构建：`pwsh -NoProfile -File tools/build-android-local.ps1 -ExistingTools -RecordPrefix <新前缀>`；lint加`-Lint`。本轮必须用pwsh（PowerShell7），Windows PowerShell5会把JAVA_TOOL_OPTIONS标准错误提示当异常。JVM编译：`.tooling/java/jdk-17.0.20.1+1/bin/javac.exe -d .local/guard-classes prototypes/android/app/src/main/java/com/mantou/salesdialer/spike/DeviceGuardRules.java tools/DeviceGuardCheck.java`；运行同JDK java.exe `-cp .local/guard-classes DeviceGuardCheck`。设备：`node tools/check-native-guard.mjs YOUR_DEVICE_SERIAL 电销卡 evidence/native-guard/新目录`，只检查不拨号。

下一步骤5：为主机ControlledTrial/ObservedTrial新增受限原生dry-run交接契约，将已持久业务attempt/轮次票据与命令摘要、安装身份和回执绑定；严格回执校验、丢失未知不重放，先替身再S23。仍不调用电话API；原生检查目前没有企业任务版本/次数，不能直接转换为真实适配。


## R042实施完成与下一小项（2026-10-15）

NativeGuardAdapter生成受限命令；ControlledTrial和SimulationEngine在既有持久业务/额度后提交；AdbGuardTransport验证APK/设备/安装身份并扣减期限。新增native-guard-link.test.mjs与tools/check-guard-link.mjs。未新增依赖，原生源码/APK未改，沿用已验证构建。

局部：`npm --prefix packages/core run test:guard-link`；相关回归：`npm --prefix packages/core run test:integration`；全量：`npm --prefix packages/core test`；语法：`npm --prefix packages/core run check`。
手动S23无拨号入口：`node tools/check-guard-link.mjs YOUR_DEVICE_SERIAL 电销卡 evidence/guard-link/新的唯一目录`，须工作时段/设备空闲，使用独立合成SQLite。当前网页不使用该新适配。

下一步5：将本关联接入/observed；首次显式绑定同时持久安装身份，后续不静默改绑；页面显示“原生检查就绪/待核对”，不显示“已拨号”；故障保留占用。先HTTP/浏览器替身与恢复测试，再S23无拨号E2E。缺真实身份、号码输入与电话授权仍不启用外呼。


## R043已交付：观察网页接入原生检查

ObservedTrial持久安装身份并固定输出模式；workbench-cli通过createAdbGuardFactory配置原生检查；观察页分别显示真实手机状态、原生检查和合成业务记录。历史绑定不自动迁移或清除。测试覆盖HTTP、SQLite重开、失回执、身份变化以及34项Chrome/S23检查。

局部命令：`npm --prefix packages/core run test:observed-native`；全量：`npm --prefix packages/core test`；语法：`npm --prefix packages/core run check`。
浏览器真机无拨号E2E：PowerShell设置 `$env:DIALER_OBSERVED_SERIAL='YOUR_DEVICE_SERIAL'`、`$env:DIALER_OBSERVED_ACCOUNT='电销卡'`，移除DIALER_ANDROID_SERIAL后执行 `node tools/check-workbench-browser.mjs`；独立合成库，不占用日常轮次。需空闲、USB调试和已批准APK，原工作时间内执行。

下一步6：集中验收当前安卓无拨号软件子范围，核对实际入口、业务约束、原生检查、持久回执与恢复证据，列出真实拨号适配/权限异常/生产身份等必需缺口。此验收不等于原始双端产品完成；发现代码缺陷回5，手机环境证据回2，iPhone最后。


## 步骤6后的实现顺序（2026-10-15）

当前安卓无拨号软件范围已集中验收；下一步5先补受限真实拨号适配的规范/测试对应部分：显式轮次授权（设备、安装、SIM、受控接收端、次数、期限）→同一可信路径守卫与持久提交→真实API结果与观察分开→未知不重放。第一小项为授权交接契约及拒绝测试，先用合成号码标识/记录调用的替身，真实开关继续关闭。此项有输入、允许/拒绝与未知行为，能继续本地实现；实际电话测试前再取得新许可，不因未授权外呼停止全部工作。不得将dry-run READY直接升级为拨号令牌。


## R044完成与下一步（2026-10-15）

新增controlled-call-contract.mjs、controlled-call-fixture.mjs、controlled-call-port.mjs、controlled-call-demo.mjs及41项测试。纯契约/记录端口没有真实号码输入、依赖安装或手机操作；网页与既有dry-run链路不变。

运行：`npm --prefix packages/core run controlled-call:demo`；局部：`npm --prefix packages/core run test:controlled-call`；全量：`npm --prefix packages/core test`；语法：`npm --prefix packages/core run check`。

下一步5具体小项：从持久attempt、任务/联系人、既有票据及许可配置组装上下文；同事务执行R044判定、许可已用计数更新和HANDOFF_UNKNOWN，事务提交后调用记录端口。输入是已授权attempt与可信配置ID；拒绝不得调用；崩溃/失回执必须待核对，重启与并发不重复交接。先SQLite故障点和竞争回归，再考虑受限原生真正拨号入口，不重复扩展纯判断测试代替连接工作。


## R045完成（2026-10-15）

ControlledCallCoordinator已连接纯契约与持久任务/TrialBudget；保存不可变许可范围，不另计已用次数。输入仅三个ID，单事务扣额/保存票据/交接未知后调用记录端口，回执与人工核对独立持久。20项专项、347全量、73模块语法通过。

局部：`npm --prefix packages/core run test:controlled-call-claim`；持久演示：`npm --prefix packages/core run controlled-call:claim-demo`，自动在项目.local创建独立SQLite并退出，首次失回执后重开不重发；全量：`npm --prefix packages/core test`。

下一步5：实现默认关闭的原生受控电话提交入口，将既有真实拨号原型的最终权限/SIM/忙线检查与持久提交账本组合；明确本地真实许可和号码解析边界，缺许可保持拒绝。先用电话系统调用的记录替身验证一次提交和未知不重放，再项目内构建；未取得新许可不得用S23实际呼叫。不要继续仅扩大原生dry-run展示代替真实适配代码。


## R046原生源码与构建已完成

ControlledCallActivity（默认禁用）、ControlledCallExecutor（同份代码供JVM测试）、tools/ControlledCallCheck.java已实现；placeCall前原子原生SQLite扣次/UNKNOWN，最终复查后调用，失败不重放。私有许可要求新的明确审批引用/token、安装/账户/目标、墙钟和设备单调期限；本轮无有效许可文件。

复现测试：项目JDK的javac编译ControlledCallExecutor.java与tools/ControlledCallCheck.java至.local/native-call-classes，然后java -cp .local/native-call-classes ControlledCallCheck；实际完整命令/版本见evidence/native-call/javac-green与jvm-green。构建：pwsh -NoProfile -File tools/build-android-local.ps1 -ExistingTools -RecordPrefix 新前缀；lint增加-Lint。本轮均成功，27断言，0错误10原有警告。

下一步5：补主机受限传输和原生显式核对。先定义从业务attempt/票据生成严格受控命令及回执映射，不扩大当前TEST_FIXTURE为真实许可；真实号码只从已授权本地配置解析。原生核对需核查权限/系统空闲并保持次数不退，解除对应占用，不能清库求通过。先替身与无拨号拒绝测试，再安装新APK并更新服务批准指纹；真正试打仍需新许可。


## R047协议子项完成；下一项仍为步骤5

新增packages/core/src/native-call-protocol.mjs及test/native-call-protocol.test.mjs。局部命令：`npm --prefix packages/core run test:native-call-protocol`；已纳入test和test:integration。全量`npm --prefix packages/core test`实测378/378；`npm --prefix packages/core run check`底层语法检查实测75文件通过。命令只运行Node内置工具，不安装依赖。

尚需实现受限USB发送及回执读取：可信本地许可/安装账户绑定、短期设备lease、secret日志脱敏、交接前持久UNKNOWN、失回执只读核查不重发。接着实现原生按scope/token摘要/明确空闲核对，只关闭匹配请求且不退次数，并处理晚到回执不重开已核对请求。R045目前仍仅接受TEST_FIXTURE和记录端口，不能直接接到真实发送器。


## R048已落盘：受限USB传输与原生显式核对

新增AdbControlledCallTransport（显式本地配置、SQLite发送屏障、设备lease、只读回执、脱敏runner、显式核对），新增ControlledCallDatabase/ControlledReconcileRules/ControlledReconcileActivity。ControlledCallActivity提交时保存原命令和token摘要，complete保留RECONCILED终态。schema1升2仅加列；两个真实相关入口默认禁用。

局部：`npm --prefix packages/core run test:controlled-usb`（传输12＋协议31）。全量：`npm --prefix packages/core test`；语法：`npm --prefix packages/core run check`。Java具体javac/java命令及17.0.20.1路径见evidence/native-reconcile/{javac-green,jvm-green,call-javac,call-jvm}/run.json。Android：`pwsh -NoProfile -File tools/build-android-local.ps1 -ExistingTools -RecordPrefix 自选新前缀-`；lint增加`-Lint`。命令记录不可覆盖旧证据。

下一项步骤5：将R045协调器拆出明确的真实受控许可分支，复用最新资格/版本/时段/额度和同事务UNKNOWN；持久保存R047原命令供重读与核对，真实端口不能接收TEST_FIXTURE。原生核对成功后才进入主机显式核对事务；核对回执丢失只重查/重核对，不重发电话。先合成替身覆盖两端不同步/任一步崩溃，然后无拨号设备验收。当前新增库没有网页/CLI真实呼叫入口，不能仅凭构造器示例启用外呼。


## R049协调器连接完成（本地代码与替身范围）

新增local-controlled-call-coordinator.mjs及local-controlled-call-demo.mjs。端口新增binding和readControlledDevice，协调器从可信只读快照及持久业务状态决策；TrialBudget区分轮次source但保留单一业务计数。SimulationEngine普通核对/观察阻止受控尝试绕过原生核对。

运行局部：`npm --prefix packages/core run test:local-controlled`；全量：`npm --prefix packages/core test`；语法：`npm --prefix packages/core run check`。可运行演示：`npm --prefix packages/core run local-controlled:demo`，创建项目.local/controlled-local-demo-*独立数据库并自动退出；不调用设备、不读取真实许可。实测一次记录提交、丢失回执后重开不重发、显式替身核对后FINISHED且used=1。

下一项步骤5：补隔离的Android数据库fixture/断言工具，使用单独测试数据库，复用真实schema迁移与complete/核对事务实现，覆盖T240。先构建，再检查S23实际连接/空闲和旧Probe状态，协调无拨号安装及服务指纹更新。不得为准备fixture启用真实拨号组件或创建有效真实许可。通过设备证据后进入步骤6局部验收；真实试打仍需新的明确次数/时间许可。

尚缺正式生产身份、手机号输入/映射与生产配置入口；现有本地协调器仍使用合成业务标识及显式开发政策。不将当前库接口直接公开为HTTP真实外呼。主机UNKNOWN而原生无行的情况继续待核对，后续必须取得确定未提交证据，不能自动重发。


## R050原生隔离工具及S23证据完成

ControlledCallDatabase现在承载共享claim/complete/reconcile事务，两个实际Activity调用同一实现。src/debug的NativeDatabaseCheckActivity只操作随机独立测试库；tools/check-native-database.mjs运行真机无拨号检查并保留回执。没有新依赖。

项目根运行：`node tools/record-core-run.mjs evidence/自选新目录 R-CALL-050 node tools/check-native-database.mjs YOUR_DEVICE_SERIAL`。要求已连接S23、匹配本地APK、手机空闲、旧Probe暂停/仿真/未armed。命令自动退出，保留独立测试库；不能重复使用既有evidence目录。首次安装/构建按manual-steps与现有工具核对，不自动启用实际电话入口。

本轮native-db-check-final-android-assemble/lint退出0（0错误10原有警告）；S23 SQLite36断言、浏览器真实dry-run34项通过。核心JS未改，复用412/412回归记录而非冒称本轮重跑。网页服务已恢复，旧数据库不重置。

下一步先步骤6整理R044～R050当前受控子范围验收，不把原Android+iPhone目标判为完成。后续步骤5仍需面向销售的受控任务操作入口、明确未提交证据的核查路径，以及生产身份/名单手机号映射；实际权限撤回/来电占用等设备证据回步骤2。真实新试打须明确新增次数/时间，iPhone最后。


## R050步骤6复核完成；下一步5直接交付操作入口

审计85 core＋21原生/工具/包摘要一致，412回归/36原生/34浏览器证据复用，当前手机APK匹配且网页200。README和project-brief已重整，旧全文归档，避免顶部旧结论误导。没有新增同类底层测试或真实电话。

首个实现小项：受控任务操作台连接LocalControlledCallCoordinator，显示绑定/许可额度/任务状态/接口提交与人工结果/待核对原因；提供只读刷新回执和显式核对。输入为可信会话身份与已保存attempt/permit，不接收客户端手机号/额度/成功声明；失败保留待核对并显示原因，不重发、不退次。先用记录端口/独立合成数据库验证可操作闭环，再对已有授权的设备无拨号核查。真实发送按钮缺独立许可或生产策略时禁用，不用新的仿真页冒充真实闭环已验收。

接续仍需生产身份与真实名单手机号映射、主机已UNKNOWN而原生缺行的确定未提交核查方案；实际撤权/来电竞争/强杀补步骤2；iPhone最后。既有资格声明、销售自助、时间/重拨规则无需再问。


## R051受控任务页面已交付

新增controlled-workspace.mjs、web/controlled.html/mjs及7项HTTP/SQLite测试；现有server/CLI挂载/controlled，主页新增导航。可信身份和permit由服务构造注入，客户端无发送/授权参数；当前CLI实例来自独立createControlledDemo，run设备方法硬拒绝。

启动沿用README；入口http://127.0.0.1:8787/controlled。操作：选择已有尝试→查询回执→确认无活动通话并选择人工结果→核对结束。演示使用冻结时钟，核对后无自动新任务/补额/重置。真实记录配置还未挂载，不能把演示当试点。

局部：`npm --prefix packages/core run test:controlled-workspace`；新页浏览器：`npm --prefix packages/core run test:controlled-browser`；全量：`npm --prefix packages/core test`；语法：`npm --prefix packages/core run check`。浏览器脚本使用新独立测试库，真实电话0，不更改用户正在查看的工作台记录。

下一步5：增加受控记录来源的明确本地配置加载和只读检查，将通用ControlledWorkspace连接指定真实记录库/已有许可绑定；不自动升级demo库、不在网页接收secret/手机号、不开放新发送。先验证缺配置/过期/错设备/错库与真实记录展示，未知仍待核对。其后再补确定未提交核查、生产身份/名单及受控新试点条件；新增电话需当次授权。


## R052显式只读记录连接已实现
新增src/controlled-records.mjs、test/controlled-records.test.mjs；CLI增加--controlled-config，复用/controlled页面，真实模式全部变更禁用。无新依赖。测试命令见README R052段。
下一步5：为真实只读记录提供“查询手机已有回执”，仅匹配已持久的attempt/command digest及已有发送账本，用只读方式打开，不构造会创建许可/账本的发送端口；读取前后校验设备/安装，缺失/断开保留UNKNOWN，不重新提交、不解除占用、不创建授权。先隔离合成夹具验证及浏览器入口；实际受控库未准备时保留未运行。其后仍需确定未提交核查、生产身份/真实号码映射和新受控试点。


## R053只读回执接入完成
controlled-records.mjs增加发送行只读核查、refresh及独立观察，CLI注入createControlledReceiptReader，复用已有页面按钮。没有新依赖、没有原生改动。局部npm --prefix packages/core run test:controlled-records；全量npm --prefix packages/core test；语法npm --prefix packages/core run check；浏览器node tools/check-controlled-browser.mjs --records（均项目根）。
下一步6：复核R051～053操作台子范围的当前源码/证据与运行命令，整理真实受控试点的实际缺口和可执行操作，不能把替身回执当真机验收。然后根据缺口回5实现生产身份/真实名单映射，或在新增通话授权和记录配置就绪后回2验证实际链路；iPhone最后。不要再重做只读页面或同类摘要测试。


## R051～R053步骤6完成；下一实现小项
下一步5：销售自助真实名单/号码映射的本地闭环。先补现有规范中的输入格式/号码解释最小可实现部分；仅接受可信会话自己的销售归属，保持企业隔离，按现有资格/拒绝/去重规则保存。合成工作台不自动切成真实线路，真实数据放忽略的独立本地存储，输出脱敏；未定语义逐行标记未处理，不猜测线路可用性。失败输入可观察且不创建可拨任务；不导入用户真实名单来运行测试。用合成标识/明确虚构号码夹具验证后，再接页面操作。生产登录与手机发送仍独立必需，不为本地输入完成宣称生产上线。


## R054已完成；下一步5名单到任务计划
新增ContactWorkspace、/contacts页面、8测试、browser/live检查工具，复用Node内置SQLite与原HTTP保护，无依赖。启动后数据在忽略目录workbench.db.contacts.db，局部`npm --prefix packages/core run test:contacts`；浏览器`node tools/check-contact-browser.mjs`。
首个后续小项：从当前销售自己的已导入联系人建立持久任务计划，并在页面显示可执行/阻挡原因；复用已采纳周一至周五09–18东八区、资格/拒绝与修订/计划版本守卫。计划不发送，真实号码不转成SYNTHETIC任务冒充真实接线。拒绝/资格撤回后旧任务失效，重复操作不制造重复意图；失效/未知规则与共用规范一致。先测试替身验证，不接手机。生产身份与真实受控外呼仍后续必需。


## R055完成；后续最小任务闭环
新增contact-plans.mjs及8测试，复用ContactWorkspace数据库和HTTP；页面同处/contacts。局部npm --prefix packages/core run test:contact-plans；浏览器node tools/check-contact-plans-browser.mjs。计划表增量创建，旧名单/拒绝不迁移或清空。
下一步5：将已保存计划接到独立的记录适配器执行检查/尝试闭环，复用已有共用规则（时间、版本、资格、占用、幂等、未知恢复），不要把真实目标改名SYNTHETIC来绕过来源隔离。先明确本地演练尝试来源与可注入时钟/记录端口，再接页面人工检查；任何本地演练不得变成真实电话授权。真实适配、生产身份与新受控许可继续独立待验证。


## R056完成；下一步定时与人工竞争
ContactAttempts在原名单库新增local_rehearsals，ContactWorkspace/ContactPlans接入权限、查看与待核对改计划保护；页面复用/contacts。内部记录端口无电话/网络调用，复用eligibility和dial-window。局部npm --prefix packages/core run test:contact-attempts；浏览器node tools/check-contact-attempts-browser.mjs。
下一步5：为同一闭环增加显式开启/停止的本地定时演练，默认停止，人工与定时争用同一计划版本去重。先用可注入时钟验证到点/旧计划/暂停/占用/重启不补拨，复用尝试持久入口，不再复制状态机或另开页面。真实外呼关闭；不自行引入生产迟到宽限，开发参数明确标注；200条先记录链路验证，不对客户批量拨号。


## R057完成：下一步5同一路径200条容量及计数
新增contact-timer.mjs（默认停止）并复用ContactAttempts；局部 npm.cmd --prefix packages/core run test:contact-timer，页面检查 node tools/check-contact-timer-browser.mjs。无新依赖。
下一最小项：用200条合成格式记录在独立数据库贯通导入→计划→定时本地演练→显式核对→下一条，检查忙线/跳过/重复/暂停和重开。给/contacts加入来源明确的本地记录计数，区分不同目标、记录尝试、实际呼出和接通，后两者缺证据不可填成功。复用既有账本，先测试，勿引入第二套调度状态机。单批200不是日硬上限；真实号码、手机、生产时效、企业认证保持待验证。


## R058完成：进入步骤6验收名单闭环子范围
本轮复用原SQL账本计算当前销售全部历史计数；200条独立合成记录闭环与重复/暂停/忙线/重开验证已完成。局部 npm.cmd --prefix packages/core run test:contact-capacity；完整容量入口test:capacity也已加入本测试；浏览器node tools/check-contact-attempts-browser.mjs。
下一步6：集中核对R054～058名单→计划→本地尝试/定时→核对的证据与当前源摘要，复用有效回归，不重复真实电话。审核隔离/来源边界及安装启动手册；只对该本地子范围下结论，整体产品保留生产身份、正式Android接线及iPhone缺口。


## R054～058步骤6已完成；下一步5可信Android预检查
本地子范围通过，见acceptance及evidence/acceptance-r058。下一小项输入：可信销售、本人目标/计划版本、项目内设备/SIM绑定配置；输出：脱敏目标、绑定状态、当前资格/版本/时段/设备/安装/SIM/空闲检查与阻挡原因，始终不产生拨号或消费许可。失败：身份/版本/绑定/状态缺失即阻挡，未知不推断成功。先复用现有映射/协议/检查组件，测试替身验证目标错配、陈旧状态、权限撤回和双卡变化，再决定如何与真实适配接口衔接。不得放宽LOCAL_RECORDING或SYNTHETIC来源校验；生产认证另有缺口，不能伪称已接入。


## R059完成：预检查规则与页面，下一步5配置/只读provider
新增ContactPreflight复用PhoneCapabilities；Workspace支持可信androidPreflight构造依赖，HTTP仅planId/version，原页面显示结果。未改原生/拨号端口或来源规则。
下一小项5：把项目内忽略配置加载与既有AdbSyntheticTransport.inspect/readPhoneCapabilities接到该构造接口，严格验证配置字段与可信actor，启动默认无绑定；无发送端口、无许可创建。补配置非法/错误APK/断连及重启检查，具备设备时做只读观察，不创建用户名单来凑测试。当前CLI缺配置阻挡为预期；正式真实适配和企业身份仍后续必需。


## R060已完成；下一步5可信目标映射准备工具
CLI已接固定.local/contact-android.json与USB只读provider；测试入口npm.cmd --prefix packages/core run test:contact-config。当前运行配置未创建，因为用户联系人/计划为空。S23只读provider已实测，不能替代目标计划E2E。
下一小项：提供项目内可信配置准备/验证工具，读取现有联系人ID与所有权、重新读取设备/指定SIM，预览脱敏目标/设备映射并显式保存；不能使用过期观察自动绑卡、不新建客户数据、不通过HTTP设归属。先独立库验证错目标/配置覆盖/重启行为，再接真实存在的用户目标。暂未有实际目标时保留未配置，真实发送仍另需许可。


## R061完成；下一步目标级只读E2E
新增contact-binding-setup.mjs与tools/prepare-contact-binding.mjs，使用只读SQLite与既有provider。预览不写，保存需相同预览标识且重新观察，已有配置拒绝覆盖。当前真实目标未选定，保持未配置。
下一步2（只读探索验证）：经mantou选择已有联系人或明确授权加入受控测试联系人后，预览→核对→保存→重启→网页只读预检查，记录真实目标/设备/SIM绑定证据，保持电话0；当前不需要新增通话许可。若发现实现缺陷回5；之后步骤6验收R059～061子范围。正式拨号及企业认证仍有独立缺口，iPhone最后。


## R059～061步骤6通过；下一步5本人计划的受控真实尝试授权
首个小项：为本人target/plan/version对接受控许可与持久尝试记录。输入必须是独立、显式的受控许可（目标/销售/设备/SIM/时段/最大次数）及当前计划；缺许可、旧版本、资格撤回、过时、暂停/占用均拒绝。提交前持久记录未知占用/额度，重复意图或相同计划版本只授权一次；提交后丢结果禁止重放。
先梳理复用现有TrialBudget/LocalControlledCallCoordinator/原生协议中的纯守卫与记录接口，以测试替身验证，不把真实TARGET重命名SYNTHETIC，也不放宽LOCAL_RECORDING来源边界。原三个电话许可已耗尽，不能从只读绑定或资格CONFIRMED推导通话许可；当前实现默认缺许可且禁用真实发送。真实适配连接与新授权是后续受控试验前提。


## R062预留账本完成；下一步5核对/回执契约
新增ContactControlledLedger及Workspace可信reserveControlled入口，CLI不注册许可，HTTP不开放预留。数据库复用现有资格/计划/时段守卫，并增加受控与演练互斥；没有手机调用或新调度器。
下一小项5：建立受控预留的结果/明确核对契约与只读展示，区分未提交、已提交未知、实际呼出/接通证据、人工结果；未知不能靠本地演练完成按钮解除或退额度。先替身测试可信回执关联、错设备/错attempt拒绝、重复回执及核对条件；继续保留真实发送禁用。然后再接原生受控发送与新当次许可，不能用历史3通或只读授权充当许可。

## R063当前实现与后续
已交付可信受控协调器、持久原生命令/回执/人工结果、原生核对后释放与页面只读状态。505回归/106语法/16浏览器通过。开发入口与局部/回归命令见README的R063段，证据evidence/contact-coordinator。旧演练定时器不接此端口。
下一实现小项：取得新当次许可后准备原生/宿主同范围会话，使用既有原生debug组件进行2次以内受控手动闭环；必须保存许可范围、设备、命令、回执和用户观察，结束关闭组件。禁止把构造参数或旧授权当新许可。再按证据补真实定时/多目标队列与恢复，企业生产身份后续补齐。D025：iPhone当前暂缓。

## R064实现结果与下一小项
已实现正式30秒时限（D027）、同库唯一计划版本持久票据、未来快照、多个目标独立协调器、停止/暂停/资格/旧版本检查、USB lease截止传递。复用R062/R063，不修改原生Java。自动测试入口改为test/*.test.mjs，避免人工清单漏掉新增测试；局部和仿真命令见README。
下一小项5：可信多目标运行配置与生命周期管理。输入为现有目标/设备/SIM绑定及逐目标独立许可；校验同库同销售/不重复/额度与有效期；无配置/许可默认停止。开启、停止、状态读取与计划变化明确；先隔离库/电话替身测试，再提供开发者运行入口。不得把已耗尽D026许可恢复成批量授权。真实后台/锁屏定时E2E需要新的受控额度，届时集中请求；iPhone继续暂停。

## R065已实现；下一小项
可信配置加载、已有协调器引用匹配、启动前资格/预算/有效期检查、状态/停止/显式重载/关闭、配置变化检查点停止已经实现。CLI可交互操作双目标仿真，实际主项目status只读显示缺配置。未接真实多目标原生许可切换，不启用组件。
下一小项5：工作台接运行状态和操作界面，先配合独立仿真会话验证start/stop、STOPPING、CONFIG_CHANGED、待核对和显式重载。主库无可信运行会话时明确显示不可开启，不让HTTP注册许可/选择任意端口。然后在独立许可范围内准备实际多目标设备端许可切换及受控定时E2E（新通话需新授权）。iPhone暂停。

## R066完成；下一小项
工作台运行状态与仿真start/stop/reload已接入，缺会话/停止中/配置变化/未知占用有明确提示。独立网页仿真可运行；主库没有真实运行实例，页面启动保持禁用。HTTP只接受既有可信实例上的有限控制，不注册许可或启用真实发送。
下一小项5：原生多目标许可切换与运行就绪检查。现有Android实际组件只读取一份受控permit文件；必须明确同设备上一attempt已核对、下一目标/号码与宿主许可匹配、保留各permit次数、安装/卡/时钟一致，再安全准备下一许可。先纯配置/USB替身和故障恢复测试，交付检查/准备入口；缺新真实许可时不写真实许可、不启用组件、不拨号。具备授权后才做正式定时多目标E2E。iPhone暂停。

## R067完成的边界及下一实现项
原生文件字节/范围、双边额度、核对状态、设备/单调时钟就绪检查与合成CLI已实现；并未部署许可。下一步骤5：可信只读采集器从设备获取组件/许可/原生账本快照，验证失败/断连不返回READY；随后设备互斥门、原子部署/回读和持久切换日志，用故障替身验证崩溃后不自动重写或发送。需要真实新许可时再集中请求，iPhone暂停。

## R068完成；下一小项5
只读USB采集器和S23真实取证完成。接下来用替身实现设备互斥门及持久许可切换日志：持锁重采集→原子替换→回读摘要→保持组件禁用；断连/崩溃后标待核对，不自动重写或触发电话。同permitId保留原始字节和额度，不能以新文件重置。先本地故障注入和恢复入口，再在有明确新许可时部署真机；iPhone暂停。

## R069完成；下一项5
持久日志、协作进程互斥、未知保持、明确只读恢复及合成文件演示完成。下一项接真实USB部署适配的无写入预览/故障替身：核对固定设备路径、候选原始字节、当前许可摘要、组件禁用和截止；将部署与发送端纳入同一设备门后才开放受控写入。现有prepare-contact-controlled-session历史专用脚本不能用于自动多目标队列。没有新真实授权时只进行预览/替身，不部署许可或拨号，iPhone暂停。

## R070已完成；下一项5明确为共用设备门
无写入预览与固定路径只读CLI完成；当前缺活动会话按预期拒绝，真实成功预览未运行。下一项不重复增加预览层：抽出持久DeviceGate，将AdbControlledCallTransport.submit/reconcile与NativePermitSwitch.prepare/reconcile纳入同一项目级日志。提交未知时保持占用，核对成功才释放，设备身份变化/多进程/旧日志迁移需回归。先替身，未具备共同互斥前不开放真实部署。

## R071已接通；下一项5
发送与切换已共用DeviceGate，双向集成通过；不再保留两个完全独立的互斥域。下一小项：只读审计/恢复前置入口，列出旧日志无核对字段、门孤儿记录和宿主/原生证据关联，既有两通历史记录只读核对后才能决定迁移，禁止直接清锁。随后接真实USB原子部署适配，维持新许可不足时不写设备。

## R072审计已完成；下一项5
当前2条历史记录匹配情况已明确，未发生迁移。下一步接真实USB部署适配及迁移前置：以当前设备记录（包含request/digest/status）和宿主完成记录为条件，在共用门保护下准备旧核对标记迁移；先故障替身，禁止归档直接解锁。随后固定路径原子替换/回读接现有切换日志，无新许可不执行真实部署/拨号。不要另建平行审计系统。

## R073迁移已完成；下一项5
S23两个旧记录已在当前原生证据下完成本地迁移，旧全目录屏障已解除，额度仍已耗尽。下一小项直接实现真实USB许可部署适配（固定路径暂存、检查旧摘要、原子替换、回读）并接R069/R071，先USB命令替身/断连/过期/未知恢复测试，不再重复历史审计。无新明确许可时不实际部署新许可、不拨号；iPhone暂停。

## R074完成与下一项
2026-10-16 R074（F005/008/011/012）：USB许可部署端口接入持久切换与设备门，T455～463通过。Node24.18.0；609/609全量回归、135模块语法、9项局部测试通过，退出0。evidence/adb-permit-deployment保存命令、版本、退出码和源码摘要。仅软件替身子范围通过；真机部署/定时自动队列未验收，iPhone暂停。
下一项步骤5：将当前受控会话、候选原始字节和R074组合为单一命令入口；默认预检，显式部署要求匹配的新授权引用/设备/号码/次数/有效期，并复用主库门。完成组合入口的无授权拒绝、过期、摘要变更和写后未知测试后，进入步骤2/6的S23受控部署及定时闭环验证。不要重新实现另一套队列。
局部：node --test --test-reporter=tap packages/core/test/adb-permit-deployment.test.mjs
回归：npm --prefix packages/core test
语法：node tools/check-core-syntax.mjs

## R075组合入口已实现
默认预检与受控部署共用当前会话/主库校验，持门后重新加载，复用现有队列及日志。下一项步骤5：替换历史prepare脚本的固定旧授权引用和直接push/cp，抽取仅本地准备当前会话/候选的可测试入口，禁止准备阶段自动部署。准备→本轮默认预检→显式部署→既有定时发送形成同一路径。随后凭新的有限真实通话授权进入步骤2/6；iPhone暂停。
本轮没有真实部署，不将软件测试算作手机验收。

## R076完成
2026-10-16 R076（F005/008/011/012；T476～486）：会话准备已改为本地登记/候选发布，删除固定旧许可引用、自动改计划和直接push/cp/组件修改。Node24.18.0，11项局部及632/632全量回归、139模块语法通过，退出0。evidence/controlled-session-preparation保存命令/版本/退出码/源码摘要。当前--prepare-local在APPROVAL处拒绝退出1，未访问手机、未改主库或生成新会话。另行adb devices确认S23已连接，仅连接证据，不代表空闲或线路通过。
本地准备→当前会话预检→显式部署的软件路径已经接通。下一步步骤2/6，以新授权运行S23受控定时验证；无需再添加平行预览层。手机故障按具体复现回步骤5，iPhone不推进。

## 当前下一项（真实闭环之后）
R076已完成S23受控宿主定时两通验收。继续步骤5：将本轮.local/run-controlled-timer.mjs和收尾逻辑收敛为可启动/停止的正式入口，复用ContactControlledSchedule及已有部署日志；覆盖无授权、停止、进程退出、待核对、唯一归档，不自动新增电话。独立手机任务调度/更多设备另按实际证据推进，iPhone暂停。

## R077完成；继续步骤5
2026-10-16 R077（F005/008/011/012；T489～499）：正式定时运行命令及停止生命周期已实现。Node24.18.0；11项局部、645/645全量回归、142模块语法通过，退出0。evidence/controlled-run保存实际命令、版本、退出码与源码摘要。当前status退出0/STOPPED，start-approved退出1（无活动会话），未访问手机、未新增电话、未改用户主库。
下一小项：正式化stop后的恢复与会话收尾命令，按真实状态处理NEEDS_RECONCILIATION/崩溃残留，核对原生许可和已完成记录后关闭许可、唯一归档会话并释放运行owner；不要删除证据或重放提交。先本地故障测试，无需新电话。iPhone暂停。

## R078完成后进入步骤6
正式关闭/同ID恢复入口及门审计接入已完成。下一步先做启动、停止、待核对、关闭、归档的离线组合验收；补齐该组合必需的故障证据，具体缺陷回步骤5。真实新工具仍需单列真机证据，当前无新电话授权。无会话的未知owner继续保守拒绝，不自动删锁。iPhone暂停。

## R079后下一项
模块级完整链路已通过，提前关闭死锁已修复。下一步6补正式CLI进程启动/停止/退出及重启恢复的离线组合测试，区分正常停止、强杀残留和手机断连；发现实际缺陷回5修复。现有模块测试不重复做一套。暂无新通话许可，iPhone暂停。

## R080后下一项
正式运行器实际子进程停止、竞争、强杀残留、配置变化已通过，671项回归/149模块语法通过。下一步6补关闭CLI接续强杀残留的离线成功/中断恢复组合；不重复R079模块故障注入。之后按环境与授权条件执行新工具真机成功路径/USB断连。本轮没有生产代码变更，不新增依赖；iPhone保持暂停。

## R081完成：下一步2补平台证据
关闭CLI已接续实际SIGKILL残留并完成同ID恢复；673/673回归、152模块语法通过。当前离线运行器→关闭进程验收完成，不继续重复同类替身场景。下一项只读核对S23连接/安装/禁用状态；真实新命令成功关闭与USB断连需要完整当前会话和设备证据，历史耗尽许可不恢复。独立手机全天队列仍待验证/实现；iPhone暂停。具体操作和回传日志见manual-steps R081。

## R082后的当前实现优先级（覆盖上方接续建议）
正式电脑+USB运行器的正常真机提交、未接核对和关闭归档已完成；下一步5优先核对现有安卓原生定时器/账本，选择不依赖新增电话授权的“手机端独立任务闭环”首个明确小项，用仿真适配和本地测试实现。保留原业务时段、销售手动重试、30秒执行窗口和未知不重放，不将电脑USB受控测试当独立手机产品完成。
真机USB断连/进程异常恢复仍作为T530待验收项，在步骤2/6按环境与许可补证；不必因此停止共用和安卓软件开发。当前无活动会话、无剩余电话授权。iPhone暂停。

## R083实现增量
手机独立模块standalone新增TaskEngine、AtomicFile本地状态及人工仿真界面；复用既有Java17/AGP8.13.2，不增加依赖。当前第一小项是手机内3/200合成任务、版本/暂停、拒绝联系、防重占用、结果来源分离和重开恢复。不是正式原生拨号队列，真实联系人导入/租户、显式重试、原生自动定时和电话适配未接入。
直接命令：pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test；-Mode Build构建APK并lint；node tools/check-standalone-device.mjs --run用于空演示库且已解锁S23的人工UI回归。不得为重跑检查自动清除已有演示数据。
下一小项5在此独立模块接入原生单次定时仿真（仍不拨号）：计划版本、30秒执行窗口、暂停撤销、后台回调及过期不补发；先固化可观察输入/输出，随后验证手机后台状态。沿用已采纳规则，不从单次成功推断全天可靠。真实电话适配保留后续专门受控验收。

## R084原生定时仿真实现
独立模块新增AppRuntime与非导出TaskAlarmReceiver，任务引擎增加持久单次定时、双时钟/boot检查和schema1→2迁移；UI增加追加演示任务及30秒后模拟下一条。没有真实号码/电话适配。原生非精确闹钟的实际到达时间需真机证据，不以纯规则通过保证准时。测试入口check-standalone.ps1 -Mode Test现在运行旧8组238断言和新增9组24断言；Build继续构建/lint。真机入口check-standalone-timer-device.mjs --run，不清空旧演示历史。

R084接口选择更新：实际非精确闹钟超过观察窗口后，改为setExactAndAllowWhileIdle，显式检查精确闹钟权限和isBackgroundRestricted。真机验收需用户允许闹钟及后台运行、解锁完成UI操作；定时触发本身在桌面后台观察。局部回归：pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test；构建：同脚本-Mode Build；手机E2E：node tools/check-standalone-timer-device.mjs --run。历史库保留，不清空，不调用电话适配。

## R085显式再次尝试实现
TaskEngine.retry(target,expectedVersion)准备已核对且结果明确的合成目标，保存历史、暂停并作废旧定时；UI“选择目标再次尝试”提供目标/上次结果，再由用户重新安排。“查看尝试历史”区分A1/A2等尝试、模拟API回执与核对结果。schema1/2可读，写入schema3；不创建真实适配。
测试/构建仍用check-standalone.ps1 -Mode Test / -Mode Build；Test增加StandaloneRetryCheck。手机入口node tools/check-standalone-retry-device.mjs --run，要求已解锁、暂停、无待核对、有已完成明确结果的合成目标；保留原历史。该脚本当前选择排序早于剩余目标的已完成任务以验证“下一条”，不清库调整现场。

## R087统一提交入口
独立模块新增TaskSubmissionBridge：显式来源、模拟端口/尝试ID、回执事实；MainActivity与TaskAlarmReceiver接入同一桥接。真实来源固定拒绝，无发送器或启用开关。新增只读SubmissionBoundaryActivity及UI检查按钮，忽略外部参数，只写诊断报告。
技术栈/数据格式保持，TaskEngine schema3不变，已有演示历史不迁移。测试入口check-standalone.ps1增加StandaloneBridgeCheck；构建仍assembleDebug/lintDebug离线。真机只读：node tools/check-standalone-bridge-device.mjs --run（可锁屏采集，无UI点击，无任务写入）；原生许可快照：node tools/collect-native-permit.mjs --read-only（会使用原app的只读能力入口，不拨号）。修改人工与定时入口，补原T549/T557手机回归。
真实连接差异见android-submission-bridge.md。后续优先复用已有正式联系人/授权规则建立隔离的手机真实任务模型，不能将DEMO快照自动变成受控真实任务。旧许可/号码授权不复用。

R087诊断隔离修复已通过T573真机失败回归；原受控APK、原生许可、发送组件和账本未变，诊断不作为实时外呼授权。下一小项建立与演示库隔离的正式手机联系人/任务模型，先检查并复用现有宿主规范/校验/ID映射，再以合成fixture验证域/权限/拒绝/版本与尝试身份；模型具备持久与恢复依据后再连接受控适配。保持一步一个紧密相关行为组。

## R088手机联系人模型首项
新增contacts/ContactTaskModel.java：可信Actor上下文、类型隔离的intake、联系人/初始DRAFT稳定ID、同目标去重/销售冲突、资格/拒绝修订与计划前检查、宿主nativeID编码。保持纯Java/Java17，不增加依赖。当前没有联系人Store，也没有真实号码/生产鉴权；符合输入不代表授权。
check-standalone.ps1 -Mode Test增加ContactTaskModelCheck，包含原350断言与新6组36断言；Build继续构建/lint。ContactModelCheckActivity固定内存fixture，忽略外部身份/来源参数，不初始化AppRuntime。手机入口“检查联系人模型”；命令node tools/check-contact-model-device.mjs --run可锁屏取证，校验宿主向量、作用域ID、原任务字节不变与旧APK摘要。
下一小项步骤5为独立SQLite元数据Store和事务/重开验证，先只用隔离合成fixture；复用既有安卓SQLite工程经验，数据类型/版本不匹配不得覆盖或当DEMO导入。需要真实号码与原生适配前再接可信intake/身份，不能把本纯规则当跨进程事务。

## R089手机元数据Store完成与下一小项
ContactTaskStore实现独立SQLite联系人/初始DRAFT/事件，原子导入、归属/能力过滤、唯一去重、CAS资格/拒绝、严格恢复。两连接竞争、5个事务失败点、已提交跨进程重开与未提交中途强停均由S23隔离fixture验证；41组397 Java断言、58真机断言，构建/lint退出0。没有正式名单库实例、生产认证或发送器接入。
命令：pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test / -Mode Build；node tools/check-contact-store-device.mjs --run。源码、边界及可执行前提见android-contact-store.md，证据evidence/android-contact-store-r089。没有修改宿主JS，不重复引用历史673项为本轮结果。
下一紧密行为组继续步骤5：显式刷新过期DRAFT快照，先补R/T输入、期望联系人/草稿版本、PLAN能力、最新资格/拒绝、原子审计和幂等契约，再最小实现/失败回归。不得通过重新导入或恢复自动刷新，不创建尝试或电话授权。完成后再处理计划时间/版本、可信真实名单和有界受控适配；iPhone暂停。

## R090草稿刷新已完成
ContactTaskModel/Store增加显式refreshDraft双修订守卫，schema2新增draft_events、schema1验证及原子迁移、审计链/资格历史恢复校验。保持任务ID和DRAFT，不创建计划或尝试，不隐式刷新。44组414 Java断言，S23 63刷新断言及58联系人回归通过；构建/lint0错误3警告。命令：check-standalone.ps1 -Mode Test / Build；node tools/check-draft-refresh-device.mjs --run；node tools/check-contact-store-device.mjs --run（USB设备顺序执行）。详见android-draft-refresh.md及evidence/android-draft-refresh-r090。
下一小项步骤5：隔离手机任务计划元数据（显式安排、计划版本、暂停/失效/过期），先补输入/失败和时钟契约再实现；复用已采纳工作日北京时间09:00–18:00、30秒执行窗口、无补拨、暂停后明确重排。暂不提交手机电话API，不自动把DEMO转正式任务。生产身份/号码/真实适配后续接入；iPhone暂停。

## R091手机计划元数据完成
SalesPlanModel与ContactTaskStore接入按销售隔离的单个活动计划、时间/双修订/计划版本、暂停/明确重排、过期持久失效及显式恢复门槛；schema3追加事件审计，验证schema1/2再迁移。未接实际定时器、尝试claim或电话。48组444 Java断言、S23计划62断言、草稿63与联系人58相关回归通过，build/lint0错误3警告。命令check-standalone.ps1 -Mode Test / Build、node tools/check-sales-plan-device.mjs --run及草稿/联系人脚本顺序运行；详见android-sales-plan.md。
下一紧密行为组继续步骤5：正式计划的原子尝试claim与模拟提交。先补R/T：消费同一计划最多一次、占用/资格/暂停/时钟在claim前复核、记录未知后才调用测试替身、提交回执与实际呼出/接通/人工结果分开、丢失回执不重放、核对后只能明确下一次。接入recoverPlan冷启动门槛并验证重开/崩溃；仅合成数据，真实适配仍禁用。之后再处理可信号码/身份/实际手机链路，不把DEMO转换授权；iPhone暂停。

## R092合成提交闭环完成
新增SyntheticAttemptModel/TaskLoop、固定SyntheticLoopCheckActivity与S23驱动；Store加入schema4合成尝试/事件、原子消费/占用、回执/结果/明确未知关闭及恢复校验，启动先recoverPlan。52组480 Java断言，S23完整97断言（50目标200显式模拟尝试约1425ms、跨进程恢复）通过；计划/草稿/联系人62/63/58相关回归通过，build/lint0错误3警告。慢持久读取越过窗口有失败回归并修复，一次all超时保留为原因未确认，不能证明全天后台可靠。命令与界限见android-synthetic-loop.md。
下一紧密行为组继续步骤5：可操作的安卓合成联系人/任务工作区，复用同一Store/TaskLoop做输入/选择→安排或立即模拟→结果核对/明确未知关闭→新计划、暂停、历史与分层计数。建立单独标记的持久合成空间，禁止真实号码；不枚举复用随机历史fixture、不创建正式联系人文件。先测试输入/失败/恢复，再S23界面验收；iPhone暂停。之后接可信号码/身份、实际调度与有界真实适配。

## R093可操作合成工作区完成

复用Java17/Android原生控件/内置SQLite，不加依赖。新增SyntheticWorkspaceModel/Session/Activity和固定CheckActivity，Store加入独立类型实例及原子批量导入，MainActivity提供实际入口。计划、版本、结果与恢复复用同一Store/Loop；数据库在后台串行，界面不接真实号码/身份/任意端口。立即计划取时事务内锚定，后续执行仍实时校验。57组510 Java断言、S23 UI驱动30检查、规则21断言和核心闭环97回归通过；50目标200模拟尝试约2062ms。0电话，原DEMO/旧APK保留。

局部测试/构建：pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test / -Mode Build。UI E2E使用node tools/record-core-run.mjs evidence/workspace-ui-new-run R-CALL-093 node tools/check-workspace-ui-device.mjs --run；需新证据目录、手机解锁、实际工作时段与无待核对。隔离规则用相同包装器运行check-workspace-fixture-device.mjs --run（已有用户工作区，可锁屏）。相关回归node tools/check-synthetic-loop-device.mjs --run；USB命令顺序运行。版本/退出码及完整操作见android-synthetic-workspace.md，证据evidence/android-workspace-r093。

下一紧密行为组继续步骤5：新工作区的原生单次定时仿真。先固化计划版本/到时唤醒、暂停/改期撤销、最新资格/占用、实际墙钟/单调/boot、30秒失效、后台与冷启动不补发；先测试替身，再接既有AlarmManager精确闹钟取证方式。不得复用DEMO库或自动恢复旧计划，冷启动恢复与合法到期回调必须明确区分。失败/进程结束保留UNKNOWN且零重放；前台、后台/锁屏、强停后重开及暂停竞态取证。新工作区仍只记录合成请求，没有电话授权。以后才连接生产身份/真实输入/手机状态和新有界许可的真实适配，再容量/多机型/试点验收；无需当前用户新决定。


## R094工作区原生单次定时完成
WorkspaceTimerModel/Coordinator/Runtime、非导出WorkspaceAlarmReceiver、固定隔离检查、UI定时入口/刷新已接入。旧DEMO及真实app不改，core schema4不变，固定RecordingPort。计划版本/票据与消费前后守卫、UNKNOWN恢复和新Session暂停已分开，后台到时不因普通恢复误取消；取消、改期、资格变化复用串行锁和核心事务。62组527 Java断言；S23隔离22、定时驱动78、计划编辑18、模拟进程丢失10、旧核心97回归通过，200模拟尝试约1963ms。警告6/错误0，0真实电话。命令和前提见android-workspace-timer.md，证据evidence/android-workspace-timer-r094/acceptance.json。
下一紧密行为组继续步骤5：复用已验证的宿主号码规范，做与合成空间分离的手机真实名单最小输入/号码映射和禁用态。先对照现有R002/003/022、角色/来源与资格契约补缺，只实现明确部分，默认停止真实提交；不把固定LOCAL-SALES或synthetic目标转换成生产身份/许可，不再次索要用户已有名单资格证明。先保存输入/预期/失败与测试，再本地实现/验证；之后才接真实手机状态/可信身份和新有界许可的适配。批量自动队列、锁屏深度休眠/撤权/全天/多机型仍需后续证据，iPhone暂停。


## R095本机号码暂存完成
PhoneIntakeModel/Store/Activity及固定隔离检查接入，MainActivity增加“打开本机号码暂存”。schema1独立5表、模式/资料槽、稳定规范号码映射、逐行输入结果/去重、资格/拒绝CAS、审计恢复/回滚；不连接旧任务或电话端口。解析与宿主保持600生成向量一致，66组551 Java断言、宿主参考8、S23隔离30/UI19通过；构建/lint0错误7警告。可变调用方列表校验先于复制Bug有确定红绿，UI文件字节对比失败以文件头复现和全业务摘要核查替代，失败保留。当前真实区0联系人，格式区4生成联系人；旧DEMO/合成工作区/真实APK不变，0电话。完整命令及前提见android-phone-intake.md，证据evidence/android-phone-intake-r095/acceptance.json。
下一紧密行为组继续步骤5：把本机暂存的联系人显式生成可追溯本地任务草稿，复用已验证的联系人/修订/来源规则，先明确输入快照、资料区/slot/target/revision绑定和失败/恢复测试。FORMAT_FIXTURE不可提升为真实任务；未认证本地草稿不能当正式企业身份或执行许可，真实发送仍固定禁用。重导入不隐式建/刷新草稿，资格变化/拒绝使旧快照失效，号码映射不公开无保护原文接口。之后再接本地计划、可信身份/实际手机状态与受控适配，最后批量/全天/多机型验收；不重复建档或索要既有资格证明。


## R096/R097交付：本机明确草稿与本地计划

2026-10-18 R096/R097：本机联系人→显式草稿→本地计划编辑子范围通过，整体仍部分通过。74组608 Java断言、600解析向量、S23 SQLite98断言、草稿界面20项/计划界面21项通过；build/lint0错误7警告。实际区0联系人，格式区6生成联系人/2测试草稿/计划version5暂停，无执行请求或电话。新链路未接电话/实际运行器或企业认证；原真实APK/DEMO/合成工作区保持。iPhone暂停。详见[实现边界](android-local-drafts-plans.md)与[本轮证据](../evidence/android-local-plan-r097/acceptance.json)。

复用ContactTaskModel、SalesPlanModel，不增依赖或另一套计划域。LocalDraftBinding只适配资料类型/slot/target/revision；PhoneIntakeStore schema3原子保存/恢复，PhoneIntakeActivity新增明确创建/刷新/计划/暂停。先R096目标行为红，再实现35断言绿；R097已有计划规则补22断言直接绿。实际设备98与两类界面检查通过，首个驱动旧XML错误保留并修复。没有重新跑不受影响的原97/200定时设备流程，仅核验原生源码摘要相同并复用有效证据。

下项步骤5：本机计划的受控执行事务与结果核对边界，再接独立手机电话适配。输入必须绑定真实资料区/slot/目标/修订/计划版本以及当次有界许可和SIM；先以测试替身验证消费唯一性、持久UNKNOWN先于端口、提交回执与呼出/接通分离、明确核对后才下一条，故障不自动重放。实际电话适配只有可信设备和新具体许可可触达，格式数据与未认证生产入口默认DENY。试点仍明确非生产企业认证，不把本机slot冒充企业身份。真实拨号、全天/多机型和生产认证缺口不以本地绿灯补齐。


## R098核心完成；R099独立适配与无拨号真机检查通过，等待实际通话证据

2026-10-18：R096～098本机草稿/计划/有界尝试核心已通过记录型验证；R099独立“销售拨号·受控试点”APK已构建安装S23，20条配置与停用路径检查、10项安装/界面检查通过。647条Java断言（含原执行器27）、600解析向量、355条S23隔离检查、旧资料升级/界面10项通过。全部本轮0真实外呼；新APK真实通话/完整队列尚未验证，企业认证仍缺，整体部分通过，iPhone暂停。用户回复“三项已设置”后，09:35～09:36已实测本包3项手机权限、精确闹钟与后台不受限生效；电销卡绑定与旧账户一致，撤权/恢复和格式数据隔离UI共46项驱动检查通过（含新鲜界面采集检查），不是46次通话。实际区仍0联系人/0尝试/计划0暂停，许可停用，结束已强停。本次设置不构成真实外呼授权。

源文件：PhoneIntakeStore schema5尝试/审计/撤销、PilotPermit与记录型检查；独立pilot模块复用10个核心源文件及原ControlledCallExecutor精确生成副本。PilotPhoneRuntime/Activity/Launcher/AlarmReceiver/ResetReceiver与ReadinessCheck已创建，可启动APK已在S23首次安装。构建/包边界/准备验证已运行，不把静态电话接口记作真实通话通过。具体启动/停止/局部测试/回归/E2E与所需日志见android-controlled-pilot.md。
下一关键路径先步骤2补新适配实际通话平台证据：postgrant已通过46项驱动检查，系统设置与选卡已核验；新包当前真实用户区无目标/许可，不在周日拨号。实际成功后继续安卓自动批量队列和企业化必要实现，保留原完整范围；iPhone继续暂停。无需重新建档、重复资格证明或逐项征求验收同意。


## R100当前无外呼实施项

按用户“只做当前可以持续推进的动作”，步骤5先交付本机批量草稿预览与明确原子创建。先纯预览业务红灯→绿，随后SQLite多连接/故障与201合成容量，再构建、格式UI与隔离检查。共用规则复用已有LocalDraftBinding；无新依赖、无schema改动、无真实授权或拨号。完成后从具体可执行缺口继续，不让真实通话条件阻断独立元数据工作。


## R101当前只读统计实施项

R100完成后按用户持续推进要求，不等待真实通话，复用持久化尝试做独立统计：纯AttemptMetrics/固定北京时间日期cohort与非法输入业务红绿；PilotAttempt只转换统计字段，不暴露号码/许可；通话页累计/今日及人工结果分离显示，actualOutgoing/actualConnected保持未知。增加201记录型尝试重开后的真实SQLite汇总与摘要只读断言；新APK升级后只读UI回归。BuildAll一次Gradle构建两APK，无新依赖或生产计费口径承诺。


2026-10-18 10:45（R100/R101）：已连续交付本机批量草稿预览/明确原子创建，以及不同目标、授权尝试、API确认、人工结果分离的累计/北京时间今日统计。689 Java断言、600解析向量、398 S23隔离断言、批量UI44驱动检查、新版只读UI43驱动检查及20配置/停用断言通过。试点0.3-batch-metrics已安装S23；本轮0真实电话，实际区0联系人/0尝试/plan0暂停/许可停用，格式区2生成记录/2草稿/plan2暂停。原资料/权限/电销卡保留；整体仍部分通过，新包真实通话、自动批量队列、企业身份与全天多机型尚未验收，iPhone暂缓。当前继续步骤5可独立实现项；真实通话条件只影响该部分。

本轮两个独立小项已执行局部验收，不等待真实通话或逐项用户同意。接下来步骤5可继续本机名单筛选/定位与批量只读预检：先复用当前快照规则，筛选不改变名单、顺序、资格或计划；不自动选下一条并拨号。真实批量执行顺序/间隔和生产主计数仍按SPEC GAP保留，未获得决定不默认采纳。新适配实际电话证据仍独立步骤2，缺陷回5、范围齐证后6。


## 2026-10-18 R102～105增量

按D-CALL-030实现本机筛选→本地企业服务→安卓企业界面/单次定时。最小栈继续Node24内置http/sqlite/crypto、node:test和原生Java/Android；不新增npm/Maven依赖。企业SQLite schema2与旧本机schema5分离，schema1升级保持凭据/会话/未知，错密钥拒绝前不写库。企业服务独立承担已采纳批量编排，复用既有大陆号码校验；安卓复用SalesPlanModel/WorkspaceTimerModel与13个同源类，不把开发固定Actor当认证。

工作项：R102纯筛选/完整快照；R103本机账号/加密名单/共享拒绝/保留；R104队列CAS/UNKNOWN/设备占用/201容量；R105受保护会话/APK可信界面/原生闹钟与独立记录端口。代码和软件回归继续步骤5，具备各自证据才在步骤6标局部通过；实际电话与全日多机型不由此推导。

直接运行：

```powershell
npm --prefix packages/enterprise test
npm --prefix packages/core test
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test
pwsh -NoProfile -File tools/check-pilot.ps1 -Mode BuildAll
pwsh -NoProfile -File tools/check-pilot-package.ps1
pwsh -NoProfile -File tools/check-standalone-package.ps1
pwsh -NoProfile -File tools/start-enterprise.ps1
pwsh -NoProfile -File tools/stop-enterprise.ps1
```

S23记录型端到端需解锁和USB授权，手动入口：node tools/record-core-run.mjs evidence/enterprise-device-NEW R-CALL-103,R-CALL-104,R-CALL-105 node tools/check-enterprise-device.mjs --run。脚本生成独立演练销售、仅生成联系人，验证前台/后台、30秒间隔、待核对、冷开停止与账号界面，绝不设置LIVE许可；证据目录必须新建。真实验证入口另见manual-steps，不在当前轮运行。


R102～105收口：当前可执行无真实通话范围已通过步骤6有限验收，具体计数/版本见acceptance.md及final-audit/acceptance.json。下一步2准备新版真实通话环境与新有界授权，不重复整个步骤3/4/5。iPhone暂停、保留期限待定默认不自动删、公网未授权。


2026-10-18 R105续项：实际补齐原许可CLI的可注入编排、完整分页目标查找、两阶段发布/失败清理/互斥与明确不确定状态，新增14检查与企业整体36检查通过。无需重建APK或重复核心/Java/真机回归，因未改它们的源码。下一步仍2实拨取证；详细入口/恢复见enterprise-permit-validation.md。


2026-10-18 R105撤销工具闭环补齐：close-enterprise-live-permit.mjs、live-validation-closure.mjs与准备/关闭共用permit-private-store.mjs；新增16自动化、S23实际无许可CLI检查1，通过。企业整体52通过，已有核心/Java/Android代码与证据复用，无需重建APK。下一步2有界实拨及结束后实际许可撤销取证；操作见enterprise-permit-closure.md。


2026-10-19：按D031仅补必要schema2受控时段例外（R106），默认拒绝和生产窗口保持。4新增Node测试含3个真实目标行为红转绿；企业56绿、Java企业票据14断言、双APK构建/lint绿。S23当前0.5已安装，一次正式呼出8239ms并按用户未接归档；生效双端撤销通过，剩余额度不自动使用。下一步2补缺失必要真实证据，非必要不增加功能。命令：npm --prefix packages/enterprise test；pwsh -NoProfile -File tools/check-pilot.ps1 -Mode Test / -Mode BuildAll；许可准备/撤销见android-controlled-window.md。


2026-10-19必要回归已完成：新版后台锁屏第2通与收尾完成；记录型E2E发现真实NOT_DUE缺陷，新增T811确定红灯后最小修复deviceFloor的已满间隔判断。57服务检查含201容量通过；重启仅本地服务加载新源码，再跑37 S23记录闭环/13控制全部通过。未改Android源码或APK，不重复构建/Java/核心；此前有效证据复用。当前无剩余已识别且独立于外部条件的必做实现项，下一步2按next-action补真实条件。


2026-10-19 09:24：T812真实来电响铃占用9检查通过；为实现原必要双目标真实下一条取证，prepareLiveValidation增加严格双接收端私有请求，保持单端兼容/时段/额度/资格及双revision，新增T813/814红转绿，59回归绿。正常工作时段T815实际两个受控目标同一队列完成、间隔79293ms、最终FINISHED与双端撤销。未改Android/服务调度，复用现有构建/37/13有效证据，不重复。下一步2仅补物理卡/重启/试点条件，非必要不增加。


2026-10-19本轮增量：按D032暂停停卡/换卡，仅推进其他验证。S23真实重启13检查通过，启动计数299→300，旧系统闹钟清除、冷开旧队列停止、无新增授权/自动恢复。前台有人操作的20条生成数据真实节拍演练通过，耗时约9.73分钟，最短提交间隔30.053秒，20条记录型请求/合成结果完成，队列FINISHED、待核对0。本轮真实外呼0；临时REHEARSAL业务时钟已按原字节恢复，系统时钟与LIVE时间未改。手机空闲、闹钟DISABLED、会话退出、双端无真实许可，LIVE仍为2联系人/4授权尝试/4API接受/待核对0。

无生产代码/APK/依赖变化，仅测试入口与证据；不重新构建或重跑原59/37/13。下一步2为真实试点条件，D032停卡/换卡暂缓。


2026-10-20（步骤5局部工具→步骤2首轮试用准备，R107/T819）：用户采纳最短路径，第一轮范围明确沿用尾5235/7214，不表示新外呼授权。新增prepare-s23-trial.cmd及tools/prepare-s23-trial.ps1，仅核对绑定S23用户0/已装APK摘要，启动或复用本地服务并建立USB8790转接；只读报告手机空闲/旧票据/许可，不打开或强停应用、不登录、不创建任务/许可、不自动安装/恢复。真实S23首次及重复运行均退出0，服务/USB就绪、APK相符、手机空闲、闹钟DISABLED且双端无许可。随后既有LIVE登录/绑定准备7检查通过，累计尝试仍5、待核对0、无新许可/电话，手机停留工作区等待试用。证据evidence/s23-daily-r107/prepare、repeat、live-ready（Node版本/命令/退出码/源码摘要），无生产电话链路变更/新依赖/全局配置；复用既有59/37/13证据不重复。docs/s23-trial-quickstart.md写明用户操作及仍需工程协助的许可步骤、停止顺序和当前10次/最多两目标/短期边界，不宣称可全天200条。
下一小项是新有界授权下两个已选目标的实际销售操作试用；无需重导入或新增平台。保持现有许可限制，若要从短时试用进入每日自主批量，另补操作者可管理的许可范围/撤销/有效期规范及相应测试，而不是放宽现有签名工具冒充已可全天生产。


2026-10-20（D033，步骤3/4/5→有限6，R108）：用户采纳销售手机逐批确认、每目标一次、当日最迟18:00失效、改名单/改期/暂停/退出/冷开须重新确认、UNKNOWN不重拨、管理员可停用。已实现服务schema3持久批次许可，与旧工程许可schema1/2分开；签名范围绑定企业/销售/会话/队列/设备/SIM/目标，重复确认不重置消耗，自动下一条不撤销有效剩余范围。旧工程文件入口拒绝schema3，防止绕过持久撤销。增加手机原生确认弹窗与独立本批许可/使用记录、勾选变更失效、暂停/改期/登录/冷开/退出清理；可信打包页面新增“确认本批并启动”，普通JS请求不得绕过原生确认。APK升级0.6-operator-batch/code5，未增加权限。
新增服务测试最初7红（接口行为缺失）保留；首次实现5/7，修正过期测试登录已自然8小时失效及故障注入前误触status事务的夹具，后续因局部测试变量漏声明的ReferenceError亦保留并修复，不能当业务红灯。7/7后补HTTP并发确认/暂停竞争、过时/次日、工程入口隔离以及拒绝联系验证，企业全套69通过，末次联系拒绝增强的局部回归另见contact-regression。Java新增11项时间/数量边界（201不是上限），既有Java回归通过；APK assemble/lint、权限/可信资产检查及浏览器17检查通过。
下一小项为步骤2的新版受控自主闭环，不再扩展功能。日常操作已由原生弹窗替代工程手写许可；真实全天/容量和费用独立取证。局部命令：npm --prefix packages/enterprise test；node --test --test-reporter=tap packages/enterprise/test/operator-batch.test.mjs；pwsh -NoProfile -File tools/check-pilot.ps1 -Mode Test / Build；pwsh -NoProfile -File tools/check-pilot-package.ps1。浏览器E2E以record-core-run包装tools/check-enterprise-browser.mjs并用新证据目录。原生无电话E2E源及实际命令保存在evidence/operator-batch-r108，必须隔离生成服务和先撤销用户0 CALL_PHONE，不能对实际企业运行夹具或自动点真实授权。


2026-10-20最终收口（D033/R108）：自主批次已完成并安装0.6-operator-batch/code5，最终APK SHA256 463339eb00d7aa75d8bb471daca275c8f9e91d310f5b16ad186de6b4d47b5c57。企业69项回归＋最新联系拒绝局部10项通过，Java新增11断言及既有回归通过；构建/lint/权限/可信资产、浏览器17、S23原生42及最终记录型完整37均通过。记录型前台/后台/UNKNOWN冷开完成2请求，最短间隔30154ms。单个复选框未撤销批次的T833真实失败已保留、修复后42转绿并重跑受影响构建/包/浏览器/37；recording-red目录那次实际也是通过，名称不代表红灯，真正失败是individual-red。原临时生成服务全部通过stdin退出，原服务已恢复，用户0电话权限恢复；手机空闲、账号退出、双端无许可/闹钟停用，原LIVE仍7授权/7接受/人工完成2未接5/待核对0，12张原业务表与schema2私有一致快照逐行相同。本轮0真实外呼，不复用旧7通为新版证据。综合证据evidence/operator-batch-r108/acceptance.json、final-audit。
实现阶段当前必要自主批次小项完成；下一步2仅验证新schema3真实链路，无需再复制5增功能。已记录局部/回归/构建/E2E命令，实际来源与结果见综合JSON。


2026-10-21当前小项完成：R108真实自主批次闭环已取证，R109仅补结果导航；浏览器业务红灯→21绿、S23生成YOUR_DEVICE_SERIAL/构建/包均绿。0.7已安装，9核心源码摘要与0.6实拨一致。本轮无需新功能，下一步6小批实际试用。局部浏览器命令见README，S23隔离无电话E2E具体入口/恢复见manual-steps；所有真实命令、版本与退出码见result-navigation-r109/*/run.json。


2026-10-21 D034/R110：最小Wi-Fi方案采用独立项目HTTPS网关（Node内置https/http/crypto）代理原loopback8790，避免迁移SQLite与重写已验证业务规则。现有项目JDK keytool生成本地PKCS12与IP SAN证书，配对码含私有地址/证书摘要/独立随机配对凭据，手机原生输入，HTTP API采用固定证书校验＋默认主机名校验；WebView仍只加载APK打包资产，不能从LAN下载桥接脚本。构建0.8/code7，无新依赖/权限。开发测试后入口start-enterprise-wifi.cmd/stop-enterprise-wifi.cmd，电脑需开机且同网。原服务和真实数据保留；正式无线SIM链路需新有界通话证据，既有USB通话不直接替代。


2026-10-21 D034/R110：方案①Wi-Fi改造完成并安装0.8-wifi-enterprise/code7，APK SHA256 17ec89e777ddb411409ed31f0d101af1c29a4dbb8c5bcee699313517373a2158。仅指定私有IPv4的TLS网关8791代理原127.0.0.1:8790；原生配对、固定证书/默认主机名校验、独立配对凭据和原账号认证，WebView仍只加载APK可信资产。无新依赖、无新增权限、未改全局网络/防火墙或部署公网。72项企业回归、S23纯Wi-Fi路径生成YOUR_DEVICE_SERIAL项及最终断线/错误证书18项通过；构建/lint/包检查通过。移除adb reverse8790后正式LIVE登录绑定9检查通过；未实际拔线作为独立观察，ADB仅用于调试控制。临时夹具已正常退出，原企业服务及Wi-Fi网关恢复、13张真实业务表保持，LIVE仍9尝试/9API接受/人工完成3未接6/待核对0，手机已正式登录、双端无许可/闹钟DISABLED。0新增电话。原USB通话证据不直接替代新版真实无线通话；该项待新有界授权。证据evidence/wifi-r110/acceptance.json及各run.json（Node24.18.0/命令/版本/退出码/源码摘要）。


2026-10-21 R111/T846：用户报告确认后无外呼/无提示、时间已到且未离开工作区。只读检查原电脑服务/Wi-Fi网关正常；截至本次查询，LIVE有新导入审计但没有新队列/新批次许可/新attempt，旧队列FINISHED。因此尚未进入新计划自动拨号阶段；无USB设备，无法直接确认手机具体当次阻断提示。未替用户安排、确认、启动或补拨。复现另一确定缺陷：长页缺计划错误在视口上方约1082px，用户看不到；R111让所有操作提示sticky可见，并把缺计划错误明确指向“安排选中联系人”。生成LIVE浏览器测试带记录型桥替身、没有电话适配，business-red退出1保存提示屏外坐标；修复后business-green退出0/23检查、提示top8px且0授权/0设备调用；构建/lint/包检查退出0。0.9-start-feedback/code8已构建，SHA256 352395b03e6b7208eb52b6cb806ca305e9c2d477d5fd0c37bfaba177d87b2d97；S23尚未连接，未安装/未运行该版，已请求仅临时连接更新。当前手机仍0.8；新版无线真实SIM验收仍未运行，旧额度不复用。


2026-10-21 R111安装收尾：用户临时连接后，先只读确认空闲/双端无许可/闹钟DISABLED/待核对0/旧队列FINISHED，再安装0.9/code8返回Success；原先手机快照因没有可见WebView未取到，不把原当次提示说成已观察。更新后在真实LIVE工作区执行严格只读的缺计划提示回归：测试临时拦截除status外的请求并禁用设备操作函数，确认旧队列FINISHED后点击无效启动；错误明确指向“安排选中联系人”、实际视口top8且可见、0写操作/0设备调用/授权仍9，11检查通过/退出0。检查结束恢复原JS函数，手机保留原正式销售登录和Wi-Fi连接、无活动许可或票据。本次0新计划/0电话，真实名单未变。0.9 SHA256 352395b03e6b7208eb52b6cb806ca305e9c2d477d5fd0c37bfaba177d87b2d97；浏览器23、构建/lint/包检查证据保持有效。GitHub同步本修复；下一步仍2补用户新计划执行的真实无线通话证据，助手不得复用旧额度。


R112：复用服务/许可/定时器，只改工作区组织和引导；新增只读readiness原生接口，新增可信打包flow.js展示状态，服务器仅增加静态资源，不变更业务规则。先生成数据浏览器验证200条不挤出运行控制、取消无计划、双击单次、原生取消停止，再S23纯Wi-Fi REHEARSAL完整闭环/恢复；版本0.10/code9。本轮无新依赖/权限。


R112交付：75项企业测试、27项新引导浏览器检查、23项原浏览器回归及47项S23生成REHEARSAL检查通过，构建/lint/可信包检查退出0。S23两条记录请求间隔30348ms，覆盖前后台和冷开未知保留；0真实电话。原服务与Wi-Fi网关已恢复，13张真实业务表逐行快照一致，LIVE仍9尝试/API接受9/人工完成3未接6/待核对0。正式账号Wi-Fi登录绑定9检查通过，闹钟DISABLED、双端无拨号许可，USB业务转接不存在；USB仅用于调试，不声称测试时物理拔线。

可直接运行的局部回归：node --test packages/enterprise/test/flow.test.mjs；相关回归：node --test packages/enterprise/test/*.test.mjs；浏览器/E2E生成数据：node tools/record-core-run.mjs evidence/guided-workspace-r112/browser-repeat R-CALL-112 node tools/check-enterprise-guided-browser.mjs。构建与包检查命令见README。真机本轮使用本地隔离REHEARSAL夹具，不提供可误用于LIVE的无人值守启动脚本；手动E2E见manual-steps。

下一步复制步骤6：只验本轮可用性，销售本人连续两轮不靠助手找按钮完成选择→时间/核对→确认→结果→结束，准备目标60秒以内（不含等待和通话）；尚未实测，不记作通过。可先使用隔离生成演练数据，不为界面验收强行增加真实通话。无线真实SIM链路T845仍未运行，需新的有界授权和当下接收端同意后回步骤2取证，再步骤6有限验收；旧额度不得复用。发现明确界面缺陷才回步骤5。iPhone、停卡换卡暂停；全天200真实尝试/多机型/费用仍未验证，不新增功能。


R113：复用flow.js实现受限CSV/TSV解析，不引入依赖；服务import兼容string与严格number/company/surname对象，schema4新增AES-GCM资料字段。新增6项单元/SQLite集成；旧schema1测试夹具同步移除新字段后再模拟旧库，保留迁移断言并改预期为4。浏览器实际文件载入/预览/200条/批次/结果回归通过。0.11构建完成，下一步安全安装与隔离REHEARSAL真机验证，不改真实名单/不拨号。


R113交付补充：原WebView不具备默认文件选择，0.11.1使用原生文档选择器+严格有界UTF-8读取，经可信页面回填文本再预览。构建/lint/包/浏览器33与23/S23 55通过，服务schema4和APK已安全升级；原13表经隔离演练保持。下一步步骤6，不再重复安装或增加功能。


R114：新增项目内read-excel-file 9.3.12及锁文件，浏览器vendor固定源码/许可并随APK打包；新增workbook.js受限ZIP/实际展开/CRC/XML检查，再本地读取首表映射至原CSV预览契约。安卓选择器按ZIP头回传有界base64，保留原CSV路径，无新权限；桌面File直接读取，晚回调与退出草稿保护。六可信资产包检查、测试与S23演练完成；不扩服务数据库schema/核心拨号规则。构建前无须在线下载vendor，首次测试须npm ci；局部/回归命令见excel-import.md。
2026-10-22 R115导入反馈修复：局部node --test packages/enterprise/test/workbook.test.mjs；回归node --test packages/enterprise/test/*.test.mjs；浏览器用record-core-run包装tools/check-enterprise-guided-browser.mjs；构建tools/check-pilot.ps1 -Mode Build及check-pilot-package.ps1。0.13构建通过，手机安装/用户原Excel回归仍待步骤6。
