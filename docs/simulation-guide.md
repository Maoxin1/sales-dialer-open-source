# 本地模拟软件运行说明

更新：2026-10-15。本入口是可操作的共用业务仿真，使用合成联系人和电话替身。原Android+iPhone销售SIM自动拨号目标未改变；此入口不接电话系统、不读取真实客户名单。Node.js24.18.0，ES modules，无新增依赖，不需要npm install。

## 一次运行演示

在项目根`D:\mx\AI-Workspace\Projects\sales-dialer`执行：

```powershell
npm.cmd --prefix packages/core run demo
```

实际入口为`node packages/core/src/simulation-cli.mjs --demo`。内存演示：导入2个合成联系人→2个任务→第一条定时触发→模拟提交→人工确认无活动通话并关闭→明确选择下一条→模拟回执丢失→保留待核对。最后显示U=2/G=2/Q=1/O=0/C=0、unknownPending=1。SUBMITTED是替身接受请求；不是已经接通。运行结束退出，不保留演示数据库。

实际运行记录见[npm-demo.json](../evidence/step-5/continuation/npm-demo.json)。

## 可持续操作与保存

```powershell
npm.cmd --prefix packages/core run simulate
```

也可执行`node packages/core/src/simulation-cli.mjs --db .local/my-simulation.db`，用独立文件保留另一组仿真。默认数据库是项目`.local/simulation.db`（已Git忽略）。每行输入一个JSON命令，输出一行JSON；`{"op":"quit"}`、EOF或Ctrl+C停止。再次启动加载原状态；交接标记未收到回执者恢复为待核对，不自动重放。不要同时把该入口当生产服务或真实多人鉴权。

初始虚拟时间固定在北京时间2026-10-14 09:00，跟当前电脑日期无关；状态输出包含当前虚拟时间与simulationPolicy。以下实验输入可逆：允许日期仅2026-10-14、定时迟到容忍60000ms、暂停scope为当前销售、恢复需重新计划、下一条顺序显式给出。它们不是mantou已采纳的生产策略。时间用`time`/`advance`推进；`tick`显式投递定时回调，没有墙钟后台服务或自动拨打手机。

固定合成操作者SYNTHETIC-SALES-A具有本实验明确能力，另有SYNTHETIC-SALES-B；不是生产管理员/销售角色决定。`help`可列命令与字段：

```json
{"op":"help"}
{"op":"status"}
{"op":"import","rows":[{"raw":"SYNTHETIC-TARGET-1","qualification":"CONFIRMED","source":"SYNTHETIC-ATTESTATION"}]}
{"op":"task","taskId":"SYNTHETIC-TASK-1","targetKey":"SYNTHETIC-TARGET-1","assignedSalesId":"SYNTHETIC-SALES-A","plannedAt":1791939600000}
{"op":"tick","taskId":"SYNTHETIC-TASK-1","planVersion":1,"policyVersion":1,"intentId":"SYNTHETIC-INTENT-1","outcome":"SUBMITTED"}
{"op":"status"}
```

从status复制实际attemptId（不能假设固定编号），例如：

```json
{"op":"reconcile","attemptId":"SYNTHETIC-ATTEMPT-实际编号","noActiveCall":true,"result":"NO_ANSWER"}
```

上面的“实际编号”是说明占位符，执行时必须替换为输出中的完整合成attemptId。仅在仿真确认无活动/待处理请求时传noActiveCall=true；这项人工确认不会把历史未知改成“未呼出”或“已接通”。再次尝试须显式retry，再使用新intentId：

```json
{"op":"retry","taskId":"SYNTHETIC-TASK-1","plannedAt":1791939600000}
{"op":"trigger","taskId":"SYNTHETIC-TASK-1","intentId":"SYNTHETIC-INTENT-2","outcome":"UNKNOWN"}
{"op":"status"}
{"op":"recover"}
```

UNKNOWN留下占用与待核对；同attemptId消费不会再次请求。人工关闭前不能用新意图绕过占用。设备IDLE观察本身也不会关闭未知。明确未提交或BUSY会终结本次，不自动创建重拨。

## 操作对应关系

