# 独立安卓受控试点（R098～R101）

2026-10-18 10:45（R100/R101）：已连续交付本机批量草稿预览/明确原子创建，以及不同目标、授权尝试、API确认、人工结果分离的累计/北京时间今日统计。689 Java断言、600解析向量、398 S23隔离断言、批量UI44驱动检查、新版只读UI43驱动检查及20配置/停用断言通过。试点0.3-batch-metrics已安装S23；本轮0真实电话，实际区0联系人/0尝试/plan0暂停/许可停用，格式区2生成记录/2草稿/plan2暂停。原资料/权限/电销卡保留；整体仍部分通过，新包真实通话、自动批量队列、企业身份与全天多机型尚未验收，iPhone暂缓。当前继续步骤5可独立实现项；真实通话条件只影响该部分。

## 当前入口与范围

当前版本0.3-batch-metrics，新APK：prototypes/android/pilot/build/outputs/apk/debug/pilot-debug.apk，SHA256 fe55ddb990fe9d698ee74ef84574600e7a0ab7787307cc59021bc7f3b9be7454。包com.mantou.salesdialer.pilot，手机应用“销售拨号·受控试点”。原“销售任务仿真”和com.mantou.salesdialer.spike独立保留，新包不继承旧权限/数据/许可。当前仅本机单销售受控试点，没有企业登录、云回拨或批量生产队列。原自动拨号、企业权限、200总尝试和iPhone目标保留；逐次许可用于当前工程取证。

已实现：复用同一号码暂存/明确草稿/计划/资格/拒绝规则；单Clock人工立即；一次计划和许可唯一；同事务消费计划并持久UNKNOWN后才交端口；最后交接写事务再校验；API接受、实际呼出/接通与人工结果分开。明确未知关闭不重放。phone_cancellations处理已claim后暂停，暂停不结束已交给电话系统的通话。schema5完整验证旧1～4后原子升级，保留原字段/slot/审计；旧APK不能读取，不以回装降级替代迁移。

真实电话适配源码使用TelecomManager.placeCall指定PhoneAccountHandle，不走提醒代拨或云线路。只接实际资料区，并复核新包权限、明确SIM/安装标识、当前许可、最新资格/版本、实际空闲及墙钟/单调/boot/30秒窗口。Receiver非导出，需精确闹钟和后台条件；主界面冷启动/更新只撤销和暂停，合法到期回调可以校验已有READY；CONSUMING中断永不恢复为READY。当前没有新包实际呼叫证据，不能由旧包成功或静态构建推导新包前后台/锁屏通过。

## 手机操作

1. 已安装新包；用户已设置并实测拨号/读取通话状态/本机号码3项权限均授予。
2. “受控通话与结果→允许准时提醒”开启本包闹钟和提醒；“后台运行设置→电池→不受限制”。历史首次安装和09:31检查尚未满足；收到用户答复后，09:35～09:36实测手机3权限true、精确闹钟true、后台受限false。没有自动授予新的权限。
3. 已只读枚举并在本包选择此前指定“电销卡”，账户摘要与旧S23绑定一致；没有拨号或改变系统默认卡。
4. 获得当次受控通话许可并处于工作日09:00含至18:00不含时，在“我的名单与计划”实际资料区导入受控目标，明确记录已有资格、生成草稿。已有用户资格声明无需上传证明；新批默认UNKNOWN。
5. 选择明确联系人后可在通话页“立即受控提交1次”；定时则先在名单中编辑未来计划，再通话页为该计划授权1次。确认页捕获目标/版本/卡，不静默应用后来改变的数据。实际到点提交无需再点系统拨号确认仍是待真机取证项。
6. 通话结束后人工记录未接听/已接通并结束/未知。实际空闲不证明客户接通；未知保持占用，明确无活动/待处理才可关闭，原结果仍未知。下一次必须明确新计划或再次触发，不自动重拨。
7. 停止使用“暂停新外呼”并退出/强停新包；已交电话系统的通话在系统电话界面挂断。不清名单、历史或旧包数据。

## 实际检查

