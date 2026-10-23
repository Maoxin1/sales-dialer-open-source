# 手机任务计划元数据（R091）

2026-10-16；R-CALL-091、F-CALL-001/005/010/011/012/013、T-CALL-601～611。当前实现每位销售单个待执行计划，后续可扩展队列；不是生产目标数量或每日200次硬上限。元数据子范围通过，尚无实际调度、电话尝试或真实适配。

SalesPlanModel为不可变纯规则，ContactTaskStore在同一SQLite写事务中读取当前联系人、草稿和销售计划版本。任务仍DRAFT，计划单独引用草稿快照。企业/销售来自可信Actor组合，不等于生产登录已实现。计划初始version0/暂停/空目标，直到明确安排才产生事件。

| 接口 | 输入与行为 |
|---|---|
| arrangePlan | 联系人ID、期望联系人/草稿/计划修订、dueAt、注入Clock；本人PLAN能力，最新合格且未拒绝草稿才允许；明确安排/改时间推进版本，重复旧版本STALE_PLAN不写 |
| getPlan | READ能力，仅返回当前销售最新元数据，不执行 |
| pausePlan | 期望计划版本；只暂停本人，清空目标/时间并推进版本；已暂停且版本匹配ALREADY_PAUSED，不新增事件 |
| recoverPlan | 明确使本人活动计划失效并暂停；未来执行器冷启动必须先接入该门槛；当前Store重开本身只恢复元数据，没有执行器 |
| inspectPlan | 期望版本与Clock；读权威资格/草稿，返回版本/暂停/资格失败、NOT_DUE、OUTSIDE_WINDOW、EXPIRED或DUE_METADATA_ONLY。到期状态不是消费、授权、电话请求或执行令牌 |

时间用北京时间UTC+8，周一至周五09:00含、18:00不含；允许在其它时间编辑未来合规计划，dueAt不能早于当前Clock。到期+30000毫秒仍在窗口，+30001毫秒过期。遇到过期会在事务中追加新版本EXPIRED暂停事件；观察到过期后重开或时钟回退不复活。最新资格/快照失效始终阻断；不会自动刷新、安排重试、补拨或恢复暂停。墙钟回拨在尚未观察过期前、单调时钟/boot守卫仍需未来实际执行链路验证。

schema3新增sales_plan_events：按企业/销售连续版本追加PLANNED/PAUSED/EXPIRED/RECOVERED，同一事件同时保存新状态和审计，事务提交前不对外返回成功。恢复检查连续版本、任务归属、联系人历史合格修订和真实草稿修订、整数时间、窗口及合法终止。缺版本或非整数数据拒绝并保留，不自动修库。校验只保证内部一致性，不认证同意来源或提供防篡改签名。

schema1/2在严格校验旧记录后事务升级3（需要时先建draft_events，再建计划表）；不覆盖已有联系人/草稿/审计，不伪造计划。文件名仍contact-tasks-v1.db。旧APK不支持schema3，暂无数据降级工具，不能直接回退APK代替数据迁移。本轮只创建随机隔离合成库，没有创建该正式文件。

实际测试：纯规则有效红灯NOT_IMPLEMENTED时原414断言通过，完成后新增4组30断言，共48组444；Store集成是实现后通过。S23 SM-S9180/API36最终四阶段62断言，含schema2合成库迁移、2迁移失败点、3计划写入回滚场景、2组两连接安排/暂停竞争、销售隔离、资格变化、过期后重开/时钟回退不复活、已提交恢复及插入事件但未提交时实际force-stop。主fixture本人计划从version6跨进程恢复，再显式recoverPlan到7/暂停；另一销售version1不变。中途强停fixture恢复version0/暂停/0计划事件，联系人/草稿revision2保持。

首个真机device在44断言后因测试库后缀planqualification超过隔离后缀16字符限制退出1；只修测试命名为planqual后62断言通过。该失败属于fixture输入，不是业务红灯。旧联系人T583～590另58断言、草稿T594～600另63断言，在最终包回归通过，不能相加冒充独立产品用例数。

实际构建/lint退出0，0错误3条既有警告；Java17.0.20.1、Gradle8.13、AGP8.13.2、Node24.18.0。最终APK SHA256 e9e7aa952bde814fd1cf127c66bd844518e3bbd4c06e30fa9ddd6b6eb3d06083。证据、命令/时间/退出码与源码摘要：evidence/android-sales-plan-r091/acceptance.json及各子目录。DEMO12目标7模拟尝试/已核对/暂停字节不变，旧受控APK/绑定/许可未改，0真实电话。仍仅SCHEDULE_EXACT_ALARM权限，无电话/网络权限，无新依赖。iPhone暂停。

~~~powershell
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Build
node tools/check-sales-plan-device.mjs --run
node tools/check-draft-refresh-device.mjs --run
node tools/check-contact-store-device.mjs --run
~~~

从项目根执行，手机命令按顺序运行，需要S23 USB调试已授权、本地设备绑定及原DEMO暂停，可锁屏。脚本安装独立仿真包、创建保留隔离合成库、强停/重开该包，写contact-store-check.json及证据；不会调用电话API、清任务或改旧许可。结束独立包已强停，可手动重开，DEMO仍暂停。手机“销售任务仿真→检查任务计划”仅运行plan-all，完整跨进程/中途强停须脚本。

必需后续：正式计划的原子尝试claim与测试替身提交/回执/结果，计划消费防重与未知结果不重放，实际运行器的冷启动/单调时钟/后台守卫；再接可信号码/生产身份/真实适配。当前DUE_METADATA_ONLY不能接电话端口。批量/全天/多机型、断电/磁盘满、并发首次建库/迁移未验证；不把本轮元数据成功当作完整安卓闭环或全天队列可靠性证明。

## R092后续状态
2026-10-16已接合成计划原子消费/UNKNOWN尝试/记录型端口/回执与人工结果/明确未知关闭，启动恢复门槛已接SyntheticTaskLoop；尚未接正式界面或实际AlarmManager/电话适配。当前schema4，最终包计划62项真机回归通过。详见android-synthetic-loop.md；DUE_METADATA_ONLY仍不能作为真实授权。
