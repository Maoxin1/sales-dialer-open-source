# 测试矩阵 v0.3

最新R095（2026-10-16）：T656～671号码暂存子范围通过；66组551 Java断言、600生成输入跨运行时一致、宿主8、S23隔离30/UI19。真实区0、格式区4生成联系人、0任务/电话。生产身份/真实任务和手机适配未验，详见文末与next-action。

最新R094（2026-10-16）：T641～655单次定时仿真通过；62组527 Java断言、隔离22、定时驱动78（含等待重复观察）、计划编辑18、模拟普通进程丢失10及核心97回归通过。单次合成子范围，不是批量真实自动拨号或全天/锁屏验收，详见文末和next-action。

最新：2026-10-16 R093/T626～640合成工作区子范围通过，57组510 Java断言、S23界面驱动30检查及隔离SQLite/Session21断言；原核心闭环97与200尝试容量本轮回归通过。当前总表为稳定ID增量记录，不以以下历史初始化计数代表最新总场景数；真实手机链路/自动定时/生产认证缺口见最新矩阵及next-action。

更新：2026-10-15，步骤6。本表保留原T001～094并新增095～097，共107个稳定场景；每行9列。原R/F关联保留，部分大场景按本地与平台分开标状态，新增小场景用于精确映射代码证据。

历史初始化汇总：当时总回归143项全部通过、0失败/跳过/取消；34文件语法检查退出0。测试数量不等于107场景全部完成。当时双端手机/E2E未运行；后续设备与界面证据按日期追加，生产鉴权、完整真实名单与保留仍未验收。

[完整命令/Node v24.18.0/退出码/源码哈希](../evidence/step-5/continuation/final-regression/checks.json)。原[步骤4红灯](../evidence/step-4/run-1/checks.json)与[M001结果](../evidence/step-5/M-CALL-001/result.json)保留；新行为组红/绿、Bug复现见[执行记录](execution-log.md)。P0/P1风险优先级不改变MoSCoW。

