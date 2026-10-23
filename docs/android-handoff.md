# 安卓任务交接契约 v1（当前仅合成仿真）

2026-10-15。关联M006、R-CALL-030、F-CALL-003/005/011/013、T-CALL-108～115。本轮把已有任务授权/持久化连接到USB手机接收器，不是生产真实拨号适配已经完成。原Android+iPhone、销售SIM及自动程度目标不变；本轮真实呼叫新增0次。

## 已实现链路

销售自己的合成联系人 → 任务 → 最新资格/时段/计划/权限/占用检查 → 持久化HANDOFF_UNKNOWN和完整命令 → 显式USB设备上的SyntheticBridgeActivity → SQLite保存去重标记 → 原子发布回执文件 → 主机核对回执 → 显式模拟核对 → 下一条合成任务。

原内存替身consume仍要求FakeDialAdapter；新增consumeAndroid只接受AndroidSandboxAdapter。两者复用同一私有消费函数，未把浏览器JSON命令开放成任意传输回调。代码级transport是可信本地开发接口，不是生产网络权限边界。

## 命令和回执

命令只允许以下字段，拒绝多余字段、real模式、非SYNTHETIC标识和无效数值：

| 字段 | 含义/约束 |
|---|---|
| schemaVersion / mode | 1 / simulation，手机端重复检查 |
| tenantId / salesId / taskId / attemptId / intentId / targetKey | 合成企业、销售、任务、授权尝试、触发意图及目标；均SYNTHETIC标识 |
| deviceId / simId | 本地测试绑定；当前simId只是SYNTHETIC-NO-SIM，不是实际SIM账户授权 |
| cycle / planVersion / policyVersion / qualificationRevision | 正整数；资格revision在交接时读取最新已确认值，原授权快照仍保留 |
| issuedAt / expiresAt | 毫秒整数；最多60秒实验传输TTL，到期拒绝；不是已采纳生产迟到容忍或重拨规则 |

交接前在同一SQLite事务保存完整androidCommand及HANDOFF_UNKNOWN，再进行USB通信。SHA-256按实际发送JSON字节计算，仅用于命令/回执关联，不是签名或身份认证。ADB明确指定serial，不自动选第一台；没有开启网络监听、adb TCP或其他远程入口。

设备SQLite主键为(tenant,attempt)，并限制(tenant,intent)、(tenant,task,cycle)唯一。相同命令只返回重复标识，改变同一授权的目标/内容拒绝；已见更新plan版本后拒绝旧版本。设备账本只证明已接收的合成命令，不替代服务器实时撤回状态。开发数据库不自动清空。

回执包含schemaVersion、mode=simulation、source=ANDROID_SIMULATION、attemptId、deviceId、commandDigest、status=SIMULATED_ACCEPTED、actualPhoneApiCalls=0和duplicate。设备先提交账本再通过AtomicFile发布回执；缺回执、超时、格式/摘要/授权/设备不匹配、非仿真来源或声称调用电话，一律在主机记UNKNOWN/RECONCILE_REQUIRED并保留占用，不自动重发。设备拒绝也保守保留待核对，暂不实现自动释放。

核心现有apiSubmission=SUBMITTED在本路径的含义是仿真接收器接受，不是TelecomManager调用；来源始终SIMULATION。androidReceipt明确记录SIMULATED_ACCEPTED/0电话API；不得据此生成O/C观察。任务结束须显式模拟核对，本次演示按UNKNOWN结果关闭，不填已接通。

## 运行与验证

在项目根：

```powershell
npm.cmd --prefix packages/core run test:android-handoff
npm.cmd --prefix packages/core test
npm.cmd --prefix packages/core run check
& .\tools\build-android-local.ps1 -ExistingTools
& .\tools\build-android-local.ps1 -Lint
& .\.tooling\android-sdk\platform-tools\adb.exe devices -l
```

连接并允许USB调试后，把下方SERIAL换为明确选定的设备：