| 命令 | 输入/结果 |
|---|---|
| import | rows只允许raw/qualification/source；支持SYNTHETIC标识的空白/大小写规范化。非法、不支持、重复、冲突逐行返回；原始支持记录保留，冲突不覆盖资格，重导入不清除拒绝。真实号码与未知字段不进入可拨名单。 |
| task / assign | 明确任务/目标/销售/时间；创建/分配不外呼，分配增版本并需重新计划。生产角色未定。 |
| plan | taskId、plannedAt；09≤目标时刻<18，增planVersion并废弃旧回调；已交接任务要求核对，完成任务必须先明确retry。 |
| pause / resume | 暂停当前销售；撤销未交出授权、旧计划失效。恢复不补执行，READY之前须plan。已交出的请求不能承诺瞬时撤回。 |
| time / advance | atEpochMs或ms，控制虚拟时钟并保存；不安排自动重拨。 |
| tick | taskId、当时的planVersion/policyVersion、intentId；按当前时间、日历和迟到参数判断定时事件。旧版本不自动取新版本。 |
| trigger | taskId、新的或重投的intentId；人工立即触发，受同一窗口/资格/权限/占用规则约束。 |
| next | taskIds显式有序数组、intentId；选列表中第一条READY任务，忙时拒绝，不静默存为未来请求。 |
| refuse / qualify | targetKey；拒绝是企业内规范目标持久状态。资格修改须qualification及合成source，不索要mantou已有资格证明。 |
| device | state为IDLE/BUSY/UNKNOWN；只模拟占用，不构成客户呼出或接通证据。 |
| consume | attemptId、可选outcome；仅已授权且尚未交出的记录可消费，所有条件再次检查。 |
| reconcile | attemptId、noActiveCall=true、result；仅明确人工核对关闭，保留原未知和人工来源。 |
| observe | 合成eventId、kind、binding、source、可选attemptId；只有MATCHED+SIMULATED_DEVICE的明确证据可计O/C。OFFHOOK/open/IDLE/CXCall不自动计接通。 |
| status / recover | 任务、授权、事件、暂停/占用、各指标、待核对；recover只恢复状态，不重放外呼。 |
| quit | 退出；持久数据库留存，下次继续。 |

outcome只允许SUBMITTED、DEFINITELY_NOT_SUBMITTED、BUSY、UNKNOWN，是实验故障输入。真实mode和任意运输回调被拒绝，未连接真实适配。

统计U=已授权尝试涉及的不同合成目标，G=授权，Q=明确系统提交，O/C=任务关联已匹配的模拟呼出/接通证据。默认统计全部授权；按date查询为“授权日期队列”的后续事实，不是假定生产日总拨号主指标。所有值都标SIMULATION；人工COMPLETED不自动增加C。

## 测试、构建与未运行范围

```powershell
npm.cmd --prefix packages/core test
npm.cmd --prefix packages/core run test:rules
npm.cmd --prefix packages/core run test:integration
npm.cmd --prefix packages/core run test:capacity
npm.cmd --prefix packages/core run test:sequences
npm.cmd --prefix packages/core run check
& .\tools\run-core-tests.ps1 -Suite All
```

check是JavaScript语法检查，本包无需转译或生成APK；不是手机构建。All保存实际版本/命令/输出/退出码/源码哈希；新EvidenceDirectory必须在本项目evidence内且为空。测试运行结束退出，临时合成SQLite库清理。固定种子0x00C0FFEE、32×50操作，失败保存原序列及最多200次删除缩减结果，不能声称全状态证明。

双端构建/设备操作和完整E2E仍见[manual-steps.md](manual-steps.md)。本机缺JDK/Android SDK/adb、Mac/Xcode访问；用户暂无真机，受控接收端缺。没有移动安装包、客户显号/双卡/后台/全天队列通过证据。

## 步骤6实际操作与错误说明

交互启停/重开、UNKNOWN不重放、拒绝后retry拒绝、pause/resume后旧计划拒绝、重新plan后显式next已操作，见[交互原始记录](../evidence/step-6/cli-interactive.json)。默认DB始终是项目根.local；使用npm --prefix时自定义相对--db路径按packages/core解析。需要指定库时用绝对路径，例如`npm.cmd --prefix packages/core run simulate -- --db D:\mx\AI-Workspace\Projects\sales-dialer\.local\my-simulation.db`。本次自定义测试库已停机移入项目.local，真实号码未使用。

time/advance非法输入返回INVALID_SIMULATION_TIME；存储失败返回SIMULATION_TIME_SAVE_FAILED，当前时钟不改变，先解决存储错误再重试仿真操作。所有生产日期/过期/恢复策略仍未由示例决定。当前136项检查通过，28mjs语法通过，详细状态见[acceptance](acceptance.md)。
