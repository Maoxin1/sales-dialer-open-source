# 安卓联系人与初始草稿存储（R089）

2026-10-16；关联R-CALL-089、F-CALL-001/010/011/012/013、T-CALL-581～590。本轮交付独立SQLite元数据Store，未接真实号码输入、生产身份或电话发送器。S23固定合成库验证通过；不是整产品验收。

ContactTaskStore在com.mantou.salesdialer.contacts；生产构造器固定contact-tasks-v1.db，本轮没有创建该文件。检查活动仅使用随机命名contact-fixture-<32位hex>.db，不能通过Intent指定数据库、企业、销售、号码或启用真实外呼。固定phase仅用于检查、重开和中断恢复。演示TaskEngine的simulation-tasks.bin不迁移、不覆盖。

| 操作 | 事务与失败行为 |
|---|---|
| 首次导入 | 联系人、初始DRAFT、IMPORTED事件同事务提交；任一阶段异常全部回滚 |
| 重复/冲突 | 企业+targetKey唯一；本人重复返回原联系人及持久的原DRAFT，不覆盖资格/拒绝/修订；同企业他人冲突无对象详情；跨企业独立 |
| 资格/拒绝 | 可信注入Actor的明确能力+本人归属+期望修订检查；联系人CAS更新与事件同事务；拒绝不可清除；任务仍保留原快照，因此可能STALE_CONTACT |
| 读取/计划前检查 | 列表限定企业和销售；读取他人返回FORBIDDEN；计划前检查在事务内读最新联系人及草稿，不产生计划或电话许可 |
| 重开 | 校验application_id、user_version、库类型、表定义、外键、稳定ID、来源、整数修订及事件连续重放；不匹配或损坏停止，保留原文件，不自动删库重建 |

数据库schema1采用四张业务表catalog_meta/contacts/tasks/contact_events，以及Android自动生成且严格校验定义的android_metadata、SQLite内部表。外键启用，WAL、synchronous=FULL、busy_timeout=5000；写事务beginTransactionNonExclusive串行竞争。存储恢复工厂为包内可见，不能绕过稳定身份、来源和任务归属验证。事件重放证明内部一致性，不认证资格声明，也不是防篡改签名。数据库打开失败不自动重置。

真实失败与修复：最初S23存在Android自动生成的android_metadata，原校验把它误判成错误库；保留device退出1及initial-schema.json，精确允许该系统表后通过。另以revision=1.5注入损坏记录，device-numeric-red退出1/EXPECTED_INVALID_STORED_CONTACT，证明Cursor.getLong截断导致缺少拒绝；现已严格检查FIELD_TYPE_INTEGER，并验证坏值仍保留。

实际检查：Java原39组386断言加恢复2组11断言，共41组397；S23四阶段58断言，包含5个失败注入点、3组双连接竞争、已提交数据强停后重开、插入联系人但未插任务/提交时强停，再开验证0联系人/0任务/0事件。主fixture最终2联系人/2草稿/4事件，当前销售只见1条、联系人revision3且拒绝、旧草稿revision1。DEMO字节前后相同、12目标/7模拟尝试/暂停；原探索APK摘要未变，实际呼叫0。

构建/lint退出0，0错误3条既有警告；APK SHA256 fe30a3fcd259d2fe9bad637e986f423b7738e04dec7c2281a4e0b84e910e21d4。完整命令/退出码、四阶段报告和源码摘要在evidence/android-contact-store-r089。只有SCHEDULE_EXACT_ALARM权限；无电话或网络权限。无新增依赖。

项目根可执行：

~~~powershell
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Build
node tools/check-contact-store-device.mjs --run
~~~

最后一条需要已配置的S23通过USB连接、DEMO原本暂停；可锁屏执行。会升级独立仿真APK、创建保留的隔离合成库，强停仅该包并写独立报告；不清任务或许可。手机“销售任务仿真→检查联系人存储”只运行all阶段；跨进程/强杀完整检查用上方命令。结束脚本强停独立仿真包，可手动重新打开；合成任务仍暂停。

未验证：断电/磁盘满/硬件损坏、多设备共享、新库首次同时创建、超过当前样本的竞争/大名单吞吐、生产鉴权/号码解析/来源真实性、实际计划与拨号、跨机型兼容。单次强停恢复不能证明所有崩溃或全天可靠。既有用户名单资格声明保持，不再索取证明；iPhone按用户要求暂停。

下一小项步骤5：显式刷新过期DRAFT快照。补期望联系人/草稿修订、本人PLAN能力、最新资格/拒绝复核与审计事务；重复刷新不增加版本，冲突不覆盖，重导入仍不隐式刷新。仅刷新草稿，不创建计划、尝试或外呼授权。随后才接计划时间/版本与可信真实输入。

## R090当前状态更新
2026-10-16已完成显式草稿刷新；当前schema2新增draft_events，并对已验证的schema1执行事务迁移，不改变文件名。上述schema1/下一小项描述保留为R089历史范围；当前规则和降级边界见android-draft-refresh.md，下一项转为手机计划元数据。R089联系人场景在最终R090包58项真机回归通过。

## R091后续状态
当前schema3新增销售计划事件表，已验证schema1/2事务迁移，原联系人/草稿规则不变；最终包T583～590/58真机断言回归通过。生产身份/号码/真实适配仍未接入，详见android-sales-plan.md。
