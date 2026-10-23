# 本地仿真实现契约

2026-10-14起，步骤5连续推进；本文细化工程接口，原27个R-CALL要求不变。只使用合成标识；不提供真实电话号码解析、生产鉴权、设备或线路。工程选择均可逆，不作为已采纳的角色、节假日、过期或恢复策略。

## M-CALL-002：可信快照的纯守卫

R-CALL-001/002/004/005，F-CALL-001/010/012，T-CALL-053～055。

`checkAccess(actor, {tenantId, capability, assignedSalesId?})` 检查可信Actor快照的企业、明确能力及可选销售归属；缺项/不符统一返回`DENY/FORBIDDEN`，不暴露其他企业联系人状态。能力是动作名，不假设管理员/销售角色映射。

`checkEligibility({actor, task, contact})` 先检查企业、trigger能力与销售归属，随后检查目标一致性、拒绝状态明确为false、资格明确为CONFIRMED。拒绝优先于资格，缺拒绝状态按DENY处理。通过仅返回`CONTINUE/ELIGIBILITY_OK`，不创建授权/调用电话，不跳过时间等其他条件。输入缺失或跨企业不泄露资格状态。未知资格返回QUALIFICATION_NOT_CONFIRMED；已拒绝为DO_NOT_CONTACT。

真实事务在授权和消费时读取最新状态；纯函数通过不等于事务不变量已验证。现有名单资格按用户声明记录，不要求再次提供证明。

## M-CALL-003～005、008接口与仿真策略（2026-10-15）

当前实现见packages/core/src/simulation-engine.mjs、sqlite-store.mjs、simulation-session.mjs。R-CALL-001～018、022～024、026/027的本地合成部分进入验收；对应平台/生产边界不扩张。

- 权威快照：本地fixture Actor注册表、tenant+targetKey联系人、task/planVersion/cycle、attempt/intentId与销售占用。所有业务动作在Store事务读取最新状态；Actor注册是可信测试配置，不是生产登录认证。能力逐项检查，销售任务操作必须属于自身。read_all为显式实验能力，未采纳产品角色。
- 输入：只支持SYNTHETIC标识；规范化trim+uppercase，支持记录保留raw和imports。UNKNOWN/INVALID不授予资格。未知字段/真实号码为UNSUPPORTED，空值INVALID；重复保留来源，资格冲突CONFLICT不覆盖；拒绝不可由导入清除。真实电话号码解析/分机、CSV/Excel适配仍待SG-CALL-007。
- 策略：simulationPolicy明确包含simulationOnly=true、version、calendarDates、lateToleranceMs、pauseScope=seller、order=explicit-selection。示例值固定2026-10-14、60000ms；缺字段返回POLICY_GAP，错误/过期版本返回STALE_POLICY。日期、迟到、scope和顺序均为可逆实验参数，不代表用户决定。
- 授权：scheduled/manual_now共用权限、资格/拒绝、时间、最新版本、暂停、策略和占用；scheduled另外检查计划到达与迟到。授权是同步事务，返回ALLOW+attemptId；拒绝只返回原因，没有新授权。intent在企业内唯一，task+cycle唯一；同周期人工/定时即使用不同intent也只授权一次。约200不设硬上限。
- 修改：retime/assign/pause使旧版本失效；未交出的grant撤销。恢复不补放，任务NEEDS_REPLAN，需明确新计划。已交接/未知任务不能靠修改重拨；完成任务需显式retry，禁止assign/cancel/retime变相开启下一周期。busy时命令拒绝，不自动保留为稍后外呼。
- SQLite：BEGIN IMMEDIATE事务，状态快照、attempt唯一索引、活动销售唯一索引、审计与outbox索引同事务提交；WAL+FULL同步。文件重开、多进程授权/消费竞争、拒绝排序和进程退出有实测。全量快照写入是本地小规模工程选择，不承诺分布式/跨设备服务、生产吞吐或硬件掉电可靠性。
- 交接：consume仅接受本地FakeDialAdapter；事务复核后持久HANDOFF_UNKNOWN，再发替身请求。收到UNKNOWN/异常进入RECONCILE_REQUIRED；进程退出后recover同样待核对。原attempt永不自动重放；明确未提交/BUSY终结但不建重试。真实模式一律REAL_ADAPTER_UNAVAILABLE。
- 人工核对：noActiveCall必须显式true，result是有限状态码，记录MANUAL_SIMULATION；关闭占用保留hadUnknown历史。late API receipt可补证据，不能重开已关闭旧attempt或覆盖下一周期任务状态。没有设备IDLE自动解除未知。
- 事件：eventId企业内去重；同ID不同事件拒绝。只有给定attempt且MATCHED+SIMULATED_DEVICE的明确OUTGOING_CONFIRMED/CONNECTED_CONFIRMED计入O/C；UNBOUND、OFFHOOK、OPEN_SUCCESS、IDLE、CX_CALL和人工结果不推断接通。
- 指标：U为已授权目标去重，G授权，Q明确SUBMITTED，O/C匹配的模拟证据，各自独立；everUnknown保留历史、unknownPending仅当前未核对。默认all-authorized-simulation，按date筛选是授权日期cohort（队列），不是已采纳的生产日主指标。
- CLI：一行JSON一个动作，默认SQLite本地保存；演示用MemoryStore。time/advance注入虚拟时间、tick投递定时事件、next传显式任务序列；没有墙钟常驻手机调度器。字段清单与完整命令见[simulation-guide.md](simulation-guide.md)。真实生产身份、保留/删除、角色、文件格式和策略继续保留SPEC GAP。

