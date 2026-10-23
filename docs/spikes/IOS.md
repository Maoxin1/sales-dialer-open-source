# iPhone平台探索记录

调查ID：S-CALL-IOS-01（原生公开路径）、S-CALL-IOS-02（快捷指令待设备实验）。关联F-CALL-002、004、005、006、008、011、013。日期2026-10-14；原型去向：[prototypes/ios](../../prototypes/ios/README.md)，保留探索源码，不转为原自动拨号产品交付。

## 问题、假设与判定

问题：中国大陆iPhone能否由销售SIM自动拨出，按计划/干预时间工作、支持双卡，并可靠关联客户通话状态？

H-I1：普通tel打开系统电话能探索呼出，但iOS10.3+官方要求确认；该路径不满足免逐通确认要求。

H-I2：iOS26新默认dialer具备免确认蜂窝能力，但需要专门权限；官方欧盟账号/设备测试条件不能证明大陆可用。

H-I3：快捷指令Time of Day可以自动触发部分动作，Call动作在大陆、锁屏、双卡和任务取消/接续条件下的能力未实测。

判定依据：分别证明触发、系统确认、真实呼出、SIM/接收端显号、客户接通/双方语音；任意CXCall状态变化不能自动归属应用任务。新权限必须有真实签名/地区条件，快捷指令须留设置与受控观察证据。

## 时间与环境

两端共享一次90分钟研究/原型窗口，起始2026-10-14T16:55:28+08:00；未分别计时，不相加。结束与总实耗见 [session.json](../../evidence/step-2/session.json)及本文件收尾记录。

当前为Windows，xcodebuild/xcrun/swift入口未找到；无可访问Mac/Xcode/签名配置报告。用户报告暂无真机，销售SIM为中国电信且同意受控测试，接收端未提供。

原生工程：SwiftUI/UIKit/CallKit、deployment17、Swift语言模式5、共享scheme DialerProbe。官网支持表当前列iOS27/Xcode27系列；最低部署设置不证明新系统兼容。工程由项目Python生成器写入，未由Xcode创建/构建验证，没有伪造dialing entitlement或后台VoIP权限。

## 本轮执行与实际结果

1. 复用Apple Phone Links、默认dialer、Shortcuts、CXCall入口；补后台执行、双卡和当前SDK资料，见 [research.md](../research.md)。JS页面不足时直接读取官方DocC JSON，记录元数据/哈希，验证新Action及entitlement introducedAt26.0。
2. 创建单目标原生源码：默认仿真、人工一次、前台30秒一次、暂停/计划失效、一次受控启用、公开tel请求、CXCallObserver、事件日志、持久待核对标记。
3. 第一次工程静态检查失败：全数字ID被解析器识别为数值导致引用无法解析。修正生成器为含字母的24位ID，保留 [首次失败](../../evidence/step-2/static-sources-first-attempt.log)，重新生成工程并只重跑受影响静态检查。
4. 修正后Xcode OpenStep项目解析/对象与引用、Info.plist与共享scheme通过。三个Swift文件仅括号/字符串/注释词法平衡通过，没有Swift语法或UIKit/CallKit类型检查。
5. 实际尝试xcodebuild模拟器无签名构建，退出127：命令不存在。没有进入Xcode编译，没有app或真机安装。
6. 写快捷指令单次实验的具体设备操作计划，未生成/安装签名shortcut，未运行Call动作、锁屏、双卡或后续请求。

本轮全项目61项源码/工程静态检查及8项元数据检查通过；完整命令/输出/退出码见 [checks.json](../../evidence/step-2/checks.json)。没有任何真实通话、SIM选择、显号或200次可靠性证据。

## 结论与边界

H-I1有明确官方确认要求，否定普通tel“无需逐通确认”的解释；原型为受控取证，不登记已满足F-CALL-004。H-I2有新API及欧盟条件资料，缺大陆适用与许可证据。H-I3仍未知，不能把自动化触发成功推断为电话成功，也不能断言所有其他路径都不可能。

普通app的前台timer不承诺后台/锁屏可靠；本原型在非active场景或迟到过久会停止，这个保护行为不是整个iOS平台能力证明。tel没有指定SIM参数，系统默认/联系人线选择与实际中国电信卡需另证。CXCall UUID/hasConnected只是观察事件，与目标号码和request的可靠关联尚未解决。

## 选项、剩余未知与下一步

当前维持原Android+iPhone、销售SIM、显号、自动程度；没有用户采纳替代。具体“保留原目标继续验证 / 允许iPhone系统确认 / 改变线路”及代价见 [research.md](../research.md#可选择的方向均未替mantou采纳)。

设备/接收端/Mac具备后按 [manual-steps.md](../manual-steps.md)运行M-IOS-01～07；按 [快捷指令说明](../../prototypes/ios/shortcuts/README.md)另测S-CALL-IOS-02。App暂停不控制个人自动化，不能把两者混为一个已实现队列。

下一步步骤3可独立定义共用规则、状态与实现范围。iPhone免确认、系统双卡路径、后台、任务关联、完整自动接续均待证据；不因静态绿灯或后续单次演示标已验收。转正式代码仍需规范、有效测试与真实验收。

## 本轮时间收束

研究/原型与交付记录结束：2026-10-14T17:49:35+08:00；共同窗口实际用时54.12分钟，90分钟内收束。Android/iOS共享此窗口，不把两个报告的时间相加。可独立工作完成；设备/构建缺口继续保留，下一步步骤3。
