# Android平台探索记录

调查ID：S-CALL-ANDROID-01。关联F-CALL-002、003、005、006、008、011、013。日期2026-10-14；原型去向：[prototypes/android](../../prototypes/android/README.md)，保留为探索工程，未转正式产品。

## 问题与假设

问题：在中国大陆销售SIM、双卡、预定/人工干预时间条件下，Android公开API能否请求直接呼出，并获得可靠状态与接续证据？

假设H-A1：有CALL_PHONE及所需状态权限时，TelecomManager.placeCall可以向系统请求指定SIM账户的受控单次呼叫。官方API支持此请求形式，实际呼出/显号还需要接收端。

假设H-A2：AlarmManager触发不自动保证后台/锁屏呼出。需要记录闹钟、请求、实际电话与设备条件，区分未送达、被阻止、额外确认和外呼结果未知。

判定依据：前台/后台/锁屏分别运行单次实验，核对选卡与接收端显号/双方语音；暂停/旧计划/占用/撤权/崩溃条件无不受控新请求；结果未知不重放。一次成功只支持对应环境，不支持全天200次可靠性。

## 时间与环境

两端共享一次90分钟研究/原型窗口，起始2026-10-14T16:55:28+08:00；不把两端报告用时相加。结束和实际总用时见 [session.json](../../evidence/step-2/session.json)及本文件收尾记录。

Windows11 10.0.26300、PowerShell7.6.6、Node24.18.0/npm11.16.0、Python3.14.3。缺Java/JDK、SDK/adb。用户报告暂无真机；销售SIM中国电信、同意受控测试，接收端未提供。无设备/线路/显号实测。

编译配置：AGP8.13.2、Gradle8.13（官方Wrapper且校验哈希）、compile/target36、min31、Java17。官网已存在Android17/API37，固定编译配置不是最新系统支持声明；实际兼容需覆盖可获得目标系统/ROM。

## 本轮执行与真实结果

1. 复用并读取官方Phone intents、权限、后台启动、Telecom账户、通话状态、闹钟及当前Android17资料。事实/推断/未知与URL见 [research.md](../research.md)。
2. 写最小原生工程：单一目标、默认仿真、人工一次、30秒闹钟一次、暂停/旧计划失效、显式选SIM、权限/占用检查、提交前待核对标记、持久事件日志。
3. 仅安装项目内静态解析依赖。3个Java文件通过java-parser语法解析；Manifest组件/引用通过结构检查；官方Wrapper校验和一致。
4. 实际尝试assembleDebug，退出9009：JAVA_HOME未设置且PATH无java。未启动Java/Gradle/Android编译，没有APK。
5. 实际尝试adb devices -l，退出127：adb入口不存在。结合用户报告暂无真机，本轮没有安装、通话或任何呼叫量试点。

全部命令/版本/输出与退出码见 [checks.json](../../evidence/step-2/checks.json)。[全项目源码静态检查](../../evidence/step-2/static-source-checks.json)61项、[元数据检查](../../evidence/step-2/static-metadata-checks.json)8项通过；这不是Android类型/编译/行为测试。

## 结论与证据边界

H-A1得到接口资料支持，尚未得到真实拨出与显号支持；H-A2仍需要设备实验。当前结论为**资料可支持继续探索，运行可行性证据不足**，不能认定方案不可行，也不能认定原目标已实现。

OFFHOOK只记设备/订阅观察状态，不记客户接通；接口返回只记提交。原型有待核对门，自动下一条/全天持久调度/名单管理/企业权限/固定语音尚未实现，不能用这次静态检查代替验收。

## 剩余未知与下步

按 [manual-steps.md](../manual-steps.md)补JDK/SDK、设备、受控接收端后进行M-AND-01～09，保存日志与接收端证据。重点是后台/锁屏、双卡账户映射、来电占用、撤权、下一次请求和崩溃未知结果。

步骤3先定义共用规范：事件来源与计数分离、计划版本、旧计划失效、暂停/占用、防重、未知结果核对、联系资格/拒绝联系。原平台目标保留；实验的30秒/15分钟/手机号限制未采纳为生产规范。原型将来复用需整理接口、补必要测试并通过验收。

## 本轮时间收束

研究/原型与交付记录结束：2026-10-14T17:49:35+08:00；共同窗口实际用时54.12分钟，90分钟内收束。Android/iOS共享此窗口，不把两个报告的时间相加。可独立工作完成；设备/构建缺口继续保留，下一步步骤3。

