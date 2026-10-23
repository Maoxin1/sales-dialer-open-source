# 安卓本机批量草稿与尝试统计（R100/R101）

2026-10-18；当前试点版本0.3-batch-metrics（versionCode2），S23 SM-S9180/API36/user0已安装。软件子范围通过，整个销售拨号产品仍部分通过。全部本轮0真实电话；新适配实际通话、生产企业身份、自动批量队列及全天多机型仍未验收，iPhone按用户决定暂缓。

## 手机当前可以操作的内容

手机打开“销售拨号·受控试点”→“我的名单与计划”。导入仍只保存本机逐行大陆11位资料，新批资格默认UNKNOWN。已有资格可直接声明，不要求上传证明。实际资料区与格式测试区固定隔离；本轮只在格式区追加1条生成记录，没有导入真实客户或旧受控接收号码。

“批量预览与生成草稿”先读取完整、不可变联系人/草稿快照，列出可新建、已有有效草稿、已有过时草稿、资格未知/撤回、拒绝联系。取消不写入；存在可新建记录才出现“确认生成合格草稿”。明确确认后，只有合格且无草稿者被创建，逐条CREATED审计随整批一起提交。已有过时草稿保留，须原有逐条明确刷新；不静默刷新或改资格。预览后任何联系人/草稿变化、跨资料类型或私有槽都会使旧确认STALE_BATCH，整批不保存，须重新预览。

批量草稿不安排计划、不设闹钟、不生成电话许可、不改变已有计划或调用端口。按目标ID排序只用于稳定预览，不决定实际拨打顺序。原单批导入最多200行是单批输入技术边界；跨批累计201联系人可以一次生成201草稿，不是每天200硬限额。

“受控通话与结果”页显示本机累计与北京时间今日的不同目标、授权尝试、系统接受请求、待核对，以及人工未接/完成/未知/已关闭未知。今日按claimedAt授权记录落在哪个北京时间日期计算，零点含、次日零点不含；只针对当前资料区，不包含旧应用的历史通话，不代替生产日总拨号/计费口径。

同一目标201次授权仍只计1个不同目标。人工完成、系统接受请求和实际呼出/接通独立；当前没有绑定的呼出/接通事件，两项显示“未取证”且报告为null，包括实际名单为空时。关闭未知仍保留UNKNOWN，不自动变成未拨出/成功，不重放。

停止使用“暂停新外呼”；需要结束应用时按下面的停止命令。真实已交电话系统的通话仍由系统电话界面挂断。本轮最终新包实际0联系人/0尝试/plan0暂停/许可DISABLED，格式区2生成记录/2草稿/plan2暂停，应用已强停。原仿真资料、DEMO/合成库与旧spike包保持；原系统设置和电销卡绑定保留。

## 本地运行与检查

以下从项目根D:\mx\AI-Workspace\Projects\sales-dialer执行。依赖均为项目既有工具，无新增安装或全局修改。

~~~powershell
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test
pwsh -NoProfile -File tools/check-pilot.ps1 -Mode BuildAll
pwsh -NoProfile -File tools/check-standalone-package.ps1
pwsh -NoProfile -File tools/check-pilot-package.ps1
~~~

Test本轮689 Java断言（含原执行器27）及600固定生成解析向量通过。BuildAll实际在同一Gradle调用构建两模块并跑lint，均退出0；试点0错误6警告，仿真0错误8警告。仿真仍只有SCHEDULE_EXACT_ALARM且DEX无电话API；试点仍4项权限、allowBackup=false、12共用源逐一摘要相同；电话Runtime源码与R099一致，未改真实适配。

安装/启动/停止使用已授权S23（已在本轮实际执行安装和冷启动；启动前先停止以得到新界面会话）：

~~~powershell
.tooling/android-sdk/platform-tools/adb.exe -s YOUR_DEVICE_SERIAL install -r prototypes/android/pilot/build/outputs/apk/debug/pilot-debug.apk
.tooling/android-sdk/platform-tools/adb.exe -s YOUR_DEVICE_SERIAL shell am force-stop com.mantou.salesdialer.pilot
.tooling/android-sdk/platform-tools/adb.exe -s YOUR_DEVICE_SERIAL shell am start -W -n com.mantou.salesdialer.pilot/com.mantou.salesdialer.contacts.PilotLauncherActivity
~~~

