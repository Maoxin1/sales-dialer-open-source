# 安卓本机草稿与本地计划（R096/R097）

2026-10-18 R096/R097：本机联系人→显式草稿→本地计划编辑子范围通过，整体仍部分通过。74组608 Java断言、600解析向量、S23 SQLite98断言、草稿界面20项/计划界面21项通过；build/lint0错误7警告。实际区0联系人，格式区6生成联系人/2测试草稿/计划version5暂停，无执行请求或电话。新链路未接电话/实际运行器或企业认证；原真实APK/DEMO/合成工作区保持。iPhone暂停。详见[实现边界](android-local-drafts-plans.md)与[本轮证据](../evidence/android-local-plan-r097/acceptance.json)。

在手机“销售任务仿真→打开本机号码暂存”，明确选择联系人，记录已有资格后点击“显式生成本地草稿”。资格变化后旧草稿标失效，“显式刷新本地草稿”才推进快照。导入/重导入不自动建或刷新。拒绝联系保持。草稿带资料类型、私有slot、不透明目标和联系人修订，不代表企业/销售登录或电话许可，格式测试草稿不能成为真实目标。

“编辑本地计划”保存明确的北京时间和期望版本；输入框建议值需要用户保存，不产生闹钟。周一至周五09:00含至18:00不含，旧版本/资格/草稿、过去或非工作时间拒绝。暂停幂等，重新进入资料区/强停重开会明确恢复暂停，需要重新安排；普通仓库只读打开不修改计划。当前到时只是DUE_METADATA_ONLY，未接执行器，不拨电话。没有改变原安卓自动拨号目标。

PhoneIntakeStore schema3共9表；schema1/2先验证表结构、类型和历史，再一次事务加缺失表。草稿事件验证目标修订确曾合格，计划逐版本验证资格和草稿历史，缺事件/错库保留并拒绝，不清库。旧APK不支持schema3，不能把回装当数据降级。原号码私存，无不受保护getter。

~~~powershell
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Build
node tools/record-core-run.mjs evidence/local-store-new-run R-CALL-096,R-CALL-097 node tools/check-phone-intake-fixture-device.mjs --run
node tools/record-core-run.mjs evidence/local-draft-new-run R-CALL-096 node tools/check-local-draft-ui-device.mjs --run
node tools/record-core-run.mjs evidence/local-plan-new-run R-CALL-097 node tools/check-local-plan-ui-device.mjs --run
~~~

项目根执行；evidence目录须新建且不同名。手机命令顺序运行，USB/本地绑定有效、原DEMO暂停、已有合成库用于保留比对。固定fixture可锁屏，只用随机生成库；UI需解锁，在格式区分别新增一条生成记录，保留原历史、不导入客户或旧受控号码。均不需要电话授权/拨号时段；不会更改手机系统设置，结束强停独立包。局部Java测试包含R096/R097和相关规则；Build执行assembleDebug/lintDebug。完整设备E2E为上述两条UI脚本。实际电话/全天/200真实尝试未运行，旧200合成证据只复用不外推。

回传run.json/output.log、phone-fixture.json、local-draft-ui-cases.json/local-plan-ui-cases.json及PNG/XML。首个业务NOT_IMPLEMENTED红灯保留；首轮UI驱动dump/cat路径不一致读旧XML，未开始导入，失败保留。驱动改为删除固定临时XML、验证新dump再读同路径，且只点击本包。通过证据不能覆盖这次失败。当前74组608、600向量、98SQLite、20/21UI，实际区业务及旧DEMO/合成库字节、真实APK均保持，正式contact-tasks-v1.db未创建。无生产认证、真实手机适配、批量自动队列/全天/多机型保证。
