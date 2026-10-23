# 安卓草稿显式刷新（R090）

2026-10-16，R-CALL-090，F-CALL-001/010/011/012/013，T-CALL-591～600。只交付联系人元数据与初始DRAFT刷新，未接真实号码、生产身份、任务调度或电话发送器。当前子范围通过，整体产品仍部分通过。

ContactTaskModel.refreshDraft(actor,task,contact,expectedContactRevision,expectedDraftRevision)为纯规则；ContactTaskStore.refreshDraft(contactId,expectedContactRevision,expectedDraftRevision)在SQLite写事务内读取权威联系人和草稿，再执行相同规则。Actor仍是可信组合输入，不是客户端可自行声称的生产身份。

| 输入/情况 | 行为 |
|---|---|
| 非本人/无PLAN能力 | FORBIDDEN，不改草稿/审计 |
| 非正修订；联系人期望版本不符 | INVALID_REVISION或STALE_CONTACT，不写 |
| 最新联系人拒绝/非CONFIRMED | DO_NOT_CONTACT或CONTACT_NOT_QUALIFIED；幂等请求也必须经过此检查 |
| 旧草稿且期望草稿版本不符，或期望高于当前 | STALE_DRAFT，不覆盖 |
| 旧草稿+双修订匹配+资格有效 | REFRESHED；推进contactRevision至当前联系人版本，任务ID不变，仍DRAFT |
| 草稿已最新且草稿期望≤当前 | ALREADY_CURRENT，同对象/快照，无新审计；联系人期望及资格仍须有效 |

草稿contactRevision作为单调快照标记，可跨过中间联系人修订，不是电话尝试数或计划版本号。任务更新与draft_events的REFRESHED(from_revision,to_revision)同事务提交；三处失败（更新后、事件后、提交前）全部回滚。两连接重复刷新仅一次REFRESHED、一次ALREADY_CURRENT；与资格撤回竞争时，撤回先提交则刷新失败，刷新先提交则随后撤回立即使该快照过期。

库仍命名contact-tasks-v1.db（稳定文件名），内部schema升级为2。schema1必须先通过旧库/记录/事件/初始草稿验证，再在一个事务中新增draft_events及变更目录version/user_version；旧联系人、草稿和资格审计保持，不伪造历史刷新。迁移创建表后/提交前失败均回滚到完整schema1，可重新打开继续。未知schema仍拒绝，不自动重置。旧版standalone只认识schema1，不能直接回退APK来读取schema2；本轮没有数据降级工具。

恢复时从初始草稿快照1沿刷新审计链推进，检查整数类型、前后顺序及任务身份，并与联系人历史中的CONFIRMED且未拒绝修订核对。缺事件、非法数值、推进到不合格修订或最终快照不一致均拒绝并保留。此为内部一致性检查，不是资格真实性认证或防篡改签名。重新导入、资格更新、重开不会隐式刷新。

实际证据：evidence/android-draft-refresh-r090。纯规则有效红灯为NOT_IMPLEMENTED（旧397断言通过），实现后新增3组17断言，共44组414；Store及迁移集成为实现后直接通过，不称为Store测试先行。最终S23 SM-S9180/API36四阶段63断言，3个刷新回滚点、2个迁移回滚点、2组连接竞争、已提交后新进程重开、更新草稿未写审计前实际force-stop后恢复旧快照均通过。迁移用重建的schema1合成库，不涉及真实客户库。主fixture最终联系人revision6/拒绝、草稿revision5、6条联系人事件/3条刷新事件；强停fixture仍联系人2/草稿1/0刷新事件。原联系人存储58项真机断言在最终包回归通过。

最终build/lint退出0，0错误3条既有警告；Java17.0.20.1/Gradle8.13/AGP8.13.2/Node24.18.0。APK SHA256 3cf530875cba6a09e59127bcc350b1df4f83120dcc0222830afeef34f9d48d56。应用仍只申请SCHEDULE_EXACT_ALARM，无电话/网络权限，无新增依赖。本轮0真实电话；DEMO文件12目标7模拟尝试/暂停字节完全不变，旧受控APK不变，正式联系人文件仍未创建。iPhone暂停。

~~~powershell
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Build
node tools/check-draft-refresh-device.mjs --run
node tools/check-contact-store-device.mjs --run
~~~

从项目根执行，后两条按顺序运行。真机需已授权USB、本地设备绑定及原DEMO暂停，可锁屏取证。脚本安装独立仿真APK、创建隔离合成库、强停/重开该包并写报告，不清原任务/旧许可、不拨号。菜单“检查草稿刷新”只执行draft-all，跨进程/中途强停用脚本。结束包被强停，可手动重开，仍暂停。Android活动只接受固定phase，外部数据库/企业/启用字段无效。

尚未验证：设备断电/磁盘满、多进程同时首次建库或迁移、真实身份/号码入口、计划与尝试记录、独立电话适配、全天/多机型队列。下一项步骤5为正式手机任务的计划时间、版本与暂停元数据，先固化合成契约/注入时钟，复用已采纳北京时间工作日窗口、30秒执行窗口、过时不补拨和暂停需重排规则；本项没有创建任何计划或呼叫。

## R091后续状态
2026-10-16已实现独立计划元数据，当前schema3在严格验证schema1/2后事务迁移，草稿规则保持。最终R091包T594～600/63真机断言回归通过。下一项为正式计划的原子尝试claim与合成提交，计划元数据不等于外呼授权，详见android-sales-plan.md。