配置仍在手机系统权限/“允许准时提醒”/“后台运行设置”，本包三项已核验，无需重复设置。数据与许可在本应用私有目录，无需编辑配置文件或把完整号码/许可写入公开日志。

## 真机测试入口和真实证据

每次必须换新的evidence目录，不能覆盖已有结果；手机脚本按顺序运行。固定夹具可锁屏，不读取用户资料，随机phone-fixture/pilot-fixture私有库，严格FORMAT/记录型端口，无真实电话API。以下命令本轮经相同包装器实际运行并退出0：

~~~powershell
node tools/record-core-run.mjs evidence/native-fixture-new-run R-CALL-100,R-CALL-101 node tools/check-phone-intake-fixture-device.mjs --run
node tools/record-core-run.mjs evidence/metrics-ui-new-run R-CALL-100,R-CALL-101 node tools/check-attempt-metrics-ui-device.mjs --run
~~~

当前固定夹具398断言通过，含整批只读预览/确认、原活动计划保持、两连接同确认只有一赢家、第二草稿写入/审计失败全部回滚、预览后撤回/新增/草稿变更和跨槽拒绝、201生成联系人原子草稿/审计及重开。另一个记录型样本是1目标201授权/记录API/夹具人工未接，统计不同目标1，实际两项未知，摘要只读不变。不能把两组样本混为201不同号码的真实电话或生产吞吐。

只读UI入口需USB授权、解锁、安装本包且许可DISABLED、格式区无活动计划/尝试；会更新同一APK、读取两区完整摘要、打开批量预览并取消、核对累计/今日统计与20配置/停用断言，不添加联系人/草稿/许可。保留原数据与设置。43驱动检查（含界面采集）+20诊断断言通过。首次脚本未正确冷启动首页，出现“检查准备状态”定位失败，失败记录保留；修正为明确强停后再启动首页，未删业务断言。

批量创建UI另有tools/check-batch-draft-ui-device.mjs --run，R100实际44驱动检查通过；该入口要求实际区为空、格式计划暂停，会在专用FORMAT区追加1条尚未使用的生成记录并明确创建草稿。重复运行会累计生成记录，不能清库回到起点或对真实资料套用。当前新版保留其批量逻辑，398原生回归重跑并补只读预览，不冒称44创建UI在每个新APK重复运行。

核心/新功能业务红灯保留：R100 NOT_IMPLEMENTED_BATCH_PREVIEW；R101 NOT_IMPLEMENTED_ATTEMPT_METRICS，均为可加载接口中的目标缺失，非导入/语法错误。首轮R100 lint指出HexFormat要求API34，改兼容编码后通过，未提高minSdk31或屏蔽lint。

## 版本、证据与尚未验收

当前试点APK：prototypes/android/pilot/build/outputs/apk/debug/pilot-debug.apk；SHA256 fe55ddb990fe9d698ee74ef84574600e7a0ab7787307cc59021bc7f3b9be7454。
仿真APK：prototypes/android/standalone/build/outputs/apk/debug/standalone-debug.apk；SHA256 86b3e8f874a133a26b56f7748e820d0bb06230ccacd9fe0f4a4a25f5a1acc0e9。

[综合证据](../evidence/android-attempt-metrics-r101/acceptance.json)含命令来源、源码/APK摘要、实际通过数、版本、失败路径与边界。主要原始结果：android-batch-draft-r100/device-ui、android-attempt-metrics-r101/green、build、device-fixture、device-ui-fresh-launcher、pilot-package、standalone-package；回传run.json/output.log、phone-fixture.json、attempt-metrics-ui.json、PNG/XML即可。不分享原始SQLite、许可token或完整手机号。

下一步5继续可独立实现的本机名单筛选/定位与批量只读预检，保持已采纳资格/拒绝/草稿规则，不自动决定生产队列顺序与间隔。真实通话仅为独立步骤2证据：工作日09:00～18:00、当次新具体有界许可、双方同意、当前设备/SIM/权限/空闲，历史许可不续用。当前周日不拨号，也不自动安排未来真实计划。范围内缺陷回5修复，证据齐后6有限验收；当前无需用户逐项同意验收或补资格证明。
