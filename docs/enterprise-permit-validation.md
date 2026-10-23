# R105：有界真实验证许可的准备工具

2026-10-18增量；沿用原自动拨号需求和D-CALL-030。本轮只补准备流程与失败恢复，**没有为真实手机创建/部署许可，没有拨号**。安卓APK、企业服务的电话链路未改，历史S23记录型证据继续有效；真实部署仍未运行。

## 已实现与检查

CLI：tools/prepare-enterprise-live-permit.mjs；编排模块：packages/enterprise/src/live-validation-preparation.mjs。依赖仍是已有Node内置模块，不新增账号或费用。

准备先核验工作日北京时间09:00～18:00、双方当次同意、5分钟内确认、最大次数1～10（受控工程单次上限，不是生产日上限）；临近18点、无法容纳15秒开始时间时拒绝。没有参数改时钟/跳窗口/自动开始电话。

持有本项目私有互斥锁后，检查当前没有生效许可，服务身份为实际企业销售且无待核对；检查手机用户0、当前APK、已选销售SIM绑定和受保护登录文件存在。已有名单可能超过200条，按受控目标掩码分页找到稳定target/revision，重读身份和待核对，再创建版本计划。资格未知/拒绝/已清除不被重导入“修复”为可拨。

两阶段发布：手机暂存并读回核对→激活该份手机文件→电脑原子发布签名许可。准备成功只返回PREPARED_ONLY_NOT_ARMED，不设置AlarmManager、不调用claim/apiReceipt/拨号。手机还须使用匹配销售账号明确启动；许可和服务同时核验设备/SIM/目标/时效/次数。

失败时清理自己创建的双方许可，只暂停仍属于本次的队列；不暂停别处新建的替代队列。队列创建回执丢失不盲目重试，清理/锁状态不确定统一CLEANUP_REQUIRED并列出项目；不能把部分完成报成成功。进程被强杀或ADB断开不等于已撤销，恢复后必须核对。

14项新增自动化检查T770～783通过，其中T775/776调用真实SQLite服务和真实签名校验，但没有任何电话适配实例；其ANDROID_SYSTEM仅是授权返回的来源字段，不能当实际呼出。服务重启/交接回执丢失保持UNKNOWN及累计次数，同一最多2次的许可不能授权第3次。另包含并发准备锁、目标不在第一页、错误身份/手机条件、部署/发布失败、替代队列、失效同意及真实CLI拒绝入口。企业全套36项通过；原核心673/Java720/S23数据库398等证据复用，不无故重跑。

证据：evidence/enterprise-permit-r105/regression-source-tracked；首轮模块接口红灯、两个恢复边界真实失败、npm运行目录差异造成的CLI测试入口错误均保留。真实设备写入的成功路径仅代码/模拟端口验证，不能记成真机许可部署已通过。

## 后续实际使用与恢复

只有在下一轮已取得明确接收端、当次双方同意及最大次数，且手机登录实际LIVE销售并绑定电销卡后，才由操作者在项目私有目录准备请求。字段：authorizationId（本次唯一标识）、receiver（受控接收端完整号码）、maxAttempts、confirmedAt（当前毫秒时间）、recipientConsentsNow=true、operatorConfirmsNow=true。文件不进Git/evidence，不复用历史同意或未接反馈充当新同意。

```powershell
node tools/prepare-enterprise-live-permit.mjs --request-file .local/enterprise/consent-request-private.json --ack-current-bounded-authorization
```

这不是本轮运行过的成功部署命令；本轮只运行隔离测试中的无参数/无有效同意拒绝入口。成功返回仍未启动手机；电话链路实测按manual-steps执行，结束后暂停并撤销本次许可，UNKNOWN不删除、不自动重放。

若返回CLEANUP_REQUIRED：先保持手机队列停用，检查服务该次queueId/version及本机已知私有许可文件。QUEUE_PREPARATION_RECEIPT意味着计划可能已创建，先查看，不再重新提交；DEVICE_PERMIT意味着需要连接手机核对暂存/生效许可；SERVER_PERMIT核对电脑本次许可；PREPARATION_LOCK先核对记录的进程是否仍在本项目运行，不能直接删锁或重建密钥。仅清理与本次许可ID一致的文件，其他销售/队列保持。已进入电话系统的请求保留待核对，停止不代表撤回已呼出的电话。

回传只需错误码、cleanupRequired、queueId/version、掩码接收端、发生时间和权限/SIM结果，不回传密码、令牌、完整号码、许可签名或密钥。当前没有必须新增的信息；真实验证到时仍需新的有界授权。


2026-10-18 17:50补充：测试后的关闭命令已实现并通过本地/无许可S23检查，使用[许可关闭说明](enterprise-permit-closure.md)。准备与关闭已复用同一文件库/互斥锁；历史36项为前一快照，当前企业npm整体52通过。有生效许可时的真实手机关闭仍未运行，不能扩大验收范围。


2026-10-19补充：D031明确授权后新增R106 schema2单次受控时段例外，默认生产请求未变；实际成功部署/呼出与撤销证据现已取得1次，不再一概标“未运行”。私有请求仅在确有当次例外时加allowOutOfHours=true，精确范围/10分钟/次数保护及步骤见android-controlled-window.md。


2026-10-19普通时段双目标准备已实现并真实验证：私有请求可用receivers（恰好两个不同手机号）替代receiver，并明确两端当次同意/总次数。不能混用两字段，额度不足或任何目标资格/拒绝不符停止；不支持双目标时段例外。同一schema1许可绑定两个revision与队列/设备/SIM，原互斥、清理、UNKNOWN和次数规则保持。实际两目标同队列自然FINISHED，证据enterprise-paired-validation-r106；当前无生效许可。
