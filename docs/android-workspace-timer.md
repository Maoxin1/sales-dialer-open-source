# 安卓工作区单次定时仿真 R094

2026-10-16，步骤5；R-CALL-094、F-CALL-003/005/010/011/012/013、T-CALL-641～655。新工作区接入原生单次闹钟，仍固定合成身份/目标/RecordingPort，无真实电话、号码输入或生产认证。原Android自动拨号目标保留，iPhone暂停。

## 入口和行为

手机“销售任务仿真”→“打开合成任务工作区”，选择合格且草稿最新的SIM联系人。“安排模拟时间”现在会把明确的未来时间保存为单次自动模拟；时间仍为北京时间yyyy-MM-dd HH:mm、工作日09:00含～18:00不含。新增“30秒后自动模拟所选”，只便于受控合成验证，不是生产重拨间隔或队列默认值。

到时经过最新计划/资格/草稿/占用和30秒窗口检查后，核心记录合成API回执，保留UNKNOWN占用；销售明确选择模拟未接/完成或关闭未知后才可下一次。自动回调在前台更新界面，退到桌面后持久记录，回到工作区读最新状态。可点“刷新定时结果”主动刷新。不会自动追加或重拨下一条。

暂停或明确修改计划使旧闹钟失效；普通用户重新进入工作区仍先暂停旧活动计划，须明确重排。强停/重开不恢复票据、不补发；无BOOT/权限恢复自动重排。手动执行未到时仍返回NOT_DUE且不撤销有效闹钟；立即执行成功建立新版本后使旧票据失效。修改当前计划目标的资格/拒绝会暂停该计划，不影响其它联系人的活动计划。

## 实现与证据边界

WorkspaceTimerModel为纯Java票据规则；Coordinator组合SQLite计划、票据接口、闹钟接口和固定记录型端口。Android Runtime绑定独立workspace-timer.bin AtomicFile与requestCode9401，不复用原DEMO文件或闹钟。票据绑定version/dueWall/dueElapsed/BOOT_COUNT和随机token；错版本/token不消费新票据。接收器非导出，仅接受固定Action，不接受数据库、身份、号码或注入时钟。固定检查Activity忽略所有外部参数，只操作随机隔离fixture。

两种启动明确分开：普通Session构造保留恢复暂停；合法定时回调只有票据与最新计划匹配后才能进入包内专用执行入口，避免构造器取消合法到期任务。票据先持久撤销，再由同一Store原子消费计划并记UNKNOWN，最后调用RecordingPort；崩溃落在撤票与claim之间会丢本次自动执行，后续明确重排，不重放。落在claim后则保留UNKNOWN待核对。SQLite与AtomicFile不宣称跨文件原子事务，以版本绑定及先撤票顺序停止重复。

墙钟与单调时间均须到时、未超过30秒且同boot；墙钟相对单调的差超过2秒则停止。2秒仅是当前仿真的采样/校时守卫，不放宽生产时间规则。端口前再检查，不能用早先读取的时钟遮蔽慢持久化。资格/修订/占用由核心事务读取最新。所有UI工作和Receiver工作使用同进程串行锁，SQLite仍独立防重。Receiver用goAsync和后台短线程，finally finish；没有服务、网络或电话调用。