```powershell
& .\.tooling\android-sdk\platform-tools\adb.exe -s SERIAL install -r prototypes/android/app/build/outputs/apk/debug/app-debug.apk
npm.cmd --prefix packages/core run android:demo -- --serial SERIAL
node tools/check-android-inbox.mjs SERIAL evidence/android-inbox-NEW-RUN
```

演示使用真实当前电脑时间，遵守已采纳的工作日09～18窗口；窗口外任务创建会拒绝而不会偷偷切到虚拟时间。每轮新合成企业/两条任务及项目.local数据库，保存新的evidence目录，不读取真实名单/号码；参数不接受电话号码。手机必须已安装本轮APK，USB断连/签名/授权不足会得到错误或待核对。脚本自动退出；Ctrl+C中止时，已交接未知仍需核对，不能重新打开旧任务自动重放。核心生产身份、实际设备/SIM配对尚未实现。

手机端额外入口只做合成账本，没有调用Probe/Telecom/电话Intent。既有单目标真实探索入口与此隔离，不能通过此USB入口打开真实模式。正式发布前须移除或限制此开发exported Activity；当前是本地debug原型。

## 真实证据及限制

- 首次可加载接口运行出现13项功能未实现红灯；实现后13绿，补时效/绑定/提交失败/资格revision场景后新增16项共用测试。总回归159通过，语法38个模块通过；原业务断言保留。
- 实际S23 Ultra Android16：两任务USB闭环17检查点通过，包括核心不重发和手机force-stop重开后重复命令不重复执行。
- 手机接收器8项检查通过：real模式、额外字段、过期、非合成目标、非整数版本拒绝；正常命令接受、同授权改目标拒绝、相同命令幂等。
- APK构建和lint通过（0错误、10原有警告），安装包SHA与设备包SHA一致。原电话API提交日志仍3条，较上轮新增0；原型配置仍仿真/暂停、无planId。

证据：[总回归](../evidence/android-handoff/all-tests-fixed/run.json)、[业务红灯](../evidence/android-handoff/red/run.json)、[首次绿灯](../evidence/android-handoff/green/run.json)、[手机闭环](../evidence/android-handoff/device-demo-final/result.json)、[原生入口检查](../evidence/android-handoff/native-guards/result.json)、[设备/包/无新增呼叫](../evidence/android-handoff/device-final.json)。最初总回归命令错误地把目录作为Node入口，MODULE_NOT_FOUND只算运行命令错误；改为枚举测试文件后通过，错误日志保留在all-tests，不算业务红灯。

尚未实现：浏览器选择手机并发送任务、生产设备/SIM身份绑定与通信认证、同步撤回/暂停到手机、生产期限/排序规范、正式真实外呼适配和自动结束判定。ADB交接仅开发路径，不适合作为售卖产品的运行依赖。原真机三通证明单次SIM可行性，不能覆盖本轮新任务链路的真实拨号；后续真实验证需另约额度。


## 时间契约修正（R035）

原生入口现在要求先取得SyntheticLeaseActivity为命令摘要生成的接收凭据，AdbSyntheticTransport.send自动完成。主机保留原始命令/摘要及本地生命周期，手机检查持久token、本机elapsedRealtime截止和BOOT_COUNT，不再比较主机issuedAt与手机当前日期。以前不带凭据直接调用SyntheticBridgeActivity的命令会被拒绝；现有CLI/工作台已由传输层统一适配。

设备期限保存在私有lease-HASH.json，同摘要再次申请不会延长，进程重启不重置；旧系统启动凭据拒绝。主机扣减往返时间后只会收紧截止。去重账本不变，未知不自动重试；超过期限的重复命令可能拒绝，不能据此抹去第一次是否已交接的未知。

这是受信任本机USB开发协议，token不代表生产签名。没有电话API，不能据此放开真实外呼。iPhone按用户新决定最后验收。