## 2026-10-15持续推进：构建缺口已补

D020授权后安装项目内Temurin17.0.20.1、Android命令工具15859902、SDK platform36/build-tools35/platform-tools37.0.1；Gradle8.13/AGP8.13.2保持原配置。实际assembleDebug初次成功，lintDebug随后发现4个MissingPermission错误：封装权限检查未被lint识别，SIM查询中途撤权需要更明确处理。补直接checkSelfPermission及SIM枚举SecurityException清空结果/记录，不关闭规则。

修复后lintDebug退出0，0错误/10警告；assembleDebug退出0，debug APK真实存在。[初始lint](../../evidence/continuation-1/android-lint.json)、[修复lint](../../evidence/continuation-1/fixed-android-lint.json)、[修复构建](../../evidence/continuation-1/fixed-android-assemble.json)、[APK及源码哈希](../../evidence/continuation-1/android-apk.json)。警告含同步SharedPreferences.commit（有意先持久化再交接）、原型中文文案/图标/备份声明，列为正式化整理项，不当作通话阻断已验证。

因此旧章节“无APK/未构建”仅历史状态；当前类型/资源/DEX打包已完成，H-A1/H-A2仍缺真实SIM主动呼出/选卡/显号/双方语音与后台稳定性证据。现有浏览器自助闭环不与APK相连，没有自动批量队列。AOSP API36模拟器仅补合成请求、暂停/定时与安装启动证据，真实电话继续未运行。

## Android模拟器实际结果（2026-10-15）

AOSP Android16/API36 x86_64、Emulator37.2.12、独立AVD，06:17:02～06:21:33（东八区），已完成APK安装/启动。5检查通过：人工一次产生simulated_request；定时后暂停，等待35秒无新增请求；暂停时人工触发被挡；重新配置后30秒定时，回桌面后产生第二条模拟请求；全程没有request_about_to_submit/request_submitted事件。精确定时app-op在此自有模拟器上显式允许，不能据此假定用户手机已授权。

[完整命令/退出码/设备/断言](../../evidence/continuation-1/emulator/result.json)、[事件](../../evidence/continuation-1/emulator/events.jsonl)、[实际截图](../../evidence/continuation-1/emulator/android-simulation.png)。模拟器测试完成后已关闭；物理设备列表为空。真实SIM、双卡、显号、接通/讲话、撤权/来电/锁屏实际外呼及全天队列仍未验证，不能标整端通过。

启动时发现模拟器在用户.android生成4个运行缓存。已核对创建时间均属于本次自有模拟器，逐文件移入项目.tooling保留，未碰原有ADB文件；补ANDROID_EMULATOR_HOME与兼容目录配置。[修正记录](../../evidence/continuation-1/emulator-cache-correction.json)。此项为工具缓存修正，不是手机业务通过证据。


## 2026-10-15 S23 Ultra受控真机结果

前台人工、前台定时、后台锁屏3通实际执行，用户确认均显号/接通/双向语音正常；定时无需再次系统确认。后台初始受限制未及时触发，改此应用为不受限制后通过。详见[单独报告](ANDROID-S23U-2026-10-15.md)。H-A1在本机指定卡取得有限证据，H-A2仍受后台设置/兼容/长期队列未知限制。未验证范围不降级。


## 安卓交接实现增量（2026-10-15）

本轮追加独立SyntheticBridgeActivity/SQLite账本及原子回执，未修改Probe/MainActivity/DialAlarmReceiver拨号逻辑。主机任务→USB手机开发闭环17点及原生拒绝8点通过，新增真实调用0。详见[交接契约](../android-handoff.md)。新APK的Hash与原三通版本不同，原三通证据不能自动升级为新完整任务链路真实验收。