## 实现中的回归修复

T-CALL-086：已完成任务经assign→plan可绕过明确retry；保存失败输入，现改为MANUAL_RETRY_REQUIRED。
T-CALL-087：缺read_all能力时，snapshot虽筛选任务却仍返回其他销售联系人/任务审计；现按可见任务/目标过滤。
T-CALL-088：导入支持标识带未知extension字段原先被静默忽略；现逐行UNSUPPORTED，保留未导入状态。

三个原失败均保存在evidence/step-5/continuation/bug-regressions-red；修复未删除或削弱断言。T-CALL-089～094补最新消费状态、多进程消费、能力拒绝、重导入历史与迟到回执的明确边界。

## 步骤6补充：失败一致性

T095：time/advance先在候选时钟校验，提交simulationNow后才更新活动时钟；非法输入返回INVALID_SIMULATION_TIME，保存失败返回SIMULATION_TIME_SAVE_FAILED且当前时间不变。该状态一致性属于仿真工程保证，不新增生产时段策略。T096：策略simulationOnly必须严格为布尔true，否则POLICY_GAP，字符串“false”不能授权。

本地子范围已通过步骤6，136项回归及200任务结果见acceptance；真实平台与生产策略缺口保留。

## 自助工作台契约（D018/D019）

self-service profile使用read/import/assign_self/trigger/retime/refuse/qualify/pause/reconcile/observe能力，没有assign/read_all。仅为本人建任务，导入而未建任务的本人目标可见；其他销售导入历史被过滤，企业级拒绝状态保留。跨销售或跨企业请求仍拒绝。旧CLI legacy-fixture只用于历史实验；工作台拒绝复用含跨销售权限的旧库。

self-service日期采用weekdays（Asia/Shanghai周一至周五），计划和触发都检查；日期不再限定为单个模拟日。初始虚拟时钟仍2026-10-14 09:00，迟到容忍60秒仍是实验参数，未被D019采纳为生产阈值。过期事件不补拨，恢复后重计划，busy立即请求不排队。

本地HTTP服务仅绑定127.0.0.1；固定资源白名单，不提供任意文件读取；API需要本次随机令牌，拒绝外来Origin/Host，正文上限64KiB，按顺序处理命令。此令牌不替代真实企业鉴权。只复用FakeDialAdapter，真实号码/real模式仍不可用。