~~~powershell
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Build
pwsh -NoProfile -File tools/check-pilot.ps1 -Mode Build
pwsh -NoProfile -File tools/check-standalone-package.ps1
pwsh -NoProfile -File tools/check-pilot-package.ps1
~~~

本项目根执行。Test当前689断言（含原执行器27）和600固定解析向量；当前398原生隔离包含201明确记录尝试和批量草稿/统计检查，实际电话端口不存在于仿真APK。独立包build/lint 0错误6警告；仿真包0错误8警告。APK检查确认仿真包仍只有精确闹钟权限/无Telecom类型；新包仅4项权限、allowBackup=false、没有旧真实拨号组件，12个共用源文件逐一摘要匹配。新包实际首次安装、20配置/禁用检查和10安装UI检查通过；权限/SIM/实际撤权恢复/格式UI共46驱动检查已通过，真实通话E2E尚未运行。

已运行手机命令均用node tools/record-core-run.mjs、新evidence目录：check-phone-intake-fixture-device.mjs --run；check-phone-upgrade-device.mjs --run；check-pilot-install-device.mjs --run --request-permissions。最后一条首次安装并保留系统弹窗，需要手机解锁和原DEMO暂停；不要对已有实际数据盲目重跑首次安装入口。元数据/格式测试不受拨号工作时段限制，因为不调用电话。

设置完成后运行node tools/record-core-run.mjs evidence/pilot-postgrant-new-run R-CALL-099 node tools/check-pilot-postgrant-device.mjs --run。它不重装、不授权通话，要求新包实际名单/尝试仍空、许可DISABLED、三项设置已满足、解锁；明确选择已指定卡，并暂时撤回READ_PHONE_STATE验证阻断，再仅恢复该次已由用户授予的3权限。finally恢复原权限，失败也不新授予未获许可权限。随后只在新包FORMAT区用生成数据测试，实际区不写客户/旧受控号码；结束强停。该脚本已实际运行，postgrant/run.json退出0，86.1秒，46驱动检查通过。新包格式区保留1条生成记录/1草稿/计划version2暂停；实际区仍空。此入口要求新格式区为空，不要对已经有数据的安装盲目重跑；需要重验时先按实际状态增量适配驱动，保留现有资料。

回传：run.json/output.log、phone-fixture.json、upgrade-ui-cases.json、package-boundary.json、pilot-package-boundary.json、pilot-install-check.json、pilot-readiness-check.json、pilot-postgrant-check.json与PNG/XML。实际通话回传私有pilot-status.json与pilot-last-execution.json的掩码数据、双方反馈和时间/来源；不把原始SQLite/许可token/完整手机号放到版本化evidence。

## 证据边界与下一步

原仿真实际区0、格式区6生成记录/2草稿/用户计划版本5暂停，数据库schema3→5全部旧业务字段/slot保持；新试点实际区0/尝试0/计划0暂停，许可DISABLED。所有原DEMO、旧合成库和真实APK保持。本轮201记录端口请求仅一个生成目标，201次各明确新计划/人工夹具未接，证明不设200硬上限；不证明200真实呼叫、接通率、人工耗时或费用。

当前无拨号下一步5继续独立名单管理；R100/R101说明见android-batch-metrics.md。真实通话单列步骤2：系统设置/SIM与无拨号检查已完成；在工作时段、实际空闲和新具体有界授权下取得独立手机真实闭环证据。当前2026-10-18周日，最早工作时段为10月19日09:00；旧许可不复用，尾号5235没有本轮通话许可。实际前后台/锁屏、占线/双卡撤回/崩溃/全天多机型未运行；企业鉴权、批量自动队列、加密/保留与生产试点仍未完成，iPhone暂停。发现缺陷回5，当前范围必需证据齐后才进入6集中验收。


## R100/R101补充

新增批量草稿与分离统计、43驱动检查及当前APK20配置检查详见[说明](android-batch-metrics.md)与[综合证据](../evidence/android-attempt-metrics-r101/acceptance.json)。当前12共用源，格式区2记录2草稿，实际区仍空且停用。