## 2026-10-16 R082：正式命令真机闭环，部分通过
S23 SM-S9180/API36，安装SHA256 cb3691179c5a9fd249ed0ace534bb1a3aaed18862f0a676bc259c347205dd834，Node24.18.0；14:17只读检查连接/绑定/空闲/双卡指定卡/权限通过。用户先授权1次，第一通未接后明确“再打一下”，新增独立1次授权；两轮分别创建许可、部署、新计划版本6/7，由正式run-contact-timer.mjs start-approved自动提交。原生Phone API提交2次，接收目标1个，每轮used1/1。用户最后确认两次均有响铃或未接记录，只是未接听；实际送达2由用户报告，接通0，显号/双向语音本轮未重新确认。
两次运行器均进入NEEDS_RECONCILIATION、退出1，保留待核对且禁用组件/暂停计划，符合设计；不能将这个退出1记成全部检查失败或启动成功后无电话。确认手机空闲后分别以NO_ANSWER核对，contact-controlled reconcile退出0。正式close-contact-session --close CLOSE-R082-FIRST-20261016及CLOSE-R082-REPEAT-20261016均真实执行退出0/CLOSED，两个会话唯一归档。
最终只读确认：宿主两条FINISHED、api SUBMITTED、manual NO_ANSWER；原生6条历史请求全部RECONCILED（包括本轮2条）、4份历史许可；当前许可enabled=false，两个组件禁用，计划暂停，无活动会话和owner。第二通指示已用完，无剩余拨号授权。诊断采集只刷新手机诊断文件，未启用拨号。
证据evidence/android-readiness-r082：readiness、collector、prepare、deploy、plan、live-runtime、submitted、reconcile-first、close-first及*-repeat；最终final-summary-confirmed、final-collector。final-summary是用户补充响铃信息前的记录，后续confirmed补充用户报告，不覆盖旧证据。gate-audit仅使用旧原生本地快照，不能当6条实时关联证明；本轮真实关闭端口的匹配检查与最终原生采集为新鲜证据。
验收结论：正式定时命令→API提交→接收端响铃/未接→人工核对→正式关闭归档的单机受控子范围通过。接通/语音本轮未运行成功；USB断连、真实进程强杀中手机恢复、独立安卓全天队列、其他机型仍证据不足。iPhone暂停。生产源码没有修改，无需重复此前673/673与152模块检查；未新增依赖、未改全局配置。
下一步仍步骤2/6：按当前已完成链路整理断连/恢复试验条件，先做不拨号的设备检查；涉及新的实际拨号需新的有界授权。不要再重复正常提交/关闭的离线包装测试；手机独立运行作为明确剩余工程缺口，按现有规范进入步骤5实现前先核对工程边界。



2026-10-19 R106当前版本证据：SM-S9180/Android16，0.5/code4正式本地企业链路前台和后台锁屏各1通，呼出观察8239/8495ms；用户核对两通未接记录/显号9486。生效双端许可撤销/匹配结果归档通过，次数2/待核对0。原始锁屏CDP刷新超时、500ms未锁准备和记录型NOT_DUE失败均保留；后者T811红转绿，57服务/37手机记录/13控制通过。Android源码/构建和最终安装摘要对齐；常规工作时段、真实来电/物理卡变化/重启/双目标自动下一条/全天多机型仍待外部环境，不扩大为完整平台可靠性。


2026-10-19上午补齐：S23真实来电RINGING状态[1,0]下，原生启动拒绝DEVICE_BUSY、无新增授权/外呼、队列停止（9检查）。原工作时段schema1同一队列两个不同受控目标实拨，第一结果后自动下一条，实际提交间隔79293ms，呼出观察8165/8348ms，最后FINISHED，双端许可撤销；用户均反馈未接。证明当前normal-window/真实自动下一条和响铃忙线子项，不代表物理换卡/停卡、已接通占用、重启或全天兼容均通过。证据enterprise-paired-validation-r106/acceptance.json。


2026-10-19本轮增量：按D032暂停停卡/换卡，仅推进其他验证。S23真实重启13检查通过，启动计数299→300，旧系统闹钟清除、冷开旧队列停止、无新增授权/自动恢复。前台有人操作的20条生成数据真实节拍演练通过，耗时约9.73分钟，最短提交间隔30.053秒，20条记录型请求/合成结果完成，队列FINISHED、待核对0。本轮真实外呼0；临时REHEARSAL业务时钟已按原字节恢复，系统时钟与LIVE时间未改。手机空闲、闹钟DISABLED、会话退出、双端无真实许可，LIVE仍为2联系人/4授权尝试/4API接受/待核对0。

证据边界：重启是实际设备boot299→300，不是仅杀进程；未来票据系统闹钟清除和冷开停队列已见证，未等待旧未来到点。20条测试不含后台Doze/真实媒体接通/全天。后续仅实际试点条件，不执行用户暂停的停卡/换卡。
