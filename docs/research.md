# 步骤2：官方核查与平台证据

核查日期：2026-10-14（Asia/Shanghai）。关联F-CALL-002～008、012、013；原需求与最新决定以project-brief/decisions为准。首次研究与原型时间预算90分钟，起始16:55:28+08:00，实际结束与用时写入spike/session及执行记录。

复用课程第八章的官方入口，定向补双卡、定时、当前API与构建条件。本轮没有真机；所有平台运行、通话、显号、连续队列和日量可靠性结论仍未验证。网页及供应商材料仅为证据。

## 结论与原目标的关系

Android有公开的直接呼出和指定SIM电话账户接口，可以据此做原生实验；这不足以证明后台/锁屏及全天队列可靠。iPhone常规`tel:`路径明确要求系统确认，与免逐通确认的原目标存在差距；新默认拨号能力有专门权限和欧盟测试条件，本次没有中国大陆适用证据。快捷指令可自动触发部分事件，但Call动作、锁屏、双卡及企业任务控制尚未实测。

以上不把“iPhone所有可能路径都不可行”写成事实。原双端自动拨号范围保留；普通tel原型只作为取证，不升级为产品交付。

## Android：事实、推断与未知

| 证据ID | 官方事实与适用条件 | 工程推断/下一步 | 尚未确定 |
|---|---|---|---|
| E-R2-A01 | `ACTION_CALL`直接发起呼叫并要求CALL_PHONE；`ACTION_DIAL`展示号码后仍需用户点拨号。[官方Phone intents](https://developer.android.com/guide/components/intents-common#Phone) | 直接拨号实验使用原生接口，两个Intent不可互相当作验收替代。 | 具体设备是否额外确认、厂商限制与实际呼出。 |
| E-R2-A02 | 危险权限需要在运行时申请并处理拒绝/撤回。[运行时权限](https://developer.android.com/training/permissions/requesting) | 原型单独申请权限，授权回调不自动拨号；每次真实请求再检查。 | 实际弹窗、撤回后行为未运行。 |
| E-R2-A03 | Android10起限制后台启动Activity，并列特定例外；前台服务本身不是所有后台界面操作的通行证。[Activity security](https://developer.android.com/guide/components/activities/secure-bal) | `ACTION_CALL`所涉界面行为与`placeCall`服务路径须分别取证，不能只凭闹钟触发判呼出成功。 | 原型Receiver调用placeCall在各ROM/锁屏条件下的实际处理。 |
| E-R2-A04 | API23起`TelecomManager.placeCall`通过系统Telecom发起请求；managed电话链路要求CALL_PHONE，可用EXTRA_PHONE_ACCOUNT_HANDLE。[TelecomManager](https://developer.android.com/reference/android/telecom/TelecomManager#placeCall(android.net.Uri,%20android.os.Bundle)) | 原型指定用户选定的账户，不自行回退到另一张卡；方法返回记“提交”，不记“接通”。 | 运营商/设备是否按指定SIM呼出、接收端显号及请求与结果关联。 |
| E-R2-A05 | getCallCapablePhoneAccounts要求READ_PHONE_STATE；getPhoneAccount对target31+要求READ_PHONE_NUMBERS。CAPABILITY_SIM_SUBSCRIPTION代表系统SIM账户。[账户API](https://developer.android.com/reference/android/telecom/TelecomManager#getCallCapablePhoneAccounts())、[SIM能力](https://developer.android.com/reference/android/telecom/PhoneAccount#CAPABILITY_SIM_SUBSCRIPTION) | 原型申请三项电话权限，筛SIM账户；账户标签/实际卡槽映射需操作者核对。 | 双卡顺序、卡变化、企业工作资料空间及默认卡交互。 |
| E-R2-A06 | OFFHOOK包括拨号中、活动通话或保持；不能仅据OFFHOOK判断客户接通。Telephony状态可与设备其他通话范围不同。[TelephonyManager](https://developer.android.com/reference/android/telephony/TelephonyManager#CALL_STATE_OFFHOOK) | 原型状态日志注明观察范围，结果未知时保留待核对，不自动重放。 | 实际接通、任务归属、默认订阅观察对另一卡的覆盖。 |
| E-R2-A07 | 精确闹钟涉及特殊授权；canScheduleExactAlarms用于判断，较新安装并非默认获准；普通闹钟存在延迟。[官方Alarms](https://developer.android.com/develop/background-work/services/alarms) | 原型记录exact/inexact两种模式，30秒只是实验参数；暂停令旧计划失效。 | Doze、省电、厂商后台控制、准点误差及真实日量。 |
| E-R2-A08 | 官网当前已有Android17/API37及影响所有应用的行为变化。[Android17变更](https://developer.android.com/about/versions/17/behavior-changes-all) | 本次编译组合固定compile/target36，另将Android17列入运行兼容取证，不能称36是最新平台。 | 未安装SDK，未验证Android14～17及厂商ROM覆盖。 |

## iPhone：中国大陆、默认拨号与状态

| 证据ID | 官方事实与适用条件 | 工程推断/下一步 | 尚未确定 |
|---|---|---|---|
| E-R2-I01 | Apple存档说明：原生app打开tel URL，iOS10.3及以后要求用户确认再拨号。[Phone Links](https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/PhoneLinks/PhoneLinks.html) | 常规tel路径不支持原要求中的免逐通确认；原型记录打开URL、确认和通话状态，三者不混同。 | 当前中国大陆机型/系统的实际弹窗、取消、默认应用/选卡影响。 |
| E-R2-I02 | 默认calling app面向VoIP；默认dialer app面向蜂窝。StartCellularConversationAction/TelephonyConversationManager需Default Dialer App entitlement；官方要求测试账号注册于欧盟且设备在欧盟。[默认拨号准备](https://developer.apple.com/documentation/livecommunicationkit/preparing-your-app-to-be-the-default-dialer-app) | 不能把VoIP默认calling、欧盟默认dialer或未签名entitlement当作大陆销售SIM证据。本次未伪造/申请该权限。 | 大陆部署授权及地区条件未获得；没有免确认蜂窝链路实测。 |
| E-R2-I03 | 官方DocC元数据列StartCellularConversationAction及dialing-app entitlement从iOS26引入。[Action](https://developer.apple.com/documentation/livecommunicationkit/startcellularconversationaction)、[Entitlement](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.dialing-app) | 旧系统与新权限能力分别核查；原型只用tel/CallKit基础公开接口。 | 用户设备OS、权限申请/签名条件与实际支持。 |
| E-R2-I04 | 个人自动化的部分触发（含Time of Day）可不经触发确认；官方提醒单个动作也可能有独立自动执行设置。[Shortcuts自动化](https://support.apple.com/guide/shortcuts/enable-or-disable-a-personal-automation-apd602971e63/ios) | “触发不用确认”不等于“Call动作锁屏必定无确认且可连续队列”。保留独立受控探索说明。 | 当前OS的Call动作、锁屏、SIM、取消、任务同步和下一通能力。 |
| E-R2-I05 | 普通app进入后台后会被挂起；延长运行是有限时间任务机制。[后台执行](https://developer.apple.com/documentation/uikit/extending-your-app-s-background-execution-time) | 普通进程timer不是可靠全天外呼调度。本原型30秒timer限定前台，迟到超过5秒停止补执行；这是实验保护参数，不是用户采纳规范。 | 后台/锁屏路径与其他官方机制的实际适用性。 |
| E-R2-I06 | CXCallObserver可观察系统通话；CXCall提供UUID、isOutgoing、hasConnected、hasEnded和isOnHold。[Observer](https://developer.apple.com/documentation/callkit/cxcallobserver)、[CXCall](https://developer.apple.com/documentation/callkit/cxcall) | UUID标识通话，但公开属性没有本次tel请求目标号码；任意观察到的通话不能自动绑定当前任务。原型只记录候选requestID/未验证关联。 | 状态回调覆盖、与受控目标的可靠关联、后台事件丢失及实际语音。 |
| E-R2-I07 | Apple双卡指南说明默认语音线、联系人优先线/历史选择及手动切换；大陆双实体卡有独立机型说明。[双SIM](https://support.apple.com/en-gb/109317)、[双nano-SIM](https://support.apple.com/en-us/108898)、[iOS27电话指南](https://support.apple.com/en-mide/guide/iphone/iph3c993cbc/27/ios/27) | tel原型没有公开的程序选SIM参数；系统/联系人线选择须与中国电信实际拨出卡核对，不能承诺指定卡成功。 | 不同大陆实体双卡/eSIM机型、当前系统、接收端显号。 |

Apple普通文档网页部分只返回JavaScript外壳；本轮直接读取同站点DocC JSON并保存查询记录与哈希，见 [apple-document-fetches.json](../evidence/step-2/apple-document-fetches.json)。这是文档取证，不是权限获批或设备运行。

## 商业电话与个人信息

| 证据ID | 官方规则的事实 | 对本项目的推断/未决条件 |
|---|---|---|
| E-R2-L01 | 消费者权益保护法实施条例第24条要求消费者事先同意商业电话，提供明确便捷取消方式，取消后立即停止；第53条规定2024-07-01施行。[国务院条例](https://app.www.gov.cn/govdata/gov/202403/19/513111/article.html) | 企业内部使用不自动豁免面对消费者的外呼。纯企业采购联系人是否属于该消费场景需按业务核对；未知资格不能当作已允许真实营销。 |
| E-R2-L02 | 个保法保护可识别自然人信息，处理需第13条依据；第15条涉及撤回，第17/19条涉及告知/期限，第21条涉及委托，第27条限制公开信息合理处理并尊重明确拒绝。[网信办公布的个保法](https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm) | 公开手机号不自动证明营销许可；个人手机号与企业总机分别判断。名单来源、处理依据、企业与软件服务方责任、撤回传播、保留期限须形成规范。 |
| E-R2-L03 | 检索到广东电信官方协议索引摘要，提及未经同意/请求或拒绝后的商业性话音限制，以及终端/软件条件。[广东电信协议](https://gd.189.cn/oper/agree/agreement.htm)；本轮打开全文返回412，未全文核查 | 只作地方协议线索，不确认它是mantou实际合同。省份/套餐未知，约200次是否符合个人SIM用途、频率和合同需运营商明确答复。 |

只核查上述与当前链路直接相关的公开条文/接口，没有声称全面审查所有地区、行业规定或用户实际合同。联系资格、拒绝联系及企业数据边界已列为后续规范输入。

## 工程与真实检查

Android：原生Java，无UI框架依赖；AGP8.13.2、Gradle8.13、compile/target36、min31、JDK17。该版本组合依据 [AGP8.13兼容表](https://developer.android.com/build/releases/agp-8-13-0-release-notes)，不是最新版本承诺。Gradle Wrapper来自官方仓库并核验官方SHA-256，实际未启动Gradle，见 [来源与校验](../evidence/step-2/wrapper-provenance.json)。

iOS：SwiftUI/CallKit/UIKit，deployment17，原生Xcode项目与共享scheme；工程由本地生成器写入，**未由Xcode创建或编译验证**。没有Default Dialer entitlement或后台VoIP伪配置。当前官网支持表已列iOS27/Xcode27系列，较旧SDK的原型设置不代表新系统已验证；构建环境按目标系统核对 [Xcode官方支持表](https://developer.apple.com/xcode/system-requirements)。

| 实际检查 | 结果 | 证据边界 |
|---|---|---|
| Java语法、Xcode工程引用、Swift词法平衡、Wrapper校验 | 修复工程ID后61项静态检查通过，命令退出0 | Java只是语法解析；Swift只检查括号/字符串/注释；均未检查平台类型与运行行为。 |
| Manifest/Info.plist/scheme元数据 | 8项通过，命令退出0 | 文件和引用有效，不等于Xcode或Android构建通过。 |
| Android assembleDebug命令尝试 | 退出9009，JAVA_HOME/java缺失 | 未启动Java/Gradle编译；无APK。 |
| iOS xcodebuild命令尝试 | 退出127，命令不存在 | 未启动Xcode编译；无app构建产物。 |
| adb devices -l尝试 | 退出127，命令不存在；用户报告暂无真机 | 工具无法枚举设备；没有平台连接/通话证据。 |

完整命令/版本/输出/退出码见 [checks.json](../evidence/step-2/checks.json)。静态检查依赖只安装在项目tools/static-check，锁定java-parser3.0.1与xcode3.0.1，使用ignore-scripts；npm提示xcode的传递uuid7依赖已弃用，该解析工具仅用于本地检查，不进入移动端运行包。

## 可选择的方向（均未替mantou采纳）

| 方向 | 保留/改变什么 | 实际代价与下一步 |
|---|---|---|
| 保留原双端自动拨号目标 | 保留销售SIM、显号与自动程度 | 继续定向验证iPhone快捷指令/官方许可路径及真机；目前无法承诺大陆iPhone闭环。共用规范与逻辑可独立继续。 |
| 允许iPhone逐通系统确认 | 保留SIM人工通话，改变自动化程度 | 每次需销售确认，额外人工操作；必须由用户采纳后修改F-CALL-004范围及验收，本轮未采纳。 |
| 改变线路，例如云回拨/企业外呼 | 改变SIM主动呼出的原条件 | 需线路资质/用途、个人号码授权显号、呼叫段费用及账号；功能和费用不能靠目前证据保证。本轮只留询问草稿。 |

下一步步骤3可先定义确定的共用行为、边界与实现计划；无法判断的平台部分继续留待验证，真外呼入口保持受控。操作与回传步骤见 [manual-steps.md](manual-steps.md)，双端结论见 [ANDROID.md](spikes/ANDROID.md) 与 [IOS.md](spikes/IOS.md)。

## 2026-10-15工程证据增量

官方[Android工具下载/SDK许可](https://developer.android.com/studio)、[环境变量](https://developer.android.com/tools/variables)及[Adoptium发布](https://github.com/adoptium/temurin17-binaries/releases)核查后，依用户授权实际项目内安装并构建。事实：Android APK编译/lint修复/模拟器合成运行已通过；事实不扩展到SIM主动拨出、显号、真实双卡/讲话或iPhone能力。详情与命令见[Android spike](spikes/ANDROID.md)。原平台/地区限制判断没有因桌面或模拟器绿灯而改变。


## 2026-10-15 S23 Ultra实际证据

事实：SM-S9180 Android16/API36的指定电销卡，前台人工/前台定时/后台锁屏定时3通，手机API/锁屏事件及用户反馈分别留证。事实：初次后台RUN_ANY_IN_BACKGROUND=ignore、精确权限allow，35秒观察未送达；系统UI改此应用“不受限制”后allow，同样后台合成测试迟28ms送达，第三通锁屏成功。推断：后台运行限制是本次行为差异的关键条件；并未隔离验证所有省电因素。未知：长时间休眠、其他OEM、全天稳定性、第二卡与失效场景、正式任务队列和iOS。

资料：[三星后台限制说明](https://www.samsung.com/us/support/answer/ANS10003442/)、[AlarmManager](https://developer.android.com/reference/android/app/AlarmManager)，核查日期2026-10-15。测量结果及适用条件见[S23 Ultra真机报告](spikes/ANDROID-S23U-2026-10-15.md)。


## 2026-10-15电话能力只读接口核查

适用：本项目Android min31、当前S23 Android16/API36。官方文档核查日期2026-10-15。

- 事实：TelecomManager可枚举call-capable账户；PhoneAccount可检查SIM_SUBSCRIPTION、tel及启用状态。权限不足可能抛SecurityException，不能将失败列表当“确定无卡”。本实现保留UNKNOWN，不读取线路号码。[TelecomManager](https://developer.android.com/reference/android/telecom/TelecomManager)、[PhoneAccount](https://developer.android.com/reference/android/telecom/PhoneAccount)。
- 事实：isInCall是设备通话状态观察，不提供本任务接通归因。精确闹钟可用性由canScheduleExactAlarms读取。[TelecomManager](https://developer.android.com/reference/android/telecom/TelecomManager)、[AlarmManager](https://developer.android.com/reference/android/app/AlarmManager#canScheduleExactAlarms())。
- 事实：isBackgroundRestricted和isIgnoringBatteryOptimizations分别观察后台限制与电池优化豁免；这些观察不证明全天调度/锁屏电话成功。[ActivityManager](https://developer.android.com/reference/android/app/ActivityManager#isBackgroundRestricted())、[PowerManager](https://developer.android.com/reference/android/os/PowerManager#isIgnoringBatteryOptimizations(java.lang.String))。
- 工程判断：本轮将已知无通话、已授予权限、允许精确闹钟、未限制后台、豁免优化列为开发只读就绪条件，不推断为所有设备统一的平台充分/必要条件。真实授权固定关闭。
- 未知：生产身份/通信签名、账户变更主动通知、长期后台限制变化及真实任务结束归因仍需实现/验证。手机时钟本轮观察比电脑快约27秒；已修复只读快照混用时钟的缺陷，未修改设备时间，现有合成命令跨端TTL仍是后续缺口。


## 2026-10-15跨设备时间核查

事实：Android System.currentTimeMillis是可被用户/网络调整的日期时间；elapsedRealtime是自启动起经过时间并包含深度休眠，适合间隔测量。[Android SystemClock官方说明](https://developer.android.com/reference/android/os/SystemClock)。

工程推断：两台设备不能直接比较各自绝对墙钟来认定同一传输过期。本轮受信任USB仿真使用设备持久接收期限、同次启动标识和主机单调往返预算；没有把它宣称为生产身份授权或已解决所有主机时钟跳变。主机本地业务时段仍遵守Asia/Shanghai，iPhone顺序后置不改变要求。


## 2026-10-15设备端检查资料核查

事实：TelecomManager.isInCall()需要READ_PHONE_STATE，描述范围包含拨号、响铃、活动及保持中的通话，包含managed/self-managed ConnectionService。[Android官方API](https://developer.android.com/reference/android/telecom/TelecomManager#isInCall())。本轮用于保守阻断，不推断某个客户是否接通。

工程推断：快照不能保证后续系统状态不变；dry-run只证明检查时刻满足，不替代真实调用时最终校验或系统错误处理。设备关联采用应用内随机持久key，未使用硬件标识；它不是生产身份凭据。Android_ID文档本次读取失败，不以未取得的资料支持实现判断。



## 2026-10-15受控原生入口API复核

事实：TelecomManager.placeCall通过系统telecom发起，托管电话服务需要CALL_PHONE，支持EXTRA_PHONE_ACCOUNT_HANDLE；返回本身不是接通证据。官方：https://developer.android.com/reference/android/telecom/TelecomManager 。本轮只用指定SIM的tel路径，实际呼出/接通另需观察。

事实：SQLiteDatabase事务需要setTransactionSuccessful及endTransaction，未标记成功会回滚。官方：https://developer.android.com/reference/android/database/sqlite/SQLiteDatabase 。本轮在结束事务后才进入电话调用，开启FULL同步；这些是实现依据，未代替手机断电实测。

推断/未知：检查权限和isInCall后仍可能被系统撤权/来电打断，不能把检查和placeCall当系统级原子操作；源码显式捕获SecurityException并保留未知。新原生入口后台、锁屏、权限变化及实际SQLite恢复未运行，历史三通不可移作本新入口成功证据。

## 2026-10-16 R084闹钟接口复核
官方来源：https://developer.android.com/develop/background-work/services/alarms ，核查日期2026-10-16。Android说明非精确闹钟可被系统延迟，setAndAllowWhileIdle支持空闲时执行但不是准时保证；精确闹钟有独立权限/适用条件。事实：当前独立仿真使用非精确ELAPSED_REALTIME_WAKEUP+PendingIntent、Receiver非导出，不使用电话API。推断：系统延迟可能超出已采纳30秒执行窗口，因此回调必须跳过而非延长窗口。未知：不同手机/Doze下达成窗口的比例，单次样本不能证明全天可靠。

R084真机纠正（2026-10-16）：evidence/android-timer-r084/device实测非精确闹钟2分钟内未回调，退出1/NO_CALLBACK_WITHIN_TWO_MINUTES，已通过UI暂停取消，未产生新模拟尝试。不能据此证明永久不会触发，但不满足本次30秒执行窗口验收。改为SCHEDULE_EXACT_ALARM + canScheduleExactAlarms门槛 + setExactAndAllowWhileIdle；缺权限先拒绝，不降级至已失败的非精确时限方案。用户通过系统“闹钟和提醒”设置允许，仅本仿真应用，不申请电话权限。精确闹钟仍不能替代实际后台/长期可靠性证据。

### R084后台限制核查（2026-10-16）
官方接口说明：https://developer.android.com/reference/android/app/ActivityManager#isBackgroundRestricted() ：后台受限时，后台jobs/alarms不能执行；适用本应用后台调度前提。S23实际RUN_ANY_IN_BACKGROUND曾为ignore，用户设置后为allow（evidence/android-timer-r084/background-allowed）。推断：这是本轮延迟的相关环境因素；一次设置前后比较不足以排除所有系统调度因素。实现增加安排前检查，拒绝受限状态，不保证系统未来不会重新限制。