使用已有SCHEDULE_EXACT_ALARM，安排和到时均检查精确闹钟与后台限制；缺权限/系统状态不明时拒绝，不静默降级。官方接口核查日期2026-10-16：[AlarmManager调度及权限说明](https://developer.android.com/develop/background-work/services/alarms)、[BroadcastReceiver异步处理接口](https://developer.android.com/reference/android/content/BroadcastReceiver#goAsync())。这些资料支持接口用法，不能证明当前应用全天可靠；精确闹钟的商用分发资格及真实电话后台限制仍须后续平台验收。

## 检查入口

项目根执行，无新依赖；Node24.18.0、项目Java17.0.20.1、Gradle8.13/AGP8.13.2、SDK36：

```powershell
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Build
node tools/record-core-run.mjs evidence/workspace-timer-new-run R-CALL-094 node tools/check-workspace-timer-device.mjs --run
node tools/record-core-run.mjs evidence/workspace-timer-fixture-new-run R-CALL-094 node tools/check-workspace-timer-fixture-device.mjs --run
node tools/record-core-run.mjs evidence/workspace-timer-controls-new-run R-CALL-094 node tools/check-workspace-timer-controls-device.mjs --run
node tools/record-core-run.mjs evidence/workspace-timer-cold-new-run R-CALL-094 node tools/check-workspace-timer-cold-device.mjs --run
node tools/check-synthetic-loop-device.mjs --run
```

证据目录每次换未存在路径。手机命令顺序运行；UI脚本需USB授权/已有本地绑定、手机解锁、当前工作时段、原DEMO暂停、已有用户工作区且无待核对，至少一个合格SIM联系人，以及已允许闹钟和后台运行。它明确安排两次合成提交并核对为模拟未接，另两次用于暂停和强停重开验证；不改变真实app、许可、名单或系统权限，不清库。脚本结束只强停独立仿真包。固定fixture可锁屏，必须已有用户工作区用于前后只读摘要比较。

纯规则：red退出1/NOT_IMPLEMENTED，原510断言通过；jvm退出0，新增5组17，总62组527断言。隔离SQLite/票据22断言通过，覆盖重复/旧票据不影响新计划、合法回调不误恢复暂停、最新拒绝/草稿失效、超时/boot、权限阻挡、arm失败回滚到暂停、撤票写失败零端口、文件写后恢复及坏文件保留。首轮device-fixture在第9断言误期望DO_NOT_CONTACT，实际既定STALE_CONTACT优先；修改测试原因后通过，未修改核心断言来放宽安全条件。

冷启动脚本会以同一仿真应用UID向自身PID发送SIGKILL，模拟普通进程丢失，保留系统闹钟；先验证单一PID确实消失，再验证新PID和实际回调。它不同于force-stop，不操作真实app。首轮am kill没有实际结束进程，device-cold保留失败，不当冷启动通过；重试改用上述方式，证据单列。普通前后台切换只刷新，不等于新建Session；新建会话/强停后重开才恢复暂停。计划编辑局部回归还检查NOT_DUE保留原票据、资格变更撤票、确认不隐式刷新及明确重排/暂停。

真实通话、实际电话占用/双卡/撤权、全天/多机型、锁屏深度休眠及生产身份仍需后续证据，不能用少数合成闹钟证明可靠性。最新实测与源码/APK摘要见evidence/android-workspace-timer-r094/acceptance.json；R093说明保留为历史快照。


## 本轮实际结果
最终62组527 Java断言、S23隔离22、定时驱动78（其中包含逐秒重复等待观察）、计划编辑18、模拟进程丢失10检查通过，原核心97回归及50目标200明确模拟尝试约1963ms/跨进程恢复通过。没有把各断言数量相加当产品功能数。前台和桌面后台各一条，SIGKILL模拟进程丢失后新PID回调再一条，本轮3次合成尝试/回执均核对为模拟未接；真实电话0。最终4联系人、6尝试/回执、3不同合成目标、4人工明确未接、2UNKNOWN明确关闭、0待核对、计划version29暂停。原DEMO12目标7模拟尝试字节及旧真实APK保持，正式库未创建。
构建/lint退出0，0错误6警告；最终APK 6df4ef7654c017f4005cba8136cc322d6a66e3dd281cb94b635a19975dd3bbde与S23安装一致。device-fixture首轮原因预期错误、device-cold未真正结束进程均保留；重试成功不覆盖失败。冷启动脚本oldPid28521消失，新Pid29085完成version28回调，随后进入界面核对；这是显式模拟进程丢失，不代表系统主动回收/深度Doze。完整输出/版本/源码摘要见acceptance.json。下一步继续5，真实名单与合成隔离输入/号码映射及禁用态；真实适配仍未连接，任何真实外呼另需当前有界授权。
