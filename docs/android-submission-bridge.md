# 安卓提交桥接边界（R087）

日期2026-10-16。当前standalone包为演示存储；原spike包是经过受控测试的开发入口。当前工作统一人工/定时模拟调用，并明确禁止真实来源，不连接两个包的发送链路。

| 边界 | 独立仿真 | 现有受控原生链路 | 真正接入前需要完成 |
|---|---|---|---|
| 联系人与任务 | DEMO-ID与schema3快照 | 宿主正式联系人/租户/销售/任务，原生许可绑定targetKey及号码 | 正式手机联系人存储/身份/资格/拒绝规则；不能把DEMO当联系人 |
| 尝试ID | DEMO-001/A1等 | 宿主contactWireId映射为原生允许的稳定ID | 独立真实尝试/票据与原生ID的一一持久映射，原协议不接受斜杠ID |
| 授权 | 无真实许可 | 宿主批准记录、限次/有效期、设备/安装/SIM绑定；原生再校验 | 独立手机受控授权入口与完整绑定，不复制旧许可或TEST_FIXTURE |
| 提交顺序 | UNKNOWN落盘→模拟端口→模拟API回执 | 宿主占用/持久提交→USB未知日志/租约→原生SQLite claim→guard→placeCall→回执 | 复用成熟守卫并明确跨存储崩溃/响应丢失；不能用单进程快照替代原生配额事务 |
| API和结果 | SIMULATED；系统呼出/接通未知 | API_SUBMITTED仍不能证明响铃/接通；单独人工核对 | 当前通话与尝试关联、回执匹配、人工结果和下一条分离 |
| 调度 | 手机上单次AlarmManager、版本/双时钟/30秒窗口 | 宿主正式运行器通过USB和原生租约 | 手机独立队列与真实guard组合的前后台/锁屏/权限变化/恢复证据 |

现有依据源码：spike/ControlledCallExecutor、ControlledCallActivity、ControlledCallDatabase；packages/core/src/adb-controlled-call-transport.mjs、contact-controlled-coordinator.mjs、native-call-protocol.mjs。沿用已有研究，不据此宣称新的平台行为。

当前TaskSubmissionBridge只提供SimulationPort。人工入口和Receiver共用它；CONTROLLED_REAL固定拒绝，不能由配置/Intent声明改变，桥接不接收号码、许可token或真实Phone端口。默认构造端口只做模拟；测试端口记录DEMO及尝试ID或抛异常。Receipt区分SIMULATED/UNKNOWN/NOT_SUBMITTED，呼出/接通保持null。

只读检查：手机“检查真实拨号状态”；或ADB启动com.mantou.salesdialer.standalone/.SubmissionBoundaryActivity，忽略Intent参数，只读状态并输出files/submission-boundary.json。诊断不能授予真实许可。设备脚本会比较任务字节并核对原探索APK摘要，真实受控许可另由已有collect-native-permit --read-only采集。

本轮不提供真实名单→原生发送器组合，也没有生产鉴权/正式授权UI。后续应先落地真实联系人与尝试持久模型，再接原生适配与授权；已有用户对名单资格的声明继续有效，不重复索取证明。仅在受控真实呼叫执行前请求当次目标与有界授权。

生命周期边界：诊断必须用独立只读引擎，不能通过AppRuntime.open(false)初始化任务单例；否则“强停→诊断→打开界面”会错误地保留旧定时。T573已在S23复现此问题，后续版本修复为readOnlyEngine。诊断只读取稳定主文件，存在.bak/.new则停止，不替正式运行路径修复文件。诊断报告不是任务/真实授权账本。
