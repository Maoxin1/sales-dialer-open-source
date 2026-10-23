# 安卓核心合成提交闭环（R092）

2026-10-16，R-CALL-092、F-CALL-001/005/006/010/011/012/013、T-CALL-612～625。联系人→明确计划→原子消费→记录型端口→模拟回执→人工合成结果→明确下一计划已连通。当前仅固定合成数据，未实现正式名单输入、生产身份、实际手机定时器或电话适配；原自动拨号范围保留，整体产品仍部分通过。

| 位置 | 当前行为 |
|---|---|
| SyntheticAttemptModel | 不可变SIM-ATTEMPT身份、UNKNOWN/RECONCILED、模拟API回执、人工结果与独立unknownClosed；实际呼出/接通字段始终未知 |
| ContactTaskStore.claimSynthetic | 同SQLite事务复核本人PLAN、计划/资格/草稿、时间、设备IDLE及无未核对尝试，暂停消费计划、写尝试和CLAIMED/UNKNOWN审计，再返回；每计划唯一plan_seq绑定 |
| SyntheticTaskLoop启动 | 先recoverPlan暂停旧活动计划，保留未知尝试；随后只能明确安排新计划。当前仅由固定fixture调用，尚未接入正式界面/AlarmManager |
| RecordingPort | final记录型模拟端口，仅接收尝试ID和目标摘要；ACK/FAIL/LOSE_ACK三种固定模式。无号码、电话实现、外部端口或真实开关 |
| 模拟提交 | 持久UNKNOWN后校验墙钟、单调耗时、boot和30秒预算，再验证持久状态，记录请求前再校验；失败仍待核对，不自动重放 |
| 回执/结果 | 模拟API回执不释放待核对占用；NO_ANSWER/COMPLETED为明确人工合成结果，相同记录幂等，已明确结果不接受冲突改写。历史核对不因后来拒绝而丢失 |

人工UNKNOWN本身保留占用。复用既有R016：独立closeSyntheticUnknown要求本人能力、已记录UNKNOWN、IDLE及明确确认无待处理通话；追加CLOSED_UNKNOWN审计与unknownClosed，不改变manualResult=UNKNOWN，也不把呼出/接通填成0或1。确认条件目前由合成测试提供，未证明真实手机状态。关闭只结束旧占用，不能重放原尝试；下一次必须新计划，仍复核所有守卫。

schema4增加synthetic_attempts和synthetic_attempt_events，source固定SYNTHETIC。尝试关联原PLANNED事件及同次PAUSED消费事件，事件版本连续，恢复验证稳定ID、作用域/目标/原计划、声明时间、消费配对、回执/结果/关闭链及每销售最多一条未核对尝试。错ID/缺审计停止保留，不自动删库修复。已验证schema1～3后原子升级4，旧联系人/草稿/计划不覆盖、旧计划不伪造尝试；文件名仍contact-tasks-v1.db，本轮没有创建该正式文件。旧APK不能读schema4，无数据降级工具。本轮中间版本fixture保留为历史证据，不能枚举后当正式数据或自动重建。

提交前写入失败没有端口请求或半条尝试；提交后丢回执、回执落库失败、结果落库失败、超时/boot变化均保留可核对记录。已提交claim属于在途，暂停不表示能够撤销已交端口的请求或挂断。过期claim观察会持久暂停，之后时钟回退不复活。单调时钟/boot目前注入测试，并非真机电话运行器/全天后台证据。

本轮具体Bug：端口前读取持久UNKNOWN可能耗尽预算，原代码只在读取前检查，导致模拟请求越过30秒预算。device-slow-read-red在52断言处以EXPECTED_EXECUTION_WINDOW_CLOSED失败；修复为持久验证完成、记录请求前再次检查，最终回归通过。纯尝试模型另有有效NOT_IMPLEMENTED红灯，原444断言通过，完成后新增4组36，总52组480。Store/闭环集成是实现后检查，不冒充所有代码均测试先行。

S23 SM-S9180/API36最终完整驱动97断言通过：3个claim回滚点、2迁移回滚点、5种时钟/boot/慢读取守卫、两连接竞争一次消费、回执丢失/落库失败、结果落库失败、显式未知关闭、提交后新进程恢复，以及提交前插入未提交和提交后未调用端口两个实际force-stop场景。提交前恢复无尝试，启动恢复暂停旧计划；提交后UNKNOWN保留且零重放。

容量：50个不同合成目标、200个独立尝试/记录型请求/模拟API回执，显式逐次重新安排并写入NO_ANSWER，约1425ms；跨进程重开后200记录和50目标完整，计划version400/暂停。不是200不同号码、自动重拨、真实接通率或全天吞吐；人工耗时未测，测试代写结果不是销售实际操作。原计划/草稿/联系人在最终包另有62/63/58真机断言回归通过，各口径不相加冒充产品用例数。

失败证据保留：初次中间版本device通过89断言；加入恢复及慢读取测试后device-slow-read-red业务失败。修复后device-final的all阶段超时，原因未确认；同一APK直接all通过78，随后device-final-retry完整97通过。超时不能被覆盖为成功，驱动现会采集限定进程诊断；不把复测成功推为后台全天可靠。

最终APK SHA256 911f9630229b741c31d3803e6f37986bf873c92c02cb201efbbe2757f17457f3；build-slow-read-fix退出0，lint0错误3既有警告。Java17.0.20.1/Gradle8.13/AGP8.13.2/Node24.18.0，无新依赖。仍仅SCHEDULE_EXACT_ALARM，无电话/网络权限。源码摘要、命令/退出码、阶段报告及失败见evidence/android-synthetic-loop-r092/acceptance.json。原DEMO12目标7模拟尝试/已核对/暂停字节不变，旧受控APK/许可/绑定不动，本轮0真实电话，iPhone暂停。

~~~powershell
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Build
node tools/check-synthetic-loop-device.mjs --run
node tools/check-sales-plan-device.mjs --run
node tools/check-draft-refresh-device.mjs --run
node tools/check-contact-store-device.mjs --run
~~~

项目根执行，手机命令顺序运行，需S23 USB已授权、本地设备绑定和原DEMO暂停；固定fixture可锁屏完成，但存在一次未确定原因的超时记录。脚本安装独立包、建保留的随机合成库、强停/重开该包，不拨号、不清原任务/旧许可。结束包强停，手动重开DEMO仍暂停。手机“销售任务仿真→检查合成提交闭环”只跑all，完整进程/容量检查需脚本。

下一项步骤5：提供可操作的合成联系人/任务工作区，复用本次同一核心完成导入/选联系人→安排或立即模拟→核对→下一次、暂停及历史；建立独立标记的持久合成工作区，不使用正式联系人文件或历史fixture，不接受真实号码。之后再接可信号码/身份、实际调度及新有界授权的手机适配。真实双卡/通话观察、后台/锁屏/全天/多机型、断电与生产身份仍未验收。