## 场景与实际状态

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-001 | R-CALL-006；F-CALL-005 | scheduled，UTC对应08:59:59.999/09:00/17:59:59.999/18:00 | 前拒绝/窗口内/窗口内/后拒绝，reason与Shanghai固定 | 单元；4组深比较 | P0 | D-CALL-010、E-CALL-009、spec接口 | 通过：4项 | [本轮回归](../evidence/step-5/continuation/final-regression/window-tests.log)；原红灯/原测试保留 |
| T-CALL-002 | R-CALL-006；F-CALL-005 | manual_now和manual_reschedule各跑同4边界 | 人工与定时同窗口；改计划检查拟拨时刻 | 单元；8组深比较 | P0 | D-CALL-010、spec | 通过：8项 | [本轮回归](../evidence/step-5/continuation/final-regression/window-tests.log)；原红灯/原测试保留 |
| T-CALL-003 | R-CALL-006；F-CALL-005 | 缺值/null/NaN/无穷/非整数/非数字/越界；无参数/null参数 | INVALID_INPUT/INVALID_TIME，不能允许拨打 | 单元；17组非法输入 | P0 | spec接口 | 通过：17项 | [本轮回归](../evidence/step-5/continuation/final-regression/window-tests.log)；原红灯/原测试保留 |
| T-CALL-004 | R-CALL-006；F-CALL-005 | 未知/缺失/空/大小写错误等trigger；时间与trigger同时无效 | INVALID_TRIGGER；同时无效优先INVALID_TIME | 单元；7组断言 | P0 | spec工程接口细化 | 通过：7项 | [本轮回归](../evidence/step-5/continuation/final-regression/window-tests.log)；原红灯/原测试保留 |
| T-CALL-005 | R-CALL-006；F-CALL-005 | 独立Node子进程TZ=UTC/New_York/Tokyo，同一UTC09点输入 | 全部返回Shanghai窗口内；主机时区不影响 | 单元；3个隔离进程 | P0 | spec | 通过：3项 | [本轮回归](../evidence/step-5/continuation/final-regression/window-tests.log)；原红灯/原测试保留 |
| T-CALL-006 | R-CALL-006；F-CALL-005 | FakeClock从09点前/18点前各推进1ms，显式传nowMs | 精确跨开/关边界，无实际等待 | 单元；可注入时钟 | P0 | spec、implementation-plan | 通过：2项 | [本轮回归](../evidence/step-5/continuation/final-regression/window-tests.log)；原红灯/原测试保留 |
| T-CALL-007 | R-CALL-006、R-CALL-024；F-CALL-005、F-CALL-011 | 冻结输入、重复调用、未接入电话替身；子进程禁Date.now | 输入不变、结果确定、替身无请求，不读取系统时钟 | 单元；窄范围纯接口检查 | P0 | spec纯函数契约 | 通过（窄范围）：2项 | [本轮回归](../evidence/step-5/continuation/final-regression/window-tests.log)；原红灯/原测试保留 |
| T-CALL-008 | R-CALL-015、R-CALL-024；F-CALL-011、F-CALL-013 | 合成grant，替身依次提交/确定失败/丢回执/占用；重复请求 | 逐次记录来源和模拟接受；重复也记录，不能由替身代做防重 | 测试基础设施；2项 | P0 | DialAdapter契约 | 通过（替身）：2项 | [本轮回归](../evidence/step-5/continuation/final-regression/support-tests.log)；原红灯/原测试保留 |
| T-CALL-009 | R-CALL-024；F-CALL-003、F-CALL-004、F-CALL-011 | real/缺mode/非合成标识/号码字段/transport回调/非法结果 | 记录前拒绝，0请求；无任何真实运输或电话接口 | 测试基础设施；6项 | P0 | I-CALL-007、spec | 通过（替身）：6项 | [本轮回归](../evidence/step-5/continuation/final-regression/support-tests.log)；原红灯/原测试保留 |
| T-CALL-010 | R-CALL-006；F-CALL-005 | Clock.set/advance，非法时间/步长/溢出 | 确定推进；非法输入不改变已存时刻 | 测试基础设施；3项 | P1 | Clock契约 | 通过（替身）：3项 | [本轮回归](../evidence/step-5/continuation/final-regression/support-tests.log)；原红灯/原测试保留 |
| T-CALL-011 | R-CALL-001、R-CALL-002、R-CALL-023；F-CALL-001、F-CALL-012 | 合成tenant A尝试查询/修改/触发B数据 | FORBIDDEN，无泄漏/授权/修改 | 单元+鉴权/Store集成 | P0 | 企业边界、spec | 部分通过：合成身份/Store越权拒绝；生产鉴权未实现 | [T064/087/092](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-012 | R-CALL-002、R-CALL-022；F-CALL-001、F-CALL-010 | 缺导入/分配/触发权限；任务重分配后旧销售触发 | 权限拒绝；导入不拨号，授权读取最新归属 | 单元+事务集成 | P0 | spec；角色SG-CALL-001 | 通过（明确能力/本地分配）；生产角色未选 | [T063/092](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-013 | R-CALL-003、R-CALL-005；F-CALL-010、F-CALL-012 | 有效/无效/不支持/重复/冲突合成记录，带拒绝历史 | 隔离非法/冲突，保原值；去重不抹拒绝/资格历史 | 单元+导入集成 | P1 | spec；格式SG-CALL-007 | 部分通过：合成标识/冲突/历史；真实号码与文件适配未实现 | [T062/088/093](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-014 | R-CALL-004；F-CALL-012 | 企业确认资格CONFIRMED与UNKNOWN/INVALID，对其他守卫显式设输入 | CONFIRMED只继续检查；其他拒绝；不索取现有证明原件 | 单元 | P0 | D-CALL-012、spec | 通过（纯守卫+合成授权）；CONFIRMED不跳过其他守卫 | [T053/065](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-015 | R-CALL-004、R-CALL-015；F-CALL-012、F-CALL-011 | 授权后、消费前资格修订变UNKNOWN/INVALID | 新消费停止，确认未交出者撤销，无适配请求 | 事务/消费集成 | P0 | spec、最新修订不变量 | 通过（本地事务/替身消费） | [T068/089](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-016 | R-CALL-005、R-CALL-014、R-CALL-015；F-CALL-012、F-CALL-011 | 拒绝与授权按可控顺序/并发提交；交出前再拒绝 | 拒绝提交后无新授权；消费再检查；已交出边界留证 | 事务/多进程集成 | P0 | I-CALL-001、spec | 通过（SQLite/两进程排序/替身）；真实系统交接未验证 | [T073/089](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-017 | R-CALL-003、R-CALL-005、R-CALL-010；F-CALL-010、F-CALL-012 | 同企业重导入/另一销售/人工再试已拒绝targetKey | 不清拒绝、不授新grant | 单元+Store集成 | P0 | spec | 通过（合成重导入/另一销售/拒绝历史） | [T062/093](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-018 | R-CALL-007、R-CALL-013；F-CALL-005、F-CALL-011 | 计划v1改v2，重投v1、取消任务、旧策略回调 | 旧事件无授权；当前版本仍走所有守卫 | 单元+事务集成 | P0 | I-CALL-002、spec | 通过（本地版本/取消/策略） | [T058/059/065/089](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-019 | R-CALL-008、R-CALL-012、R-CALL-013；F-CALL-005、F-CALL-011 | 同一待执行任务人工/定时竞争，多worker交错 | 同周期至多1授权/占用/消费；不能各拨一次 | 可控交错+多进程集成 | P0 | I-CALL-003、spec | 通过（本地两进程授权/消费竞争） | [T057/072/091](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-020 | R-CALL-006、R-CALL-007、R-CALL-009；F-CALL-005、F-CALL-011 | 明确Actor修改窗口内/外计划，旧回调到达 | 增版本，旧回调失效；窗口外不成为可拨计划 | 单元+事务集成 | P0 | D-CALL-010、spec；窗口外编辑SG-CALL-004 | 部分通过：仿真修改/窗口/版本；生产编辑策略待定 | [T059/082/086](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-021 | R-CALL-010、R-CALL-018；F-CALL-005、F-CALL-007、F-CALL-011 | 未接/忙线/拒接/失败结束；销售明确新intentId再次尝试 | 无自动重拨；新意图重新检查，分开计数；拒绝联系仍拦截 | 单元+任务集成 | P0 | D-CALL-011、spec | 通过（本地无自动重拨/显式新周期） | [T069/079/086/093](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-022 | R-CALL-011、R-CALL-015；F-CALL-011 | 显式scope暂停，已有未消费grant，人工/定时到达 | 不新授权；未交出grant撤销；已交出不承诺瞬时撤回 | 事务/队列集成 | P0 | spec | 通过（显式seller scope与未交出撤销）；真实设备撤回未验证 | [T060/082](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-023 | R-CALL-007、R-CALL-011、R-CALL-024；F-CALL-005、F-CALL-011 | 恢复时旧版本/错过事件；缺过期策略的真实模式 | 不补放旧事件；所需策略缺失POLICY_GAP | 单元+恢复集成 | P0 | spec；SG-CALL-003/005 | 部分通过：本地恢复需新计划/策略缺失拒绝；real入口统一不可用 | [T058/060/080/082](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-024 | R-CALL-012、R-CALL-019；F-CALL-006、F-CALL-008、F-CALL-011 | 同销售多个任务/设备争占用；其他SIM来电/状态未知 | 至多1未终结授权；busy/未知阻止真实新请求 | Store集成+受控真机 | P0 | spec、manual-steps | 部分通过：本地占用/BUSY/UNKNOWN；双卡真机未运行 | [T061/071/072/091](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-025 | R-CALL-013、R-CALL-014；F-CALL-005、F-CALL-011 | 同intent/task周期事件重复送达/多进程竞争 | 唯一授权；返回原结果/重复拒绝，无新增attempt | 唯一约束/多进程集成 | P0 | I-CALL-003、spec | 通过（SQLite唯一约束/多进程） | [T057/072/075](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-026 | R-CALL-014；F-CALL-011、F-CALL-013 | 事务写授权/占用/审计/outbox各位置注入失败 | 全部回滚，0适配调用；提交成功有恢复记录 | 文件Store故障集成 | P0 | I-CALL-006、spec | 通过（本地四个写入故障点回滚） | [T067](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-027 | R-CALL-014、R-CALL-015、R-CALL-016；F-CALL-011、F-CALL-013 | 提交前/后、交接标记后、外部可能接受后杀子进程并重开 | 未提交不调用；可能交出但无回执保待核对且不重放 | 子进程+持久化崩溃集成 | P0 | I-CALL-004/006、spec | 通过（5个真实子进程退出位置）；硬件掉电/设备未运行 | [T074](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-028 | R-CALL-016；F-CALL-011、F-CALL-013 | 重启载入拒绝/暂停/版本/占用/幂等/未知；人工核对关闭 | 状态保留；IDLE不变未呼出；新意图仍需全部守卫 | 文件重开/事件恢复集成 | P0 | spec | 通过（文件重开/人工核对/保留未知历史） | [T066/069/074/094](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-029 | R-CALL-016、R-CALL-017、R-CALL-018；F-CALL-006、F-CALL-013 | 注入OFFHOOK、open成功、IDLE与人工结果 | 不推客户接通或未呼出；来源与未知保留，重复不多计 | 事件投影单元+平台核对 | P0 | research、spec | 部分通过：模拟事件与计数；平台核对未运行 | [T077/078](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-030 | R-CALL-017、R-CALL-021；F-CALL-004、F-CALL-006、F-CALL-013 | 未绑定CXCall/outgoing UUID、其他任务/电话事件 | 只记观察，不归属当前客户/接通统计 | 投影单元+真机关联探索 | P0 | research、spec | 部分通过：UNBOUND事件不归属任务；真机关联未运行 | [T077/078](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-031 | R-CALL-018；F-CALL-007、F-CALL-013 | 合成2目标3授权、2去重提交、1已证实呼出、0接通证据，另有未知；重投事件 | 仿真U/G/Q/O/C各2/3/2/1/0，未知另列；不把0已证实当全部未接通 | 事件/统计集成 | P1 | D-CALL-004、spec；主口径SG-CALL-008 | 通过（仿真U/G/Q/O/C=2/3/2/1/0） | [T076](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-032 | R-CALL-027、R-CALL-013、R-CALL-018；F-CALL-007、F-CALL-011、F-CALL-013 | 50合成目标共200显式尝试、10重复投递；串行释放销售占用 | 授权/尝试不被重复放大；记录耗时/内存/异常/未知，0真实请求 | 仿真容量/闭环集成 | P1 | spec；不是200不同号码要求 | 通过（本地50目标200尝试+10重复）；真实日量未验证 | [T085](../evidence/step-5/continuation/final-regression/capacity-tests.log) |
| T-CALL-033 | R-CALL-018、R-CALL-027；F-CALL-007、F-CALL-013 | 守卫拒绝/重复不加G；200后在其余条件满足时显式第201意图 | 不因“约200”自动拒绝；U/G/Q/O/C分开，无虚构生产额度 | 授权/计数集成 | P1 | D-CALL-004、spec | 通过（显式第201次允许，拒绝/重复不增G） | [T065/085](../evidence/step-5/continuation/final-regression/capacity-tests.log) |
| T-CALL-034 | R-CALL-001、R-CALL-023；F-CALL-001、F-CALL-012、F-CALL-013 | 合成权限读取日志，掩码/来源；显式实验保留策略与幂等记录关联 | 无跨企业日志泄漏；未定期限不假称合规；删除不造成未知重放 | 审计单元+数据生命周期集成 | P0 | spec；SG-CALL-006 | 部分通过：权限过滤/合成日志；保留/删除与生产生命周期未实现 | [T064/087/092](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-035 | R-CALL-004、R-CALL-005、R-CALL-007、R-CALL-011、R-CALL-013、R-CALL-015、R-CALL-016；F-CALL-011、F-CALL-012 | 固定种子/样本上限的资格、拒绝、计划、暂停、触发、崩溃序列 | I-CALL-001～007成立；失败保原序列/最小复现 | 有限模型序列+文件Store集成 | P0 | spec不变量；下文策略 | 通过（有限仿真32×50操作）；非穷举/真实设备证明 | [T090](../evidence/step-5/continuation/final-regression/sequence-tests.log) |
| T-CALL-036 | R-CALL-019；F-CALL-002、F-CALL-008 | 双卡指定销售卡/默认变化/停用，受控接收端核对 | 不静默换卡；实际SIM与销售显号有接收端证据 | 双端受控真机 | P0 | D-CALL-003、research | 部分通过：S23双卡枚举，指定电销卡显号3通；另一卡/停卡/回落/iOS未运行 | [S23 Ultra真机报告](spikes/ANDROID-S23U-2026-10-15.md) |
| T-CALL-037 | R-CALL-020；F-CALL-003 | Android前台人工及一次定时，具备权限/受控双方 | 系统请求、实际呼出、显号、语音分别留证 | 原生构建+受控真机 | P0 | manual-steps | 通过（S23 Ultra限定）：前台人工/30秒定时两通，用户确认显号/语音；非全天队列 | [S23 Ultra真机报告](spikes/ANDROID-S23U-2026-10-15.md) |
| T-CALL-038 | R-CALL-020；F-CALL-003 | Android后台/锁屏到点，记录ROM/权限/误差 | 原自动要求按场景取证；不以闹钟送达证明已拨号 | 受控真机 | P0 | research、manual-steps | 部分通过：后台受限制初测失败；不受限制后后台仿真及锁屏真实一通通过；其他条件未验 | [S23 Ultra真机报告](spikes/ANDROID-S23U-2026-10-15.md) |
| T-CALL-039 | R-CALL-019、R-CALL-020；F-CALL-003、F-CALL-008 | 撤电话/状态/精确闹钟权限、卡不可用 | 停止新请求，不自动补拨/换卡；保存异常 | 受控真机+适配集成 | P0 | manual-steps | 未运行 | M-AND-05/06 |
| T-CALL-040 | R-CALL-012、R-CALL-017、R-CALL-020；F-CALL-003、F-CALL-006、F-CALL-011 | 第一通结束/来电占用后下一任务，双卡占用变化 | 明确释放/关联来源再走下一意图；未知不自动拨下一通 | 真机+设备/Store集成 | P0 | manual-steps、spec | 部分通过：三次明确重新启用与核对；来电占用/正式自动下一任务未运行 | [S23 Ultra真机报告](spikes/ANDROID-S23U-2026-10-15.md) |
| T-CALL-041 | R-CALL-021；F-CALL-004 | 大陆iPhone普通tel，分别确认/取消，记录实际提示 | 确认探索不得算免逐通确认目标；取消/回执不作接通 | 原生构建+受控真机探索 | P0 | research、manual-steps | 未运行：缺Mac/Xcode/iPhone/接收端 | M-IOS-01；无默认dialer地区许可证据 |
| T-CALL-042 | R-CALL-021；F-CALL-004 | 快捷指令时间触发/Call动作/锁屏；核对默认dialer签名/地区条件 | 分开触发与动作；地区不满足停对应路径；系统自动化独立停用 | 手工平台探索 | P1 | research、Shortcuts说明 | 未运行：设备/权限/地区证据缺 | prototypes/ios/shortcuts/README.md |
| T-CALL-043 | R-CALL-007、R-CALL-011、R-CALL-021；F-CALL-004、F-CALL-011 | iOS前台timer、后台/锁屏、恢复迟到、暂停/改计划 | 记录是否运行/确认/过期；原型参数非生产窗口/迟到策略 | 受控真机 | P0 | manual-steps、spec | 未运行 | M-IOS-02/05；不能从原型限制推所有路径不可能 |
| T-CALL-044 | R-CALL-019、R-CALL-021、R-CALL-017；F-CALL-004、F-CALL-006、F-CALL-008 | iOS默认语音线变化、占用、设备限制/电话不可用 | 选卡/任务关联按实际证据；不捏造CALL_PHONE式权限开关 | 受控真机 | P0 | research、manual-steps | 未运行 | M-IOS-03/04/07 |
| T-CALL-045 | R-CALL-015、R-CALL-016、R-CALL-020、R-CALL-021；F-CALL-003、F-CALL-004、F-CALL-011 | 双端请求交接附近终止进程/重开，接收端核对 | 未知持久、原意图不重放；来源/调用次数分开 | 双端受控真机+恢复集成 | P0 | spec、manual-steps | 部分通过：Android持久标记后force-stop重开仍阻止重放；交接瞬间崩溃/iOS未运行 | [S23 Ultra真机报告](spikes/ANDROID-S23U-2026-10-15.md) |
| T-CALL-046 | R-CALL-024；F-CALL-003、F-CALL-004、F-CALL-011 | 仿真全入口；真实mode缺资格/策略/设备/线路/授权之一 | 仿真只能合成替身；真实缺条件停止，不切替代路径 | 入口/适配集成 | P0 | I-CALL-007、spec | 通过（本地合成入口，real与任意transport拒绝）；正式真实适配未实现 | [T080/083](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-047 | R-CALL-025；F-CALL-009 | 检查本轮任务/适配/界面与发布范围 | 无固定语音/意愿识别/转接，本轮不验收媒体链路 | 范围审计/人工验收 | P1 | D-CALL-002、spec | 通过：步骤6范围审计，本轮无固定语音/媒体链路 | [验收](acceptance.md)、[下一轮](next-round-voice.md) |
| T-CALL-048 | R-CALL-026；F-CALL-005、F-CALL-011、F-CALL-013 | CLI合成闭环启停/暂停/触发/计划/核对/看结果 | 提交/呼出/接通/未知分开显示；有可操作下一任务入口 | CLI集成+人工操作 | P1 | spec、implementation-plan | 通过（合成CLI）：集成/演示及Agent交互操作；非mantou体验签收 | [T081～084回归](../evidence/step-6/npm-test-verified/run.json)、[实际操作](../evidence/step-6/cli-interactive.json) |
| T-CALL-049 | R-CALL-001、R-CALL-002、R-CALL-004、R-CALL-005、R-CALL-006、R-CALL-007、R-CALL-008、R-CALL-011、R-CALL-012、R-CALL-017、R-CALL-019、R-CALL-020、R-CALL-022、R-CALL-024；F-CALL-001、F-CALL-002、F-CALL-003、F-CALL-005、F-CALL-006、F-CALL-008、F-CALL-010、F-CALL-011、F-CALL-012、F-CALL-013 | 管理员/授权导入者→分配→计划/人工→Android→受控接收端→讲话→结果→下一条 | 每段实际证据；拒绝/暂停/未知场景阻止新外呼；原目标适用条件齐备 | 手动完整E2E | P0 | 原需求、spec；角色/策略先明确 | 未运行：手机正式适配/真机/线路缺；本地仿真不代替双端E2E | manual-steps完整E2E入口，E2E-AND-01 |
| T-CALL-050 | R-CALL-001、R-CALL-002、R-CALL-004、R-CALL-005、R-CALL-006、R-CALL-007、R-CALL-008、R-CALL-011、R-CALL-012、R-CALL-017、R-CALL-019、R-CALL-021、R-CALL-022、R-CALL-024；F-CALL-001、F-CALL-002、F-CALL-004、F-CALL-005、F-CALL-006、F-CALL-008、F-CALL-010、F-CALL-011、F-CALL-012、F-CALL-013 | 同链路使用大陆iPhone，保留原自动程度/SIM/显号 | 逐通确认演示不代验收；双端分别留真实链路证据 | 手动完整E2E | P0 | 原需求、spec；地区/许可证据 | 未运行：手机正式适配/真机/线路缺；本地仿真不代替双端E2E | manual-steps完整E2E入口，E2E-IOS-01 |
| T-CALL-051 | R-CALL-006；F-CALL-005 | 上海午夜前后/次日09点，JS有效Date上下端点 | 跨日仍按当地窗口；合法端点不抛异常或误判非法输入 | 单元；5组扩展边界 | P0 | spec的纯窗口与有效Date范围 | 通过：5项 | [本轮回归](../evidence/step-5/continuation/final-regression/window-tests.log)；原红灯/原测试保留 |
| T-CALL-052 | R-CALL-006；F-CALL-005 | CLI输入UTC毫秒/trigger，窗口内外、非法、缺参数和help | 合法分类退出0；非法/缺参数退出2；只判断时间，不授权或拨号 | CLI子进程；6项 | P1 | E-CALL-012；M-CALL-001可运行入口 | 通过：6项 | [本轮回归](../evidence/step-5/continuation/final-regression/cli-tests.log)；原红灯/原测试保留 |
| T-CALL-053 | R-CALL-001、R-CALL-002、R-CALL-004；F-CALL-001、F-CALL-012 | 资格CONFIRMED/UNKNOWN/INVALID/缺失，重复纯调用 | 仅CONFIRMED继续其他守卫；输入不变 | 单元 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-054 | R-CALL-004、R-CALL-005；F-CALL-012 | 拒绝true/未知状态，目标不一致 | 拒绝/缺状态/目标错误停止 | 单元 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-055 | R-CALL-001、R-CALL-002、R-CALL-004；F-CALL-001、F-CALL-010、F-CALL-012 | 跨企业/缺能力/错销售/缺快照；不同动作能力 | 统一FORBIDDEN，不泄漏资格/拒绝详情 | 单元 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-056 | R-CALL-012、R-CALL-013、R-CALL-014；F-CALL-005、F-CALL-011、F-CALL-013 | 当前合法任务授权 | 一份AUTHORIZED/占用/审计，API回执为空 | 内存Store集成 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-057 | R-CALL-008、R-CALL-012、R-CALL-013；F-CALL-005、F-CALL-011 | 同周期20个人工/定时意图交错 | 至多一授权 | 可控同进程交错 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-058 | R-CALL-007、R-CALL-024；F-CALL-005、F-CALL-011 | 旧计划/旧策略/未来/迟到/缺策略 | 明确原因拒绝，G不增加 | Store集成 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-059 | R-CALL-006、R-CALL-007、R-CALL-009；F-CALL-005、F-CALL-011 | 修改窗口内计划后旧回调，窗口外目标 | 增版本/旧回调拒绝/窗口外不接受 | Store集成 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-060 | R-CALL-007、R-CALL-011、R-CALL-015；F-CALL-005、F-CALL-011 | 授权后暂停/恢复/重投旧回调 | 未交出撤销；恢复需重新计划 | Store集成 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-061 | R-CALL-012；F-CALL-006、F-CALL-011 | 同销售多任务、模拟BUSY/UNKNOWN | 至多一占用；不明设备不请求 | Store集成 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-062 | R-CALL-003、R-CALL-005；F-CALL-010、F-CALL-012 | 合成大小写/空白/重复/非法/不支持与拒绝后重导入 | 保raw/拒绝历史，逐行隔离 | 导入集成 | P1 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-063 | R-CALL-002、R-CALL-022；F-CALL-001、F-CALL-010 | 分配改变/能力撤回后旧销售触发 | 读取最新权限和归属，FORBIDDEN | Store集成 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-064 | R-CALL-001、R-CALL-023；F-CALL-001、F-CALL-012 | 外企业查询已存在/不存在任务并触发 | 相同FORBIDDEN，无状态变化 | Store集成 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-065 | R-CALL-004、R-CALL-005、R-CALL-006、R-CALL-007、R-CALL-024；F-CALL-005、F-CALL-011、F-CALL-012 | 资格未知/拒绝/窗口外/real/取消 | 零新授权 | Store集成 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-066 | R-CALL-005、R-CALL-011、R-CALL-014、R-CALL-016；F-CALL-011、F-CALL-012、F-CALL-013 | SQLite文件关闭重开 | 任务/授权/拒绝/暂停/占用保留 | 文件Store | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-067 | R-CALL-014；F-CALL-011、F-CALL-013 | attempt/占用/审计/outbox四个写位置故障 | 同事务完整回滚，重开仍无残留 | 文件故障集成 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-068 | R-CALL-004、R-CALL-015；F-CALL-011、F-CALL-012 | 授权后资格变UNKNOWN再消费 | 撤销已知未交出授权，零适配调用 | 文件Store/替身 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-069 | R-CALL-010、R-CALL-015、R-CALL-016；F-CALL-005、F-CALL-011、F-CALL-013 | UNKNOWN后重开/重复消费/人工核对/明确retry | 未知不重放；显式核对后新周期，历史仍保留 | 文件Store/替身 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-070 | R-CALL-014、R-CALL-015；F-CALL-011、F-CALL-013 | adapter读取handoff标记后抛丢回执异常 | 标记先持久化；待核对、不重放 | 文件Store/替身 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-071 | R-CALL-012、R-CALL-013、R-CALL-015；F-CALL-011 | 10个同进程并发消费者 | 一次提交 | 消费交错集成 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-072 | R-CALL-008、R-CALL-012、R-CALL-013、R-CALL-014；F-CALL-005、F-CALL-011 | 两个Node进程人工/定时争同周期 | 一份授权/占用 | 真实子进程+SQLite | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-073 | R-CALL-005、R-CALL-014、R-CALL-015；F-CALL-011、F-CALL-012 | 两进程拒绝/授权竞态与消费复核 | 拒绝提交后无新grant/adapter请求 | 真实子进程+SQLite | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-074 | R-CALL-014、R-CALL-015、R-CALL-016；F-CALL-011、F-CALL-013 | 5个事务/授权/交接/外部返回/回执位置process.exit(77) | 回滚或持久待核对；原attempt不重放 | 真实子进程+文件请求计数 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-075 | R-CALL-012、R-CALL-013、R-CALL-014；F-CALL-011 | 绕过service写重复intent/cycle/活动seller | SQL唯一约束拒绝并回滚 | SQLite约束集成 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-076 | R-CALL-017、R-CALL-018；F-CALL-006、F-CALL-007、F-CALL-013 | 2目标3授权2提交1证实呼出0接通含UNKNOWN | U/G/Q/O/C=2/3/2/1/0，来源分开 | 事件统计集成 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-077 | R-CALL-016、R-CALL-017、R-CALL-018；F-CALL-006、F-CALL-013 | OFFHOOK/open/IDLE/unbound CX/人工COMPLETED | 不推断呼出/接通；未知历史保留 | 事件集成 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-078 | R-CALL-017、R-CALL-018；F-CALL-006、F-CALL-013 | 事件ID重复/冲突、MATCHED与来源检查 | 去重/拒绝冲突；只计匹配模拟设备证据 | 事件集成 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-079 | R-CALL-010、R-CALL-018；F-CALL-005、F-CALL-007、F-CALL-011 | BUSY/确定未提交后重投与明确retry | 不自动新意图；明确retry才开新周期 | 任务闭环 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-080 | R-CALL-024；F-CALL-003、F-CALL-004、F-CALL-011 | real构造与任意submit运输回调 | REAL_ADAPTER_UNAVAILABLE，零调用 | 入口/适配集成 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-081 | R-CALL-015、R-CALL-016、R-CALL-026；F-CALL-011、F-CALL-013 | CLI导入→任务→UNKNOWN，跨进程再次status | 记录持久，待核对不丢失 | CLI子进程 | P1 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-082 | R-CALL-006、R-CALL-007、R-CALL-011、R-CALL-026；F-CALL-005、F-CALL-011 | CLI暂停/恢复/改计划/推进时间/tick | 暂停拒绝，新的明确计划才执行 | CLI子进程 | P1 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-083 | R-CALL-024、R-CALL-026；F-CALL-003、F-CALL-004、F-CALL-011 | 坏JSON/未知字段/real mode | 拒绝且可继续status；real在工作前停止 | CLI子进程 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-084 | R-CALL-017、R-CALL-018、R-CALL-026；F-CALL-005、F-CALL-013 | 内置双任务演示 | G=2/Q=1/O=C=0，1条待核对 | CLI子进程/实际npm运行 | P1 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-085 | R-CALL-013、R-CALL-018、R-CALL-027；F-CALL-007、F-CALL-011、F-CALL-013 | 50目标200尝试10重复，再第201次 | G=200未重复放大；第201允许，0真实请求 | SQLite容量闭环 | P1 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/capacity-tests.log) |
| T-CALL-086 | R-CALL-010；F-CALL-005、F-CALL-011 | 完成任务assign→plan绕过retry的复现 | MANUAL_RETRY_REQUIRED，完成状态不被重开 | Bug回归 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-087 | R-CALL-001、R-CALL-002、R-CALL-023；F-CALL-001、F-CALL-012、F-CALL-013 | 缺read_all查看其他销售目标和审计 | 不泄漏不可见任务关联记录 | Bug回归 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-088 | R-CALL-003；F-CALL-010、F-CALL-012 | 合成输入带未知extension字段 | UNSUPPORTED，不静默丢字段后导入 | Bug回归 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-089 | R-CALL-002、R-CALL-005、R-CALL-006、R-CALL-007、R-CALL-012、R-CALL-015；F-CALL-001、F-CALL-005、F-CALL-011、F-CALL-012 | 消费前拒绝/时段/设备/能力/版本/策略变化 | 6种变化均零adapter请求 | 消费回归 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-090 | R-CALL-004、R-CALL-005、R-CALL-007、R-CALL-011、R-CALL-013、R-CALL-014、R-CALL-015、R-CALL-016、R-CALL-024；F-CALL-011、F-CALL-012、F-CALL-013 | seed0x00C0FFEE，32序列×50操作含重启/注入故障 | 检查7个不变量；失败保存并有界缩减 | 文件Store有限状态序列 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/sequence-tests.log) |
| T-CALL-091 | R-CALL-013、R-CALL-014、R-CALL-015；F-CALL-011、F-CALL-013 | 两个独立进程消费同一授权 | 文件请求记录恰好1，另一ALREADY_CONSUMED | 多进程消费 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-092 | R-CALL-001、R-CALL-002、R-CALL-022；F-CALL-001、F-CALL-010、F-CALL-012 | 缺import/assign/refuse/qualify能力 | 全部FORBIDDEN，状态不变 | 权限集成 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-093 | R-CALL-003、R-CALL-005、R-CALL-022；F-CALL-010、F-CALL-012 | 重导入冲突与拒绝后转另一销售 | 不覆盖历史资格/拒绝，不授新grant | 管理/授权集成 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-094 | R-CALL-015、R-CALL-016、R-CALL-017；F-CALL-011、F-CALL-013 | UNKNOWN人工关闭并开新周期后迟到回执 | 补原回执而不重开旧attempt/覆盖新任务状态 | 异步回执回归 | P0 | spec/simulation-contract；步骤5实际检查 | 通过（本地合成边界） | [TAP](../evidence/step-5/continuation/final-regression/business-tests.log) |
| T-CALL-095 | R-CALL-014、R-CALL-024、R-CALL-026；F-CALL-011、F-CALL-013 | time/advance注入保存失败；非法时间；成功后重开 | 失败不改变内存/持久时钟，SAVE_FAILED与INVALID_TIME区分；成功持久 | 故障回归/会话集成 | P0 | 步骤6发现的时间事务缺陷 | 通过：2红转绿+1已有通过 | [红灯](../evidence/step-6/regressions-red/run.json)、[最终绿灯](../evidence/step-6/npm-test-verified/run.json) |
| T-CALL-096 | R-CALL-024；F-CALL-011 | simulationOnly为字符串/数字/对象/null/false | POLICY_GAP、零授权；仅布尔true可继续检查 | 配置边界回归 | P0 | 仿真显式策略契约 | 通过：先红后绿 | [红灯](../evidence/step-6/regressions-red/run.json)、[最终绿灯](../evidence/step-6/npm-test-verified/run.json) |
| T-CALL-097 | R-CALL-013、R-CALL-016、R-CALL-018、R-CALL-027；F-CALL-007、F-CALL-011、F-CALL-013 | 50合成目标200独立任务，中途重开、10重投、提交/忙线/未知 | 200任务终结，G200/Q180/O180/C40均模拟；重复不放大、未知保留且不重放 | SQLite模拟容量 | P1 | 步骤6明确200条任务检查 | 通过（模拟），真实试点未运行 | [容量结果](../evidence/step-6/npm-test-verified/task-capacity.json) |
| T-CALL-098 | R-CALL-002、028；F-CALL-001、010、012 | 销售自助导入后为自己/他人建任务、尝试重新分配 | 自建允许、跨销售分配拒绝 | 权限集成 | P0 | D018、R028 | 通过，业务红转绿 | [局部绿灯](../evidence/continuation-1/self-service-green/run.json) |
| T-CALL-099 | R-CALL-003、023、028；F-CALL-010、012 | 本人导入尚未建任务，另一个销售导入同目标 | 本人目标可见，其他导入历史不泄漏，权威历史不删除 | 数据投影集成 | P0 | D018、R028 | 通过，业务红转绿 | [回归](../evidence/continuation-1/all-tests/run.json) |
| T-CALL-100 | R-CALL-004、005、028；F-CALL-012 | 查询/修改别人名单资格或拒绝，随后自己导入同一已拒绝目标 | 未拥有目标不能操作；重新导入保留企业拒绝 | 权限/拒绝集成 | P0 | D018、R028 | 通过，业务红转绿 | [回归](../evidence/continuation-1/all-tests/run.json) |
| T-CALL-101 | R-CALL-024、026、028；F-CALL-010、011 | 浏览器API导入/建任务/UNKNOWN/状态 | 自助闭环可操作，真实适配关闭 | 本地HTTP集成 | P0 | 工作台契约 | 通过，缺实现转绿 | [回归](../evidence/continuation-1/all-tests/run.json) |
| T-CALL-102 | R-CALL-001、023、024、026；F-CALL-012 | 缺token、外来Origin、伪Host | 403、不修改状态，本地入口不替生产鉴权 | HTTP边界集成 | P0 | 本地工作台契约 | 通过 | [回归](../evidence/continuation-1/all-tests/run.json) |
| T-CALL-103 | R-CALL-024、026；F-CALL-011、013 | 坏JSON、超64KiB、quit、伪actor、文件路径 | 明确拒绝、服务仍可用、无新增授权 | HTTP输入集成 | P0 | 本地工作台契约 | 通过 | [回归](../evidence/continuation-1/all-tests/run.json) |
| T-CALL-104 | R-CALL-006、029；F-CALL-005 | 周六计划、周日人工触发、周一到点 | 周末拒绝，周一窗口允许其他检查 | 日历/会话集成 | P0 | D019 | 通过，业务红转绿 | [回归](../evidence/continuation-1/all-tests/run.json) |
| T-CALL-105 | R-CALL-026、028、029；F-CALL-005、010、011、013 | 实际Chrome界面双任务操作、UNKNOWN刷新、暂停/拒绝、390宽度 | 13检查点通过；U2/G2/Q1/O1/C1均模拟，零浏览器异常 | 桌面浏览器E2E | P1 | 已采纳流程及工作台 | 通过；非Android/iPhone E2E | [浏览器证据](../evidence/continuation-1/browser-final/browser-check.json) |
| T-CALL-106 | R-CALL-019、020；F-CALL-003、008 | JDK/SDK下编译Android，lint权限检查与签出APK | 实际构建成功；权限撤回路径不靠禁用检查通过 | 原生构建/lint | P0 | D020、原型权限边界 | 通过：4个lint错误修复，保留10警告；非通话通过 | [初始lint](../evidence/continuation-1/android-lint.json)、[修复lint](../evidence/continuation-1/fixed-android-lint.json)、[APK](../evidence/continuation-1/android-apk.json) |
| T-CALL-107 | R-CALL-020、024；F-CALL-003、011 | AOSP API36模拟器安装、启动、仿真人工/定时/暂停 | 不调用电话API；分别留安装与事件结果 | Android模拟器探索 | P1 | 原型单目标协议 | 通过：安装/启动及5个合成检查；不代表真实SIM | [模拟器](../evidence/continuation-1/emulator/result.json) |
| T-CALL-108 | R-CALL-030；F-CALL-003、011、013 | 当前合成授权/资格revision，消费并观察transport调用前Store | 完整命令先持久化，绑定最新资格与任务/版本 | 共用集成（2项） | P0 | android-handoff契约 | 通过 | [共用回归](../evidence/android-handoff/all-tests-fixed/run.json) |
| T-CALL-109 | R-CALL-030；F-CALL-003、011、013 | 两次并发消费同一授权 | 仅一次传输，占用保持到核对 | 共用并发集成（1项） | P0 | android-handoff契约 | 通过 | [共用回归](../evidence/android-handoff/all-tests-fixed/run.json) |
| T-CALL-110 | R-CALL-030；F-CALL-003、011、013 | 交接前拒绝联系/暂停/重排/跨销售 | 零传输，旧授权或无权请求拒绝 | 共用集成（4项） | P0 | android-handoff契约 | 通过 | [共用回归](../evidence/android-handoff/all-tests-fixed/run.json) |
| T-CALL-111 | R-CALL-030；F-CALL-003、011、013 | 回执丢失/错误摘要或授权/真实来源/声称电话调用 | UNKNOWN保留占用，重复消费不重放 | 故障集成（5项） | P0 | android-handoff契约 | 通过 | [共用回归](../evidence/android-handoff/all-tests-fixed/run.json) |
| T-CALL-112 | R-CALL-030；F-CALL-003、011、013 | 持久化失败或持久化后模拟崩溃，SQLite重开 | 失败前零传输；已交接未知恢复不重发 | 持久化集成（2项） | P0 | android-handoff契约 | 通过 | [共用回归](../evidence/android-handoff/all-tests-fixed/run.json) |
| T-CALL-113 | R-CALL-030；F-CALL-003、011、013 | real/号码/多字段/非法或到期TTL/设备SIM绑定不匹配 | 传输前拒绝，0电话调用 | 协议单元（2项） | P0 | android-handoff契约 | 通过 | [共用回归](../evidence/android-handoff/all-tests-fixed/run.json) |
| T-CALL-114 | R-CALL-030；F-CALL-003、011、013 | 手机原生接收器非法命令/相同授权改变目标/重复命令 | 独立拒绝、先持久账本、同命令不二次执行 | S23真机无外呼（8检查点） | P0 | android-handoff契约 | 通过（合成限定） | [原生检查](../evidence/android-handoff/native-guards/result.json) |
| T-CALL-115 | R-CALL-030；F-CALL-003、011、013 | 两条合成联系人→任务→授权→USB手机→回执→显式核对→下一条 | 17检查点；任务来源可追溯、0 O/C/真实API；手机重开去重 | S23真机开发E2E（17检查点） | P0 | android-handoff契约 | 通过（USB合成限定） | [手机闭环](../evidence/android-handoff/device-demo-final/result.json) |

## 运行与证据边界

```powershell
npm.cmd --prefix packages/core test
npm.cmd --prefix packages/core run test:rules
npm.cmd --prefix packages/core run test:integration
npm.cmd --prefix packages/core run test:capacity
npm.cmd --prefix packages/core run test:sequences
& .\tools\run-core-tests.ps1 -Suite All
```

总回归按组实际运行：48时段+11替身+6窗口CLI+64业务/集成/模拟CLI+1容量+1状态序列=131。内存交错不独自证明多进程；本轮另有SQLite两进程授权、拒绝竞争与消费实验，5个进程退出点保存独立请求次数。固定语音仅保留后续范围，T047已由步骤6核对。

原M001源码/测试/替身不变；只修改package/记录脚本纳入新增模块。纯守卫、仿真Store、模拟证据不验收Android/iPhone真实能力。真实E2E入口为[manual-steps](manual-steps.md)；本机缺构建工具/真机/受控接收端，未自动改成辅助拨号。

## 有限状态序列与容量

seed=0x00C0FFEE，32×50=1600操作，SQLite重开、资格/拒绝、版本、暂停、人工/定时、写失败和handoff中断；逐步核对7个不变量。最终75个授权、67个模拟请求、0失败。每次运行保存输入序列；发生失败时保存初始快照、源码哈希、原序列和最多200次缩减重放的结果，不称全局最小。当前无失败复现文件，因为全部通过。见[state-sequences.json](../evidence/step-5/continuation/final-regression/state-sequences.json)。

容量场景为50目标200尝试（含明确人工重试）、10重复投递，不冒充200不同号码或真实日量。三次功能结果一致；首次约15.00秒，总回归出现约10814.59秒异常长样本，复测约12.47秒。异常原因未确认，不删原记录，也不将本机短样本作为生产吞吐保证。见[首次](../evidence/step-5/continuation/M009-capacity/capacity.json)、[总回归](../evidence/step-5/continuation/final-regression/capacity.json)、[复测](../evidence/step-5/continuation/capacity-timing-recheck/capacity.json)。

全部27项R-CALL仍有验证方法；步骤6已判定本地子范围通过，原完整范围部分通过/手机证据不足，见acceptance。平台T036～045、T049/050未运行，T024/029/030等只完成合成部分。生产策略缺口不使用实验默认值冒充完成。

## 步骤6当前回归覆盖

[最终npm回归](../evidence/step-6/npm-test-verified/run.json)含当前全部136检查：原65基础+68业务+2容量+1状态序列。表内步骤5链接保留作为历史分组证据，当前代码的总验证以此记录为准；所有当前本地Must行为均有T映射。T095/096对应两处修复，T097补200独立任务，T048增本地交互操作，T047范围审计完成。T036～045/T049/050仍未运行，T024/029/030等仍只完成模拟部分，没有把计划记成通过。

本轮T085约19.68秒，T097约23.80秒；32×50有限序列通过。原异常耗时保留，见历史章节；未证明真实日量/兼容/全天稳定性。双端逐段与试点协议见manual-steps。


## 2026-10-15真机增量

T036/037/038/040/045按真实边界更新，ID保持稳定。T039撤权/停卡与其他未运行项不因三通成功改成通过。原143项本地测试未改代码且未重复执行，本轮证据是物理设备、日志、用户接收端反馈和最终状态。详见[S23 Ultra真机报告](spikes/ANDROID-S23U-2026-10-15.md)。


## 2026-10-15设备绑定与网页手机区增量

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-116 | R031；F003/005 | 未绑定、匹配/不匹配APK、随机APK路径、重建绑定对象 | 仅匹配包可绑定，合成SIM，无真实能力；重启未绑定 | 单元3项 | P0 | R031 | 通过（替身） | [总回归](../evidence/android-binding/all-tests/run.json) |
| T-CALL-117 | R031；F003/005 | 到期及墙钟回退 | 绑定失效不自动续期 | 单元 | P0 | R031 | 通过（替身） | 同上 |
| T-CALL-118 | R031；F003/005 | 断连/包变更/启动标识变更 | 失效，重绑产生新ID | 单元3项 | P0 | R031 | 通过（替身） | 同上 |
| T-CALL-119 | R031；F003/011 | 旧适配器重绑后提交、发送前断连 | 0传输 | 单元 | P0 | R031 | 通过（替身） | 同上 |
| T-CALL-120 | R032；F005/013 | 虚拟时钟推进、尝试复用原任务库 | 手机墙钟/身份隔离，拒绝共库 | 集成 | P0 | R032 | 通过 | 同上 |
| T-CALL-121 | R031/032；F003/005 | 无绑定/到期/断连时触发 | 0授权/传输 | 集成 | P0 | R031/032 | 通过（替身） | 同上 |
| T-CALL-122 | R030/032；F003/011 | 并发触发、回执丢失后重开、授权后断连 | 最多1请求，未知占用、不重放 | 集成2项 | P0 | 不变量 | 通过（替身；原SQLite恢复T112沿用） | 同上 |
| T-CALL-123 | R032；F005/013 | 暂停/拒绝联系/非合成目标/多字段 | 阻止传输 | 集成 | P0 | R032 | 通过 | 同上 |
| T-CALL-124 | R031/032；F003/005/011/013 | 网页创建→未绑拒绝→绑定S23→发送→重复→刷新→核对 | 手机合成回执，G=1/O=C=0 | 实际浏览器+S23开发E2E | P0 | R031/032 | 通过（合成7点；另原浏览器13点） | [20点检查](../evidence/android-binding/browser-device/browser-check.json) |
| T-CALL-125 | R032；F013 | 无令牌/异源/虚拟时钟命令/手机区建任务 | 拒绝越界，原任务库不变 | HTTP集成 | P0 | R032 | 通过 | [总回归](../evidence/android-binding/all-tests/run.json) |

本轮总回归173通过；43模块语法通过。真实撤权/停卡/来电/长期后台/自动下一条/iOS未重跑或未运行，原状态保持。


## 持久定时增量（2026-10-15）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-126 | R033；F003/006 | 保存计划、提前/到点/重复驱动 | 持久PENDING，提前0、到点仅1，scheduled来源 | 共用集成 | P0 | R033 | 通过（合成） | [总回归](../evidence/android-scheduler/all-tests/run.json) |
| T-CALL-127 | R033；F005/006/011 | 暂停恢复/重排/直接旧版本/策略变化/拒绝/重绑/断连/超时 | 0新授权和传输，不补发 | 集成8项 | P0 | 不变量 | 通过（替身） | 同上 |
| T-CALL-128 | R033；F006/011 | SQLite重开，未来和过期计划 | 保留记录，NEEDS_REPLAN，无补发 | SQLite集成 | P0 | 恢复约束 | 通过 | 同上 |
| T-CALL-129 | R033；F006/011 | 人工与定时竞争，回执丢失 | 1授权，未知占用，不重放 | 并发集成 | P0 | 不变量 | 通过（替身） | 同上 |
| T-CALL-130 | R033；F006 | 非未来/超绑定/非法时间 | 拒绝且原任务不变 | 单元 | P0 | 开发时限 | 通过 | 同上 |
| T-CALL-131 | R033；F005/006 | 人工抢先、到点占用后转空闲 | 原定时取消、忙线失败不排队 | 集成 | P0 | D019 | 通过（替身） | 同上 |
| T-CALL-132 | R033；F006 | 设备预检消耗至超过期限 | 授权前拒绝，0授权/传输 | 故障集成 | P0 | R033 | 通过（替身） | 同上 |
| T-CALL-133 | R033；F011 | SQLite交接提交后注入崩溃再重开 | HANDOFF_UNKNOWN恢复待核对，无自动回放 | 持久化故障集成 | P0 | 不变量 | 通过（替身） | 同上 |
| T-CALL-134 | R033；F006 | 无浏览器驱动、真实Node定时器、关闭服务 | 自动领取1次，关闭停止驱动 | 运行时集成 | P0 | R033 | 通过（替身） | 同上 |
| T-CALL-135 | R033；F003/006 | 实际网页保存15秒计划→离开网页→S23接收→重开核对 | 自动合成回执1次，保存关联，0真实电话 | Chrome+USB S23 E2E | P0 | R033 | 通过（合成4点；含既有20点共24） | [浏览器证据](../evidence/android-scheduler/browser-device/browser-check.json) |

本轮总回归189项通过，44模块语法通过。红灯9失败/1通过（原接口已拒绝非法请求，因此未人为造红），首次实现10绿，扩展后16项调度测试通过。真实SIM定时队列、来电/撤权/停卡、长期后台和iOS不由此证明。


## R034电话能力只读检查（2026-10-15）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-136 | R034；F002/003/008 | 新快照、显式账户选择 | 默认不选卡；只读就绪也始终拒绝真实授权 | 单元 | P0 | R034 | 通过 | [最终回归](../evidence/phone-capabilities/all-tests-final/run.json) |
| T-CALL-137 | R034；F002/003/008/011 | 撤权/账户消失/未知/通话中/后台限制/闹钟关闭/设备变化 | 清除绑定、禁止自动换卡 | 单元7项 | P0 | R034 | 通过（替身） | 同上 |
| T-CALL-138 | R034；F008/011 | 过期、读失败、过期后重新读取、篡改返回对象 | 旧选择失效、不静默续绑、内部状态隔离 | 单元2项 | P0 | R034 | 通过 | 同上 |
| T-CALL-139 | R034；F008/011 | 错类型、重复账户、多余字段 | 拒绝整份快照 | 单元 | P0 | R034 | 通过 | 同上 |
| T-CALL-140 | R034；F002/003/008 | 实际读取S23账户/权限/后台→明确选择电销卡→再读取 | 只读绑定；与合成SIM分离，真实外呼关闭 | S23只读/浏览器3检查 | P0 | D021/R034 | 通过（不含实际撤权/停卡） | [独立读取](../evidence/phone-capabilities/device-read-fixed/result.json)、[27点浏览器](../evidence/phone-capabilities/browser-final/browser-check.json) |
| T-CALL-141 | R034；F008/011 | 错nonce、错APK、读期间设备变化 | 拒绝，不能使用旧文件 | 传输替身 | P0 | R034 | 通过 | [最终回归](../evidence/phone-capabilities/all-tests-final/run.json) |
| T-CALL-142 | R034；F008 | null能力、停用账户、未变化有效快照 | 未知/停用禁止选择；有效未变化保留选择 | 单元 | P0 | R034 | 通过 | 同上 |
| T-CALL-143 | R034；F008/011 | 手机时间比主机快约27秒，nonce关联本次读取 | 主机判断新鲜度，保留设备时间且不据其漂移续绑 | 回归+真机 | P0 | 本轮实际缺陷 | 红→绿 | [失败回归](../evidence/phone-capabilities/clock-red/run.json)、[修复](../evidence/phone-capabilities/clock-green/run.json) |

最终203项回归、46模块语法、实际浏览器+S23共27点通过；Android新APK构建/lint通过，0错误10原有警告。第一次浏览器定时预检超过实验期限81ms阻断，未修改容差；第二次因跨端时钟快照校验失败；两次失败留存，最终修复快照后流程通过。真实权限撤回/停卡/跨SIM通话仍未执行，T039不能据替身标整项通过。


## R035跨端时间契约（2026-10-15）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-144 | R035；F003/006 | 主机时钟模拟±1天、±27秒、0，经过真实传输方法 | 保留原命令；生成同等设备elapsed截止，不比较两端墙钟 | 传输替身5项 | P0 | 时差缺陷 | 通过 | [传输测试](../evidence/time-lease/transport-tests/run.json) |
| T-CALL-145 | R035；F003/011 | 错摘要/token/类型、耗尽预算 | 拒绝，不发送最终命令 | 单元 | P0 | R035 | 通过 | 同上 |
| T-CALL-146 | R035；F006/011 | 重用既有接收期限、剩余预算减少 | 截止只能更早，不能延长 | 单元 | P0 | R035 | 通过 | 同上 |
| T-CALL-147 | R035；F006/011 | Java实际共享守卫：到期、时间回退、延长、跨启动、启动未知、超60秒 | 非法/过期均拒绝 | JVM8项 | P0 | 原生LeaseWindow | 通过（非真机重启） | [JVM](../evidence/time-lease/jvm/run.json) |
| T-CALL-148 | R035；F003/006 | 真机收取模拟主机快/慢1天命令；不改设备时钟 | 两种偏差均接收合成任务 | USB S23 | P0 | 原时钟缺口 | 通过（合成） | [12点真机](../evidence/time-lease/device/result.json) |
| T-CALL-149 | R035；F003/011 | force-stop应用后同一命令再送 | SQLite账本仅一次；token/设备原截止不变 | USB S23进程恢复 | P0 | R035 | 通过（非整机重启） | 同上 |
| T-CALL-150 | R035；F003/011 | 真机错误token、elapsed到期、超过设备截止 | REJECTED，无新执行/真实电话 | USB S23拒绝检查 | P0 | R035 | 通过（合成） | 同上 |

本轮总210项共用回归通过，新增7项时间契约测试。原生接收器8项复测通过；其中旧“expired”原始包现在因TIME_LEASE_REQUIRED拒绝，不据此声称手机判定了主机过期，主机过期由既有T113校验、设备elapsed到期由T150验证。JVM8项不冒充实际重启手机。iPhone原未运行项按D023最后验收。


## R036受控额度模型（2026-10-15）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-151 | R036；F003/005/008/011 | 轮次重复/篡改/真实号码输入 | 幂等/冲突/拒绝，真实授权DENY | 纯逻辑仿真 | P0 | R036 | 通过（合成） | [11项](../evidence/trial-budget/rollback-green/run.json) |
| T-CALL-152 | R036；F003/005/008/011 | 改变租户/销售/设备/账户/目标 | 拒绝且不扣额 | 纯逻辑仿真 | P0 | R036 | 通过（合成） | [11项](../evidence/trial-budget/rollback-green/run.json) |
| T-CALL-153 | R036；F003/005/008/011 | 耗尽额度后重复注册 | 不恢复额度 | 纯逻辑仿真 | P0 | R036 | 通过（合成） | [11项](../evidence/trial-budget/rollback-green/run.json) |
| T-CALL-154 | R036；F003/005/008/011 | 开始前/截止/回拨/撤回 | 停止新占用 | 纯逻辑仿真 | P0 | R036 | 通过（合成） | [11项](../evidence/trial-budget/rollback-green/run.json) |
| T-CALL-155 | R036；F003/005/008/011 | 重复意图/任务周期/跨轮次 | 不重复扣额 | 纯逻辑仿真 | P0 | R036 | 通过（合成） | [11项](../evidence/trial-budget/rollback-green/run.json) |
| T-CALL-156 | R036；F003/005/008/011 | 未知占用及越权/不完整核对 | 维持占用，合法显式核对才释放 | 纯逻辑仿真 | P0 | R036 | 通过（合成） | [11项](../evidence/trial-budget/rollback-green/run.json) |
| T-CALL-157 | R036；F003/005/008/011 | SQLite关闭重开与双连接 | 未知和额度保留 | SQLite进程/持久集成 | P0 | R036 | 通过（合成） | [11项](../evidence/trial-budget/rollback-green/run.json) |
| T-CALL-158 | R036；F003/005/008/011 | 同设备另一销售/轮次申请 | 占用拒绝 | 纯逻辑仿真 | P0 | R036 | 通过（合成） | [11项](../evidence/trial-budget/rollback-green/run.json) |
| T-CALL-159 | R036；F003/005/008/011 | 两个Node进程同库抢占 | 一个RESERVED、一个OCCUPIED | SQLite进程/持久集成 | P0 | R036 | 通过（合成） | [11项](../evidence/trial-budget/rollback-green/run.json) |
| T-CALL-160 | R036；F003/005/008/011 | 撤回重注册与未发送核对 | 不复活，不退额度 | 纯逻辑仿真 | P0 | R036 | 通过（合成） | [11项](../evidence/trial-budget/rollback-green/run.json) |
| T-CALL-161 | R036；F003/005/008/011 | 先观察过期，再回拨到期限内 | 仍TIME_BLOCKED | 纯逻辑仿真 | P0 | R036 | 通过（合成） | [11项](../evidence/trial-budget/rollback-green/run.json) |

真实手机/线路、权限撤回接入和电话交接均未运行。本轮未修改原生代码，不重复原生构建或真机实验。T161有真实业务失败及修复证据：evidence/trial-budget/rollback-red、rollback-green。

最终回归：221/221通过；语法51通过；独立演示通过；退出码均0。证据：evidence/trial-budget/final-regression、final-syntax、final-demo。


## R037联合预检与交接（2026-10-15）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-162 | R037；F003/005/006/008/011 | 有效业务+快照+轮次 | 一张票据关联一次任务授权，真实授权DENY | 业务/设备状态替身集成 | P0 | R037 | 通过（仿真） | [22项](../evidence/controlled-trial/cancel-green/run.json) |
| T-CALL-163 | R037；F003/005/006/008/011 | 撤权/未知/忙线/换设备/换卡/失效/断连 | 零请求、零新授权、零扣额 | 业务/设备状态替身集成 | P0 | R037 | 通过（仿真） | [22项](../evidence/controlled-trial/cancel-green/run.json) |
| T-CALL-164 | R037；F003/005/006/008/011 | 读取期间拒绝联系/资格变化/暂停/换版本/越租户/到期 | 按最新状态拒绝 | 业务/设备状态替身集成 | P0 | R037 | 通过（仿真） | [22项](../evidence/controlled-trial/cancel-green/run.json) |
| T-CALL-165 | R037；F003/005/006/008/011 | 轮次额度耗尽 | 任务仍READY，无残留授权 | 业务/设备状态替身集成 | P0 | R037 | 通过（仿真） | [22项](../evidence/controlled-trial/cancel-green/run.json) |
| T-CALL-166 | R037；F003/005/006/008/011 | 人工/定时竞争 | 一个替身请求且仅扣一次 | 业务/设备状态替身集成 | P0 | R037 | 通过（仿真） | [22项](../evidence/controlled-trial/cancel-green/run.json) |
| T-CALL-167 | R037；F003/005/006/008/011 | UNKNOWN回执、恢复、再次提交、人工核对 | 不重放，原子释放占用不退次数 | 业务/设备状态替身集成 | P0 | R037 | 通过（仿真） | [22项](../evidence/controlled-trial/cancel-green/run.json) |
| T-CALL-168 | R037；F003/005/006/008/011 | 联合提交后交接前模拟崩溃，SQLite关闭重开 | 待核对，无重发 | SQLite恢复集成 | P0 | R037 | 通过（仿真） | [22项](../evidence/controlled-trial/cancel-green/run.json) |
| T-CALL-169 | R037；F003/005/006/008/011 | 网页形状请求夹带ready/qualified/设备/目标 | INVALID_REQUEST | 业务/设备状态替身集成 | P0 | R037 | 通过（仿真） | [22项](../evidence/controlled-trial/cancel-green/run.json) |
| T-CALL-170 | R037；F003/005/006/008/011 | BUSY/明确未提交 | 显式核对关闭额度占用，不退款 | 业务/设备状态替身集成 | P0 | R037 | 通过（仿真） | [22项](../evidence/controlled-trial/cancel-green/run.json) |
| T-CALL-171 | R037；F003/005/006/008/011 | 提交已落库但交接前暂停 | 不交接，保留额度直到显式核对 | 业务/设备状态替身集成 | P0 | R037 | 通过（仿真） | [22项](../evidence/controlled-trial/cancel-green/run.json) |

全量243/243、语法54个模块、controlled:demo通过；证据evidence/controlled-trial/{regression,syntax,demo}。真机/API/网页E2E未运行，不能据此推断手机权限撤回已实测。T170/171先保存业务失败，再修复回归；原断言保留。


## R038受控网页（2026-10-15）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-172 | R038；F003/005/008/011/013 | 变更额度/注册/冒用身份字段 | 拒绝且额度不变 | 服务/SQLite集成 | P0 | R038 | 通过（模拟） | [回归](../evidence/trial-web/regression/run.json) |
| T-CALL-173 | R038；F003/005/008/011/013 | 未选卡、选卡提交、重复、重新创建工作区 | 一次未知提交；不重放、不补额 | 服务/SQLite集成 | P0 | R038 | 通过（模拟） | [回归](../evidence/trial-web/regression/run.json) |
| T-CALL-174 | R038；F003/005/008/011/013 | 未勾选与明确勾选核对 | 前者拒绝，后者关闭且不退款 | 服务/SQLite集成 | P0 | R038 | 通过（模拟） | [回归](../evidence/trial-web/regression/run.json) |
| T-CALL-175 | R038；F003/005/008/011/013 | 缺token/外域/API提交后读取主区 | HTTP保护生效，主区计数仍0 | 服务/SQLite集成 | P0 | R038 | 通过（模拟） | [回归](../evidence/trial-web/regression/run.json) |
| T-CALL-176 | R038；F003/005/008/011/013 | SQLite关闭重开再提交 | 保留未知及已用额度，新进程需重新选卡 | 服务/SQLite集成 | P0 | R038 | 通过（模拟） | [回归](../evidence/trial-web/regression/run.json) |
| T-CALL-177 | R038；F003/005/008/011/013 | 浏览器点击/刷新/重复/核对/窄屏/返回主区 | 完整模拟闭环正常，无页面异常 | 实际Chrome E2E | P0 | R038 | 通过（模拟） | [浏览器](../evidence/trial-web/browser-run/browser-check.json) |

实际248测试/57模块语法/22浏览器检查通过；浏览器22包含原主区13与本轮9，不是22个新增需求。无真机电话或iPhone运行。


## R039真机观察＋模拟输出（2026-10-15）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-178 | R039；F002/003/005/008/011 | 真实时间模型+显式设备账户key绑定 | 一目标一次额度，只有模拟UNKNOWN提交 | 可注入设备观察集成 | P0 | R039 | 通过（范围见方法） | [软件回归](../evidence/observed-trial/regression/run.json) |
| T-CALL-179 | R039；F002/003/005/008/011 | 断连/撤权/账户消失/换设备/忙线/未知 | 零新模拟请求与扣额 | 可注入设备观察集成 | P0 | R039 | 通过（范围见方法） | [软件回归](../evidence/observed-trial/regression/run.json) |
| T-CALL-180 | R039；F002/003/005/008/011 | 另一SIM重绑/同卡重绑/超过5分钟 | 换范围拒绝，原截止不延长 | 可注入设备观察集成 | P0 | R039 | 通过（范围见方法） | [软件回归](../evidence/observed-trial/regression/run.json) |
| T-CALL-181 | R039；F002/003/005/008/011 | 重新创建服务模型并显式重绑 | 不默选卡、不重放、不恢复次数 | 可注入设备观察集成 | P0 | R039 | 通过（范围见方法） | [软件回归](../evidence/observed-trial/regression/run.json) |
| T-CALL-182 | R039；F002/003/005/008/011 | 绑定事务写入失败后重试 | 无孤立任务，重试可绑定 | 可注入设备观察集成 | P0 | R039 | 通过（范围见方法） | [软件回归](../evidence/observed-trial/regression/run.json) |
| T-CALL-183 | R039；F002/003/005/008/011 | S23实际只读、电销卡、模拟提交、SQLite重开和核对 | 10点通过，实际呼叫0 | S23只读＋SQLite＋替身 | P0 | R039 | 通过（范围见方法） | [真机观察](../evidence/observed-trial/s23-idle/result.json) |

首次真实检查s23/result.json因设备inCall=true阻断，成功路径未执行，退出1。用户回复已空闲后s23-idle/result.json读取空闲并通过10点；不覆盖首次记录、不将其视为通过。撤权/换卡/断线场景目前为替身，未实际改变手机权限/切卡。


## R040真机观察网页（2026-10-15）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-184 | R040；F002/003/005/008/011/013 | 客户端附带身份/ready/次数/期限/注册 | 拒绝，不创建轮次 | HTTP/软件集成 | P0 | R040 | 通过（范围见方法） | [回归](../evidence/observed-web/regression/run.json) |
| T-CALL-185 | R040；F002/003/005/008/011/013 | 仅刷新后查看选择，再模拟失联 | 不默选；失联清观察并阻断提交 | HTTP/软件集成 | P0 | R040 | 通过（范围见方法） | [回归](../evidence/observed-web/regression/run.json) |
| T-CALL-186 | R040；F002/003/005/008/011/013 | 无token/外域/正常HTTP流程/检查纯模拟区 | 保护生效、一次未知提交、另一库额度不变 | HTTP/软件集成 | P0 | R040 | 通过（范围见方法） | [回归](../evidence/observed-web/regression/run.json) |
| T-CALL-187 | R040；F002/003/005/008/011/013 | 服务未配置USB设备 | 明确拒绝，不回退模拟观察 | HTTP/软件集成 | P0 | R040 | 通过（范围见方法） | [回归](../evidence/observed-web/regression/run.json) |
| T-CALL-188 | R040；F002/003/005/008/011/013 | 实际Chrome＋S23点击读取/电销卡绑定/提交/刷新/重复/核对/窄屏 | 12个新增检查通过，仅模拟输出 | 真实Chrome+S23只读E2E | P0 | R040 | 通过（范围见方法） | [浏览器](../evidence/observed-web/browser/browser-check.json) |
| T-CALL-189 | R040；F002/003/005/008/011/013 | HTTP服务关闭及同SQLite重新启动 | 已用1/未知保留，未选卡，无新请求 | HTTP/软件集成 | P0 | R040 | 通过（范围见方法） | [回归](../evidence/observed-web/regression/run.json) |

全量263/263、语法61模块、浏览器34检查通过（原22＋新增12）。浏览器真机部分只有只读Activity，输出仍FakeDialAdapter。未实际撤回权限/切卡/拔线；软件对应拒绝证据不扩大为真机通过。


## R041原生提交前dry-run（2026-10-15）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-190 | R041；F002/003/005/008/011 | 同一Java规则输入权限缺失/忙线/未知/账户0或2匹配/停用 | 9项拒绝与成功规则正确 | JVM（非真机撤权） | P0 | R041 | 通过（仅对应范围） | [证据](../evidence/native-guard/jvm-green/run.json) |
| T-CALL-191 | R041；F002/003/005/008/011 | S23电销卡，安装身份nonce与设备期限 | DRY_RUN_READY，电话API0 | 真机dry-run | P0 | R041 | 通过（仅对应范围） | [证据](../evidence/native-guard/s23-expiry/result.json) |
| T-CALL-192 | R041；F002/003/005/008/011 | 同摘要重送及force-stop应用后重送 | duplicate=true、账本检查次数1 | 真机进程恢复 | P0 | R041 | 通过（仅对应范围） | [证据](../evidence/native-guard/s23-expiry/result.json) |
| T-CALL-193 | R041；F002/003/005/008/011 | 同ID异摘要/错设备/错账户/real模式/附号码字段 | 冲突或严格拒绝，不回退其他卡 | 真机拒绝检查 | P0 | R041 | 通过（仅对应范围） | [证据](../evidence/native-guard/s23-expiry/result.json) |
| T-CALL-194 | R041；F002/003/005/008/011 | 缺token/错token/非法截止/延长/实际等待过期 | 全部拒绝 | 真机设备单调期限 | P0 | R041 | 通过（仅对应范围） | [证据](../evidence/native-guard/s23-expiry/result.json) |
| T-CALL-195 | R041；F002/003/005/008/011 | 旧Probe状态、新APK观察网页回归 | 暂停/模拟/未armed；34网页检查通过 | 状态核验与实际Chrome+S23 | P0 | R041 | 通过（仅对应范围） | [证据](../evidence/native-guard/browser/browser-check.json) |

JVM9、新APK构建/lint（0错误10原有警告）、S23最终16点、浏览器34点通过。本轮未修改共用逻辑，沿用此前263测试证据，不冒称本轮重跑。首次s23因为host观察inCall=true中止退出1，原生忙线分支未触发；用户回复已空闲后成功。最终s23-expiry增加真实等待2秒凭据到期，15点旧证据保留。


## R042：业务票据关联原生检查（2026-10-15）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-196 | R042；F003/005/008/011/013 | 授权+额度后原生检查 | 发送前持久链接；READY不计API成功；五字段无号码 | 替身集成及S23 dry-run | P0 | R042 | 通过（限定dry-run） | evidence/guard-link/final-regression/run.json；s23-corrected/result.json |
| T-CALL-197 | R042；F011/013 | 丢回执/错摘要/非零API/真实开关/次数2/冲突 | 不接收成功证据，未知占用，不重发 | 6组替身集成 | P0 | R042 | 通过（非真实拔线） | evidence/guard-link/final-regression/run.json |
| T-CALL-198 | R042；F005/011/013 | 并发、重复、人工核对 | 一次检查/扣额；核对不退款 | 集成；S23重复提交 | P0 | R042 | 通过 | evidence/guard-link/final-regression/run.json；s23-corrected/result.json |
| T-CALL-199 | R042；F005/008/011/012 | 提交边界暂停/过期/撤销轮次/票据或账户变化 | 拒绝，无原生请求 | 5组替身集成 | P0 | R042 | 通过 | evidence/guard-link/final-regression/run.json |
| T-CALL-200 | R042；F008/011/013 | 改命令/链接/绑定/摘要、到期、外来账户 | 拒绝，不发传输 | 单元及集成 | P0 | R042 | 通过 | evidence/guard-link/final-regression/run.json |
| T-CALL-201 | R042；F011/013 | 丢回执后SQLite关闭重开 | 命令/票据/次数保留；不重放 | SQLite集成；S23成功检查后重开 | P0 | R042 | 通过（非手机整机断电） | evidence/guard-link/final-regression/run.json；s23-corrected/result.json |

红灯8失败/1通过为目标关联缺失，无导入/语法错误。S23首次因测试脚本calendarMode字段错误被POLICY_GAP阻断，未发送guard，证据原样保留；改为既有calendar字段后5点通过，0真实外呼。实际拔线/撤权/停卡/整机重启及真实电话闭环仍未运行。


## R043：网页原生检查（2026-10-15）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-202 | R043；F003/008/011 | 首次绑定、身份读取失败、状态轮询 | 安装key持久；失败无轮次；轮询无手机IO | 替身集成 | P0 | R043 | 通过 | evidence/observed-native/recovery/run.json |
| T-CALL-203 | R043；F008/011 | 安装变化后再绑定/直接提交 | 清选择并拒绝，不扣额，不覆盖原身份 | 替身集成 | P0 | R043 | 通过，非实际卸载 | evidence/observed-native/recovery/run.json |
| T-CALL-204 | R043；F011/013 | 回执丢失、重建模型、缺原生配置 | 未知/次数保留，不回退Fake，可核对历史 | 替身集成 | P0 | R043 | 通过 | evidence/observed-native/recovery/run.json |
| T-CALL-205 | R043；F003/011 | 已绑定Fake历史轮次后启用native | 拒绝模式变化，不重建额度 | 集成 | P0 | R043 | 通过 | evidence/observed-native/regression/run.json |
| T-CALL-206 | R043；F003/013 | HTTP注入安装key、正常提交 | 注入拒绝；原生回执与apiSubmission分离 | HTTP集成 | P0 | R043 | 通过 | evidence/observed-native/recovery/run.json |
| T-CALL-207 | R043；F003/005/008/011/013 | Chrome+S23：读取/电销卡/提交/刷新/重复/核对/窄屏 | 原生READY、待核对/尚未拨号；一次检查与额度 | 实际浏览器+手机dry-run | P0 | R043 | 通过，0真实外呼 | evidence/observed-native/browser/browser-check.json |
| T-CALL-208 | R043；F011/013 | 原生失回执后SQLite关闭、重建HTTP服务 | 身份/未知/次数保留，无默认选择/后台IO/重发 | SQLite+HTTP集成 | P0 | R043 | 通过 | evidence/observed-native/recovery/run.json |

首次5个目标业务测试全红，入口可加载；实现后5绿。全量283/283通过；随后新增3场景，8项专项全部通过（与全量中的5项重叠，不相加称291）。65模块语法通过。Chrome/S23实际34检查通过。未实际卸载、拔线、撤权或整机重启，不扩大证据范围。


## 2026-10-15步骤6证据复核

T001～208中已实现的自动化集合，本轮npm全量286/286通过（测试数量不等于ID数量）；T085/T097容量实际重跑，200任务、重投/SQLite重开通过。T207复用34项实际浏览器/S23证据并核对71文件摘要无变化；R041原生13文件及APK摘要匹配，已有构建/lint/16点证据继续有效。证据：evidence/acceptance-android-dry/regression/run.json、audit.json。未新增行为不重新分配ID。

本地与dry-run方法列通过；原生实际撤权/停卡/来电竞争/整机重启、正式业务真实通话E2E、日量试点、iPhone仍未运行/证据不足，不能用本次集合绿灯替代。


## R044交接契约（2026-10-15）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-209 | R044；F002/003/011/013 | 完整匹配的明确合成许可 | 有界交接描述，不变更输入、不启真实许可 | 纯契约单元 | P0 | R044 | 通过 | evidence/controlled-call-contract/green/run.json |
| T-CALL-210 | R044；F002/008/012 | 企业/销售/设备/安装/SIM/目标六项分别不匹配 | 拒绝、不替换范围 | 单元6组 | P0 | R044 | 通过 | 同上 |
| T-CALL-211 | R044；F005/008/011/012 | 缺审批引用/附号码、起止/回退/耗尽、撤销/版本/资格/拒绝/暂停/占用/未知/权限/停卡/过期观察 | 相应拒绝原因 | 单元22组 | P0 | R044 | 通过，非真实环境变化 | 同上 |
| T-CALL-212 | R044；F005 | 工作时间外/周末、较长许可 | 窗口拒绝；不能延长交接TTL | 单元 | P0 | R044 | 通过 | 同上 |
| T-CALL-213 | R044；F011/013 | 记录端口的提交/不提交/失回执、撤销许可 | API与呼出/接通/人工结果分离；未知待核对；拒绝无记录 | 无电话替身 | P0 | R044 | 通过 | 同上及demo/run.json |
| T-CALL-214 | R044；F002/012 | 非法对象、伪造USER_APPROVED、篡改返回描述 | 拒绝或不污染输入；无真实权限 | 单元 | P0 | R044 | 通过 | 同上 |

31项初始目标测试红灯均为业务NOT_IMPLEMENTED；实现后补畸形输入/替身，共41项通过。此集合不证明持久次数、防重、真实身份/电话可靠性；相应持久集成留下一小项。


## R045持久交接（2026-10-15）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-215 | R045；F003/011/013 | 事务提交后、端口调用前观察库 | 次数1、票据/描述/未知已保存，端口尚未调用 | 故障钩子/集成 | P0 | R045 | 通过 | evidence/controlled-call-claim/green-corrected/run.json |
| T-CALL-216 | R045；F005/011 | 同时提交同尝试两次 | 一次扣额/调用 | 集成 | P0 | R045 | 通过 | 同上 |
| T-CALL-217 | R045；F011 | 提交前/提交后/回执后/回执落库前异常，SQLite重开 | 前者回滚无调用；后者待核对不重放 | 4处异常注入/SQLite | P0 | R045 | 通过，非物理断电 | 同上 |
| T-CALL-218 | R045；F005/008/012 | 读取中改变暂停/拒绝/计划/权限/SIM/期限/撤销 | 最新状态阻断，无扣额和调用 | 7组集成 | P0 | R045 | 通过 | 同上 |
| T-CALL-219 | R045；F011/012 | 客户端加字段/越权/未确认核对/确认核对/重投 | 保护生效，核对不退款，重投无调用 | 集成 | P0 | R045 | 通过 | 同上 |
| T-CALL-220 | R045；F011 | 同许可ID增加额度 | 配置冲突拒绝 | 集成 | P0 | R045 | 通过 | 同上 |
| T-CALL-221 | R045；F011 | 两个SQLite连接竞争同尝试 | 一票据、一次扣额、一次调用 | 数据库集成 | P0 | R045 | 通过，非多机分布式 | 同上 |
| T-CALL-222 | R045；F013 | SUBMITTED/NOT_SUBMITTED/无效回执 | 结果分开，错误回执UNKNOWN，核对不退款 | 替身集成 | P0 | R045 | 通过 | 同上 |
| T-CALL-223 | R045；F005/011 | 观察被拒绝后时间回退 | 保留时间高水位，拒绝不泄露暂存次数/票据 | 集成 | P0 | R045 | 通过 | 同上 |

专项20通过，完整347通过，73模块语法通过。首轮15失败中有1项测试请求对象误写函数；修正前证据原样保留，不把该TypeError算业务红灯，其余实现缺失失败有效。demo实际运行显示首次调用1次，重开0次，真实电话API0。


## R046原生受控入口（2026-10-15）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-224 | R046；F003/011 | 共享执行器首次调用、提交前观察账本 | UNKNOWN和次数已保存后才调用；API返回单列 | JVM执行器＋账本/电话替身 | P0 | R046 | 通过（非Android SQLite） | evidence/native-call/jvm-green/run.json |
| T-CALL-225 | R046；F011 | 同请求重投/异摘要/耗尽/初始守卫拒绝/claim失败 | 无重复调用，拒绝不发电话 | JVM替身 | P0 | R046 | 通过 | 同上 |
| T-CALL-226 | R046；F008/011/013 | 电话异常、二次守卫拒绝、回执落库失败、Error中断后重投 | 未知/待核对，扣次保留且不重放 | JVM共享执行器、27断言中的失败分支 | P0 | R046 | 通过（非手机强杀） | 同上 |
| T-CALL-227 | R046；F002/003/008 | 真实入口源代码、打包Manifest、权限异常处理 | 默认disabled，受限私有许可，构建/lint通过 | 源码审查/Android构建/lint/aapt2 | P0 | R046 | 部分通过：构建与默认开关通过，运行未测 | evidence/native-call/manifest/run.json；continuation-1/native-call-checked-* |
| T-CALL-228 | R046；F003/008/011 | 新入口无许可/错token/撤销/账户变化/SQLite重开/真实呼叫 | 拒绝或指定SIM最多一次，未知待核对 | 待Android实机集成 | P0 | R046 | 未运行：新APK未安装，主机桥接/核对未完成，旧3次许可耗尽 | manual-steps.md |

JVM红灯编译成功、执行NOT_IMPLEMENTED退出1；实现后27断言退出0。首次lint3处MissingPermission错误已用显式SecurityException处理修复；最终0错误10原有警告。仅复用既有347项Node测试，不声称本轮重跑；JS未改。


## R047主机原生协议（2026-10-15）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-229 | R047；F003/011 | 规范命令、字段倒序、变更关联字段、非法或额外字段 | 固定摘要/不可变副本；非法命令拒绝 | Node纯逻辑 | P0 | R046原生格式/R047 | 通过 | evidence/native-call-protocol/green/run.json |
| T-CALL-230 | R047；F008 | 匹配API_SUBMITTED回执 | 仅提交返回，呼出/接通/人工仍null | Node纯逻辑 | P0 | R047 | 通过 | 同上 |
| T-CALL-231 | R047；F011/013 | 错摘要/attempt/ticket/source、缺失/损坏/超长回执 | UNKNOWN、待核对、不允许重试 | Node纯逻辑 | P0 | R047 | 通过 | 同上 |
| T-CALL-232 | R047；F008/011 | 拒绝、额度冲突、历史重复、历史已核对回执 | 保留原生标签，不自动释放占用或重发 | Node纯逻辑 | P0 | R047 | 通过 | 同上 |

本轮31专项、378全量及75模块语法均通过；USB传输与原生核对不在这些测试的通过范围内，T228仍未运行。


## R048受限传输及原生核对

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-233 | R048；F008/011 | 摘要/token/安装变化，确认缺失，忙线/未知，已核对后晚到结果 | 拒绝错误核对、终态不重开 | 共享Java规则，13断言 | P0 | R048 | 通过（非SQLite实机） | evidence/native-reconcile/jvm-green |
| T-CALL-234 | R048；F003/011 | 可信配置、错scope/设备/过期/TEST_FIXTURE、设备lease | 拒绝或单次提交 | Node USB替身 | P0 | R048 | 通过 | evidence/native-reconcile/transport |
| T-CALL-235 | R048；F011/013 | 两连接并发、失回执后重开、同attempt改摘要、只读重查 | 实际主机SQLite持久去重，替身最多一次 | Node集成SQLite＋假USB | P0 | R048 | 通过 | 同上 |
| T-CALL-236 | R048；F008 | 错摘要/缺失电话回执 | UNKNOWN，无重试 | Node替身 | P0 | R048 | 通过 | 同上 |
| T-CALL-237 | R048；F008/011 | 无明确确认、busy、旧nonce、正确核对，再次提交 | 原生核对未确认则停止；不自动核对主机/退次/重发 | Node替身 | P0 | R048 | 通过（不代表手机空闲检查已实测） | 同上 |
| T-CALL-238 | R048；F013 | 真正子进程runner失败并携带合成secret参数 | 日志不含参数/secret/stdout/stderr | Node本机进程，无adb设备 | P0 | R048 | 通过 | 同上 |
| T-CALL-239 | R048；F003/008/011 | Android build/lint、打包manifest | 构建通过，双入口默认disabled | 构建/静态检查 | P0 | R048 | 通过 | continuation-1/native-reconcile-final-*；native-reconcile/manifest |
| T-CALL-240 | R048；F003/008/011/013 | 真机schema迁移/核对/权限撤回/重开/晚到结果/业务连接 | 只关闭匹配请求，无新增呼叫，无退额 | 待Android集成 | P0 | R048 | 部分通过：已安装并完成共享SQLite迁移/核对/关闭重开；实际系统场景与电话入口未运行 | evidence/native-db-check；docs/manual-steps.md |

本轮12项传输测试通过，回归390/390，语法77模块；JVM核对13断言＋既有执行器27断言通过。不是整条真实业务链路验收。


## R049本地受控协调器

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-241 | R049；F003/011 | 提交前观察持久状态 | 扣次/票据/命令/UNKNOWN先于端口调用，secret不入库 | Node＋实际SQLite＋记录USB | P0 | R049 | 通过 | evidence/local-coordinator/targeted |
| T-CALL-242 | R049；F011 | 同实例/双SQLite连接并发与重复提交 | 一次交接、一次扣次 | 集成 | P0 | R049 | 通过 | 同上 |
| T-CALL-243 | R049；F011/013 | 提交前/后、端口返回后、回执提交前崩溃，重开库 | 无未知自动重放，只读回执 | SQLite故障注入 | P0 | R049 | 通过 | 同上 |
| T-CALL-244 | R049；F003/011 | 设备读取后暂停/拒绝/改计划/忙线/政策绑定撤销/许可撤销 | 无提交且不扣次 | 共用规则集成 | P0 | R049 | 通过 | 同上 |
| T-CALL-245 | R049；F008/011 | 原生拒绝/成功、重复核对、晚到回执 | 拒绝保留占用；成功结束、不退额、不重开 | 记录USB＋SQLite | P0 | R049 | 通过 | 同上 |
| T-CALL-246 | R049；F011/013 | 原生已核对后主机崩溃、主机核对提交前崩溃 | 主机保持pending，重复显式核对可收敛 | 故障注入 | P0 | R049 | 通过 | 同上 |
| T-CALL-247 | R049；F008/011 | 普通仿真核对和模拟接通事件 | 不得释放/伪造受控尝试 | 回归 | P0 | R049 | 通过 | 同上 |
| T-CALL-248 | R049；F003/011 | TEST_FIXTURE、旧仿真轮次、改额/换发送库 | 明确拒绝，不升级许可 | 配置/集成 | P0 | R049 | 通过 | 同上 |
| T-CALL-249 | R049；F011 | 额外客户端字段、他人actor、缺人工确认 | 拒绝 | 单元/集成 | P0 | R049 | 通过 | 同上 |
| T-CALL-250 | R049；F003 | 原生只读快照映射：错source、权限撤回、重复账户 | 不将不明条件当就绪 | USB替身 | P0 | R049 | 通过 | 同上 |

本轮专项34项（协调器21＋USB13），全量412/412，语法80文件；演示退出0。T240原生数据库/实际USB链路仍未运行；以上不是新增通话证据。


## R050原生无拨号验收

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-251 | R050；F003/011 | debug入口、打包Manifest、真实设备安装前后检查 | 独立数据库，实际账本不变，拨号/核对组件仍禁用 | S23 API36实机＋打包检查 | P0 | R050 | 通过 | evidence/native-db-check/device、manifest、component-state.json |
| T-CALL-252 | R050/R046；F011/013 | claim重复/异摘要/占用、关闭重开、写入触发器中断 | UNKNOWN与次数持久、重复不重放、事务完整回滚 | 实际Android SQLite事务 | P0 | R050 | 通过 | device/device-report.json |
| T-CALL-253 | R050/R048；F011/013 | 合成v1账本升级v2 | 行和used保留，缺凭据旧行拒绝关闭 | 实际Android SQLite迁移 | P0 | R050 | 通过 | 同上 |
| T-CALL-254 | R050/R048；F008/011 | 错请求/摘要/token/安装、未确认、busy/null注入、正常核对/晚到complete | 拒绝或只关闭匹配行，幂等不退次、不重开 | 真SQLite＋注入BusyProbe | P0 | R050 | 通过；实际忙线/权限撤回仍未测 | 同上 |
| T-CALL-255 | R050；F003/013 | 新APK、浏览器→本机服务→S23原生dry-run，现有网页HTTP | 34项既有浏览器流程通过，网页恢复200 | 浏览器/真机无拨号E2E | P0 | R050 | 通过 | browser/run.json；service-health/run.json |

T240从“全部未运行”更新为部分通过：schema迁移/真实SQLite事务/关闭重开已补证据；真实系统权限撤回、来电占用、进程强杀/掉电与完整ControlledCallActivity/ControlledReconcileActivity交接仍未运行。数据库36断言不替代电话或系统竞争验证。


## 步骤6证据一致性复核

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-256 | R044～050；F003/011/013 | 比对历史有效测试源码/当前文件集/包摘要、退出码、容量、当前安装包与网页 | 不复用过期测试，不将替身/历史拼接为完整电话通过 | 只读验收审计 | P0 | 步骤6 | 通过：85 core＋21原生/工具/包摘要一致，当前APK匹配、HTTP200 | evidence/acceptance-r050/audit/run.json；audit.json |

412/36/34为已运行且本轮审计仍有效的结果，不是本轮重新执行这些测试；T240仍部分通过。


## R051操作台

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-257 | R051；F011/013 | 初始待核对任务、状态请求 | 白名单显示，不泄露secret/命令/路径 | Node＋SQLite | P0 | R051 | 通过 | evidence/controlled-workspace/regression |
| T-CALL-258 | R051；F008/011 | 只读回执刷新、未确认/确认核对、晚到刷新 | 未确认拒绝；结束不退次/不重开 | 实际协调器＋记录端口 | P0 | R051 | 通过 | 同上 |
| T-CALL-259 | R051；F003/011 | submit、他人attempt、actor/permit/号码等额外字段 | 拒绝，不产生发送 | API规则 | P0 | R051 | 通过 | 同上 |
| T-CALL-260 | R051；F011/013 | 核对后关闭/重开数据库 | 一条历史结束记录、used=1保留 | SQLite集成 | P0 | R051 | 通过 | 同上 |
| T-CALL-261 | R051；F011 | 页面/HTTP会话、错Origin、缺配置、POST status | token/来源检查、缺配置明确、状态接口405 | HTTP集成 | P0 | R051 | 通过；status方法Bug先失败后修复 | status-method-red及regression |
| T-CALL-262 | R051；F008/011/013 | 浏览器刷新、确认/核对、重载、窄屏、当前服务GET | 11检查通过、无运行异常/横向溢出；当前页200且待核对 | Chrome真实浏览器＋本地记录端口 | P0 | R051 | 通过（不含手机） | browser/browser-check.json；live/run.json |

全量419/419、83模块语法通过；原工作台浏览器回归22检查通过（本轮未连接USB）；此前34手机检查仍为历史有效证据，不能称本轮重跑。


## R052：只读记录连接
| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-263 | R052；F011/013 | 指定既有记录、读取/尝试修改 | 原DB字节不变；白名单；不发送 | Node＋SQLite合成数据 | P0 | R052 | 通过 | evidence/controlled-records/cli |
| T-CALL-264 | R052；F003/011 | 缺配置/缺库/额外secret字段 | 拒绝、不建库/不回退演示 | Node | P0 | R052 | 通过 | 同上 |
| T-CALL-265 | R052；F003/011 | 演示库/撤回read/错误绑定或账本来源 | 拒绝显示 | SQLite | P0 | R052 | 通过 | 同上 |
| T-CALL-266 | R052；F011/013 | 过期许可、显式观察、错安装、过期/断开 | 历史仍只读；检查不触发电话；状态正确 | 注入观察替身 | P0 | R052 | 通过；未真机运行 | 同上 |
| T-CALL-267 | R052；F003 | 打开后撤回读取权限 | 后续读/检查拒绝 | SQLite双连接 | P0 | R052 | 通过 | 同上 |
| T-CALL-268 | R052；F008/011 | HTTP改身份/核对/发送；浏览器只读及勾选/重载/窄屏 | 拒绝变更；7项浏览器检查通过 | HTTP＋Chrome，合成库/观察替身 | P0 | R052 | 通过 | cli、browser-readonly |
| T-CALL-269 | R052；F011 | 真正CLI传缺配置、打开页面 | 明确不可用且不创建演示DB | 子进程＋HTTP | P0 | R052 | 通过 | cli |
全量回归426/426（regression-fixed）；随后仅增加CLI测试，专项8/8（cli）；最终语法85模块通过（syntax-final）。演示浏览器11检查（browser-demo-final）通过，已有实际网页GET通过（live）。不把增加测试后未全量重跑说成427项全量通过。


## R053：已有回执读取
| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-270 | R053；F011/013 | 已匹配发送行、提交回执 | 单列观察，业务库/发送库字节不变，未知占用与额度保留 | SQLite＋合成回执 | P0 | R053 | 通过 | evidence/controlled-receipts/regression |
| T-CALL-271 | R053；F003/011 | 无发送行、命令摘要不符 | 拒绝且不读设备 | 集成替身 | P0 | R053 | 通过 | 同上 |
| T-CALL-272 | R053；F011/013 | 无效回执→匹配提交→缺失 | 未知/匹配来源分开，后续缺失不抹掉历史匹配观察 | 集成替身 | P0 | R053 | 通过 | 同上 |
| T-CALL-273 | R053；F003 | 外人尝试/命令覆盖/异步期间撤权 | 拒绝，后续不采纳 | SQLite＋异步替身 | P0 | R053 | 通过 | 同上 |
| T-CALL-274 | R053；F011 | 设备读取前后安装变化、命令捕获 | 身份两次检查，仅cat固定摘要回执；变化拒绝 | USB接口替身，无真机 | P0 | R053 | 通过 | 同上 |
| T-CALL-275 | R053；F008/011 | 缺发送库/结束任务查询/关闭重开 | 不建库、不重开终态、缓存不冒充持久证据 | SQLite | P0 | R053 | 通过 | 同上 |
| T-CALL-276 | R053；F011/013 | 点击查询、观察独立、刷新/窄屏 | 8项通过；没有核对/发送权限 | Chrome＋合成库/回执 | P0 | R053 | 通过 | browser/browser-check.json |
433/433全量回归、85模块语法、只读浏览器8/演示11检查通过。真机回执读取未运行；没有实际通话。


| T-CALL-277 | R051～053；F003/008/011/013 | 审计源摘要/证据及本机页面 | 91 core/21原生文件匹配，页面200；不拼接模拟与历史真机结果 | 步骤6只读审计 | P0 | 当前验收 | 通过 | evidence/acceptance-r053/audit |

2026-10-15步骤6：T085/T097重新执行2/2通过；T276本轮Chrome8检查通过。T257～275复用433回归中的有效结果，91个core源码文件逐一匹配；不是本轮全量重跑。实际电话/真实配置回执仍未运行。


## R054名单输入
| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-278 | R054/R003；F010 | 导入/重复/重开 | 稳定ID、去重、掩码、不外呼 | SQLite | P0 | R054 | 通过 | evidence/contact-input/regression |
| T-CALL-279 | R054/R003；F010 | 国家码/座机/无效行混合 | INVALID/UNSUPPORTED隔离，dialable=false | 单元集成 | P0 | R054 | 通过 | 同上 |
| T-CALL-280 | R054/R002；F001/012 | 同企业不同销售/跨企业/无权限/覆盖身份 | 隔离与冲突拒绝 | SQLite双连接 | P0 | R054 | 通过 | 同上 |
| T-CALL-281 | R054/R004/005；F012 | 撤回/拒绝后重导入与重启 | 原状态保留，不能恢复拒绝 | SQLite | P0 | R054 | 通过 | 同上 |
| T-CALL-282 | R054；F010/012 | 超批次/非法声明/跨销售修改 | 拒绝，无新目标 | 集成 | P0 | R054 | 通过 | 同上 |
| T-CALL-283 | R054；F001/010 | 实际HTTP来源/token/发送操作 | 页面可用，越权和发送拒绝 | HTTP | P0 | R054 | 通过 | 同上 |
| T-CALL-284 | R054/R023；F010/013 | 查看私有原始行、注入SQLite写失败 | 原值保留，批次/目标/事件原子回滚 | SQLite触发器故障 | P0 | R054 | 通过 | 同上 |
| T-CALL-285 | R054；F011 | 错误数据库类型 | 拒绝且不写contacts表 | SQLite | P0 | R054 | 通过 | 同上 |
| T-CALL-286 | R054；F010/012 | 浏览器导入/确认/撤回/拒绝/重导入/刷新/窄屏 | 10检查通过；状态文本和按钮分别断言 | Chrome＋生成测试数据 | P0 | R054 | 通过 | browser-final/browser-check.json |
441全量测试/88模块语法通过，旧工作台Chrome22回归通过。首次浏览器检查存在选择器误判，browser-final才是有效最终证据，详见执行记录。真机/实际客户导入未运行。


## R055任务计划
| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-287 | R055/R013；F005/011 | 建计划、相同/冲突意图、重开 | 稳定计划、同意图幂等、未开放外呼 | SQLite | P0 | R055 | 通过 | evidence/contact-plans/regression |
| T-CALL-288 | R055/R006；F005 | 周末/09前/18点/过时/旧联系人版本 | 明确拒绝，不创建计划 | 注入时钟 | P0 | R055 | 通过 | 同上 |
| T-CALL-289 | R055/R007/009；F005/011 | 改期/旧版本/取消/恢复取消 | 版本递增，旧修改和取消恢复拒绝 | SQLite | P0 | R055 | 通过 | 同上 |
| T-CALL-290 | R055/R011；F011 | 暂停→恢复→重开→显式重排 | 销售隔离，恢复不补放 | SQLite | P0 | R055 | 通过 | 同上 |
| T-CALL-291 | R055/R004/005；F012 | 撤回/重新确认/拒绝/时间经过 | 旧计划阻挡，过时不补拨 | 注入时钟 | P0 | R055 | 通过 | 同上 |
| T-CALL-292 | R055/R002；F001 | 跨销售建/改计划、无权限、覆盖身份 | 拒绝且不可见 | SQLite | P0 | R055 | 通过 | 同上 |
| T-CALL-293 | R055/R014；F011/013 | 审计写入失败 | 计划/意图/事件整体回滚 | SQLite触发器 | P0 | R055 | 通过 | 同上 |
| T-CALL-294 | R055/R007；F005/011 | 双连接旧版编辑、18点边界 | 冲突拒绝、不覆盖 | 集成 | P0 | R055 | 通过 | 同上 |
| T-CALL-295 | R055；F005/011/012 | 浏览器建计划/暂停恢复/重排/过时/拒绝/重载/窄屏 | 11检查通过，无自动外呼 | Chrome＋固定测试时钟 | P0 | R055 | 通过 | browser/browser-check.json |
全量449/449、90模块语法通过；原名单浏览器10检查回归通过。无手机、无实际电话。


## R056本地尝试闭环
| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-296 | R056/R013；F011 | 重复意图/版本/下一条竞争 | 一条尝试，销售占用，来源分离 | SQLite | P0 | R056 | 通过 | evidence/contact-attempts/regression |
| T-CALL-297 | R056/R014/015；F011 | 提交后故障、重开、显式关闭、下一条 | 未知不重放，核对后才下一条 | SQLite＋故障注入 | P0 | R056 | 通过 | 同上 |
| T-CALL-298 | R056；F011/012 | 待核对改计划/暂停/拒绝 | 不绕过占用，人工结果不等于呼出 | 集成 | P0 | R056 | 通过 | 同上 |
| T-CALL-299 | R056/R002/004/006；F005/012 | 错销售/缺权限/旧版本/窗口外/撤回 | 提交前拒绝，无演练记录 | 共用规则＋SQLite | P0 | R056 | 通过 | 同上 |
| T-CALL-300 | R056/R014；F011 | 提交前故障 | 整体回滚，重试仅一次 | 故障注入 | P0 | R056 | 通过 | 同上 |
| T-CALL-301 | R056/R017；F012/013 | 他人核对、伪造source、重复关闭 | 拒绝越权/伪造；关闭幂等，不能重跑原版 | 集成 | P0 | R056 | 通过 | 同上 |
| T-CALL-302 | R056；F005/011/013 | 计划→演练→刷新→占用→明确核对→下一条 | 11浏览器检查通过，无通话证据声明 | Chrome＋固定时钟/生成夹具 | P0 | R056 | 通过 | browser/browser-check.json |
455/455回归、92模块语法通过；既有计划浏览器11检查回归通过。关闭/重开与故障注入不冒充手机强杀或掉电试验。


## R057本地定时演练
| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-303 | R057；F005 | 默认/开启/到点 | 默认停止，一次LOCAL_RECORDING | 注入时钟+SQLite | P0 | R057 | 通过 | evidence/contact-timer/focused-final |
| T-CALL-304 | R057/R056；F011 | 人工后定时竞争 | 同计划版本仅一次 | 集成 | P0 | 防重不变量 | 通过 | 同上 |
| T-CALL-305 | R057；F005 | 停止后旧回调，再开启过时计划 | 不执行、不补跑 | 注入定时器 | P0 | R057 | 通过 | 同上 |
| T-CALL-306 | R057；F005 | 回调迟到1001ms | EXPIRED且无重试 | 边界测试 | P0 | 实验参数 | 通过 | 同上 |
| T-CALL-307 | R057；F011 | 开启→暂停→恢复→旧回调 | 停止，不能恢复旧计划 | 集成 | P0 | 用户暂停规则 | 通过 | 同上 |
| T-CALL-308 | R057；F011 | 改期后旧回调/注入容差字段 | PLAN_CHANGED/UNSUPPORTED_FIELDS | 集成 | P0 | R057 | 通过 | 同上 |
| T-CALL-309 | R057；F012 | 开启后拒绝联系 | 不新增尝试 | 集成 | P0 | 拒绝不变量 | 通过 | 同上 |
| T-CALL-310 | R057；F011 | 占用时到点，随后关闭占用 | 跳过，不排队重试 | 集成 | P0 | 用户忙线规则 | 通过 | 同上 |
| T-CALL-311 | R057；F011 | 提交后故障/重开/时钟回退再开启 | 未知保留，已消费票据不重放 | SQLite重开+故障注入 | P0 | 恢复不变量 | 通过 | 同上 |
| T-CALL-312 | R057；F005/013 | 页面开启→到点→刷新→停止→重载 | 10浏览器检查，窄屏无溢出 | Chrome+注入时钟 | P0 | R057 | 通过 | evidence/contact-timer/browser |
| T-CALL-313 | R057；F012 | 缺trigger权限/回调已过时 | 拒绝且无尝试 | 集成 | P0 | R057 | 通过 | evidence/contact-timer/focused-final |
| T-CALL-314 | R057；F005 | Node原生计时150ms，模拟工作日时钟随真实时间流逝 | 自动一次记录、外呼false | 本机计时器 | P1 | R057 | 通过 | 同上 |
全量464/464（新增T313/314前）；补充后局部11/11通过。语法94模块；旧手动闭环浏览器11检查通过。手机/生产定时未运行，不据此验收。


## R058计数/容量
| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-315 | R058/R057；F005/007/011 | 200合成目标导入→计划→定时→逐条核对→重开 | 200尝试/200目标/200结束/0待核对；票据展示50但累计200；呼出接通null | SQLite+注入时钟 | P0 | 当前闭环 | 通过 | evidence/contact-capacity/green |
| T-CALL-316 | R058；F011/013 | 重复意图、同目标重排第二次、不同销售/租户 | 2尝试/1目标；重放不加；他人0 | 集成 | P0 | 防重/权限 | 通过 | 同上 |
| T-CALL-317 | R058；F005/011 | 忙线跳过、暂停恢复、重开过时 | 2票据/1尝试/1拒绝，重开不补跑 | 集成 | P0 | 已采纳规则 | 通过 | 同上 |
| T-CALL-318 | R058；F013 | 页面两条演练、一条人工完成 | 展示2目标/2尝试/1结束/1待核对；呼出接通暂无证据 | Chrome | P0 | 来源边界 | 通过 | evidence/contact-capacity/browser |



## 2026-10-15 步骤6证据复核（R054～058）
T-CALL-279～318相关本地用例按各行范围有效；全部469回归及95语法摘要与当前102文件一致，13闭环浏览器同样匹配。新增evidence/acceptance-r058/audit为版本证据审计，不新增业务测试通过数；本轮定时浏览器10检查在当前版本执行通过（timer-browser）。实际手机/双端E2E仍未运行，不能用本地通过覆盖相应未运行行。


## R059只读预检查
| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-319 | R059；F003/008 | 可信映射/正常观察 | ready但无拨号授权，目标不改名，序列号不返回 | 替身/PhoneCapabilities | P0 | R059 | 通过 | evidence/contact-preflight/regression |
| T-CALL-320 | R059；F012 | 目标/销售错配、缺映射 | 读设备前阻挡 | 集成规则 | P0 | R059 | 通过 | 同上 |
| T-CALL-321 | R059；F003/008 | 撤权、换卡、忙线、过期 | PHONE_CHECK_FAILED | 替身 | P0 | R059 | 通过 | 同上 |
| T-CALL-322 | R059；F003 | APK变化/断连 | 阻挡且不返回内部异常 | 替身 | P0 | R059 | 通过 | 同上 |
| T-CALL-323 | R059；F011 | 设备等待中版本变化 | 再检查PLAN_CHANGED | 异步集成 | P0 | R059 | 通过 | 同上 |
| T-CALL-324 | R059；F005/011/012 | 过时、占用、无trigger | 不读USB | 集成规则 | P0 | R059 | 通过 | 同上 |
| T-CALL-325 | R059；F012 | 工作区接口/客户端伪造映射 | 字段拒绝，无尝试写入 | SQLite | P0 | R059 | 通过 | 同上 |
| T-CALL-326 | R059；F003 | 名单页点击预检查 | 明示未配绑定；旧演练仍可用 | Chrome | P0 | R059 | 通过 | evidence/contact-preflight/browser |
真实USB对应关系检查未运行，当前仅替身与缺配置页面路径。


## R060可信配置/只读接入
| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-327 | R060；F003 | 文件缺失/有效文件 | 默认禁用或读取映射，无设备I/O | 文件集成 | P0 | R060 | 通过 | evidence/contact-config/integration-final |
| T-CALL-328 | R060；F012 | 错归属/设备/APK/多字段/非法值 | 启动配置拒绝 | 文件集成 | P0 | R060 | 通过 | 同上 |
| T-CALL-329 | R060；F012 | 无效JSON/超长文本 | 脱敏报错，不默默禁用 | 文件集成 | P0 | R060 | 通过 | 同上 |
| T-CALL-330 | R060；F003 | 只读provider、篡改APK参数 | 仅inspect/readPhone，错摘要拒绝 | 实际类+替身方法 | P0 | R060 | 通过 | 同上 |
| T-CALL-331 | R060；F003 | 修改启动文件 | 旧对象不自动更新，重新加载才变化 | 文件集成 | P0 | R060 | 通过 | 同上 |
| T-CALL-332 | R060/R059；F003/008 | 文件→provider→本人真实Workspace目标计划→设备重启 | 首次只读ready，重启阻挡，尝试0 | SQLite+USB替身 | P0 | R060 | 通过 | 同上 |
| T-CALL-333 | R060；F003 | 有文件但无显式Android参数 | 拒绝启动配置 | 文件集成 | P0 | R060 | 通过 | 同上 |
2026-10-16实际S23只读provider检查成功，evidence/contact-config/usb：Android API36、APK匹配、双卡、指定卡唯一/可选、读取时空闲/权限齐全；没有联系人任务E2E/通话，观察会过期。481全量（新增T332/333前），最终局部7通过，99语法通过。


## R061绑定准备工具
| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-334 | R061/R060；F003 | 预览→显式保存→重新加载 | 预览无写入，保存后可读，尝试0 | 临时SQLite/文件+USB替身 | P0 | R061 | 通过 | evidence/binding-setup/focused |
| T-CALL-335 | R061；F012 | 错目标/归属/拒绝 | 设备读取0次 | 同上 | P0 | R061 | 通过 | 同上 |
| T-CALL-336 | R061；F008 | 卡名不唯一/观察过期 | 阻挡 | 同上 | P0 | R061 | 通过 | 同上 |
| T-CALL-337 | R061；F003 | 标识不同/观察过期保存 | 不创建配置 | 同上 | P0 | R061 | 通过 | 同上 |
| T-CALL-338 | R061；F003 | 已有配置重复保存 | 拒绝覆盖，原字节不变 | 文件集成 | P0 | R061 | 通过 | 同上 |
| T-CALL-339 | R061；F012 | 预览后撤回目标资格 | 写入前阻挡 | SQLite集成 | P0 | R061 | 通过 | 同上 |
命令实际验证：--help退出0；preview TARGET-MISSING退出1且TARGET_NOT_ELIGIBLE，属于预期拒绝，未访问手机/写配置。真实目标完整链路待目标选择，不记为通过。



2026-10-16 R061实际验证追加：用户明确选择尾号7214受控端仅作只读绑定后，实际导入→预览→重新观察并保存→重启→HTTP preflight→USB读取完成，ready=true但callAuthorization=DENY、尝试0、定时停止。证据evidence/binding-setup/actual-save及actual-preflight；这是实际目标只读E2E，不是呼叫E2E。全量489/489、101模块语法通过。


2026-10-16步骤6：R059～061集中验收，489回归/101语法及actual-preflight源码摘要与当前一致；本轮浏览器14通过，四页面HTTP200。证据evidence/acceptance-r061，审计不新增业务测试数。实际只读目标E2E沿用已成功证据，未重复访问手机；真实呼叫E2E和iPhone保持未运行。


## R062受控许可预留
| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-340 | R062；F011/012 | 缺许可/HTTP伪命令/重复意图 | 拒绝或同一预留，额度1，来源分离 | SQLite | P0 | R062 | 通过 | evidence/contact-controlled/regression |
| T-CALL-341 | R062；F011 | 提交前故障 | 额度与占用全回滚 | 故障注入 | P0 | R062 | 通过 | 同上 |
| T-CALL-342 | R062；F011 | 提交后故障/重开/重复 | 未知不重放/不退款 | SQLite重开 | P0 | R062 | 通过 | 同上 |
| T-CALL-343 | R062；F012 | SIM错配/过期/旧版本/拒绝/许可冲突 | 预留前阻挡 | 集成 | P0 | R062 | 通过 | 同上 |
| T-CALL-344 | R062；F005/011 | 受控未知→演练/取消/暂停 | 互斥占用，暂停不擦除 | 集成 | P0 | R062 | 通过 | 同上 |
| T-CALL-345 | R062；F011 | 先有演练占用再预留 | 阻挡且额度0 | 集成 | P0 | R062 | 通过 | 同上 |
| T-CALL-346 | R062；F011/012 | 额度耗尽/无trigger/受控占用预检查 | 不新增，预检查不ready | 持久额度夹具+集成 | P0 | R062 | 通过 | 同上 |
本轮没有原生发送、实际通话、真实许可注册或解除未知结果，均不得记为通过。

## R063受控提交/核对（2026-10-16）
| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-347 | R063；F005/011 | 合成名单→计划→提交→核对→重排→下一次 | 提交2次；API不等于接通；旧请求防重 | SQLite+电话替身集成 | P0 | R063 | 通过 | evidence/contact-coordinator/regression |
| T-CALL-348 | R063；F011 | 提交后断连、重开、刷新回执 | 保留占用；不重发；额度保留 | 故障/恢复 | P0 | R063 | 通过 | 同上 |
| T-CALL-349 | R063；F011 | 命令持久化后/端口返回后崩溃 | 重试不重放 | 故障注入 | P0 | R063 | 通过 | 同上 |
| T-CALL-350 | R063；F012 | 原生核对失败/无核对权限 | 不释放/不越权调用 | 集成 | P0 | R063 | 通过 | 同上 |
| T-CALL-351 | R063；F003/008 | 错设备/卡/APK/许可/来源/旧观察 | 调用前阻挡，不扣额 | 集成 | P0 | R063 | 通过 | 同上 |
| T-CALL-352 | R063；F012 | 新许可处理旧记录 | 不读取/核对端口 | 集成 | P0 | R063 | 通过 | 同上 |
| T-CALL-353 | R063；F011 | 核对写入故障、重复核对 | 回滚保留占用；首个人工结果保留；额度不退 | SQLite | P0 | R063 | 通过 | 同上 |
| T-CALL-354 | R063；F005/011 | 并发同意图；观察等待期间拒绝联系 | 仅一次提交；拒绝后零提交 | 异步集成 | P0 | R063 | 通过 | 同上 |
| T-CALL-355 | R063；F013 | 已提交后无效回执 | 不虚构接通、不降级提交、不释放 | 集成 | P0 | R063 | 通过 | 同上 |
| T-CALL-356 | R063；F011/013 | 网页展示受控模拟占用 | 来源/未知可见，无发送/解除按钮，演练禁用 | 真实浏览器/合成库 | P0 | R063 | 通过 | evidence/contact-coordinator/browser-fixed |
真实S23只读检查：设备/安装匹配、指定卡1张、权限具备、空闲；evidence/contact-coordinator/usb-inspect。新真实呼叫E2E未运行，等待新当次许可及会话准备；iPhone依D025暂停实现。

| T-CALL-357 | R063；F003/005/008/011/013 | S23、电销卡、D026两次许可、名单v2→通话→核对→v3→通话→核对 | 两次独立提交，正确SIM，用户确认音频/显号，核对后衔接，不自动重拨 | 实际USB+接收端人工观察 | P0 | D025/D026/R063 | 通过（受控手动子范围） | evidence/contact-coordinator/actual-call-1、actual-call-2、actual-reconcile-1/2、closure |
| T-CALL-358 | R063；F011/012 | 双通结束关闭组件/许可、归档session再调用send | host/native均完成且used2；未授权调用本地拒绝、零新增电话 | 双端持久库审计+CLI负向 | P0 | R063 | 通过 | evidence/contact-coordinator/closure |
以上新增实测不计入505自动测试数量。实际自动定时多目标队列仍未运行，iPhone暂缓。

## R064正式调度与多目标软件验证
| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-359 | R064；F005/011 | 未到点→到点→重开重试 | 未到点不消费；到点持久一次；重开不重放 | SQLite | P0 | R064 | 通过，保留首个红灯 | evidence/contact-schedule/red、green、targeted |
| T-CALL-360 | R064；F011/012 | 超时票据、回退时钟、外销售 | 过时消费不补拨；无越权记录 | SQLite | P0 | R064 | 通过 | evidence/contact-schedule/targeted |
| T-CALL-361 | R064；F012 | 缺策略/无trigger/旧版本 | 拒绝且不消费票据 | 单元/SQLite | P0 | R064 | 通过 | 同上 |
| T-CALL-362 | R064；F003/005 | 两目标路由、30秒内触发、核对第一通再第二通 | 各目标正确路由，一目标一尝试，deadline传递 | 时钟/电话替身集成 | P0 | D027/R064 | 通过 | 同上 |
| T-CALL-363 | R064；F005 | 延迟超30秒/过时才启动 | 跳过且不补拨 | 集成 | P0 | D027 | 通过 | 同上 |
| T-CALL-364 | R064；F011 | 人工与定时竞争 | 同版本仅一次提交 | 集成 | P0 | R064 | 通过 | 同上 |
| T-CALL-365 | R064；F005 | 异步读设备时stop | 回调返回后不新增预留/提交 | 异步集成 | P0 | R064 | 通过 | 同上 |
| T-CALL-366 | R064；F005/012 | 拒绝、暂停恢复、修改计划 | 最终守卫拒绝旧执行 | 集成 | P0 | 已采纳规则 | 通过 | 同上 |
| T-CALL-367 | R064；F011 | 第一通未知→第二目标到点→之后核对 | 第二条跳过，事后不补拨 | 集成 | P0 | 已采纳规则 | 通过 | 同上 |
| T-CALL-368 | R064；F011 | 票据提交后崩溃→新调度实例 | 保留CHECK_REQUIRED，默认停止，不重放 | 故障注入+持久库 | P0 | R064 | 通过 | 同上 |
| T-CALL-369 | R064；F005 | 检查期间超时/时钟倒退 | 拒绝新尝试、不扣额 | 异步集成 | P0 | D027 | 通过 | 同上 |
| T-CALL-370 | R064；F012 | 重复目标/跨库路由/HTTP开启 | 拒绝配置或命令 | 集成 | P0 | R064 | 通过 | 同上 |
| T-CALL-371 | R064；F007/011 | 200合成目标顺序到点并显式核对 | 每目标一次，共200次；不产生真实通话 | 容量/注入时钟 | P0 | 日量要求 | 通过 | 同上 |
| T-CALL-372 | R064；F008 | 已过期/剩1秒deadline | 过期零USB；lease不超剩余期限 | USB替身 | P0 | D027 | 通过 | evidence/contact-schedule/usb-deadline |
| T-CALL-373 | R064；F008/011 | lease读取期间超时→再调用 | 原生提交0，重试不重放 | USB替身/固定时钟 | P0 | D027 | 通过 | 同上 |
本轮真实定时、双目标接收端、后台/锁屏E2E未运行：没有新的受控电话额度，现有本机许可已关闭。软件仿真不记成实际通话通过。

R064最终回归：520/520、110语法、16浏览器通过；evidence/contact-schedule/regression-final、syntax、browser。当前core摘要与最终测试一致（live/state-audit.json）。T359～373为本轮新增15个自动测试；实际两通T357～358仍是上一轮人工/USB证据，未重复拨号。

## R065可信配置与生命周期
| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-374 | R065；F012 | 缺文件→有效配置 | 默认禁用；不可变快照与摘要 | 文件单元 | P0 | R065 | 通过，保留红灯到绿 | evidence/contact-runtime/red、green、targeted |
| T-CALL-375 | R065；F012 | 额外字段/归属/重复/伪来源/超大小 | 拒绝整份配置 | 文件单元 | P0 | R065 | 通过 | evidence/contact-runtime/targeted |
| T-CALL-376 | R065；F012 | 修改或损坏配置 | 摘要改变；旧快照不变；不部分加载 | 文件单元 | P0 | R065 | 通过 | 同上 |
| T-CALL-377 | R065；F005 | start/stop/status/reload/close | 默认停、停止不执行、关闭不能再开 | 集成/注入时钟 | P0 | R065 | 通过 | 同上 |
| T-CALL-378 | R065；F011 | 运行后变更/删除配置 | 触发前停机，无尝试/新许可 | 文件+调度集成 | P0 | R065 | 通过 | 同上 |
| T-CALL-379 | R065；F012 | 新配置、错许可/SIM/来源 | 不隐式转换；有效配置仍需reload/start | 集成 | P0 | R065 | 通过 | 同上 |
| T-CALL-380 | R065；F011 | 异步读设备时改配置、reload/close | STOPPING/IN_FLIGHT，返回后不外呼 | 异步集成 | P0 | R065 | 通过 | 同上 |
| T-CALL-381 | R065；F012 | 拒绝/额度耗尽/过期/未知占用 | 开始前阻挡 | 集成 | P0 | R065 | 通过 | 同上 |
| T-CALL-382 | R065；F013 | 新实例/状态序列化 | 不自动恢复，不泄露号码/许可原文 | 集成 | P0 | R065 | 通过 | 同上 |
| T-CALL-383 | R065；F005 | 可运行双目标CLI演示 | 2替身提交/完成、实际电话0 | 子进程CLI | P0 | R065 | 通过 | evidence/contact-runtime/cli |
| T-CALL-384 | R065；F005/012 | stdin启动→停止→推进时间/非法命令 | 停止后零提交，非法命令不改范围 | 子进程CLI | P0 | R065 | 通过 | 同上 |
真实定时/多目标原生许可部署和切换未运行。当前实际主项目配置只读结果CONFIG_MISSING，没有创建真实运行会话。

R065最终证据：531/531回归、116语法、16浏览器，evidence/contact-runtime/regression、syntax、browser；主库安全状态和当前源码匹配见live/state-audit.json。T374～384共新增11个自动测试。真实定时多目标未运行，CLI/status只读主配置不是电话测试。

## R066工作台调度运行控制
| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-385 | R066；F005 | 无可信运行实例读取/启动 | 明确缺会话、不可启动 | HTTP集成 | P0 | R066 | 通过，保留红灯到绿 | evidence/contact-runtime-web/red、green |
| T-CALL-386 | R066；F012 | 无会话/跨来源/额外字段/非法命令/正常控制 | 隔离且严格白名单；启动停止重载有效 | HTTP集成 | P0 | R066 | 通过 | evidence/contact-runtime-web/regression |
| T-CALL-387 | R066；F012 | 跨库运行实例/只读actor | 构造拒绝或无trigger权限 | 集成 | P0 | R066 | 通过 | 同上 |
| T-CALL-388 | R066；F012 | 可信实例声明真实来源 | 网页start拒绝，不调用运行启动 | 真实来源状态替身 | P0 | R066 | 通过 | 同上 |
| T-CALL-389 | R066；F011 | 读设备过程中HTTP stop/reload | STOPPING、IN_FLIGHT，返回后零提交 | 异步HTTP | P0 | R066 | 通过 | 同上 |
| T-CALL-390 | R066；F011 | 检查未返回时关闭服务 | 先停止/等检查，再关库；零提交 | 异步关服 | P0 | R066 | 通过 | 同上 |
| T-CALL-391 | R066；F005/013 | 页面启动/刷新/停止/占用/改配置/重载/STOPPING/窄屏 | 不重启、正确禁用、状态可见，刷新核对记录 | 真实浏览器+电话替身 | P0 | R066 | 通过 | evidence/contact-runtime-web/browser-final |
| T-CALL-392 | R066；F011 | 联系人预检查阻塞时停止运行 | stop不排在耗时检查后 | HTTP并行请求 | P0 | R066 | 通过 | evidence/contact-runtime-web/regression |
| T-CALL-393 | R066；F005 | --web子进程→页面/API→CLI关闭 | 独立仿真可访问并正确关闭，实际电话0 | 子进程/HTTP | P0 | R066 | 通过 | evidence/contact-runtime-web/web-demo |
T391为浏览器场景，不计入自动单元/集成测试数量。真实许可切换/真实定时多目标E2E保持未运行。

2026-10-16最终核对：T385～390、392～393包含于539测试；T391为browser-final的14项浏览器检查，既有浏览器17项回归。Node v24.18.0；539/539回归、最终119模块语法、14新浏览器检查及17既有浏览器回归通过。证据evidence/contact-runtime-web。全量回归后只改contact-schedule-page.mjs、contacts.mjs、contacts.html，已重跑最终浏览器和语法；live/state-audit.json确认后端匹配539回归、最终网页匹配浏览器证据。live核对主站HTTP200、缺配置禁用；真实队列E2E未运行。

## R067原生许可切换只读检查

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-394 | R067；F005/008/011/012 | 有效且已核对快照 | READY且真实外呼仍禁用 | 纯规则/快照替身 | P0 | R067/原生代码契约 | 通过 | evidence/native-permit-readiness/targeted-final |
| T-CALL-395 | R067；F005/008/011/012 | 宿主待核对/拒绝/暂停或原生未知 | 拒绝切换 | 纯规则/快照替身 | P0 | R067/原生代码契约 | 通过 | evidence/native-permit-readiness/targeted-final |
| T-CALL-396 | R067；F005/008/011/012 | 切回旧许可及文件字节变化 | 保留次数；变化冲突 | 纯规则/快照替身 | P0 | R067/原生代码契约 | 通过 | evidence/native-permit-readiness/targeted-final |
| T-CALL-397 | R067；F005/008/011/012 | 双边额度耗尽/原生超宿主 | 拒绝，不退款 | 纯规则/快照替身 | P0 | R067/原生代码契约 | 通过 | evidence/native-permit-readiness/targeted-final |
| T-CALL-398 | R067；F005/008/011/012 | 号码/令牌/时间/目标/SIM错配 | 范围不符拒绝 | 纯规则/快照替身 | P0 | R067/原生代码契约 | 通过 | evidence/native-permit-readiness/targeted-final |
| T-CALL-399 | R067；F005/008/011/012 | 设备过时/未知/占线/组件开启 | 拒绝 | 纯规则/快照替身 | P0 | R067/原生代码契约 | 通过 | evidence/native-permit-readiness/targeted-final |
| T-CALL-400 | R067；F005/008/011/012 | 重启/过期/期限及临界值 | 拒绝或缩短有效期 | 纯规则/快照替身 | P0 | R067/原生代码契约 | 通过 | evidence/native-permit-readiness/targeted-final |
| T-CALL-401 | R067；F005/008/011/012 | 缺失/损坏/非法账本 | 失败关闭，不输出敏感数据 | 纯规则/快照替身 | P0 | R067/原生代码契约 | 通过 | evidence/native-permit-readiness/targeted-final |
| T-CALL-402 | R067；F005/008/011/012 | 工作日18点边界 | 窗口结束拒绝/截断 | 纯规则/快照替身 | P0 | R067/原生代码契约 | 通过 | evidence/native-permit-readiness/targeted-final |
| T-CALL-403 | R067；F005/008/011/012 | CLI无标志/合成演示 | 拒绝或纯仿真，设备访问0 | 子进程 | P0 | R067/原生代码契约 | 通过 | evidence/native-permit-readiness/targeted-final |
| T-CALL-404 | R067；F005/008/011/012 | 观察年龄消耗单调期限 | 扣除年龄，过期拒绝 | 纯规则/快照替身 | P0 | R067/原生代码契约 | 通过 | evidence/native-permit-readiness/targeted-final |
这些场景没有真实USB或写入操作，不证明真实切换成功。

## R068原生只读采集

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-405 | R068；F005/008/011/012 | 完整稳定快照 | COLLECTED且外呼禁用 | USB替身/SQLite | P0 | R068 | 通过 | evidence/native-permit-collector/targeted-complete |
| T-CALL-406 | R068；F005/008/011/012 | USB失败/部分结果 | 拒绝且不泄露异常原文 | USB替身/SQLite | P0 | R068 | 通过 | evidence/native-permit-collector/targeted-complete |
| T-CALL-407 | R068；F005/008/011/012 | 设备变化/占线 | 拒绝 | USB替身/SQLite | P0 | R068 | 通过 | evidence/native-permit-collector/targeted-complete |
| T-CALL-408 | R068；F005/008/011/012 | WAL存在 | 不下载不完整主库 | USB替身/SQLite | P0 | R068 | 通过 | evidence/native-permit-collector/targeted-complete |
| T-CALL-409 | R068；F005/008/011/012 | 下载字节损坏 | 摘要不符拒绝并清理 | USB替身/SQLite | P0 | R068 | 通过 | evidence/native-permit-collector/targeted-complete |
| T-CALL-410 | R068；F005/008/011/012 | 许可采集中变化 | 拒绝 | USB替身/SQLite | P0 | R068 | 通过 | evidence/native-permit-collector/targeted-complete |
| T-CALL-411 | R068；F005/008/011/012 | 组件未禁用/其他用户 | 拒绝 | USB替身/SQLite | P0 | R068 | 通过 | evidence/native-permit-collector/targeted-complete |
| T-CALL-412 | R068；F005/008/011/012 | 采集过时/重启 | 拒绝 | USB替身/SQLite | P0 | R068 | 通过 | evidence/native-permit-collector/targeted-complete |
| T-CALL-413 | R068；F005/008/011/012 | 采集命令列表 | 无许可写入和拨号命令 | USB替身/SQLite | P0 | R068 | 通过 | evidence/native-permit-collector/targeted-complete |
| T-CALL-414 | R068；F005/008/011/012 | 额外User 0查询区段 | 正确识别安装区段 | USB替身/SQLite | P0 | R068 | 通过 | evidence/native-permit-collector/targeted-complete |
| T-CALL-415 | R068；F005/008/011/012 | 空/非空rollback journal | 空摘要可读，非空拒绝 | USB替身/SQLite | P0 | R068 | 通过 | evidence/native-permit-collector/targeted-complete |
S23实际只读：device-complete退出0，2原生请求均RECONCILED，1许可、enabled=false、组件禁用。未运行实际许可切换/真实定时E2E。

## R069持久切换日志

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-416 | R069；F005/008/011/012 | 正常写入和回读 | 一次写入，VERIFIED且外呼禁用 | SQLite/替身 | P0 | R069 | 通过 | evidence/native-permit-switch/targeted-final |
| T-CALL-417 | R069；F005/008/011/012 | 重复ID/不同候选字节 | 不重写/冲突拒绝 | SQLite/替身 | P0 | R069 | 通过 | evidence/native-permit-switch/targeted-final |
| T-CALL-418 | R069；F005/008/011/012 | 双连接、检查在途、尝试恢复/关闭 | 设备忙、活跃拥有者拒绝、禁止关闭 | SQLite/替身 | P0 | R069 | 通过 | evidence/native-permit-switch/targeted-final |
| T-CALL-419 | R069；F005/008/011/012 | 替换后响应丢失并重开日志 | 保持REVIEW，显式回读后完成 | SQLite/替身 | P0 | R069 | 通过 | evidence/native-permit-switch/targeted-final |
| T-CALL-420 | R069；F005/008/011/012 | 写入前断连 | 只读确认旧字节后ABORTED，不重放 | SQLite/替身 | P0 | R069 | 通过 | evidence/native-permit-switch/targeted-final |
| T-CALL-421 | R069；F005/008/011/012 | 回读非旧非新摘要 | 持续REVIEW并占用 | SQLite/替身 | P0 | R069 | 通过 | evidence/native-permit-switch/targeted-final |
| T-CALL-422 | R069；F005/008/011/012 | 资格/额度/权限/期限不满足 | 无写入 | SQLite/替身 | P0 | R069 | 通过 | evidence/native-permit-switch/targeted-final |
| T-CALL-423 | R069；F005/008/011/012 | 真实端口或异步修改输入 | 拒绝真实端口，保留原始意图 | SQLite/替身 | P0 | R069 | 通过 | evidence/native-permit-switch/targeted-final |
| T-CALL-424 | R069；F005/008/011/012 | 子进程写文件后直接退出 | WRITING持久，下一操作阻挡，只读核对恢复 | SQLite/替身/子进程 | P0 | R069 | 通过 | evidence/native-permit-switch/targeted-final |
另demo入口实际写本地隔离文件并原子重命名，模拟丢响应→重复请求→显式回读，合成写入1次、真实许可写入0次；真实USB部署未运行。

## R070部署预览

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-425 | R070；F005/008/011/012 | 有效候选 | 脱敏PREVIEW，不可apply | 采集替身 | P0 | R070 | 通过 | evidence/native-permit-preview/targeted |
| T-CALL-426 | R070；F005/008/011/012 | 路径/命令注入与敏感数据 | 严格输入白名单，不输出号码令牌 | 采集替身 | P0 | R070 | 通过 | evidence/native-permit-preview/targeted |
| T-CALL-427 | R070；F005/008/011/012 | USB异常/损坏当前文件 | 失败关闭 | 采集替身 | P0 | R070 | 通过 | evidence/native-permit-preview/targeted |
| T-CALL-428 | R070；F005/008/011/012 | 宿主未知/暂停/耗尽/过期 | 拒绝 | 采集替身 | P0 | R070 | 通过 | evidence/native-permit-preview/targeted |
| T-CALL-429 | R070；F005/008/011/012 | 异步期间修改候选 | 不能改变已复制意图 | 采集替身 | P0 | R070 | 通过 | evidence/native-permit-preview/targeted |
| T-CALL-430 | R070；F005/008/011/012 | 当前摘要变化/候选相同 | ID变化/明确无变更 | 采集替身 | P0 | R070 | 通过 | evidence/native-permit-preview/targeted |
| T-CALL-431 | R070；F005/008/011/012 | 宿主读取耗时超限 | 拒绝过时预览 | 采集替身 | P0 | R070 | 通过 | evidence/native-permit-preview/targeted |
| T-CALL-432 | R070；F005/008/011/012 | CLI模拟/缺会话/非法apply | 只模拟或拒绝，不能开启外呼 | 子进程 | P0 | R070 | 通过 | evidence/native-permit-preview/targeted |
实际项目--preview退出1/CURRENT_SESSION_REQUIRED为预期拒绝，无手机访问；活动真实会话成功预览及共用设备锁/真实部署未运行。

## R071共用设备门

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-433 | R071；F005/008/011/012 | 已提交未核对→尝试切换→原生核对 | 先阻挡，匹配核对后可切换 | 真实协调器/SQLite/USB替身 | P0 | R071 | 通过 | evidence/device-gate/targeted-complete |
| T-CALL-434 | R071；F005/008/011/012 | 切换collect在途→提交 | USB命令0，切换完成后可提交 | 真实协调器/SQLite/USB替身 | P0 | R071 | 通过 | evidence/device-gate/targeted-complete |
| T-CALL-435 | R071；F005/008/011/012 | 发送丢响应→重开→错误核对 | 继续阻挡切换，不重放 | 真实协调器/SQLite/USB替身 | P0 | R071 | 通过 | evidence/device-gate/targeted-complete |
| T-CALL-436 | R071；F005/008/011/012 | 旧delivery缺设备/核对字段 | 全目录屏障，匹配核对才释放 | 真实协调器/SQLite/USB替身 | P0 | R071 | 通过 | evidence/device-gate/targeted-complete |
| T-CALL-437 | R071；F005/008/011/012 | 提交未返回→核对/关闭/切换 | 禁止提前解锁，关闭IN_FLIGHT | 真实协调器/SQLite/USB替身 | P0 | R071 | 通过 | evidence/device-gate/targeted-complete |
既有双连接、重复提交、子进程崩溃T235/T418～424随相关及全量回归运行。未发送真实电话；主项目历史日志尚未迁移。

## R072只读审计

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-438 | R072；F005/011/012 | 旧表无核对字段 | 识别缺口，不建门/改列 | SQLite | P0 | R072 | 通过 | evidence/device-gate-audit/targeted-final |
| T-CALL-439 | R072；F005/011/012 | 门无业务记录 | 孤儿报告，不解锁 | SQLite | P0 | R072 | 通过 | evidence/device-gate-audit/targeted-final |
| T-CALL-440 | R072；F005/011/012 | 业务已终态但门OPEN | 终态仍持锁 | SQLite | P0 | R072 | 通过 | evidence/device-gate-audit/targeted-final |
| T-CALL-441 | R072；F005/011/012 | 业务未完但门RELEASED | 冲突报告 | SQLite | P0 | R072 | 通过 | evidence/device-gate-audit/targeted-final |
| T-CALL-442 | R072；F005/011/012 | 摘要不符 | 不可视为匹配，不输出原ID | SQLite | P0 | R072 | 通过 | evidence/device-gate-audit/targeted-final |
| T-CALL-443 | R072；F005/011/012 | 非法状态/缺目录 | 失败关闭，不创建 | SQLite | P0 | R072 | 通过 | evidence/device-gate-audit/targeted-final |
| T-CALL-444 | R072；F005/011/012 | 原生归档同/异摘要 | 只匹配历史证据，不作当前证明 | SQLite | P0 | R072 | 通过 | evidence/device-gate-audit/targeted-final |
| T-CALL-445 | R072；F005/011/012 | 切换REVIEW/VERIFIED | 待核对/终态区别 | SQLite | P0 | R072 | 通过 | evidence/device-gate-audit/targeted-final |
| T-CALL-446 | R072；F005/011/012 | CLI写入参数或缺目录 | 拒绝，无创建 | SQLite/子进程 | P0 | R072 | 通过 | evidence/device-gate-audit/targeted-final |
| T-CALL-447 | R072；F005/011/012 | 宿主命令摘要与完成状态 | 严格匹配，错误摘要拒绝 | SQLite | P0 | R072 | 通过 | evidence/device-gate-audit/targeted-final |
实际current-filtered：2条发送记录、2个宿主完成匹配、2个归档原生核对匹配；门不存在、旧核对标记缺失，不作为当前手机证明或迁移通过。

## R073旧发送元数据迁移

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-448 | R073；F005/011/012 | 当前原生/宿主同摘要且完成 | 迁移标记，不拨号 | SQLite/采集替身/故障注入 | P0 | R073 | 通过 | evidence/legacy-delivery-migration/targeted |
| T-CALL-449 | R073；F005/011/012 | 归档/过时/占线/安装变化 | 拒绝，旧表不变 | SQLite/采集替身/故障注入 | P0 | R073 | 通过 | evidence/legacy-delivery-migration/targeted |
| T-CALL-450 | R073；F005/011/012 | 原生摘要不符/宿主未完/重复证据 | 拒绝 | SQLite/采集替身/故障注入 | P0 | R073 | 通过 | evidence/legacy-delivery-migration/targeted |
| T-CALL-451 | R073；F005/011/012 | 断连或commit前故障 | schema与数据回滚 | SQLite/采集替身/故障注入 | P0 | R073 | 通过 | evidence/legacy-delivery-migration/targeted |
| T-CALL-452 | R073；F005/011/012 | commit后中断再恢复 | 门保留，新当前证据后释放 | SQLite/采集替身/故障注入 | P0 | R073 | 通过 | evidence/legacy-delivery-migration/targeted |
| T-CALL-453 | R073；F005/011/012 | 并发迁移与新切换 | 共用门阻挡 | SQLite/采集替身/故障注入 | P0 | R073 | 通过 | evidence/legacy-delivery-migration/targeted |
| T-CALL-454 | R073；F005/011/012 | 宿主状态提交前变化 | 回滚 | SQLite/采集替身/故障注入 | P0 | R073 | 通过 | evidence/legacy-delivery-migration/targeted |
S23 current-retry实际MIGRATED 2，原生写入0/额度变化false/电话0；post-audit-retry 2发送+2门，旧缺字段/缺门告警消失。归档审计仍不冒充当前原生证明，当前证明来自迁移中的新USB采集。

## R074 USB部署替身验证（2026-10-16）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-455 | R074；F005/008/011/012 | 正常持门部署并回读 | VERIFIED，一次替身写入 | SQLite/USB替身 | P0 | R074 | 通过（非真机） | evidence/adb-permit-deployment/targeted |
| T-CALL-456 | R074；F005/008/011/012 | 直接调用缺持久意图 | 拒绝，写入0 | SQLite/USB替身 | P0 | R074 | 通过（非真机） | evidence/adb-permit-deployment/targeted |
| T-CALL-457 | R074；F005/008/011/012 | 候选摘要不在授权内 | REVIEW，写入0 | SQLite/USB替身 | P0 | R074 | 通过（非真机） | evidence/adb-permit-deployment/targeted |
| T-CALL-458 | R074；F005/008/011/012 | 第二次宿主检查撤回资格 | REVIEW，写入0 | SQLite/USB替身 | P0 | R074 | 通过（非真机） | evidence/adb-permit-deployment/targeted |
| T-CALL-459 | R074；F005/008/011/012 | 写后回复丢失并重复提交 | 仅写1次，只读核对后VERIFIED | SQLite/USB替身 | P0 | R074 | 通过（非真机） | evidence/adb-permit-deployment/targeted |
| T-CALL-460 | R074；F005/008/011/012 | 写后字节不匹配 | REVIEW，继续持门 | SQLite/USB替身 | P0 | R074 | 通过（非真机） | evidence/adb-permit-deployment/targeted |
| T-CALL-461 | R074；F005/008/011/012 | 写前旧摘要改变 | REVIEW，写入0 | SQLite/USB替身 | P0 | R074 | 通过（非真机） | evidence/adb-permit-deployment/targeted |
| T-CALL-462 | R074；F005/008/011/012 | 固定部署脚本检查 | 编码载荷、固定路径、期限检查先于rename | SQLite/USB替身 | P0 | R074 | 通过（非真机） | evidence/adb-permit-deployment/targeted |
| T-CALL-463 | R074；F005/008/011/012 | 过期请求/部署窗口 | 不写入 | SQLite/USB替身 | P0 | R074 | 通过（非真机） | evidence/adb-permit-deployment/targeted |
真机部署、设备侧脚本执行/断连、后续定时通话：未运行，缺新有界许可及组合入口。

## R075组合入口

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-464 | R075；F005/008/011/012 | 缺部署授权 | 拒绝/写入0 | SQLite/USB替身或CLI | P0 | R075 | 通过（非真机） | evidence/controlled-permit-deployment/targeted-final |
| T-CALL-465 | R075；F005/008/011/012 | 会话过期 | 拒绝/写入0 | SQLite/USB替身或CLI | P0 | R075 | 通过（非真机） | evidence/controlled-permit-deployment/targeted-final |
| T-CALL-466 | R075；F005/008/011/012 | 次数耗尽 | 拒绝/写入0 | SQLite/USB替身或CLI | P0 | R075 | 通过（非真机） | evidence/controlled-permit-deployment/targeted-final |
| T-CALL-467 | R075；F005/008/011/012 | 候选字节变更 | 拒绝/写入0 | SQLite/USB替身或CLI | P0 | R075 | 通过（非真机） | evidence/controlled-permit-deployment/targeted-final |
| T-CALL-468 | R075；F005/008/011/012 | 设备映射范围不符 | 拒绝/写入0 | SQLite/USB替身或CLI | P0 | R075 | 通过（非真机） | evidence/controlled-permit-deployment/targeted-final |
| T-CALL-469 | R075；F005/008/011/012 | 默认只预检 | PREVIEW/写入0 | SQLite/USB替身或CLI | P0 | R075 | 通过（非真机） | evidence/controlled-permit-deployment/targeted-final |
| T-CALL-470 | R075；F005/008/011/012 | 持门部署及重复操作 | VERIFIED/仅写1次 | SQLite/USB替身或CLI | P0 | R075 | 通过（非真机） | evidence/controlled-permit-deployment/targeted-final |
| T-CALL-471 | R075；F005/008/011/012 | 持门后会话撤销 | REVIEW/不重放 | SQLite/USB替身或CLI | P0 | R075 | 通过（非真机） | evidence/controlled-permit-deployment/targeted-final |
| T-CALL-472 | R075；F005/008/011/012 | 写后回复丢失 | REVIEW/不重放 | SQLite/USB替身或CLI | P0 | R075 | 通过（非真机） | evidence/controlled-permit-deployment/targeted-final |
| T-CALL-473 | R075；F005/008/011/012 | 无活动会话CLI | 拒绝/写入0 | SQLite/USB替身或CLI | P0 | R075 | 通过（非真机） | evidence/controlled-permit-deployment/targeted-final |
| T-CALL-474 | R075；F005/008/011/012 | 会话有效而部署授权过期 | 拒绝/写入0 | SQLite/USB替身或CLI | P0 | R075 | 通过（非真机） | evidence/controlled-permit-deployment/targeted-final |
| T-CALL-475 | R075；F005/008/011/012 | 授权目标或次数变更 | 拒绝/写入0 | SQLite/USB替身或CLI | P0 | R075 | 通过（非真机） | evidence/controlled-permit-deployment/targeted-final |

## R076本地准备

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-476 | R076；F005/008/011/012 | 准备产物进入部署预检 | PREPARED→PREVIEW，无原生部署 | 本地文件/替身/CLI | P0 | R076 | 通过（非真机） | evidence/controlled-session-preparation/regression |
| T-CALL-477 | R076；F005/008/011/012 | 过期授权 | 拒绝/保留中断，不自动重试 | 本地文件/替身/CLI | P0 | R076 | 通过（非真机） | evidence/controlled-session-preparation/regression |
| T-CALL-478 | R076；F005/008/011/012 | 目标/组件不符 | 拒绝/保留中断，不自动重试 | 本地文件/替身/CLI | P0 | R076 | 通过（非真机） | evidence/controlled-session-preparation/regression |
| T-CALL-479 | R076；F005/008/011/012 | 重复准备 | 拒绝/保留中断，不自动重试 | 本地文件/替身/CLI | P0 | R076 | 通过（非真机） | evidence/controlled-session-preparation/regression |
| T-CALL-480 | R076；F005/008/011/012 | CLAIMED故障 | 拒绝/保留中断，不自动重试 | 本地文件/替身/CLI | P0 | R076 | 通过（非真机） | evidence/controlled-session-preparation/regression |
| T-CALL-481 | R076；F005/008/011/012 | INTENT故障 | 拒绝/保留中断，不自动重试 | 本地文件/替身/CLI | P0 | R076 | 通过（非真机） | evidence/controlled-session-preparation/regression |
| T-CALL-482 | R076；F005/008/011/012 | REGISTERED故障 | 拒绝/保留中断，不自动重试 | 本地文件/替身/CLI | P0 | R076 | 通过（非真机） | evidence/controlled-session-preparation/regression |
| T-CALL-483 | R076；F005/008/011/012 | CANDIDATE故障 | 拒绝/保留中断，不自动重试 | 本地文件/替身/CLI | P0 | R076 | 通过（非真机） | evidence/controlled-session-preparation/regression |
| T-CALL-484 | R076；F005/008/011/012 | GRANT故障 | 拒绝/保留中断，不自动重试 | 本地文件/替身/CLI | P0 | R076 | 通过（非真机） | evidence/controlled-session-preparation/regression |
| T-CALL-485 | R076；F005/008/011/012 | 归档后复用引用 | 拒绝/保留中断，不自动重试 | 本地文件/替身/CLI | P0 | R076 | 通过（非真机） | evidence/controlled-session-preparation/regression |
| T-CALL-486 | R076；F005/008/011/012 | CLI未明确本地模式 | 拒绝/保留中断，不自动重试 | 本地文件/替身/CLI | P0 | R076 | 通过（非真机） | evidence/controlled-session-preparation/regression |

## R076真机结果及修复

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-487 | R074/076；F005/011 | 应用无系统时钟/临时目录权限 | shell读取时钟，app仅写许可 | 回归+S23 | P0 | 真机故障 | 通过 | device-script-bugs.json、final-regression、live-deploy-h |
| T-CALL-488 | R074/076；F005/011 | 手机墙钟快约29秒 | 单调执行期限，保留许可区间 | 回归+S23 | P0 | 真机故障 | 通过 | 同上 |

2026-10-16 11:48（北京时间）真实收尾：新授权2次均已完成。S23/电销卡向同一受控接收端，计划版本4/5各30秒后触发，调度领取分别晚16ms/12ms，均在30秒窗口内提交API；原生及宿主2/2已核对，用户分别确认响铃接通、显号尾号9486、双向语音正常、无需选卡/确认且已挂断。结束时许可关闭、两个组件禁用、计划暂停、三份活动文件唯一归档，12个设备门全部RELEASED。
证据：evidence/controlled-session-preparation/live-deploy-h、live-call-1/2、live-reconcile-1/2、live-closure.json；源码最终634/634回归、139模块语法通过（final-regression/final-syntax）。
状态为受控USB子范围通过；独立手机队列、全天200次真实容量、更多设备兼容仍未运行。

## R077定时生命周期

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-489 | R077；F005/008/011/012 | 无授权不启动 | 按规范拒绝/停止/保留待核对，不重放 | 可控时钟/SQLite/CLI | P0 | R077 | 通过（本地） | evidence/controlled-run/targeted-final |
| T-CALL-490 | R077；F005/008/011/012 | 到点前停止并暂停 | 按规范拒绝/停止/保留待核对，不重放 | 可控时钟/SQLite/CLI | P0 | R077 | 通过（本地） | evidence/controlled-run/targeted-final |
| T-CALL-491 | R077；F005/008/011/012 | 在途等待且保留未知 | 按规范拒绝/停止/保留待核对，不重放 | 可控时钟/SQLite/CLI | P0 | R077 | 通过（本地） | evidence/controlled-run/targeted-final |
| T-CALL-492 | R077；F005/008/011/012 | 禁用失败REVIEW | 按规范拒绝/停止/保留待核对，不重放 | 可控时钟/SQLite/CLI | P0 | R077 | 通过（本地） | evidence/controlled-run/targeted-final |
| T-CALL-493 | R077；F005/008/011/012 | 预检等待中停止 | 按规范拒绝/停止/保留待核对，不重放 | 可控时钟/SQLite/CLI | P0 | R077 | 通过（本地） | evidence/controlled-run/targeted-final |
| T-CALL-494 | R077；F005/008/011/012 | 重复启动及暂停重启 | 按规范拒绝/停止/保留待核对，不重放 | 可控时钟/SQLite/CLI | P0 | R077 | 通过（本地） | evidence/controlled-run/targeted-final |
| T-CALL-495 | R077；F005/008/011/012 | 关闭后停止幂等 | 按规范拒绝/停止/保留待核对，不重放 | 可控时钟/SQLite/CLI | P0 | R077 | 通过（本地） | evidence/controlled-run/targeted-final |
| T-CALL-496 | R077；F005/008/011/012 | 预检拒绝晚于关闭 | 按规范拒绝/停止/保留待核对，不重放 | 可控时钟/SQLite/CLI | P0 | R077 | 通过（本地） | evidence/controlled-run/targeted-final |
| T-CALL-497 | R077；F005/008/011/012 | CLI只读status/stop | 按规范拒绝/停止/保留待核对，不重放 | 可控时钟/SQLite/CLI | P0 | R077 | 通过（本地） | evidence/controlled-run/targeted-final |
| T-CALL-498 | R077；F005/008/011/012 | CLI无许可拒绝 | 按规范拒绝/停止/保留待核对，不重放 | 可控时钟/SQLite/CLI | P0 | R077 | 通过（本地） | evidence/controlled-run/targeted-final |
| T-CALL-499 | R077；F005/008/011/012 | 崩溃残留及定向停止请求 | 按规范拒绝/停止/保留待核对，不重放 | 可控时钟/SQLite/CLI | P0 | R077 | 通过（本地） | evidence/controlled-run/targeted-final |
操作系统信号下的真机清理、拔线及强杀后的恢复：未运行；强杀保留owner需人工/后续恢复入口核对。

## R078关闭与恢复

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-500 | R078；F005/008/011/012 | 完整关闭及唯一归档 | 关闭/明确拒绝/保留待核对；不重放 | SQLite/文件/USB替身/CLI | P0 | R078 | 通过（本地） | evidence/controlled-session-close/targeted-integrated |
| T-CALL-501 | R078；F005/008/011/012 | 宿主待核对阻挡 | 关闭/明确拒绝/保留待核对；不重放 | SQLite/文件/USB替身/CLI | P0 | R078 | 通过（本地） | evidence/controlled-session-close/targeted-integrated |
| T-CALL-502 | R078；F005/008/011/012 | 运行进程仍活跃 | 关闭/明确拒绝/保留待核对；不重放 | SQLite/文件/USB替身/CLI | P0 | R078 | 通过（本地） | evidence/controlled-session-close/targeted-integrated |
| T-CALL-503 | R078；F005/008/011/012 | 写后回复丢失 | 关闭/明确拒绝/保留待核对；不重放 | SQLite/文件/USB替身/CLI | P0 | R078 | 通过（本地） | evidence/controlled-session-close/targeted-integrated |
| T-CALL-504 | R078；F005/008/011/012 | 部分文件归档中断 | 关闭/明确拒绝/保留待核对；不重放 | SQLite/文件/USB替身/CLI | P0 | R078 | 通过（本地） | evidence/controlled-session-close/targeted-integrated |
| T-CALL-505 | R078；F005/008/011/012 | 活动文件变更 | 关闭/明确拒绝/保留待核对；不重放 | SQLite/文件/USB替身/CLI | P0 | R078 | 通过（本地） | evidence/controlled-session-close/targeted-integrated |
| T-CALL-506 | R078；F005/008/011/012 | owner归档后中断 | 关闭/明确拒绝/保留待核对；不重放 | SQLite/文件/USB替身/CLI | P0 | R078 | 通过（本地） | evidence/controlled-session-close/targeted-integrated |
| T-CALL-507 | R078；F005/008/011/012 | 原生未知请求 | 关闭/明确拒绝/保留待核对；不重放 | SQLite/文件/USB替身/CLI | P0 | R078 | 通过（本地） | evidence/controlled-session-close/targeted-integrated |
| T-CALL-508 | R078；F005/008/011/012 | 重复关闭需显式恢复 | 关闭/明确拒绝/保留待核对；不重放 | SQLite/文件/USB替身/CLI | P0 | R078 | 通过（本地） | evidence/controlled-session-close/targeted-integrated |
| T-CALL-509 | R078；F005/008/011/012 | 已完成恢复幂等 | 关闭/明确拒绝/保留待核对；不重放 | SQLite/文件/USB替身/CLI | P0 | R078 | 通过（本地） | evidence/controlled-session-close/targeted-integrated |
| T-CALL-510 | R078；F005/008/011/012 | 关闭后宿主变化 | 关闭/明确拒绝/保留待核对；不重放 | SQLite/文件/USB替身/CLI | P0 | R078 | 通过（本地） | evidence/controlled-session-close/targeted-integrated |
| T-CALL-511 | R078；F005/008/011/012 | CLI无当前会话 | 关闭/明确拒绝/保留待核对；不重放 | SQLite/文件/USB替身/CLI | P0 | R078 | 通过（本地） | evidence/controlled-session-close/targeted-integrated |
| T-CALL-512 | R078；F005/008/011/012 | CALL设备锁占用 | 关闭/明确拒绝/保留待核对；不重放 | SQLite/文件/USB替身/CLI | P0 | R078 | 通过（本地） | evidence/controlled-session-close/targeted-integrated |
| T-CALL-513 | R078；F005/008/011/012 | 过期证据/计数不符 | 关闭/明确拒绝/保留待核对；不重放 | SQLite/文件/USB替身/CLI | P0 | R078 | 通过（本地） | evidence/controlled-session-close/targeted-integrated |
| T-CALL-514 | R078；F005/008/011/012 | 真实端口禁止启用许可 | 关闭/明确拒绝/保留待核对；不重放 | SQLite/文件/USB替身/CLI | P0 | R078 | 通过（本地） | evidence/controlled-session-close/targeted-integrated |
| T-CALL-515 | R078；F005/008/011/012 | 关闭记录与门审计关联 | 关闭/明确拒绝/保留待核对；不重放 | SQLite/文件/USB替身/CLI | P0 | R078 | 通过（本地） | evidence/controlled-session-close/targeted-integrated |
真实关闭端口断连、正式命令启动/停止到关闭的真机完整组合：未运行，另列步骤6验收。

## R079离线组合验收

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-516 | R079；R077/078；F005/008/011/012 | 先关闭再核对通话仍可继续 | 无重复提交、核对不被关闭锁阻挡、关闭后暂停/归档 | SQLite/真实发送日志与门/ADB替身/虚拟时钟 | P0 | 组合验收 | 通过（离线模块链路） | evidence/controlled-lifecycle-e2e/targeted |
| T-CALL-517 | R079；R077/078；F005/008/011/012 | 正常定时到核对/关闭/归档 | 无重复提交、核对不被关闭锁阻挡、关闭后暂停/归档 | SQLite/真实发送日志与门/ADB替身/虚拟时钟 | P0 | 组合验收 | 通过（离线模块链路） | evidence/controlled-lifecycle-e2e/targeted |
| T-CALL-518 | R079；R077/078；F005/008/011/012 | 到点前停止且不用掉额度 | 无重复提交、核对不被关闭锁阻挡、关闭后暂停/归档 | SQLite/真实发送日志与门/ADB替身/虚拟时钟 | P0 | 组合验收 | 通过（离线模块链路） | evidence/controlled-lifecycle-e2e/targeted |
| T-CALL-519 | R079；R077/078；F005/008/011/012 | 提交回复丢失保留UNKNOWN | 无重复提交、核对不被关闭锁阻挡、关闭后暂停/归档 | SQLite/真实发送日志与门/ADB替身/虚拟时钟 | P0 | 组合验收 | 通过（离线模块链路） | evidence/controlled-lifecycle-e2e/targeted |
| T-CALL-520 | R079；R077/078；F005/008/011/012 | 关闭回复丢失后只读恢复 | 无重复提交、核对不被关闭锁阻挡、关闭后暂停/归档 | SQLite/真实发送日志与门/ADB替身/虚拟时钟 | P0 | 组合验收 | 通过（离线模块链路） | evidence/controlled-lifecycle-e2e/targeted |
| T-CALL-521 | R079；R077/078；F005/008/011/012 | 归档中断后恢复及重复恢复 | 无重复提交、核对不被关闭锁阻挡、关闭后暂停/归档 | SQLite/真实发送日志与门/ADB替身/虚拟时钟 | P0 | 组合验收 | 通过（离线模块链路） | evidence/controlled-lifecycle-e2e/targeted |
T516原red退出1：reconcile预期OK，实际DENY，属于业务死锁，不是导入/语法错误。green含原关闭回归17通过。T085容量回归覆盖50合成目标、200明确尝试和重复提交，并验证201不被误作硬上限；不代表真实线路容量。

## R080正式CLI进程验收

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-522 | R080/R077；F005/008/011/012 | 合成未来计划，独立CLI启动、另进程stop、退出后再次启动 | 首次退出0，owner归档CLOSED，计划暂停；再次启动不恢复计划，尝试0 | Windows子进程/SQLite/设备替身 | P0 | R080 | 通过（离线） | evidence/controlled-run-process/green |
| T-CALL-523 | R080/R077；F005/008/011/012 | 首个运行中再次启动 | 第二个退出1，原owner不变；原进程可正常stop退出 | Windows子进程/SQLite/设备替身 | P0 | R080 | 通过（离线） | evidence/controlled-run-process/green |
| T-CALL-524 | R080/R077；F005/008/011/012 | 强杀运行进程后status/start/stop | SIGKILL退出，保留owner，start退出1；stop仅请求，不冒充已关闭；尝试0 | 实际OS强杀/SQLite | P0 | R080 | 通过（离线） | evidence/controlled-run-process/green |
| T-CALL-525 | R080/R077；F005/008/011/012 | 运行时修改隔离部署元数据 | 退出0、暂停、两组件禁用替身回执、尝试0 | Windows子进程/文件变化 | P0 | R080 | 通过（离线） | evidence/controlled-run-process/green |

## R081关闭CLI进程组合验收

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-526 | R081/R078/080；F005/008/011/012 | 实际启动运行器，活跃时close；强杀后再次close和resume | 活跃时退出1/RUN_OWNER_ACTIVE且无设备操作；退出后close为0/CLOSED，唯一归档、暂停、门RELEASED、重复恢复幂等 | Windows子进程/SQLite/设备替身 | P0 | R081 | 通过（离线） | evidence/controlled-close-process/verified |
| T-CALL-527 | R081/R078/080；F005/008/011/012 | 关闭写入禁用许可后强杀；另一ID/原ID新close；同IDresume | 保留CLOSING/active，两个新close退出1；resume退出0，禁用仅写1次、唯一归档、门RELEASED | Windows真实强杀/跨进程持久恢复/设备替身 | P0 | R081 | 通过（离线） | evidence/controlled-close-process/verified |

## R082真实定时与关闭验收

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-528 | R077/080；F005/008/011/012 | S23绑定有效、单次授权，正式运行器定时计划版本6/7 | 各提交1次，停止禁用并待核对，不自动重放 | 真机/实际CLI/用户接收端报告 | P0 | R082 | 通过（响铃或未接记录；接通0） | evidence/android-readiness-r082/live-runtime、live-runtime-repeat、report.md |
| T-CALL-529 | R078/081；F008/011/012 | 用户反馈未接、设备空闲，分别核对后正式close | 单次额度不返还，许可关闭回读、暂停、唯一归档，无活动owner | 真机/实际CLI/SQLite | P0 | R082 | 通过（2次真实关闭） | evidence/android-readiness-r082/close-first、close-repeat、final-summary-confirmed、final-collector |
| T-CALL-530 | R078/081；F008/011/012 | 真机USB断连/进程强杀后同ID恢复 | 未知不重放，核对后按真实状态恢复 | 真机故障场景 | P0 | R082剩余风险 | 未运行 | docs/manual-steps.md；R081仅离线进程通过 |

## R083安卓独立仿真验证

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-531 | R083；F005/008/011 | 3合成任务、计划、重复触发、另一目标、重建引擎、人工核对 | 先存UNKNOWN再适配；重复不提交，未知占用，重开保留 | Java17/持久存储替身 | P0 | R083 | 通过 | evidence/android-standalone-r083/jvm |
| T-CALL-532 | R083；F005/010/011 | 暂停、旧版本、重开、重排、拒绝目标 | 旧计划失效，拒绝联系不授权 | Java17 | P0 | R083 | 通过 | evidence/android-standalone-r083/jvm |
| T-CALL-533 | R083；F008/011 | 适配抛异常后重开，核对UNKNOWN | 不重放、不伪造API回执，未核对不重排 | Java17 | P0 | R083 | 通过 | evidence/android-standalone-r083/jvm |
| T-CALL-534 | R083；F005 | UTC+8周五09/18边界及周六 | 工作日09含18不含，窗口外不调用适配 | 注入时钟/Java17 | P0 | 已采纳时段 | 通过 | evidence/android-standalone-r083/jvm |
| T-CALL-535 | R083；F011 | 持久化在写前失败 | 不调用适配，当前引擎停止后续提交 | Java17故障替身 | P0 | R083 | 通过 | evidence/android-standalone-r083/jvm |
| T-CALL-536 | R083；F011 | 写入成功但确认抛错，再重开 | UNKNOWN保留，不因回执丢失重放 | Java17故障替身 | P0 | R083 | 通过 | evidence/android-standalone-r083/jvm |
| T-CALL-537 | R083；F011/013 | 损坏数据/外部修改快照对象 | 损坏拒绝启动；克隆不改变持久状态 | Java17 | P0 | R083 | 通过 | evidence/android-standalone-r083/jvm |
| T-CALL-538 | R083；F007/013 | 200条合成任务逐条提交并核对再重开 | 200尝试/完成，无电话API | Java17有界容量 | P1 | 演示样本 | 通过 | evidence/android-standalone-r083/jvm |
| T-CALL-539 | R083；F005/008/010/011/013 | S23实际UI创建3任务、模拟提交、force-stop/重开、核对、暂停/重排、拒绝、下一条 | 重开保留待核对，未知占用，暂停阻止旧计划，拒绝目标跳过；最终暂停/零真实呼叫，原APK不变 | 实际Android UI/AtomicFile | P0 | R083 | 通过（手机仿真） | evidence/android-standalone-r083/device-unlocked、screen.png |

R083共8组JVM场景238断言通过，APK构建/lint退出0（0错误/2警告）；真实UI第一次因锁屏阻断，用户解锁后完整通过，不记成业务红绿修复。APK权限转储无uses-permission。真机UI仅合成任务，不是自动/真实拨号验收。

## R084定时规则验证

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-540 | R084；F005/011 | 同次开机、到点前/到点/重复回调 | 提前不执行，到点1次、重复无提交 | Java注入双时钟 | P0 | R084 | 通过 | evidence/android-timer-r084/jvm |
| T-CALL-541 | R084；F005/011 | 定时后暂停再触发旧版本 | STALE_ALARM且适配次数不增 | Java持久替身 | P0 | R084 | 通过 | evidence/android-timer-r084/jvm |
| T-CALL-542 | R084；F005/011 | 到点晚30001ms后回调、重开重放 | SKIPPED_EXPIRED且回调已消费 | Java双时钟/重开 | P0 | D027 | 通过 | evidence/android-timer-r084/jvm |
| T-CALL-543 | R084；F005/011 | boot_count变化 | SKIPPED_REBOOT、无适配调用 | Java开机标识替身 | P0 | R084 | 通过 | evidence/android-timer-r084/jvm |
| T-CALL-544 | R084；F010/011 | 安排后拒绝联系 | REFUSED，无新尝试 | Java | P0 | 原拒绝规则 | 通过 | evidence/android-timer-r084/jvm |
| T-CALL-545 | R084；F005/011 | 人工先执行后旧定时回调 | 仅人工产生1次，定时无重复 | Java | P0 | 原竞争规则 | 通过 | evidence/android-timer-r084/jvm |
| T-CALL-546 | R084；F005 | 到点后恰好30000ms | 在工作时段且条件满足可提交 | Java双时钟 | P0 | D027 | 通过 | evidence/android-timer-r084/jvm |
| T-CALL-547 | R084；F005/011 | 持久化导致单调时钟超窗口 | 保留UNKNOWN，无适配调用/伪回执 | Java故障/延迟注入 | P0 | R084 | 通过 | evidence/android-timer-r084/jvm |
| T-CALL-548 | R084；F011/013 | 读取schema1结果记录 | 历史版本/结果保留，无隐式闹钟 | Java二进制迁移 | P0 | R083升级 | 通过 | evidence/android-timer-r084/jvm |
| T-CALL-549 | R084；F005/008/011/013 | S23精确闹钟/后台权限已允许，30秒安排后Home；核对后重排并force-stop/重开 | 后台模拟提交一次，历史保留，重开旧定时作废且35秒无补发，最终暂停 | 真机UI/AlarmManager/AtomicFile | P0 | R084 | 通过（单次后台仿真） | evidence/android-timer-r084/device-background-unlocked |

T549前置失败保留：device（非精确超观察窗口）、device-exact（后台受限）、device-background-allowed（锁屏）；最终日志明确SIMULATED_API_SUBMITTED，未以SKIPPED_EXPIRED充当成功。本项不涵盖全天/连续/锁屏/真实拨号。

## R085显式再次尝试验证

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-550 | R085；F005/008/011 | 已核对NO_ANSWER，准备重试，重复旧版本，未重排提交 | 仅一次准备、暂停、旧版本拒绝、无提交 | JVM版本与持久替身 | P0 | 已采纳手动重试 | 通过；有效红转绿 | evidence/android-retry-r085/red、green |
| T-CALL-551 | R085；F011/012 | 重开、明确重排、A2提交并核对 | A1未接与A2接通分别保留；目标数不增，尝试数2 | JVM持久回归 | P0 | R085 | 通过 | evidence/android-retry-r085/green |
| T-CALL-552 | R085；F008/010/011 | 拒绝联系、其他任务待核对、已核对UNKNOWN | 分别拒绝准备，不生成新尝试 | JVM | P0 | 原拒绝/未知守卫 | 通过 | evidence/android-retry-r085/green |
| T-CALL-553 | R085；F005/011 | 原定时后准备重试，旧回调；重排后周末提交 | 旧定时失效；新尝试仍受工作时段约束 | JVM双时钟 | P0 | D027与已采纳时段 | 通过 | evidence/android-retry-r085/green |
| T-CALL-554 | R085；F011 | 准备写盘失败后重开 | 保留原已核对结果，无历史丢失/新适配 | JVM故障注入 | P0 | 持久化守卫 | 通过 | evidence/android-retry-r085/green |
| T-CALL-555 | R085；F011/012 | 读取真实schema2格式，原无API回执，准备再重开 | 迁移schema3，A1原回执false保留 | JVM独立旧格式fixture | P0 | R084升级 | 通过 | evidence/android-retry-r085/green |
| T-CALL-556 | R085；F011 | 历史尝试序号非法 | 拒绝打开，不清空记录 | JVM坏数据 | P0 | 持久化规则 | 通过 | evidence/android-retry-r085/green |
| T-CALL-557 | R085；F005/008/011/012/013 | S23现有演示库，选择未知目标/明确目标重试；A2提交后force-stop/重开、重复下一条、核对 | 未知拒绝；A1保留，A2待核对保留，重复无新增，历史界面显示，最终暂停 | 真机UI/AtomicFile | P0 | R085 | 通过（仿真） | evidence/android-retry-r085/device |

R085局部回归包含原T531～538、T540～548，共24组292断言通过；构建/lint退出0（0错误3警告）。真机T557仅合成任务，无真实通话。旧宿主JS代码未改，673项历史回归未在本轮重复运行。

R085对T549的schema3回归：evidence/android-retry-r085/timer-regression退出0，DEMO-005在桌面后台实际SIMULATED_API_SUBMITTED，既有A1/A2历史保留；重排后force-stop/重开无补发，最终暂停。

## R086本地合成名单测试

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-560 | R086；F001/010/013 | 导入新DEMO ID、已有ID、批内重复、空行和首尾空格 | 只新增唯一ID，跳过/空行计数；拒绝标记和历史保留，重开数据一致 | Java纯逻辑/持久替身 | P0 | R086 | 通过 | evidence/android-import-r086/green-final-unique2 |
| T-CALL-561 | R086；F001/010 | 一批合法ID后含手机号或非法字符行 | 整批拒绝，状态不变，给错误行，不保存合法前缀 | Java原子校验 | P0 | 原号码资格守卫 | 通过 | evidence/android-import-r086/green-final-unique2 |
| T-CALL-562 | R086；F001/013 | 超200行、超8000字符 | 边界拒绝，不写状态 | Java输入边界 | P1 | R086演示输入 | 通过 | evidence/android-import-r086/green-final-unique2 |
| T-CALL-563 | R086；F001/013 | 200目标上限及新增量超余量 | 容量拒绝且不部分导入 | Java容量/持久替身 | P1 | 既有演示边界 | 通过 | evidence/android-import-r086/green-final-unique2 |
| T-CALL-565 | R086；F001/010/013 | S23导入批次含手机号、重复与已存在ID；力停/重开 | 非法批次原子拒绝，合法合并1条；原历史/拒绝保存；重开保持暂停 | 真机UI/AtomicFile | P0 | R086 | 通过（合成数据） | evidence/android-import-r086/device-final |

T564保留给后续合成编辑/删除场景，目前未实现。R086局部回归24既有场景292断言+4导入场景28断言，共28场景320断言通过。构建/lint退出0，0错误3警告。APK仅含SCHEDULE_EXACT_ALARM；无拨号/网络权限。手机12目标/5模拟尝试/暂停，真实呼叫0。

追加唯一性回归：合成名单含非连续DEMO ID后，追加3条仍选择空闲ID，纯逻辑断言见evidence/android-import-r086/green-final-unique2；S23导入后追加和强停重开见device-final。


## R087桥接与恢复检查

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-566 | R087；F003/011/012 | CONTROLLED_REAL请求DEMO或受控联系人标识 | 未连接，任务写0、端口调用0、未消耗尝试 | Java真实引擎/记录替身 | P0 | 源隔离 | 通过（有效红转绿） | evidence/android-bridge-r087/red、green |
| T-CALL-567 | R087；F005/011/013 | SIMULATION提交/重复 | 端口前持久UNKNOWN、独立尝试ID、SIMULATED回执、呼出/接通null | Java持久替身 | P0 | R087 | 通过 | evidence/android-bridge-r087/green |
| T-CALL-568 | R087；F011/013 | 模拟端口失败、重开再提交 | UNKNOWN/待核对保留，无重放或API伪回执 | Java故障/重开 | P0 | 原恢复规则 | 通过 | evidence/android-bridge-r087/green |
| T-CALL-569 | R087；F005/011 | 定时由同一桥接发送并重复回调 | 一次模拟提交、重复无新尝试 | Java双时钟 | P0 | R084 | 通过 | evidence/android-bridge-r087/green |
| T-CALL-570 | R087；F012 | 来源null、模拟输入号码或null | 在任务访问/持久变更前拒绝 | Java负向 | P0 | R087 | 通过 | evidence/android-bridge-r087/green |
| T-CALL-571 | R087；F003/011/012 | S23带启用/真实来源参数启动只读诊断 | 固定禁用，忽略参数，任务字节不变，原APK摘要一致 | 真机诊断 | P0 | R087 | 通过 | evidence/android-bridge-r087/device-isolated |
| T-CALL-572 | R087；F008/011/013 | 原生许可/账本前后只读快照 | 许可仍关闭/摘要一致、请求6/许可4不增，组件仍禁用 | 真机只读/字段断言 | P0 | 不消耗历史许可 | 通过 | evidence/android-bridge-r087/native-before、native-after、native-comparison.json |
| T-CALL-573 | R084/087；F005/011 | 安排模拟定时→force-stop→诊断→主界面 | 诊断不写任务且不初始化运行单例；主界面作废旧计划并暂停 | 真机生命周期 | P0 | 本轮具体Bug | 通过（真机失败回归） | evidence/android-bridge-r087/diagnostic-restart-red、diagnostic-restart-unlocked |

R087纯规则：原28组320断言+新增5组30断言，共33组350断言通过。人工T557与后台T549回归通过，证据manual-regression/timer-regression；分别实际模拟A3与DEMO-006，最终12目标/7模拟尝试/暂停。它们不证明真实原生发送。


## R088联系人/初始任务模型验证

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-574 | R088；F001/010/013 | 可信Actor/CONTACT_INTAKE/目标摘要/确认资格；独立重复构造 | 稳定作用域联系人/初始DRAFT身份；无电话/生产认证 | Java不可变模型 | P0 | 既有宿主自助导入 | 通过；有效业务红转绿 | evidence/android-contact-model-r088/red、final-jvm |
| T-CALL-575 | R088；F010/012 | 已拒绝联系人重新导入 | 原对象、来源、资格/拒绝修订保留，停止可计划状态 | Java纯规则 | P0 | 拒绝不变量 | 通过 | evidence/android-contact-model-r088/final-jvm |
| T-CALL-576 | R088；F001/012 | 同企业他销售冲突、跨企业相同目标、无导入能力 | 冲突不返回ID/对象；身份按企业隔离；越权拒绝 | Java合成Actor | P0 | 已采纳销售本人规则 | 通过 | evidence/android-contact-model-r088/final-jvm |
| T-CALL-577 | R088；F011/012 | 当前联系人资格改变，旧DRAFT；撤回/未知/拒绝后更新 | 旧修订STALE；新快照仍因资格/拒绝停止；拒绝不能用确认资格清除 | Java版本/不可变快照 | P0 | 当前权威快照前提 | 通过 | evidence/android-contact-model-r088/final-jvm |
| T-CALL-578 | R088；F010/012 | DEMO/模拟回执来源、坏key/空声明、矛盾目录 | 失败，不将来源标记或摘要当真实授权 | Java负向 | P0 | R087隔离 | 通过 | evidence/android-contact-model-r088/final-jvm |
| T-CALL-579 | R088；F013 | 与宿主独立UTF-8 nativeId向量比较；非法身份/类型 | 编码一致，非法输入拒绝；编码不代表许可 | Java+宿主编码向量 | P1 | 既有contactWireId | 通过 | evidence/android-contact-model-r088/host-vector、final-jvm |
| T-CALL-580 | R088；F001/010/012/013 | S23启动固定合成模型检查并传入外部身份/来源覆盖 | 固定fixture规则通过，作用域ID/宿主向量一致，外部参数忽略；DEMO字节/原APK不变，无联系人库或电话 | 真机只读fixture | P0 | R088 | 通过（内存模型） | evidence/android-contact-model-r088/device-final |

R088当前局部回归为原33组350断言+6组36断言，共39组386断言；最终构建/lint退出0，0错误3警告。没有联系人持久化/事务/并发/崩溃恢复证据，不把T580的应用停止或稳定重算ID称为联系人重开持久性通过。旧宿主673项历史回归没有在本轮重复运行，原生产JS未修改。

## R089元数据Store（2026-10-16）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-581 | R089；F001/010/011/012/013 | 规范化联系人持久记录恢复；坏身份/来源/声明/修订 | 合法恢复；损坏拒绝 | Java恢复规则 | P0 | R089契约/恢复风险 | 通过；有效业务红→绿 | evidence/android-contact-store-r089/jvm |
| T-CALL-582 | R089；F001/010/011/012/013 | 原草稿快照恢复；伪造归属/未来修订/非DRAFT | 保留旧快照；矛盾任务拒绝 | Java恢复规则 | P0 | R089契约/恢复风险 | 通过 | evidence/android-contact-store-r089/jvm |
| T-CALL-583 | R089；F001/010/011/012/013 | 合成导入→资格/拒绝→重复→关闭重开 | 原子保留联系人/原DRAFT/事件；STALE不刷新 | S23 SQLite | P0 | R089契约/恢复风险 | 通过 | evidence/android-contact-store-r089/device-final |
| T-CALL-584 | R089；F001/010/011/012/013 | 同企业他人、跨企业同目标、无能力Actor | 归属隔离；冲突无对象；权限拒绝 | S23 SQLite | P0 | R089契约/恢复风险 | 通过（注入身份，非生产鉴权） | evidence/android-contact-store-r089/device-final |
| T-CALL-585 | R089；F001/010/011/012/013 | 导入四点及更新一点注入失败再开 | 五处事务回滚，无孤立记录/半更新 | S23 SQLite故障注入 | P0 | R089契约/恢复风险 | 通过 | evidence/android-contact-store-r089/device-final |
| T-CALL-586 | R089；F001/010/011/012/013 | 两连接竞争：同销售导入、不同销售冲突、同修订资格/拒绝 | 一次导入；一次更新；败者幂等/冲突/过期 | S23真实SQLite并发 | P0 | R089契约/恢复风险 | 通过；3组固定竞争 | evidence/android-contact-store-r089/device-final |
| T-CALL-587 | R089；F001/010/011/012/013 | 错库/未来版本/坏ID/事件矛盾/REAL修订/坏文件 | 停止且保留损坏/原记录，不重置 | S23负向恢复 | P0 | R089契约/恢复风险 | 通过；数值缺陷有红绿 | evidence/android-contact-store-r089/device-numeric-red、device-final |
| T-CALL-588 | R089；F001/010/011/012/013 | 已提交后am force-stop再启新进程 | 2联系人/2草稿/4事件及原版本保留 | S23跨进程 | P0 | R089契约/恢复风险 | 通过 | evidence/android-contact-store-r089/device-final |
| T-CALL-589 | R089；F001/010/011/012/013 | AFTER_CONTACT_INSERT未提交时force-stop再开 | 0联系人/0草稿/0事件；无重放 | S23实际中途强停 | P0 | R089契约/恢复风险 | 通过；非断电证明 | evidence/android-contact-store-r089/device-final |
| T-CALL-590 | R089；F001/010/011/012/013 | 固定fixture并传外部数据库/身份/启用字段；比较前后 | 参数无效；DEMO字节/旧APK/生产库状态不变，暂停零电话 | S23宿主驱动 | P0 | R089契约/恢复风险 | 通过 | evidence/android-contact-store-r089/device-final |

局部Java共41组397断言；真机另58断言，不能相加作为产品用例数。build-final退出0，lint0错误3警告。真实号码输入/生产身份/实际计划/真实拨号没有在本轮运行；iPhone暂停。旧673项宿主回归未重复运行。

## R090草稿刷新（2026-10-16）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-591 | R090；F001/010/011/012/013 | 显式刷新/同请求重放 | ID稳定、旧对象不变、已最新幂等无新事件 | 纯Java | P0 | 显式刷新/事务恢复契约 | 通过（合成数据） | evidence/android-draft-refresh-r090/jvm-final |
| T-CALL-592 | R090；F001/010/011/012/013 | 双修订/归属/PLAN能力不符 | STALE_CONTACT/STALE_DRAFT/FORBIDDEN，不推进 | 纯Java | P0 | 显式刷新/事务恢复契约 | 通过（合成数据） | evidence/android-draft-refresh-r090/jvm-final |
| T-CALL-593 | R090；F001/010/011/012/013 | 未知/撤回/拒绝及刷新后再变化 | 不合格禁止刷新，后续变化使快照失效 | 纯Java | P0 | 显式刷新/事务恢复契约 | 通过（合成数据） | evidence/android-draft-refresh-r090/jvm-final |
| T-CALL-594 | R090；F001/010/011/012/013 | 重建schema1→迁移→多次刷新/重复/资格变化 | 数据保留、不伪造审计、幂等、拒绝阻断 | S23 SQLite | P0 | 显式刷新/事务恢复契约 | 通过（合成数据） | evidence/android-draft-refresh-r090/device-final |
| T-CALL-595 | R090；F001/010/011/012/013 | 他销售/无PLAN、草稿与联系人期望失配 | 拒绝且记录不覆盖 | S23 SQLite | P0 | 显式刷新/事务恢复契约 | 通过（合成数据） | evidence/android-draft-refresh-r090/device-final |
| T-CALL-596 | R090；F001/010/011/012/013 | 刷新3点失败；迁移2点失败再开 | 草稿/审计同回滚；迁移失败保持schema1可重开 | S23失败注入 | P0 | 显式刷新/事务恢复契约 | 通过（合成数据） | evidence/android-draft-refresh-r090/device-final |
| T-CALL-597 | R090；F001/010/011/012/013 | 两连接重复刷新；刷新与资格撤回竞争 | 一次刷新；撤回后不可计划，不留下资格绕过 | S23真实连接并发 | P0 | 显式刷新/事务恢复契约 | 通过（合成数据） | evidence/android-draft-refresh-r090/device-final |
| T-CALL-598 | R090；F001/010/011/012/013 | 缺审计的旧库、无审计新快照、非整数审计、不合格目标修订 | 拒绝且损坏/旧版本保留，不自动修复 | S23负向恢复 | P0 | 显式刷新/事务恢复契约 | 通过（合成数据） | evidence/android-draft-refresh-r090/device-final |
| T-CALL-599 | R090；F001/010/011/012/013 | 提交后force-stop再新进程读取 | 联系人6/拒绝、草稿5、3刷新事件不丢失 | S23跨进程 | P0 | 显式刷新/事务恢复契约 | 通过（合成数据） | evidence/android-draft-refresh-r090/device-final |
| T-CALL-600 | R090；F001/010/011/012/013 | 草稿UPDATE后事件前实际force-stop再开 | 联系人2/草稿1/0刷新事件，无半提交；原DEMO/旧APK不变 | S23真实中途强停+宿主比较 | P0 | 显式刷新/事务恢复契约 | 通过（合成数据） | evidence/android-draft-refresh-r090/device-final |

Java44组414断言；S23刷新63断言，联系人相关回归T583～590另58断言通过，勿相加冒充产品用例数。纯模型有有效业务红绿；Store集成是实现后通过。正式身份/名单/计划/真实电话未接，断电/多机型未运行；iPhone暂停。

## R091手机计划元数据（2026-10-16）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-601 | R091；F001/005/010/011/012/013 | 明确安排未来时间、注入时间、到期/30秒边界 | 单调计划版本，+30000有效/+30001过期，状态不是执行许可 | Java纯规则 | P0 | 既有时段/版本/恢复规则 | 通过（合成数据） | evidence/android-sales-plan-r091/jvm |
| T-CALL-602 | R091；F001/005/010/011/012/013 | 改时间、旧版本、暂停、重复暂停及明确重排 | 旧版本失效；暂停不自动恢复；版本匹配幂等 | Java纯规则 | P0 | 既有时段/版本/恢复规则 | 通过（合成数据） | evidence/android-sales-plan-r091/jvm |
| T-CALL-603 | R091；F001/005/010/011/012/013 | 周末、09点前、18点、过时时间、窗口末尾检查 | 北京时间工作日09含18不含；不安排过时；检查也守窗口 | Java纯规则 | P0 | 既有时段/版本/恢复规则 | 通过（合成数据） | evidence/android-sales-plan-r091/jvm |
| T-CALL-604 | R091；F001/005/010/011/012/013 | 资格/拒绝/草稿变化、双修订、归属与能力 | 拒绝/未知/陈旧/越权停止安排或检查，不授权电话 | Java纯规则 | P0 | 既有时段/版本/恢复规则 | 通过（合成数据） | evidence/android-sales-plan-r091/jvm |
| T-CALL-605 | R091；F001/005/010/011/012/013 | schema2合成库迁移后安排/改时/暂停/重排 | 旧元数据保持，计划连续版本；初始无计划事件 | S23 SQLite | P0 | 既有时段/版本/恢复规则 | 通过（合成数据） | evidence/android-sales-plan-r091/device-fixture-fix |
| T-CALL-606 | R091；F001/005/010/011/012/013 | 不同销售计划、无PLAN、他销售联系人、资格改变 | 只见/改本人计划；另一销售不受暂停/恢复影响；资格改变阻断 | S23 SQLite | P0 | 既有时段/版本/恢复规则 | 通过（合成数据） | evidence/android-sales-plan-r091/device-fixture-fix |
| T-CALL-607 | R091；F001/005/010/011/012/013 | 两迁移失败点、安排事件后/提交前及暂停写失败 | 3计划回滚场景；迁移失败保持schema2；无半写计划 | S23失败注入 | P0 | 既有时段/版本/恢复规则 | 通过（合成数据） | evidence/android-sales-plan-r091/device-fixture-fix |
| T-CALL-608 | R091；F001/005/010/011/012/013 | 两连接同版本安排；安排与暂停竞争 | 一次成功/一次STALE_PLAN，不重复事件，连续版本 | S23真实SQLite连接并发 | P0 | 既有时段/版本/恢复规则 | 通过（合成数据） | evidence/android-sales-plan-r091/device-fixture-fix |
| T-CALL-609 | R091；F001/005/010/011/012/013 | 计划事件版本缺口、非整数时间、超时检查与回拨 | 损坏拒绝保留；观察过期持久暂停，不能回拨复活 | S23负向/时钟替身 | P0 | 既有时段/版本/恢复规则 | 通过（合成数据） | evidence/android-sales-plan-r091/device-fixture-fix |
| T-CALL-610 | R091；F001/005/010/011/012/013 | 提交后force-stop新进程→明确recoverPlan；另开过期库 | version6保留后恢复到7暂停，别的销售仍1；过期重开不复活 | S23跨进程 | P0 | 既有时段/版本/恢复规则 | 通过（合成数据） | evidence/android-sales-plan-r091/device-fixture-fix |
| T-CALL-611 | R091；F001/005/010/011/012/013 | 插入计划事件未提交时实际force-stop再开 | 无计划事件/version0暂停，联系人/草稿保持；DEMO/旧APK不变 | S23真实中途强停 | P0 | 既有时段/版本/恢复规则 | 通过（合成数据） | evidence/android-sales-plan-r091/device-fixture-fix |

当前48组444 Java断言、S23计划62断言；旧草稿63/联系人58在最终包分别回归通过，不相加当产品用例数。纯模型有NOT_IMPLEMENTED红绿；首次device因fixture名称过长停止不是业务红灯，已保留。真实定时运行器/电话/生产身份与号码入口未运行，冷启动恢复门槛未接正式运行器，iPhone暂停。

## R092合成提交闭环（2026-10-16）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-612 | R092；F001/005/006/010/011/012/013 | 合成claim及IDLE/BUSY/UNKNOWN/过期 | 稳定身份，初始UNKNOWN无回执/呼出/接通；不明/忙/晚阻断 | Java纯模型 | P0 | 计划消费/未知恢复不变量 | 通过（合成；真实状态未验） | evidence/android-synthetic-loop-r092/jvm-final |
| T-CALL-613 | R092；F001/005/006/010/011/012/013 | 回执、UNKNOWN/明确结果及重复/冲突 | 来源分离、幂等，未知不伪造明确结果 | Java纯模型 | P0 | 计划消费/未知恢复不变量 | 通过（合成；真实状态未验） | evidence/android-synthetic-loop-r092/jvm-final |
| T-CALL-614 | R092；F001/005/006/010/011/012/013 | 他销售/无PLAN/非法结果 | 权限/归属/枚举拒绝 | Java纯模型 | P0 | 计划消费/未知恢复不变量 | 通过（合成；真实状态未验） | evidence/android-synthetic-loop-r092/jvm-final |
| T-CALL-615 | R092；F001/005/006/010/011/012/013 | 启动恢复→新计划→claim→回执→核对→明确下一计划 | 先持久UNKNOWN，计划一次消费，独立尝试/历史，原请求不重放 | S23 SQLite+记录型端口 | P0 | 计划消费/未知恢复不变量 | 通过（合成；真实状态未验） | evidence/android-synthetic-loop-r092/device-final-retry |
| T-CALL-616 | R092；F001/005/006/010/011/012/013 | claim三点失败、端口FAIL/丢回执、回执/结果落库失败 | 提交前无端口/半记录；提交后UNKNOWN保留占用，结果不丢写成已知 | S23故障注入 | P0 | 计划消费/未知恢复不变量 | 通过（合成；真实状态未验） | evidence/android-synthetic-loop-r092/device-final-retry |
| T-CALL-617 | R092；F001/005/006/010/011/012/013 | 忙/状态未知/拒绝、未到/过期、时钟/boot与慢持久读取 | 不调用端口；超时后暂停不复活，已claim未知保留 | S23注入时钟/设备状态 | P0 | 计划消费/未知恢复不变量 | 通过（合成；真实状态未验） | evidence/android-synthetic-loop-r092/device-slow-read-red、device-final-retry |
| T-CALL-618 | R092；F001/005/006/010/011/012/013 | 两连接同计划竞争执行；重复和新计划抢占 | 一次claim/一次端口，败者OCCUPIED，不重复记录 | S23真实SQLite连接 | P0 | 计划消费/未知恢复不变量 | 通过（合成；真实状态未验） | evidence/android-synthetic-loop-r092/device-final-retry |
| T-CALL-619 | R092；F001/005/006/010/011/012/013 | schema3合成库迁移与两失败点 | 旧计划保持、无伪造尝试，失败回滚到3 | S23迁移 | P0 | 计划消费/未知恢复不变量 | 通过（合成；真实状态未验） | evidence/android-synthetic-loop-r092/device-final-retry |
| T-CALL-620 | R092；F001/005/006/010/011/012/013 | 他销售/坏尝试ID/缺CLAIMED事件 | 归属隔离；损坏拒绝保留，不自动修复 | S23负向恢复 | P0 | 计划消费/未知恢复不变量 | 通过（合成；真实状态未验） | evidence/android-synthetic-loop-r092/device-final-retry |
| T-CALL-621 | R092；F001/005/006/010/011/012/013 | 提交后force-stop新进程重开 | 明确历史保留；未知占用保留，不自动重放 | S23跨进程 | P0 | 计划消费/未知恢复不变量 | 通过（合成；真实状态未验） | evidence/android-synthetic-loop-r092/device-final-retry |
| T-CALL-622 | R092；F001/005/006/010/011/012/013 | claim提交后、端口前实际force-stop | UNKNOWN保留且无回执，启动后零重放 | S23实际中途强停 | P0 | 计划消费/未知恢复不变量 | 通过（合成；真实状态未验） | evidence/android-synthetic-loop-r092/device-final-retry |
| T-CALL-623 | R092；F001/005/006/010/011/012/013 | 插入尝试未提交时实际force-stop | 尝试回滚，原计划保留；执行器启动暂停旧计划，零请求 | S23实际中途强停 | P0 | 计划消费/未知恢复不变量 | 通过（合成；真实状态未验） | evidence/android-synthetic-loop-r092/device-final-retry |
| T-CALL-624 | R092；F001/005/006/010/011/012/013 | 50合成目标/200明确计划与模拟尝试，强停后重开 | 200唯一尝试/请求/模拟回执、50目标完整；真实电话0 | S23固定样本容量 | P0 | 计划消费/未知恢复不变量 | 通过（合成；真实状态未验） | evidence/android-synthetic-loop-r092/device-final-retry |
| T-CALL-625 | R092；F001/005/006/010/011/012/013 | 人工UNKNOWN后明确IDLE/无待处理确认关闭；再次计划 | 独立关闭占用但结果仍未知，不能重放旧尝试；缺确认拒绝，重复关闭幂等 | Java+S23合成恢复 | P0 | 计划消费/未知恢复不变量 | 通过（合成；真实状态未验） | evidence/android-synthetic-loop-r092/jvm-final、device-final-retry |

52组480 Java断言；S23最终97断言，计划/草稿/联系人另62/63/58回归通过，不累计冒充产品用例数。T617慢读取窗口有有效失败回归。device-final/all曾超时，根因未定，同APK直接all及完整重跑通过；保留失败，不标全天/真实后台可靠。正式号码/身份、真实电话/定时器与多机型仍未运行，iPhone暂停。

## R093工作区与失败回归（2026-10-16）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-626 | R093；F010 | SIM逐行空白/重复/空行及修改返回列表 | trim/跳重/空白统计，Batch不可变 | Java纯规则 | P0 | R093输入契约 | 通过（合成） | android-workspace-r093/jvm |
| T-CALL-627 | R093；F010/012 | 电话式数字/DEMO/超200行或8000字符 | 明确行号/资源错误，不回显原输入，不部分处理 | Java负向 | P0 | R093输入边界 | 通过（合成） | android-workspace-r093/jvm |
| T-CALL-628 | R093；F010/012 | 全1000个SIM ID及独立SHA向量/外部摘要 | 稳定、互异、可还原标签，外部目标拒绝 | Java+独立向量 | P0 | 类型隔离 | 通过（合成） | android-workspace-r093/jvm |
| T-CALL-629 | R093；F005 | 北京时间分钟格式/非法日期/25点 | 严格解析，无效拒绝，不改变拨号时段 | Java纯规则 | P0 | D-CALL-010/R093 | 通过（合成） | android-workspace-r093/jvm |
| T-CALL-630 | R093；F013 | 回执/待核对/人工UNKNOWN与关闭 | 来源分别计数，关闭不伪造接通或明确结果 | Java不变量 | P0 | R016/R093 | 通过（合成） | android-workspace-r093/jvm |
| T-CALL-631 | R093；F010/012 | 导入、资格变化/拒绝后重复导入、非法批次 | 保留旧修订/拒绝/草稿；非法整批零新增 | S23隔离SQLite | P0 | 原子导入 | 通过（合成） | android-workspace-r093/clock-regression-green |
| T-CALL-632 | R093；F010/011 | 第二条插入后注入失败并重开 | 全批联系人/草稿/审计均回滚 | S23事务故障 | P0 | 持久不变量 | 通过（合成） | android-workspace-r093/clock-regression-green |
| T-CALL-633 | R093；F011/012 | 错类型库/外部摘要/伪Intent身份与库名 | 拒绝保留，不打开用户或正式库，不赋生产身份 | S23负向/类型检查 | P0 | 命名空间隔离 | 通过（合成） | clock-regression-green、device-ui-final |
| T-CALL-634 | R093；F005/011/013 | Session立即→占用→UNKNOWN→明确关闭→新尝试→未接 | 占用阻挡；缺确认关闭拒绝，关闭仍未知；新计划才新尝试 | S23固定时钟集成 | P0 | R092/R093 | 通过（合成） | android-workspace-r093/clock-regression-green |
| T-CALL-635 | R093；F005/011/012 | 资格改动/确认/刷新、未来计划后新Session | 旧草稿失效；明确刷新；旧计划暂停、历史不重放 | S23恢复集成 | P0 | 版本与恢复 | 通过（合成） | android-workspace-r093/clock-regression-green |
| T-CALL-636 | R093；F005/010 | S23解锁，实际输入去重/非法批次/未来时间→执行→暂停 | 原子导入，未到时零提交，暂停作废计划 | 实际UI点击 | P0 | 工作区操作契约 | 通过（合成） | android-workspace-r093/device-ui-final |
| T-CALL-637 | R093；F005/011/013 | 立即模拟→强停重开→未知→关闭确认→下一次→未接 | 保留未知/禁重放；按钮需明确确认；新尝试新ID | 实际UI/跨进程 | P0 | UNKNOWN恢复不变量 | 通过（合成） | device-ui-final；首轮device-ui失败保留 |
| T-CALL-638 | R093；F010/012 | UI资格未知→确认→刷新→拒绝→重导入 | 不隐式刷新；拒绝后不可安排，重导入不解除 | 实际UI点击 | P0 | 资格/拒绝与修订 | 通过（合成） | android-workspace-r093/device-ui-final |
| T-CALL-639 | R093；F005/011/013 | UI未来计划→强停重开→历史；fixture后检查原库/旧APK | 旧计划暂停/零补发，结果未知仍未知；原DEMO/工作区保留 | 实际UI+保留校验 | P0 | 恢复与来源隔离 | 通过（合成） | device-ui-final截图/XML及workspace-ui-cases.json |
| T-CALL-640 | R093；F005/011 | 即时计划取时后Clock每读递增1ms；实际第二次立即操作 | 事务内due/now同样本，不误报PAST_DUE；执行仍实时校验 | S23确定复现+UI回归 | P0 | 真机具体Bug | 红→绿 | clock-regression-red、clock-regression-green；device-ui、device-ui-final |

以上android-workspace-r093起首路径相对evidence，其余简写相对evidence/android-workspace-r093；纯规则57组510断言、隔离21、UI驱动30（含保留校验）分别统计，不相加冒充产品功能数量。R093实际仅合成，原DEMO/旧真实app未变、0电话。T615～625本轮loop-regression退出0/97，容量50目标200尝试约2062ms且重开完整。新工作区自动定时、真实状态/双卡权限撤回/来电竞争及正式号码/生产身份E2E未运行；iPhone暂停。所有R093 MUST均有上述验证方式，整个平台功能仍未验收。


## R094单次原生定时仿真（2026-10-16）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-641 | R094；F003/005 | 有效版本/未来时间/双时钟/boot/token | 绑定票据，到时DUE | Java | P0 | 定时契约 | 通过（合成） | jvm；red保留 |
| T-CALL-642 | R094；F005/011 | 旧版本/错token/无票据 | STALE_TIMER，不消费新票据 | Java | P0 | 防重 | 通过（合成） | jvm |
| T-CALL-643 | R094；F005/011 | 到时前1ms、到时+30秒/30秒1ms | 早期拒绝、含边界允许、超时停止 | Java | P0 | 30秒窗口 | 通过（合成） | jvm |
| T-CALL-644 | R094；F005/011 | boot改变、负单调值、墙钟相对偏移5秒 | TIMER_CLOCK_CHANGED，无许可 | Java | P0 | 双时钟守卫 | 通过（合成） | jvm |
| T-CALL-645 | R094；F005 | 过时时间/空boot/负或溢出单调值 | 不产生票据，明确失败 | Java负向 | P0 | 输入边界 | 通过（合成） | jvm |
| T-CALL-646 | R094；F003/005/011 | 明确计划、到期回调、重复/旧回调、改期 | 合法回调不误暂停；最多一次，旧请求不撤新票 | S23隔离Store+替身闹钟 | P0 | 计划/票据绑定 | 通过（合成） | device-fixture-fixed |
| T-CALL-647 | R094；F005/010/012 | 计划后目标拒绝/草稿过期、恢复 | 最新状态阻挡，暂停/撤票，0请求；恢复不补发 | S23集成 | P0 | 资格/恢复 | 通过（合成） | device-fixture-fixed；首轮原因预期错误保留 |
| T-CALL-648 | R094；F003/005 | 过期/boot变更/替身缺精确权限/arm抛错 | 失败停在暂停，无请求；权限缺失前置不写计划 | S23故障替身 | P0 | 平台状态失败 | 通过（合成，非实测撤权） | device-fixture-fixed |
| T-CALL-649 | R094；F011 | 撤票写失败、AtomicFile重读/坏格式 | 0端口；类型损坏拒绝且字节保留 | S23故障/持久 | P0 | 崩溃停止不重放 | 通过（合成） | device-fixture-fixed |
| T-CALL-650 | R094；F003/005/013 | S23前台点30秒单次模拟 | 原生回调一次，UI刷新UNKNOWN，人工核对未接 | 实际UI/闹钟 | P0 | 单次定时 | 通过（合成） | device-ui/foreground PNG/XML及timer-cases |
| T-CALL-651 | R094；F003/005/013 | 30秒安排后退桌面，回调后再进入 | 后台真实回调标记、持久一尝试，重开无重放 | 实际UI/闹钟 | P0 | 后台定时 | 通过（合成；未锁屏） | device-ui/workspace-timer-cases.json |
| T-CALL-652 | R094；F005/011 | 安排后暂停，等待35秒越过到时 | 无对应回调/新尝试 | 实际UI/等待观察 | P0 | 取消 | 通过（合成） | device-ui |
| T-CALL-653 | R094；F005/011 | 安排后force-stop，重开并等35秒 | 旧计划暂停/撤票，无补发 | 实际UI/强停重开 | P0 | 恢复 | 通过（合成） | device-ui/timer-final PNG/XML |
| T-CALL-654 | R094；F005/010/011/012 | 保存未来计划→手动早执行→目标资格改动/确认/刷新→改期/暂停 | NOT_DUE保留票据，资格撤票；无隐式刷新，改期换票、暂停清票 | 实际UI/票据读比 | P0 | 相邻动作回归 | 通过（合成） | device-controls/controls-cases.json |
| T-CALL-655 | R094；F003/005/011 | 安排后后台以本包UID SIGKILL本包PID，保留系统闹钟 | 旧PID消失、新PID原生回调一次；核对后无占用 | 实际模拟进程丢失 | P0 | 合法回调冷启动 | 通过（合成；非系统内存回收） | device-cold-retry/cold-cases.json；device-cold失败保留 |

以上证据简称相对evidence/android-workspace-timer-r094。device-ui的78驱动检查包含逐秒重复等待观察，不是78个独立产品场景；22/18/10/97与527不同层级不相加。核心回归loop-regression97及50目标200明确尝试约1963ms/跨进程恢复通过；宿主JS未改，未重跑旧673项。当前原生单次合成子范围通过，真实权限撤回、锁屏深度休眠、全天/多机型、企业认证/真实名单/手机适配及批量自动队列仍未验收，iPhone暂停。


## R095号码暂存与隔离（2026-10-16）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-656 | R095；F010 | 大陆11位格式及ASCII/NBSP/BOM/全角空格 | VALID并规范trim，掩码输出 | Java纯规则 | P0 | 宿主号码规范 | 通过（生成格式） | jvm；red保留 |
| T-CALL-657 | R095；F010/012 | 国家码/座机/分机/括号、SIM/DEMO/脚本/短串 | UNSUPPORTED或INVALID，不猜测转换 | Java负向 | P0 | 来源/号码边界 | 通过（生成格式） | jvm |
| T-CALL-658 | R095；F010 | 200/201行、行超128、来源空白、CRLF尾空行 | 结构错误拒绝；空行按INVALID行保存语义 | Java | P0 | 已有批次语义 | 通过 | jvm |
| T-CALL-659 | R095；F001/012 | LOCAL_PHONE_INTAKE与FORMAT_FIXTURE | 始终未认证/格式区DENY，不形成许可 | Java | P0 | 真实禁用 | 通过 | jvm |
| T-CALL-660 | R095；F010 | 固定seed600生成字符串，宿主/Java逐项状态和规范摘要 | 完全一致，失败仅报索引，不输出号码 | 跨运行时+宿主定向8项 | P0 | 复用现有规则 | 通过（无客户数据） | jvm、host-reference |
| T-CALL-661 | R095；F010/013 | 混合有效/重复/不支持/非法行并读取原值 | 两条合法行同目标、坏行无目标，原值私存/掩码 | S23隔离SQLite | P0 | 逐行输入/去重 | 通过（格式fixture） | snapshot-regression-green |
| T-CALL-662 | R095；F010/012 | 撤回→重导入→拒绝/重复拒绝/过时修订→重开 | 不覆盖声明/拒绝、CAS拒绝、ID及审计稳定 | S23集成 | P0 | 拒绝不绕过 | 通过（格式fixture） | snapshot-regression-green |
| T-CALL-663 | R095；F010/011 | 第二行写后/联系人更新后注入失败并重开 | 整批/更新回滚，表与事件无半写 | S23事务故障 | P0 | 持久原子性 | 通过（格式fixture） | snapshot-regression-green |
| T-CALL-664 | R095；F010/011 | 两连接并发导入同规范号码、不同声明 | 一目标、一IMPORTED一DUPLICATE，不覆盖赢家声明 | S23两连接竞争 | P0 | 防重 | 通过（格式fixture） | snapshot-regression-green |
| T-CALL-665 | R095；F011/012 | 元数据kind篡改/修订1.5浮点 | 拒绝，原行/错误类型保留，不重建 | S23负向恢复 | P0 | 严格类型/错库 | 通过（格式fixture） | snapshot-regression-green |
| T-CALL-666 | R095；F001/012 | 同号码不同资料槽、跨槽目标ID、边界检查 | slot/ID独立、跨槽NOT_FOUND，FMT永不授权 | S23隔离 | P0 | 本地不冒充租户/许可 | 通过（生产身份未验） | snapshot-regression-green |
| T-CALL-667 | R095；F010/013 | 真实区只读→显式格式区→混合导入/空来源 | 仅生成数据写格式区，逐行摘要/掩码，坏结构不写 | 实际UI | P0 | 手机输入入口 | 通过（生成数据） | device-ui-final；首次锁屏device-ui未开始 |
| T-CALL-668 | R095；F010/012 | 声明已有资格→边界→拒绝→改资格→重导入 | 已有资格仍DENY，拒绝不解除，ID/revision保留 | 实际UI | P0 | 声明与发送分离 | 通过（生成数据） | device-ui-final |
| T-CALL-669 | R095；F010/011/012 | force-stop→真实区→格式区，旧DEMO/合成库及业务摘要对比 | 不转真实目标；格式历史保留；实际区全部业务/slot及旧库保持 | 实际UI/跨进程 | P0 | 数据隔离/恢复 | 通过（生成数据） | device-ui-final；device-ui-unlocked字节假设失败保留 |
| T-CALL-670 | R095；F010/011 | 调用方List第一次读取合法、后续变成129字符 | 先不可变快照后校验，保存同一合法快照，不落未校验超长行 | S23确定复现 | P0 | 新接口具体Bug | 红→绿 | snapshot-regression-red/green |
| T-CALL-671 | R095；F011/013 | 只重开生成库，比较字节/完整业务摘要，再拒绝联系人 | 本例头27/95可变但业务摘要稳定；实际变更须改变摘要 | S23文件/语义对照 | P0 | 字节假设纠正及全字段隔离 | 通过（生成数据） | snapshot-regression-green及device-ui-final |

上述简写相对evidence/android-phone-intake-r095。66组551断言包含原527回归；600生成向量、宿主8、隔离30和UI19分层统计，不相加当功能数。R094定时/核心97与200容量本轮仅核验原生源码摘要复用，未重新运行；无真实客户数据/电话，未创建任务或正式contact-tasks库。真实认证、实际号码到任务/电话链路、批量/全天/多机型仍未验，iPhone暂停。


## 2026-10-18 R096本机显式草稿

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-672 | R096；F010/012 | 本地合格快照明确建草稿/重复 | 稳定ID、类型/slot/target/rev，不授权执行 | Java | P0 | 已定来源隔离 | 通过 | android-local-draft-r096/jvm |
| T-CALL-673 | R096；F011 | 资格修订后旧草稿/刷新/重复/错误CAS/恢复 | 旧快照失效，明确刷新才推进，同ID/幂等 | Java | P0 | R090复用 | 通过 | jvm |
| T-CALL-674 | R096；F012 | UNKNOWN/WITHDRAWN/refused | 创建及刷新拒绝 | Java | P0 | 资格/拒绝 | 通过 | jvm |
| T-CALL-675 | R096；F012 | 同target但不同资料区/slot | 无跨区复用或提升，格式仍DENY | Java | P0 | 来源隔离 | 通过 | jvm |
| T-CALL-676 | R096；F011/012 | 坏slot/target/null/版本/缺草稿 | 固定错误、无执行 | Java | P0 | 失败封闭 | 通过 | jvm |
| T-CALL-677 | R096；F010/011 | 显式创建/重复/重导入/更新/撤回/拒绝/重开 | 无隐式草稿或刷新；过时失效、声明审计保留 | SQLite隔离 | P0 | 持久化 | 通过（生成隔离库） | android-local-plan-r097/device-fixture |
| T-CALL-678 | R096；F011 | 写草稿及写审计后分别注入失败，重开 | 创建/刷新均原子回滚 | SQLite故障 | P0 | 恢复 | 通过（生成隔离库） | android-local-plan-r097/device-fixture |
| T-CALL-679 | R096；F011 | 两连接并发创建同目标 | 同ID、一草稿/一事件 | SQLite并发 | P0 | 防重 | 通过（生成隔离库） | android-local-plan-r097/device-fixture |
| T-CALL-680 | R096；F011 | 已知schema1升级/建表后失败 | 失败全回滚至1，重试保留旧slot/记录/版本，无隐式草稿 | SQLite迁移 | P0 | 已有成果 | 通过（生成隔离库） | android-local-plan-r097/device-fixture |
| T-CALL-681 | R096；F011/012 | 缺草稿审计、旧库浮点修订 | 拒绝打开/迁移，保留数据 | SQLite恢复 | P0 | 严格校验 | 通过（生成隔离库） | android-local-plan-r097/device-fixture |
| T-CALL-682 | R096；F010/011/012 | 手机格式区创建/重复/刷新/拒绝/重开 | 可操作/掩码，实际区业务不变、无电话 | S23 UI | P0 | 当前入口 | 通过（格式区） | android-local-draft-r096/device-ui-fresh |



## 2026-10-18 R097本地计划（不是电话运行器）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-683 | R097；F005/011 | 格式草稿/未来工作日/到时+30秒边界 | 复用计划版本、到期及过期元数据规则，不调用端口 | Java | P0 | 既有SalesPlanModel | 通过 | android-local-plan-r097/jvm |
| T-CALL-684 | R097；F011/012 | 旧计划/联系人/草稿、过去/18点、跨资料区Actor、撤回 | 固定拒绝/过期状态、无授权 | Java | P0 | 权限和版本 | 通过 | jvm |
| T-CALL-685 | R097；F011 | 暂停/重复暂停/旧版本 | 版本失效，暂停幂等、无隐式恢复 | Java | P0 | 已采纳暂停行为 | 通过 | jvm |
| T-CALL-686 | R097；F005/011/012 | 保存/过时/改期/资格变更/明确刷新/暂停/重开/拒绝 | 最新版本和合格快照才可计划，恢复须重新安排 | S23 SQLite | P0 | 持久调度元数据 | 通过（隔离生成库） | device-fixture |
| T-CALL-687 | R097；F011 | 计划行/事件后注入失败；恢复暂停失败 | 事务全回滚，不丢旧有效计划 | S23 SQLite故障 | P0 | 持久原子性 | 通过（隔离生成库） | device-fixture |
| T-CALL-688 | R097；F011 | 两连接同版本安排 | 一赢家、一STALE_PLAN，单事件 | S23 SQLite竞争 | P0 | 防重 | 通过（隔离生成库） | device-fixture |
| T-CALL-689 | R097；F005/011 | +30001ms读取/恢复；schema2带草稿升级故障/重试 | 过期不补发，失败保留2、成功保留slot/草稿且计划初始暂停 | S23 SQLite恢复/迁移 | P0 | 过时/迁移 | 通过（隔离生成库） | device-fixture |
| T-CALL-690 | R097；F011 | 删除计划审计再打开 | 拒绝并保留计划行 | S23 SQLite负向 | P0 | 审计完整性 | 通过（隔离生成库） | device-fixture |
| T-CALL-691 | R097；F005/011/012 | 手机明确计划/坏时间/资格失效/刷新/暂停/强停重开 | 可见状态、版本稳定、恢复暂停、实际区不变 | S23 UI | P0 | 操作入口 | 通过（格式区） | android-local-plan-r097/device-ui |



## R098受控尝试事务（无真实电话端口）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-692 | R098；F011/013 | 一次合格到期计划，记录端口先读取库 | 端口前已持久UNKNOWN/消费计划，回执独立 | SQLite | P0 | 先持久再提交 | 通过（记录端口） | android-pilot-attempt-r098/device |
| T-CALL-693 | R098；F012 | 许可资料区/slot/target/rev/SIM/安装/ticket | 格式拒绝、指纹稳定/变更区分 | Java | P0 | 许可绑定 | 通过 | jvm |
| T-CALL-694 | R098；F005/011 | 双时钟、boot、早到/30000/30001/时钟偏差 | 复用既有门槛，无重放许可 | Java | P0 | 时钟规则 | 通过 | jvm |
| T-CALL-695 | R098；F011 | 重复/不同许可、待核对新计划、本人忙线结果 | 不重复端口，未核对占用，不把回执当接通 | SQLite | P0 | 防重/占用 | 通过（记录端口） | device |
| T-CALL-696 | R098；F011/013 | 端口异常、UNKNOWN/明确关闭/重开 | 未知保持，明确关闭后仍不重放 | SQLite恢复 | P0 | 未知处理 | 通过（故障注入） | device |
| T-CALL-697 | R098；F011 | claim行/审计后失败、receipt写失败 | 前者全回滚，后者持久未知且不重发 | SQLite故障 | P0 | 原子性 | 通过 | device |
| T-CALL-698 | R098；F011 | 端口抛Error模拟控制流中断后重开、第二守卫撤销 | 待核对持久、0重放；不是OS杀进程实测 | SQLite故障 | P0 | 崩溃边界 | 通过（注入） | device |
| T-CALL-699 | R098；F011 | 两连接同许可竞争 | 一API确认/一重复，仅一记录请求 | SQLite竞争 | P0 | 唯一消费 | 通过 | device |
| T-CALL-700 | R098；F012 | 拒绝后执行、格式区输入 | 无尝试/端口 | SQLite | P0 | 资格/来源 | 通过 | device |
| T-CALL-701 | R098；F011 | schema3带计划升级失败/重试，删除CLAIMED审计 | 失败保留3、成功保留资料/草稿/计划；坏审计拒绝保留 | SQLite迁移 | P0 | 恢复 | 通过 | device |
| T-CALL-702 | R098；F005/011 | claim后时钟每次前进40秒 | claim锚定合法单个Clock样本，提交前过期阻止，UNKNOWN可恢复 | SQLite时钟替身 | P0 | 慢检查窗口 | 通过 | device |
| T-CALL-703 | R098；F007/013 | 201次明确新计划/记录提交/人工未接/重开 | 201独立尝试/回执、不设200硬上限，无实际呼出/接通推断 | S23记录型容量 | P0 | 日量口径 | 通过 | device |
| T-CALL-704 | R098；F012 | 检查实际APK权限和DEX共享类 | 只有精确闹钟权限，无电话API/旧真实组件，仅纯执行器 | APK静态检查 | P0 | 权限边界 | 通过 | android-pilot-attempt-r098/package |
| T-CALL-705 | R098；F010/011 | 用户库升级3到4、实际区/格式区只读界面 | 原资料/slot/草稿/计划保持，无新增尝试或电话 | S23 UI/业务摘要 | P0 | 已有成果 | 通过（旧区全业务保留） | upgrade-device |
| T-CALL-706 | R098；F011 | claim已提交后、最终端口前明确暂停 | 未知保留但不交给端口 | SQLite竞争点 | P0 | 暂停原子边界 | 红绿通过 | pause-red；device-final |


| T-CALL-707 | R098；F011 | schema4带未知尝试升级、撤销写后失败/恢复/重复 | 回滚保留4、UNKNOWN不关闭、撤销幂等 | S23 SQLite故障 | P0 | 暂停修复兼容 | 通过 | device-final |
| T-CALL-708 | R098/099；F005/011 | 单Clock取人工立即计划、待核对时再立即 | 到期锚定事务内样本，不保存忙碌/待核对请求 | S23记录替身 | P0 | 已采纳人工操作 | 通过 | device-final |

## R099独立受控APK：构建/准备通过，真实链路未运行

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-709 | R099；F002/011/012 | 新包首次安装/配置/停用回调 | 精确4权限、无网络/旧拨号组件；默认无目标/许可/尝试；20条严格配置与停用检查 | APK/原生/UI | P0 | 新包边界 | 通过（无拨号） | android-pilot-app-r099/build-codec-check、package、install |
| T-CALL-710 | R099；F008/012 | 用户授予本包三项系统设置；读取真实SIM并选已指定电销卡 | 实际权限与后台/闹钟满足，选卡摘要匹配旧验证绑定，无静默换卡 | S23只读 | P0 | 新包需独立授权 | 通过：本包权限/闹钟/后台实测与旧绑定摘要匹配；无拨号 | evidence/android-pilot-app-r099/postgrant/pilot-postgrant-check.json；46驱动检查整体 |
| T-CALL-711 | R099；F011/012 | 临时撤回READ_PHONE_STATE，恢复仅先前已授予权限 | 状态未知阻断、绑定保留，无许可/尝试自动恢复 | S23无电话恢复 | P0 | 真实撤权 | 通过：实际撤回READ_PHONE_STATE→idle未知→仅恢复原已授予权限，许可不恢复 | 同上；postgrant退出0 |
| T-CALL-712 | R099；F010/012 | 新包格式区导入→草稿→计划→重开 | 格式不进受控电话页，实际区仍空，计划恢复暂停 | S23 UI | P0 | 禁止提升测试数据 | 通过：生成格式数据1条/草稿1/重开计划version2暂停，受控入口禁用，实际区0/0 | 同上；实际点击/PNG/XML |
| T-CALL-713 | R099；F002/005/006/008/013 | 正式本地名单→人工一次→实际系统/受控接收端→人工核对→新计划 | 指定SIM，响铃/显号/双向语音由双方反馈；API与人工事实分存，未知不重放 | 真实受控E2E | P0 | 首个独立手机闭环 | 未运行：缺当次通话许可且当前周日 | android-controlled-pilot.md、manual-steps |
| T-CALL-714 | R099；F003/005/011 | 同链路前台/后台/锁屏单次原生定时及取消/过期/重复 | 30秒内检查提交，否则跳过；许可一次，无解锁确认/选卡提示须真实取证 | 真实受控E2E | P0 | 安卓自动原范围 | 未运行：设置已核验；缺当次许可/工作时段 | manual-steps |
| T-CALL-715 | R099；F008/011/012 | 新链路来电占用、SIM停用/变更、提交中撤权、崩溃与重开 | 新尝试阻断或未知待核对，无误判接通/自动补拨 | 真机异常/E2E | P0 | 平台边界 | 未运行；核心替身不替代这些事实 | manual-steps |



## R100批量本地草稿（当前无拨号子范围）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-716 | R100；F001/010 | 合格/未知/撤回/拒绝及已有有效/过时草稿混合 | 分类完整，只有合格且无草稿者可新建；不刷新既有 | Java纯规则 | P0 | 原资格/拒绝/草稿规则 | 通过 | preview-green、final-jvm；LocalDraftBatchCheck 21断言整体 |
| T-CALL-717 | R100；F011/012 | 调用方列表变化、反序和跨类型/slot/重复/孤立草稿 | 不可变快照；排序不改变摘要；非法范围拒绝 | Java纯规则 | P0 | 元数据隔离 | 通过 | 同上 |
| T-CALL-718 | R100；F011 | 预览后修订/草稿变化 | 旧快照比较失败 | Java纯规则 | P0 | 确认所见行为 | 通过 | 同上 |
| T-CALL-719 | R100；F001/010 | 空名单与201合格元数据 | 空预览，无200日硬上限 | Java纯规则 | P1 | 200为总尝试近似量 | 通过 | 同上；无号码/电话端口 |
| T-CALL-720 | R100；F012 | Preview列表尝试原地修改 | 预览只读，不含原始号码或许可 | Java纯规则 | P0 | 原隔离边界 | 通过 | 同上 |
| T-CALL-721 | R100；F010/011 | 混合名单/已有活动计划→预览→明确创建→重开 | 仅新草稿/CREATED审计，旧草稿/活动计划/尝试保持，预览与无新增操作不改摘要 | S23隔离SQLite | P0 | 本地批量小项 | 通过 | device-fixture；394断言整体（新增39） |
| T-CALL-722 | R100；F011/012 | 预览后撤回/新增联系人/创建草稿/跨槽/重复旧确认 | STALE_BATCH，整批不保存 | S23隔离SQLite | P0 | CAS/失效 | 通过 | 同上 |
| T-CALL-723 | R100；F011/013 | 第2草稿写入或第2审计后注入失败 | 全事务回滚，完整业务摘要不变，重开可读 | S23故障集成 | P0 | 持久化不变量 | 通过 | 同上 |
| T-CALL-724 | R100；F011 | 两连接同时确认同一快照 | 一赢家，一STALE_BATCH，无重复草稿/审计 | S23并发集成 | P0 | 防重 | 通过 | 同上 |
| T-CALL-725 | R100；F001/010 | 两批导入生成201目标→一次批量创建→重开 | 201草稿/201审计，0计划/尝试；不代表201电话 | S23生成容量 | P1 | 批量管理 | 通过 | 同上 |
| T-CALL-726 | R100；F012 | 仿真/试点构建、权限/DEX、11共用源摘要 | 保留隔离；无新权限/依赖；旧安卓兼容 | 构建/lint/包检查 | P0 | 新类共用 | 通过 | build-compatible/pilot-build/standalone-package/pilot-package；首轮API34编码lint红保留 |
| T-CALL-727 | R100；F001/010 | 新包FORMAT生成记录→预览取消→明确确认→再次预览 | 取消不写；一次创建；已存在时不提供确认；重开保留 | S23 UI | P0 | 最小用户闭环 | 通过：44驱动检查整体 | evidence/android-batch-draft-r100/device-ui/batch-draft-ui.json |
| T-CALL-728 | R100；F012 | 新包升级后比较实际区/旧包/设置/绑定/许可 | 实际0、许可停用、旧资料不变、设置/电销卡保留 | S23 UI/隔离 | P0 | 授权边界 | 通过：44驱动检查整体 | evidence/android-batch-draft-r100/device-ui/batch-draft-ui.json |


## R101本机尝试统计

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-729 | R101；F007/013 | 不同目标/多次授权、API确认、未填结果、UNKNOWN/关闭未知与人工未接/完成 | 每项独立，不推断实际呼出/接通，空集合两项仍null | Java纯逻辑 | P0 | 原统计分离 | 通过 | android-attempt-metrics-r101/green；21新增断言整体 |
| T-CALL-730 | R101；F007/013 | 同一目标201尝试；重复ID、非法/可变输入 | 1不同目标/201尝试，无200硬上限；非法计数拒绝 | Java纯逻辑 | P0 | 近似日量/重试区分 | 通过 | 同上 |
| T-CALL-731 | R101；F005/013 | 时间区间边界及北京时间跨日 | 起点含终点不含，明确授权日期cohort，与主机时区无关 | Java注入时间值 | P0 | 已采纳东八区 | 通过 | 同上 |
| T-CALL-732 | R100/101；F007/010/011/013 | S23既有记录型端口201尝试重开→汇总 | 1目标/201授权/201记录API/201人工未接，0pending；真实两项null；完整摘要不变，批量回归仍通过 | S23记录型集成 | P0 | 真实持久化来源 | 通过：398隔离断言整体 | evidence/android-attempt-metrics-r101/device-fixture |
| T-CALL-733 | R100/101；F012 | 新版本两APK构建/lint、包检查、12共享源 | 无新增权限/依赖、仿真仍无电话API，适配器来源不扩大 | 本地构建/静态 | P0 | 兼容隔离 | 通过 | build/pilot-package/standalone-package |
| T-CALL-734 | R100/101；F010/012/013 | 新试点升级→实际/格式只读摘要→批量预览取消→今日/累计统计 | 旧元数据/设置/绑定不变；空实际统计授权0、呼出/接通null，许可停用 | S23只读UI | P0 | 当前可运行路径 | 通过：43新版只读驱动检查整体 | evidence/android-attempt-metrics-r101/device-ui-fresh-launcher |
| T-CALL-735 | R099/101；F011/012 | 新版固定配置与停用回调诊断 | 20断言通过，默认无通话许可，不调电话端口 | S23无拨号诊断 | P0 | 新APK证据 | 通过：当前APK20配置断言 | 同上 |


## R102～105 本地企业批量闭环（新增，2026-10-18）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-736 | R102/F010 | 空集合/各种草稿资格/筛选/尾号/隐藏选择 | 不改快照、隐藏选择清空、无隐式替换 | Java纯规则22断言 | P0 | 筛选误操作 | 通过 | android-contact-view-r102/green |
| T-CALL-737 | R102/F010/011 | 联系人/草稿/计划/尝试同事务快照 | 摘要和视图同代 | SQLite/UI | P0 | 已有快照规则 | 通过 | enterprise-android-r105/sqlite-unlocked及android-contact-view-r102/device |
| T-CALL-738 | R102/F010 | S23格式区筛选空集再返回 | 不隐式选中、不写资料 | 只读原生UI | P0 | R102 | 通过 | android-contact-view-r102/device（29检查） |
| T-CALL-739 | R105/F003/011 | 时钟/boot/version/owner/30秒窗口 | 过时/漂移拒绝，无补拨 | Java纯票据9断言 | P0 | 既有时钟模型 | 通过 | enterprise-android-r105/jvm |
| T-CALL-740 | R105/F001/012 | APK界面/桥接/会话 | 仅可信资产；不向JS返回token；Keystore保护；退出删除 | 构建+S23 | P0 | 新认证入口 | 通过 | enterprise-android-r105/bundled-assets及device-exact-button |
| T-CALL-741 | R104/105/F003/011 | 前台第1条→手填结果→后台第2条 | 记录端口且至少30秒，未知前不进下一条 | S23原生闹钟E2E | P0 | D030 | 通过 | enterprise-android-r105/device-exact-button |
| T-CALL-742 | R104/105/F011 | 第2条未知时强停重开 | 停止且UNKNOWN保留，不重放 | S23 E2E | P0 | 崩溃恢复 | 通过 | enterprise-android-r105/device-exact-button与device-controls |
| T-CALL-743 | R105/F012 | 旧包/旧资料/实际企业/LIVE许可 | 不混区；新真实电话默认禁用 | S23数据/包 | P0 | 授权边界 | 通过 | enterprise-android-r105/final-audit |
| T-CALL-744 | R103/105/F001/012 | 管理员创建/停用销售、未定保留 | 权限分离、不默认删除 | S23 UI/服务 | P0 | 用户采纳 | 通过 | device-exact-button与下表T745～766 |
| T-CALL-745 | R103/F001/012 | 凭据/可信角色/会话持久化 | 按规范拒绝无效授权，状态来源不混淆 | Node内置测试/真实SQLite夹具 | P0 | D030与风险回归 | 通过 | evidence/enterprise-r103/device-spacing，测试名T745 |
| T-CALL-746 | R103/F010/012 | 两企业/两销售隔离与共享拒绝 | 按规范拒绝无效授权，状态来源不混淆 | Node内置测试/真实SQLite夹具 | P0 | D030与风险回归 | 通过 | evidence/enterprise-r103/device-spacing，测试名T746 |
| T-CALL-747 | R103/F010/012/013 | 原始输入加密/去重不复活资格 | 按规范拒绝无效授权，状态来源不混淆 | Node内置测试/真实SQLite夹具 | P0 | D030与风险回归 | 通过 | evidence/enterprise-r103/device-spacing，测试名T747 |
| T-CALL-748 | R104/F005/007/011 | 导入顺序/30秒/UNKNOWN/重复领取 | 按规范拒绝无效授权，状态来源不混淆 | Node内置测试/真实SQLite夹具 | P0 | D030与风险回归 | 通过 | evidence/enterprise-r103/device-spacing，测试名T748 |
| T-CALL-749 | R104/F005/011/013 | 忙线/暂停/未知/重启停止 | 按规范拒绝无效授权，状态来源不混淆 | Node内置测试/真实SQLite夹具 | P0 | D030与风险回归 | 通过 | evidence/enterprise-r103/device-spacing，测试名T749 |
| T-CALL-750 | R104/F003/008/011/012 | 资格撤回/设备错配/超30秒过期 | 按规范拒绝无效授权，状态来源不混淆 | Node内置测试/真实SQLite夹具 | P0 | D030与风险回归 | 通过 | evidence/enterprise-r103/device-spacing，测试名T750 |
| T-CALL-751 | R103/F001/012/013 | 会话撤销/保留未定 | 按规范拒绝无效授权，状态来源不混淆 | Node内置测试/真实SQLite夹具 | P0 | D030与风险回归 | 通过 | evidence/enterprise-r103/device-spacing，测试名T751 |
| T-CALL-752 | R104/F011 | 事务回滚/过期不复活 | 按规范拒绝无效授权，状态来源不混淆 | Node内置测试/真实SQLite夹具 | P0 | D030与风险回归 | 通过 | evidence/enterprise-r103/device-spacing，测试名T752 |
| T-CALL-753 | R104/F011/013 | 提交后回执丢失保留UNKNOWN | 按规范拒绝无效授权，状态来源不混淆 | Node内置测试/真实SQLite夹具 | P0 | D030与风险回归 | 通过 | evidence/enterprise-r103/device-spacing，测试名T753 |
| T-CALL-754 | R104/F011 | 双连接/单待核对 | 按规范拒绝无效授权，状态来源不混淆 | Node内置测试/真实SQLite夹具 | P0 | D030与风险回归 | 通过 | evidence/enterprise-r103/device-spacing，测试名T754 |
| T-CALL-755 | R103/F012 | 错密钥拒绝 | 按规范拒绝无效授权，状态来源不混淆 | Node内置测试/真实SQLite夹具 | P0 | D030与风险回归 | 通过 | evidence/enterprise-r103/device-spacing，测试名T755 |
| T-CALL-756 | R103/F012/013 | 明确保留清理保护墓碑/未知 | 按规范拒绝无效授权，状态来源不混淆 | Node内置测试/真实SQLite夹具 | P0 | D030与风险回归 | 通过 | evidence/enterprise-r103/device-spacing，测试名T756 |
| T-CALL-757 | R103/F001/012 | HTTP Host/Origin/路径/身份 | 按规范拒绝无效授权，状态来源不混淆 | Node内置测试/真实SQLite夹具 | P0 | D030与风险回归 | 通过 | evidence/enterprise-r103/device-spacing，测试名T757 |
| T-CALL-758 | R104/F007/013 | 201独立生成目标记录型容量 | 按规范拒绝无效授权，状态来源不混淆 | Node内置测试/真实SQLite夹具 | P0 | D030与风险回归 | 通过 | evidence/enterprise-r103/device-spacing，测试名T758 |
| T-CALL-759 | R105/F002/003/012 | 无独立LIVE许可拒绝真实领取 | 按规范拒绝无效授权，状态来源不混淆 | Node内置测试/真实SQLite夹具 | P0 | D030与风险回归 | 通过 | evidence/enterprise-r103/device-spacing，测试名T759 |
| T-CALL-760 | R103/F001/012 | 密码轮换/停启/重置撤销旧会话 | 按规范拒绝无效授权，状态来源不混淆 | Node内置测试/真实SQLite夹具 | P0 | D030与风险回归 | 通过 | evidence/enterprise-r103/device-spacing，测试名T760 |
| T-CALL-761 | R105/F002/003/012 | 有界许可MAC/范围 | 按规范拒绝无效授权，状态来源不混淆 | Node内置测试/真实SQLite夹具 | P0 | D030与风险回归 | 通过 | evidence/enterprise-r103/device-spacing，测试名T761 |
| T-CALL-762 | R105/F002/003/012 | 许可时效/字段/次数 | 按规范拒绝无效授权，状态来源不混淆 | Node内置测试/真实SQLite夹具 | P0 | D030与风险回归 | 通过 | evidence/enterprise-r103/device-spacing，测试名T762 |
| T-CALL-763 | R103/104/F010/011 | 分页/掩码搜索/目标版本CAS | 按规范拒绝无效授权，状态来源不混淆 | Node内置测试/真实SQLite夹具 | P0 | D030与风险回归 | 通过 | evidence/enterprise-r103/device-spacing，测试名T763 |
| T-CALL-764 | R104/F001/011/012 | 同手机换销售阻止UNKNOWN绕过 | 按规范拒绝无效授权，状态来源不混淆 | Node内置测试/真实SQLite夹具 | P0 | D030与风险回归 | 通过 | evidence/enterprise-r103/device-spacing，测试名T764 |
| T-CALL-765 | R103/104/F011/012/013 | schema1升级保持会话/UNKNOWN/错密钥不写 | 按规范拒绝无效授权，状态来源不混淆 | Node内置测试/真实SQLite夹具 | P0 | D030与风险回归 | 通过 | evidence/enterprise-r103/device-spacing，测试名T765 |
| T-CALL-766 | R104/F005/007/011 | 同手机换销售仍至少30秒 | 按规范拒绝无效授权，状态来源不混淆 | Node内置测试/真实SQLite夹具 | P0 | D030与风险回归 | 通过 | evidence/enterprise-r103/device-spacing，测试名T766 |
| T-CALL-767 | R105/F011/012 | 手机安排后暂停、强停到点前、真实撤CALL_PHONE再恢复 | 不新增授权，持久停用，恢复不重排 | S23记录型控制 | P0 | 用户停止/恢复不变量 | 通过：13检查 | enterprise-android-r105/device-controls |
| T-CALL-768 | R103/104/F001/010/012 | 管理员/销售界面、导入、搜索、快照安排、结果、保留配置 | 自己数据/明确选择、状态与记录分离 | Chrome真实界面夹具 | P0 | 业务闭环 | 通过：17检查 | enterprise-r103/browser |
| T-CALL-769 | R102～105/F001/003/011/012 | 最终安装/源码与包/许可/权限/服务/私有数据泄露扫描 | 当前两包摘要一致、LIVE0/0，无活动/未知，默认禁真实外呼，原权限恢复 | 只读综合审计 | P0 | 收口 | 通过 | enterprise-android-r105/final-audit |


## R105许可准备与次数恢复增量（2026-10-18）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-770 | R105/F002/003/012 | 有效隔离许可、目标不在status前200条 | 查找目标并两侧同份签名，永不claim/start/电话 | Node/注入API与模拟设备；无真实部署 | P0 | 原许可边界 | 通过 | enterprise-permit-r105/regression-source-tracked |
| T-CALL-771 | R105/F005/012 | 周日/过期同意/缺同意/临近18点 | 任何副作用前拒绝 | Node/注入API与模拟设备；无真实部署 | P0 | 原许可边界 | 通过 | enterprise-permit-r105/regression-source-tracked |
| T-CALL-772 | R105/F011/012 | 手机激活或服务发布失败 | 清双方本次许可，暂停本次队列 | Node/注入API与模拟设备；无真实部署 | P0 | 原许可边界 | 通过 | enterprise-permit-r105/regression-source-tracked |
| T-CALL-773 | R105/F011/013 | 失败清理断开 | 明确CLEANUP_REQUIRED，不成功/不重试 | Node/注入API与模拟设备；无真实部署 | P0 | 原许可边界 | 通过 | enterprise-permit-r105/regression-source-tracked |
| T-CALL-774 | R105/F001/008/012 | 已有许可/错误角色/无手机会话/错APK | 不导入/不发布 | Node/注入API与模拟设备；无真实部署 | P0 | 原许可边界 | 通过 | enterprise-permit-r105/regression-source-tracked |
| T-CALL-775 | R104/105/F007/011/013 | 真实SQLite授权回执丢失，重启，2次预算 | UNKNOWN和次数持久，第3次拒绝 | Node/真实SQLite与签名；无电话适配 | P0 | 原许可边界 | 通过 | enterprise-permit-r105/regression-source-tracked |
| T-CALL-776 | R105/F002/012 | 签名许可次数被篡改 | 零新授权 | Node/真实SQLite与签名；无电话适配 | P0 | 原许可边界 | 通过 | enterprise-permit-r105/regression-source-tracked |
| T-CALL-777 | R105/F011 | 两个准备并发 | 只一个队列，失败方不释放他方锁 | Node/注入API与模拟设备；无真实部署 | P0 | 原许可边界 | 通过 | enterprise-permit-r105/regression-source-tracked |
| T-CALL-778 | R105/F011/012 | 准备失败后他处替代队列 | 不暂停替代队列 | Node/注入API与模拟设备；无真实部署 | P0 | 原许可边界 | 通过 | enterprise-permit-r105/regression-source-tracked |
| T-CALL-779 | R105/F001/012 | 准备中身份变化 | 发布/计划前拒绝 | Node/注入API与模拟设备；无真实部署 | P0 | 原许可边界 | 通过 | enterprise-permit-r105/regression-source-tracked |
| T-CALL-780 | R105/F012 | 真实CLI缺明确参数 | 退出1、无设备/秘密输出 | 真实CLI子进程拒绝；无设备写入 | P0 | 原许可边界 | 通过 | enterprise-permit-r105/regression-source-tracked |
| T-CALL-781 | R105/F005/012 | 真实CLI无有效同意请求 | 退出1，副作用前拒绝 | 真实CLI子进程拒绝；无设备写入 | P0 | 原许可边界 | 通过 | enterprise-permit-r105/regression-source-tracked |
| T-CALL-782 | R105/F011/013 | 计划创建成功但回执丢失替身 | 标回执不确定，不重试/不发布 | Node/注入API与模拟设备；无真实部署 | P0 | 原许可边界 | 通过 | enterprise-permit-r105/regression-source-tracked |
| T-CALL-783 | R105/F011/012 | 发布后清理锁失败 | 清本次许可、暂停并显式待核对 | Node/注入API与模拟设备；无真实部署 | P0 | 原许可边界 | 通过 | enterprise-permit-r105/regression-source-tracked |


## R105许可关闭（2026-10-18增量）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-784 | R105/F002/003/008/011/012/013 | 正常关闭，已有UNKNOWN/已用次数 | 先服务端撤销、匹配手机停用/当前队列暂停，记录和次数不变 | 注入端口 | P0 | 许可收尾与安全恢复 | 通过 | enterprise-close-r105/scoped-regression |
| T-CALL-785 | R105/F002/003/008/011/012/013 | 手机离线 | 服务先撤/队列仍暂停，手机项未核实 | 注入端口 | P0 | 许可收尾与安全恢复 | 通过 | enterprise-close-r105/scoped-regression |
| T-CALL-786 | R105/F002/003/008/011/012/013 | 服务许可ID不同 | 不改他人许可/手机/队列 | 注入端口 | P0 | 许可收尾与安全恢复 | 通过 | enterprise-close-r105/scoped-regression |
| T-CALL-787 | R105/F002/003/008/011/012/013 | 手机另一条活动队列，服务队列已替代 | 不强停手机、不暂停替代队列 | 注入端口 | P0 | 许可收尾与安全恢复 | 通过 | enterprise-close-r105/scoped-regression |
| T-CALL-788 | R105/F002/003/008/011/012/013 | 服务不可用 | 仍撤文件/手机，队列项未核实 | 注入端口 | P0 | 许可收尾与安全恢复 | 通过 | enterprise-close-r105/scoped-regression |
| T-CALL-789 | R105/F002/003/008/011/012/013 | 重复关闭 | ALREADY_ABSENT，无额外停止/写结果/改次数 | 注入端口 | P0 | 许可收尾与安全恢复 | 通过 | enterprise-close-r105/scoped-regression |
| T-CALL-790 | R105/F002/003/008/011/012/013 | 另一操作持锁 | 不释放别人的锁/不变更数据 | 注入端口 | P0 | 许可收尾与安全恢复 | 通过 | enterprise-close-r105/scoped-regression |
| T-CALL-791 | R105/F002/003/008/011/012/013 | 准备与关闭共用真实文件锁 | 互斥，失败方不解锁 | 真实隔离文件系统 | P0 | 许可收尾与安全恢复 | 通过 | enterprise-close-r105/scoped-regression |
| T-CALL-792 | R105/F002/003/008/011/012/013 | 同/异ID删除，旁边有密钥/额度/历史 | 只删同ID许可，保护安全记录 | 真实隔离文件系统 | P0 | 许可收尾与安全恢复 | 通过 | enterprise-close-r105/scoped-regression |
| T-CALL-793 | R105/F002/003/008/011/012/013 | 锁nonce已被更改 | 不猜测/静默删除新锁 | 真实隔离文件系统 | P0 | 许可收尾与安全恢复 | 通过 | enterprise-close-r105/scoped-regression |
| T-CALL-794 | R105/F002/003/008/011/012/013 | 真实CLI缺ID/模糊ID/force参数 | 写入前退出1拒绝 | 实际CLI拒绝 | P0 | 许可收尾与安全恢复 | 通过 | enterprise-close-r105/scoped-regression |
| T-CALL-795 | R105/F002/003/008/011/012/013 | S23无许可，运行真实关闭CLI | ALREADY_ABSENT；完整业务/手机文件与绑定保持 | S23实际无许可CLI | P0 | 许可收尾与安全恢复 | 通过 | enterprise-close-r105/scoped-device-noop |
| T-CALL-796 | R105/F002/003/008/011/012/013 | 别的准备临时文件 | 本操作解锁不删除；只清自身创建文件 | 真实隔离文件系统 | P0 | 许可收尾与安全恢复 | 通过 | enterprise-close-r105/scoped-regression |
| T-CALL-797 | R105/F002/003/008/011/012/013 | 服务文件撤销失败 | 仍停用匹配手机/队列，PARTIALLY_REVOKED | 注入端口；先红后绿 | P0 | 许可收尾与安全恢复 | 通过 | enterprise-close-r105/scoped-regression |
| T-CALL-798 | R105/F002/003/008/011/012/013 | 真实SQLite已有UNKNOWN/次数，关闭后重启 | UNKNOWN与已用额度保留，第3次仍拒绝 | 真实SQLite/签名，无OS电话适配 | P0 | 许可收尾与安全恢复 | 通过 | enterprise-close-r105/scoped-regression |
| T-CALL-799 | R105/F002/003/008/011/012/013 | 锁所有权变更后发布/删除 | 拒绝变更许可 | 真实隔离文件系统 | P0 | 许可收尾与安全恢复 | 通过 | enterprise-close-r105/scoped-regression |
| T-CALL-800 | R105/F002/003/008/011/012/013 | 连接了不同手机 | 不误报目标手机已撤销，仍撤服务/匹配队列 | 注入端口；先红后绿 | P0 | 许可收尾与安全恢复 | 通过 | enterprise-close-r105/scoped-regression |


| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-801 | R106/F003 | 凌晨默认/false/当前同意true | 默认拒绝，明确例外且双同意才可准备 | Node隔离 | P0 | D031 | 通过，红转绿 | enterprise-afterhours-r106/enterprise-quota-final |
| T-CALL-802 | R106/F008/012 | 篡改flag/request/目标或过期 | 签名和精确范围拒绝 | 真实HMAC | P0 | D031 | 通过，红转绿 | 同上 |
| T-CALL-803 | R106/F003/011/012 | SQLite夜间准备/UNKNOWN/跨队列第3次/撤销 | 仅签名匹配可准备；未知和额度不绕过，撤销即拒绝 | SQLite集成，无电话 | P0 | D031与不变量 | 通过，红转绿 | 同上 |
| T-CALL-804 | R106/F003/012 | 例外双端预发布/返回错误队列 | 不自动启动，错误范围清理许可 | 编排隔离 | P0 | 受控部署恢复 | 通过 | 同上 |
| T-CALL-805 | R106/F003/012 | 夜间票据/截止/墙钟漂移/boot/版本 | 明确例外仅放宽时段，其余保护不变 | Java，新增5断言，原9保留 | P0 | D031与时钟不变量 | 通过 | enterprise-afterhours-r106/jvm-final |
| T-CALL-806 | R106/F002/003/008 | 正式名单/绑定电销卡/单次定时 | 指定号码电话界面+系统呼出状态至少8秒 | S23实机，1次 | P0 | 用户8秒判据 | 本次通过，8239ms；接收端证据不足 | enterprise-afterhours-r106/call-one |
| T-CALL-807 | R105/106/F012 | 生效许可实拨后撤销 | 双端许可撤销、队列停止、额度与待核对保留 | S23+真实服务 | P0 | 许可关闭 | 通过 | enterprise-afterhours-r106/close-after-call |
| T-CALL-808 | R105/106/F011/012 | 用户反馈未接/手机空闲 | 只归档匹配尝试，不自动重拨；0待核对/退出 | S23真实界面 | P0 | 用户未接反馈 | 通过，8项检查 | enterprise-afterhours-r106/result-archive |


| T-CALL-809 | R105/106/F003/011/012 | 新版修复后S23两条生成队列/后台/冷开 | 结果后下一条，至少30秒，UNKNOWN不重放 | S23记录型E2E，无电话 | P0 | 新版回归 | 通过37检查，30213ms；原失败保留 | enterprise-afterhours-r106/fixed-recording-device |
| T-CALL-810 | R105/106/F003/011/012 | 新版暂停/强停/实际CALL_PHONE撤回并恢复 | 无新增授权，不重启，原权限恢复 | S23真实控制，无电话 | P0 | 新版回归 | 通过13检查 | enterprise-afterhours-r106/fixed-device-controls |
| T-CALL-811 | R105/106/F003/011/012 | 时钟每次读取前进1ms，上一授权30秒已满 | 允许到期下一条，不产生虚假NOT_DUE；未满仍拒绝 | 确定时钟SQLite回归 | P0 | 真机发现调度Bug | 先红后绿，企业57整体通过 | enterprise-afterhours-r106/ticking-clock-red、service-fixed-suite |

T806追加：第二通真实后台/锁屏呼出8495ms，电话界面匹配接收端、系统状态与最终空闲通过；脚本末尾锁屏CDP刷新超时保留为自动化失败，后续解锁8项人工结果归档补足。用户核对两通均未接、有未接记录且显示尾9486；接收端证据来源USER_REPLY。T807第二次生效许可双端撤销REVOKED，T808第二次用户未接归档通过，累计额度2，当前无许可/会话/待核对。


| T-CALL-812 | R105/106/F003/011/012 | 真实来电RINGING，REHEARSAL生成任务，双端无许可 | DEVICE_BUSY、无授权新增、队列停止、闹钟不启动 | S23真实来电+记录型任务 | P0 | 必要平台证据 | 通过9检查；PREPARE12仅准备，不记验收 | enterprise-busy-device-r106/verify |
| T-CALL-813 | R105/F003/008/012 | 双受控端/重复/少额度/混字段/时段例外 | 仅明确两端当前同意且足额、普通时段可准备 | Node隔离 | P0 | 双目标实拨验收前提 | 红转绿 | enterprise-paired-validation-r106/regression |
| T-CALL-814 | R105/F003/008/012 | 两目标revision/第二端撤回 | 同一签名精确绑定两目标；一端不合格不发布 | 编排隔离，无电话 | P0 | 双目标实拨验收前提 | 红转绿，企业59整体通过 | 同上 |
| T-CALL-815 | R105/F002/003/007/011/012 | 正常时段同一真实队列，尾5235未接归档→尾7214 | 自动下一条，至少30秒，最后FINISHED并撤销 | S23实拨两不同受控端 | P0 | 已授权新一轮最多2通 | 通过，8165/8348ms，间隔79293ms；用户均未接 | enterprise-paired-validation-r106/acceptance.json |


| T-CALL-816 | R105/106/F003/011/012 | 生成演练未来闹钟READY→真实手机重启→解锁冷开 | 系统旧闹钟清除、boot变化、旧队列停止、无新增授权或自动恢复 | S23真实重启+REHEARSAL，无电话 | P0 | 必要恢复证据 | 准备13检查通过；真实重启/VERIFY待运行 | enterprise-reboot-device-r106/prepare |

2026-10-19用户暂停停卡/换卡验证：保持未运行/未验收，不再纳入当前执行队列；原功能要求不变。


| T-CALL-816 | R105/106/F003/011/012 | 未来演练闹钟READY→真实重启→解锁冷开 | boot变化、系统旧闹钟清除、原队列STOPPED、授权不增 | S23真实重启，REHEARSAL无电话 | P0 | 重启恢复 | 通过13检查；299→300、2→2 | enterprise-reboot-device-r106/verify |
| T-CALL-817 | R105/106/F003/007/011/012 | 20条生成目标，前台真实时钟节拍、合成未接结果 | 仅RECORDING、至少30秒、20完成且无待核对、时钟还原 | S23前台有人操作连续演练，0电话 | P1 | 有限连续运行证据 | 通过；约9.73分钟，最短30.053秒 | enterprise-long-device-r106/acceptance.json |

T817不覆盖后台Doze/充放电全天/真实200通；保亮由本应用非交互标题触摸模拟操作完成，不更改系统全局设置。

| T-CALL-818 | R105/106/F002/008/012 | 正式名单单次任务→接收端接听→双方讲话→用户挂断并核对结果 | 指定销售SIM/显号；双向语音由用户确认；结果单独归档，无自动重拨 | S23真实受控通话+人工报告 | P0 | 当前企业路径讲话缺口 | 仅准备：语法检查及7项就绪通过；实际通话未运行 | enterprise-speech-r106/preparation.json |

T-CALL-818进展（2026-10-20）：正式单条定时API接受、呼出状态/指定号码界面已观察，单次许可已撤销；接通/语音/显号与挂断结果等待用户核对，未记通过。证据enterprise-speech-r106/20261020-call、20261020-close。

| T-CALL-818 | R105/106/F002/003/008/012 | 当前正式企业单条定时任务→电销卡呼出→接收端接听讲话→挂断→结果归档 | 用户确认接通/双向清晰/显号9486，单次额度耗尽，0待核对，无许可/会话/闹钟 | S23实际受控通话、用户反馈、UI归档13检查 | P0 | 本次明确授权及用户结果 | 受控单通通过；讲话时长未计量 | enterprise-speech-r106/20261020-acceptance.json |

| T-CALL-819 | R107/F003/011/012 | S23连接助手首次运行→重复运行→既有LIVE只登录绑定检查 | 电脑/USB就绪、安装摘要相符；0新增电话/计划/许可，原5尝试/0待核对保持，闹钟停用 | PowerShell真实S23连接检查及7项既有只登录绑定检查 | P1 | 最短试用路径 | 通过；两入口执行退出0，LIVE准备7检查退出0；不是实拨或全天证据 | s23-daily-r107/prepare、repeat、live-ready |

| T-CALL-820 | R107/F003/011/012 | 两个既有目标有界许可；用户亲自手机填写第一结果→自动下一条→第二结果→撤销/退出 | 助手不代写结果；至少30秒，最终FINISHED/0待核对/许可双端撤销/账号退出 | 正常时段S23实际2通+只读监测与6项收尾检查 | P0 | 首轮日常操作试用 | 有限通过；140070ms，COMPLETED/NO_ANSWER；仍工程协助准备许可和启动 | s23-daily-r107/acceptance.json |


2026-10-20 R108当前增量（0.6/code5；以下通过均不代表真实通话）：

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-821 | R108/F003/008/011/012 | explicit LIVE销售确认当前版本/目标/设备 | 当日18:00签名范围，重复确认相同许可/无尝试 | 服务单元/真实SQLite | P0 | D033 | 通过 | operator-batch-r108/service-green-fixed、final-regression |
| T-CALL-822 | R108/F003/008/011/012 | 首条UNKNOWN→人工结果→次条；重复触发 | 唯一提交/30秒/未知不重放且保留消耗 | SQLite集成 | P0 | R108不变量 | 通过 | operator-batch-r108/final-regression |
| T-CALL-823 | R108/F003/008/011/012 | 暂停/改期/新计划/退出/服务恢复 | 旧许可失效，不自动续拨/重置 | SQLite恢复集成 | P0 | D033 | 通过 | operator-batch-r108/final-regression |
| T-CALL-824 | R108/F003/008/011/012 | 资格撤回/拒绝/18点/新会话/换设备 | 不授权新尝试 | SQLite集成 | P0 | 资格及范围 | 通过；含拒绝增强 | operator-batch-r108/contact-regression |
| T-CALL-825 | R108/F003/008/011/012 | 管理员/演练/旧版本/外来设备/停用销售 | 拒绝不合格确认或身份，无越权 | 权限集成 | P0 | 企业隔离 | 通过 | operator-batch-r108/final-regression |
| T-CALL-826 | R108/F003/008/011/012 | 201生成目标在同一批完成 | 每目标一次，201不被200硬上限拦截 | 容量仿真、无电话适配 | P1 | D033/原日尝试量解释 | 通过；不是生产吞吐 | operator-batch-r108/final-regression |
| T-CALL-827 | R108/F003/008/011/012 | 确认/claim提交后丢回执与重开 | 确认幂等；claim UNKNOWN和额度持久，不重放 | 故障注入/SQLite恢复 | P0 | 恢复不变量 | 通过；修复夹具事务注入位置后实测 | operator-batch-r108/service-green-fixed、final-regression |
| T-CALL-828 | R108/F003/008/011/012 | 日末/周末/数量/跨日边界 | Java规则与签名窗口一致 | 纯Java，11断言 | P0 | R108 | 通过 | operator-batch-r108/java |
| T-CALL-829 | R108/F003/008/011/012 | HTTP并发确认、暂停与claim竞争 | 同一许可，无双授权，未知保留；旧版本暂停须刷新 | 本地HTTP+SQLite集成 | P0 | 并发防重 | 通过 | operator-batch-r108/http-race、final-regression |
| T-CALL-830 | R108/F003/008/011/012 | 隔离生成LIVE；用户0拨号权限撤销；原生弹窗/清空/暂停/冷开/退出 | 仅明确弹窗安装，取消不授予；失效清双端；缺权限无尝试 | S23无电话E2E、42检查 | P0 | 当前核心链路 | 通过；全程0尝试/0电话 | operator-batch-r108/native |
| T-CALL-831 | R108/F003/008/011/012 | 计划过时或次日 | 拒绝确认，不自动移动计划时间 | 服务集成 | P0 | 当日窗口与不补拨 | 通过 | operator-batch-r108/final-regression |
| T-CALL-832 | R108/F003/008/011/012 | 复制operator许可到旧工程文件入口 | 拒绝，不能绕过持久撤销 | 文件/签名隔离 | P0 | 新旧用途隔离 | 通过 | operator-batch-r108/final-regression |
| T-CALL-833 | R108/F003/008/011/012 | 已确认后单独取消勾选一联系人 | 立即暂停、双端许可失效，选中集合正确重绘 | S23原生+可信Web UI失败回归 | P0 | D033换名单须重确认 | 红→修复后42检查绿，原失败保留 | operator-batch-r108/individual-red、individual-green、selection-build、selection-browser |

新版实际自主确认→SIM呼出→讲话→自动下一条：未运行/证据不足，下一步2；旧0.5实际通话不迁移为0.6已通过。


R108最终快照：T821～833按上述实际方法通过；T833修复后individual-green42/selection-browser17/selection-package与构建通过；最终recording-final37采用最终APK，前后台2记录请求、间隔30154ms、冷开未知保留。final-audit验证原服务/权限/12表不变及7历史尝试/0待核对。0.6 schema3真实通话用例仍未运行，不能将本矩阵软件通过记作真实拨号通过。

| T-CALL-834 | R108/F003/011/012 | 实际北京时间20点后，已有两受控目标的未启动未来计划，原生请求确认 | OUTSIDE_WINDOW，未发许可/未设置闹钟；测试计划暂停、历史7尝试保持、0待核对 | S23当前真实时段无拨号检查 | P0 | D033/生产工作窗口 | 通过8检查；0电话 | operator-batch-r108/evening-guard |

| T-CALL-835 | R108/F003/008/011/012 | 用户手机原生确认schema3，两受控目标，各一次；用户填结果→自动下一条→退出 | 恰2次、>=30秒、来源/目标UI匹配、自然FINISHED/0待核对/许可失效/退出 | S23两通真实受控+用户结果+7项收尾检查 | P0 | 新版自主许可闭环 | 有限通过；音质/显号等待反馈，全天未验 | operator-batch-r108/20261021-acceptance.json |


2026-10-21当前覆盖更新，优先于此前“新版未运行”快照：T835受控schema3实拨/用户亲自填写/自动下一条通过，第一通语音及两端显号由用户确认；全天仍未运行。

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-836 | R-CALL-109 / F003/011/012 | 生成REHEARSAL待核对；长页顶部点固定入口；清空待核对/退出 | 入口可见并定位当前卡片，不写结果/授权，完成或退出隐藏 | 浏览器21检查＋S23生成数据41检查；无电话E2E | P0 | 用户重复找不到结果卡片 | 红exit1→绿exit0；通过 | result-navigation-r109/{red,green,device,final-audit} |


2026-10-21 D034/R110新增（均未拨真实电话）：

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-837 | R110/F003/008 | 私有/公网/通配/畸形IPv4 | 只接受指定私有IPv4 | Node单元 | P0 | 局域网范围 | 通过 | wifi-r110/regression-final |
| T-CALL-838 | R110/F003/008 | TLS配对、Unicode伪凭据、来源/路径/超限正文 | 拒绝且不转发，凭据不传原服务 | HTTPS集成 | P0 | 连接边界 | 通过 | wifi-r110/gateway-final及regression-final |
| T-CALL-839 | R110/F011 | 本机企业服务不可达 | 返回不可用、不重试 | HTTPS集成 | P0 | 断线停止 | 通过 | wifi-r110/regression-final |
| T-CALL-840 | R110/F008 | S23原生输入配对码并确认 | 配对保存、清旧身份/批次、无票据 | 原生UI9检查 | P0 | D034 | 通过 | wifi-r110/pair-fixed |
| T-CALL-841 | R110/F003/008 | 移除USB8790转接后正式登录/绑定 | Wi-Fi TLS有效，9历史尝试/0待核对保持 | S23无电话9检查 | P0 | 无USB使用 | 通过 | wifi-r110/live-ready |
| T-CALL-842 | R110/F003/011/012 | 生成REHEARSAL完整定时/结果/下一条/冷开 | 2记录请求≥30秒，未知保留，0真实电话 | S23 Wi-Fi43检查 | P0 | 原闭环迁移 | 通过 | wifi-r110/device |
| T-CALL-843 | R110/F011/012 | 未来演练票据到期前关网关，再恢复 | 停用票据、0claim、无自动重试 | S23故障注入 | P0 | 断线恢复 | 通过 | wifi-r110/native-final，18检查的一部分 |
| T-CALL-844 | R110/F008 | 错证书摘要后登录，再恢复正确配对 | 错配拒绝且无身份，恢复后0尝试 | S23 TLS失败回归 | P0 | 证书认证 | 通过 | wifi-r110/native-final |
| T-CALL-845 | R110/F002/003/008/012 | 拔线后新版真实SIM→受控接收端→讲话/结果 | 实际呼出、显号/语音及收尾分别取证 | 手动真实E2E | P0 | 新运输链路 | 未运行 | 需新有界授权，旧USB证据不替代 |


| T-CALL-846 | R111/F003/011/012 | 生成LIVE空队列，移动长页点击确认，记录型桥无电话适配 | 缺计划错误在视口内且明确先安排，0授权/0设备调用 | 浏览器失败回归，23检查 | P0 | 用户点击后无提示 | 浏览器红→绿通过；S23新版未安装/未运行 | start-feedback-r111/{business-red,business-green,build,package} |


T846补实际S23：0.9/code8安装后严格只读11检查通过（status外请求被测试禁止，手机适配被测试禁止，测试期间0写入/0设备调用、授权仍9、提示在视口内）。结束已恢复原函数。证据start-feedback-r111/device，不以原旧版当次提示已观察作为结论。


## R112界面收敛实际结果（2026-10-21）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-847 | R112/F003/011 | 空选择/选中/服务计划/原生票据/待核对/断线 | 一个正确下一动作，RUNNING不冒充手机启动 | 纯状态单元 | P0 | D035 | 通过 | flow、regression |
| T-CALL-848 | R112/F012 | 核对期间资格/版本/选择变化 | 拒绝旧快照，完整名单仍经服务复核 | 单元+浏览器 | P0 | 原资格/版本不变量 | 通过 | flow、browser-final |
| T-CALL-849 | R112/F003 | 北京工作日9/18及周末边界 | UI解释不扩大服务时段 | 单元 | P0 | 既定时段 | 通过 | flow |
| T-CALL-850 | R112/F003 | 名单→核对→取消/再次确认/快速双击 | 预览取消0计划，确认单次创建/启动 | 浏览器替身+S23演练 | P0 | D035 | 通过（无真实外呼） | browser-final、device-final |
| T-CALL-851 | R112/F003/011 | 原生确认取消/启动失败 | 已建计划停止，清本批，无自动重试 | 浏览器原生替身 | P0 | 失败恢复 | 通过（替身范围） | browser-final |
| T-CALL-852 | R112/F003/010 | 200条生成名单及历史 | 拨号控制独立可达、维护折叠、历史分区 | 浏览器200条+S23布局 | P1 | 长页问题 | 通过 | browser-final、device-final |
| T-CALL-853 | R112/F011/013 | 演练记录→结果→下一条 | 待核对优先、中文历史、至少30秒 | S23 Wi-Fi REHEARSAL | P0 | 原闭环 | 通过（记录型） | device-final，30348ms |
| T-CALL-854 | R112/F011 | 演练后台/强停冷开 | UNKNOWN保留、旧计划不自动恢复 | S23 REHEARSAL | P0 | 原恢复不变量 | 通过 | device-final |
| T-CALL-855 | R112/F008 | 手机报告占用，点击主动作 | 显示设置/占用原因、不创建计划或外呼 | S23实际占用保护 | P0 | 原占用规则 | 通过（阻断保护） | device-scope；空闲后device-final完整通过 |
| T-CALL-856 | R112/F003/011 | 本人连续两轮无助手独立操作 | 选择至结果/结束，准备≤60秒 | 手动可用性 | P1 | ux-review项目目标 | 未运行 | manual-steps，不能用自动化代替 |
| T-CALL-857 | R112/F011 | 浏览器断线→恢复 | 可见刷新，不自动恢复计划 | 浏览器故障注入 | P0 | 网络失败保护 | 通过（替身范围） | browser-final |
| T-CALL-858 | R112/F012/013 | 隔离演练后恢复原服务/账号 | 13表不变、9历史/0待核对、无许可 | SQLite快照+S23只读 | P0 | 数据保留 | 通过 | final-audit-idle、live-ready |

T845真实无线通话仍未运行。R111/T846原按钮提示历史回归保留23检查通过；日常主流程以R112引导为准，不能照旧按钮文案操作。


## R113三列名单（2026-10-22）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-859 | R113/F010 | Excel TSV/带BOM及重排表头CSV/引号/缺列/201行/旧格式 | 正确解析，错误停止，不误解字段 | 单元 | P0 | 用户三列需求 | 通过 | contact-profile-r113/regression-final |
| T-CALL-860 | R113/F010/012 | 三列导入、同号新资料、重开及存储字节检查 | 加密持久、搜索可用、重复不覆盖 | SQLite集成 | P0 | 原隐私/去重 | 通过 | 同上 |
| T-CALL-861 | R113/F010/012 | 无效资料/旧单列/UNKNOWN资格 | 无效整批拒绝，旧格式兼容，不授权 | 集成 | P0 | 资格和输入不变量 | 通过 | 同上 |
| T-CALL-862 | R113/F013 | 记录型claim→status结果关联 | 返回所属联系人公司姓氏，REHEARSAL无可拨号码 | 集成 | P0 | 讲话/结果识别 | 通过（仿真） | 同上 |
| T-CALL-863 | R113/F011 | schema3旧库→4，schema1迁移回归 | 原联系人/会话/UNKNOWN保持 | SQLite迁移 | P0 | 数据兼容 | 通过（生成库） | regression-final/T765 |
| T-CALL-864 | R113/F012 | 联系人保留清理/再次导入 | 清除公司姓氏/原行，拒绝联系保持 | SQLite集成 | P0 | 隐私保留 | 通过 | regression-final |
| T-CALL-865 | R113/F010/003 | CSV文件载入→预览→改动失效→200条导入→核对 | 掩码预览、不自动导入/拨号、流程与公司显示正确 | 浏览器真实服务+原生替身 | P0 | 三列批量操作 | 33检查通过；S23未运行 | browser-final；手机未连接 |



| T-CALL-866 | R113/F010/012 | S23点击选择CSV、取消、从下载中选择生成CSV并预览 | 系统选择器打开，取消0导入，选定文件只填内容，须预览确认，0真实外呼 | 真机文档提供程序+REHEARSAL | P0 | 手机WebView默认无文件选择器缺口 | 通过（正常/取消路径；超限/坏编码未真机单独注入） | contact-profile-r113/device-validated，55检查 |

2026-10-22 T865补S23三列预览/导入/核对及原闭环/恢复通过；T866实际打开/取消/选取UTF-8文件并预览通过。手机文件选择曾因测试选择器误点搜索框导致超时，修正为点文件标题后通过，不算产品拨号失败。后台WebView CDP暂停导致原测试读状态超时，改为通过服务只读观察后台记录请求，再冷开核对保留未知，不放松业务断言。T845/T856仍未运行。


## R114 Excel导入（2026-10-22）

| 测试ID | 需求ID | 前置/输入/操作 | 预期 | 层级/方法 | 优先级 | 来源 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| T-CALL-867 | R114/F010 | 压缩XLSX、inline/shared字符串、数值手机号 | 三列原值读取且沿用CSV预览契约 | 单元/真实解析器 | P0 | Excel需求 | 通过 | excel-r114/parser-regression、regression |
| T-CALL-868 | R114/F010 | 首表/列重排/额外列/空行/缺列/重复表头/201条 | 只取首表三列，错误拒绝 | 单元 | P0 | 输入契约 | 通过 | 同上 |
| T-CALL-869 | R114/F012 | 公式/实体/宏/加密/坏格式/超限/稀疏范围 | 导入前拒绝 | 受限解析 | P0 | 输入边界 | 通过（软件） | 同上 |
| T-CALL-870 | R114/F012 | 巨大展开、CRC损坏、关系文件实体、伪造展开长度 | 受限实际解压、校验/实体失败，0导入 | 单元+额外边界 | P0 | 文件边界 | 通过 | template-and-bounds、regression |
| T-CALL-871 | R114/F010 | 桌面选择真实生成.xlsx→预览 | 公司姓氏/掩码正确，载入0导入/0许可 | 浏览器真实文件+服务 | P0 | 文件交互 | 通过 | browser-final，37检查 |
| T-CALL-872 | R114/F012 | 退出清草稿后迟到原生文件回调 | 草稿清空，不跨身份写回 | 浏览器身份场景 | P0 | 异步输入 | 通过 | browser-final |
| T-CALL-873 | R114/F010/003/011 | S23系统选择共享字符串.xlsx→导入3条→2条记录队列/结果/后台/冷开 | 正常/取消路径可用，无真实电话，间隔≥30秒，未知保留 | S23 REHEARSAL E2E | P0 | 安卓Excel闭环 | 55检查通过 | device-final |

手机提供程序的所有损坏/超限/加密组合未逐项运行，不能据正常文件通过扩称全部已验；T845真实Wi-Fi与T856本人可用性仍待验。

| T-CALL-874 | R115/F010 | 含标题行、别名、无关列、姓名的生成XLSX | 识别3字段、中文姓氏、忽略其余 | 单元 | Must | D038 | 通过 | evidence/import-feedback-r115/green |
| T-CALL-875 | R115/F010 | 姓氏+姓名、外文姓名 | 明确姓氏优先；不可靠姓名明确报错 | 单元 | Must | D038 | 通过 | 同上 |
| T-CALL-876 | R115/F012 | 实际浏览器文件选择后刷新 | 自动预览、条数与持久状态；未导入/未计划 | 浏览器集成 | Must | 用户无显示报告 | 通过39检查 | evidence/import-feedback-r115/browser-green |
