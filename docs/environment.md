# 环境检查

实测时间：2026-10-14T16:27:45+08:00。时区：Asia/Shanghai（Windows：China Standard Time）。项目：`D:\mx\AI-Workspace\Projects\sales-dialer`。

检查使用PowerShell 7.6.6，工作目录为固定项目。原始命令参数、输出、退出码、路径探测及流程源SHA-256见 [step-1-environment.json](../evidence/step-1-environment.json)。无新增依赖或全局配置修改。

## 操作系统与可用工具

| 项目 | 可用性与版本 | 路径/实测依据 | 对当前项目的影响 |
|---|---|---|---|
| 操作系统 | Microsoft Windows 11 家庭版 中文版；10.0.26300；Build 26300；64位 | `Get-CimInstance Win32_OperatingSystem` | 可完成建档和共用逻辑检查；移动端构建条件另查。 |
| PowerShell | 7.6.6 | `$PSVersionTable.PSVersion` | 本轮命令执行环境。 |
| Git | 2.55.0.windows.3；退出码0 | `D:\Git\cmd\git.exe`；`git --version` | 项目内仓库操作可用。 |
| Node.js | v24.18.0；退出码0 | `C:\Program Files\nodejs\node.exe`；`node --version` | 后续可利用已有运行时与内置测试工具；未据此选定正式技术栈。 |
| npm | 11.16.0；退出码0 | `C:\Program Files\nodejs\npm.cmd`；`npm.cmd --version` | 包管理入口可用；本轮未安装包。 |
| Python | 3.14.3（64位）；`py`版本和解释器执行均退出码0 | 启动器：`C:\Users\mx\AppData\Local\Microsoft\WindowsApps\py.exe`；解释器：`C:\Users\mx\AppData\Local\Python\pythoncore-3.14-64\python.exe` | 使用`py`执行；当前`Get-Command python`未找到命令，不能把它写为可用入口。 |
| Java/JDK | `java`、`javac`未在PATH找到；版本未知 | `Get-Command`；JAVA_HOME未设置；下列常见路径不存在 | 当前不能据此执行需要JDK的Android构建；建档不阻塞。 |
| Android SDK/adb | `adb`、`sdkmanager`、`avdmanager`未在PATH找到；版本未知 | ANDROID_HOME/ANDROID_SDK_ROOT未设置；常见SDK目录不存在 | 当前无法执行adb检查、SDK编译或模拟器验证。未运行`adb devices`，设备连接状态未知。 |
| Gradle | 命令未在PATH找到；版本未知 | `Get-Command gradle` | 当前没有工程/Wrapper，未尝试Android构建；未来工程自带Wrapper的可用性另查。 |
| iOS构建工具 | `xcodebuild`、`xcrun`、`swift`、`pod`未在本机PATH找到；版本未知 | `Get-Command` | 本机未建立可用iOS构建入口。实际Mac/Xcode、签名和远程构建条件未知；未尝试构建。 |

“未找到”仅说明当前会话PATH、环境变量与已检查路径内未发现可用入口；没有扫描全盘或证明所有其他电脑/安装目录都不存在工具。

## Java与Android路径检查

以下路径逐项`Test-Path`均为false：

- `C:\Users\mx\AppData\Local\Android\Sdk`
- `C:\Program Files\Android\Android Studio`及其`jbr\bin\java.exe`
- `C:\Program Files\Java`、`C:\Program Files\Microsoft\jdk`、`C:\Program Files\Eclipse Adoptium`、`C:\Program Files\OpenJDK`
- `D:\Android\Sdk`、`D:\Android\android-sdk`、`D:\Android\Android Studio`及其`jbr\bin\java.exe`

未提供其他安装路径。设备、账号、签名或线路没有因工具探测而自动满足。

## 项目与AGENTS.md检查

项目和上级Projects目录最初不存在，未有代码、next-action或执行记录。创建项目后文件检查为空；父级`D:\mx\AI-Workspace`及新项目的仓库探测均返回“not a git repository”（退出码128）。随后本项目`git init`成功，仓库根为固定路径，默认分支master，无提交。首次`git log -1 --oneline`退出码128是无提交的预期结果。

检查的磁盘AGENTS.md路径均不存在：`C:\`、`C:\Users`、`C:\Users\mx`；`D:\`、`D:\mx`、`D:\mx\AI-Workspace`、`Projects`、本项目及其`docs`/`evidence`；知识库及流程源文件的两级子目录。完整路径清单保存在原始证据中。继续遵循mantou在会话中提供的个人AGENTS.md指令；未创建额外项目AGENTS.md。

## 用户报告与尚缺的真实环境

2026-10-14用户报告：覆盖近五年手机型号与近三年系统版本，允许按证据灵活调整；Mac环境不限制；SIM主动拨出、销售号码显号及双卡已要求；提供候选测试号 `177****9486`。

这些是需求/环境意向，不是连接或运行证据。实际Android/iPhone型号与系统、Mac主机/Xcode、运营商/双卡配置、号码角色和受控测试授权尚未分别确认。完整号码保存在Git忽略的 [test-contact.local.json](test-contact.local.json)。

以上为步骤1环境快照，当时没有移动端构建/设备/通话检查。步骤2的增量结果如下，旧快照不替代新状态。

## 2026-10-14步骤2增量

- 用户报告暂无真机；提供号码已明确为销售拨出SIM、中国电信，并同意受控测试。接收端未提供；Mac/Xcode可访问方式未提供。上述均为用户报告，不是AI设备/线路实测。
- 项目新建prototypes/android与prototypes/ios原生探索源码；JDK/SDK/Xcode未安装，也未取得签名或Default Dialer权限。
- 只在tools/static-check安装java-parser3.0.1、xcode3.0.1及锁定的传递依赖，使用ignore-scripts；21个依赖包，不进入移动端。npm有uuid7弃用提示，记录在research。
- Gradle8.13官方Wrapper脚本/JAR已项目内保存并验证官方SHA-256，分发包校验和固定；当前缺Java，Gradle本身未启动。AGP8.13.2、compile/target36、min31、JDK17为实验配置。
- 新官网资料已核对Android17/API37、iOS27/Xcode支持表；编译/最低部署参数不代表这些系统已验证。
- 61项源码/工程静态检查、8项元数据检查通过；Java仅语法、Swift仅词法平衡，不含类型/行为验证。源码更新后只重跑受影响静态检查。
- Android构建命令实际尝试退出9009（java缺失）；iOS构建与adb devices实际尝试均退出127（命令不存在）。均未进入平台编译或设备枚举，无APK/app/通话产物。

完整命令、版本、退出码与输出见 [checks.json](../evidence/step-2/checks.json)，补环境/安装/取证方法见 [manual-steps.md](manual-steps.md)。步骤3规范已完成，原双端能力继续待真机证据。

## 2026-10-14步骤3增量

只探测已有Node.js v24.18.0内置node:test、node:assert/strict、node:sqlite。模块导入成功，DatabaseSync在内存执行SELECT sqlite_version()返回3.53.1；退出码0，stderr为空。完整命令/版本/输出见[stack-probe.json](../evidence/step-3/stack-probe.json)。这是工具可用性检查，不是产品单元测试、持久化/重启恢复验证或移动端构建。

官方版本文档确认node:test为Stable，node:sqlite接口为Stability1.2 Release candidate；后者只用于后续本地仿真与事务实验，不据此选定生产后端。步骤3未安装依赖、未改平台源码或重复缺工具的构建尝试，真实环境仍沿用步骤2缺口。

共用最小栈及范围见[implementation-plan.md](implementation-plan.md)。下一步步骤4先建M-CALL-001时段测试，不依赖真机/Mac/接收端；既有平台运行证据保持未运行。

## 2026-10-14步骤4增量

实际复核Node.js24.18.0/npm11.16.0，创建packages/core的ES modules/.mjs测试工程；仅用内置node:test/assert、子进程隔离时区，无新依赖或node_modules。版本/5个文件语法/模块加载检查退出0。

真实单元命令与TAP见[step-4/run-1/checks.json](../evidence/step-4/run-1/checks.json)：替身11项通过（退出0）；时段43项中41个目标断言红灯、2项窄范围通过（退出1）。记录脚本整体退出1，不代表入口不可用，也不称时段已通过。时钟/电话替身仅仿真，无手机/真实线路接入。

没有安装JDK/SDK/Xcode、补设备或重复已知失败的原型构建；平台条件继续沿用前次记录。下一步5先实现确定的时段规则，未运行的集成/容量/双端E2E留[test-matrix](test-matrix.md)。

## 2026-10-14步骤5/M-CALL-001增量

继续使用Node.js24.18.0与内置Intl/node:test/assert；无依赖安装。本轮新增纯时段实现、window-cli、扩展边界和CLI测试；8个文件语法/模块加载及时段48/替身11/CLI6全部退出0。原43项时段断言/文件未改，41个目标红灯转绿。

命令、版本、哈希、TAP和独立退出码见[green-1/checks.json](../evidence/step-5/M-CALL-001/green-1/checks.json)；npm时段CLI示例实际退出0，见[cli-example.json](../evidence/step-5/M-CALL-001/cli-example.json)。CLI执行即退出，没有常驻服务/电话接口。平台工具/设备仍沿用缺口，未重复构建或拨号。

下一步继续复制步骤5，先做M-CALL-002资格/拒绝/权限纯守卫；其他Store/并发/真实设备证据依各自条件补齐。


## 2026-10-15连续步骤5增量

本机继续使用Node.js v24.18.0、内置test/assert/Intl/sqlite/fs/child_process，未安装新依赖。已实际运行SQLite文件事务、唯一索引、重开、多进程授权/拒绝/消费与5个进程退出位置；工具可用性与业务结果分别记录。当前26份ES模块语法与入口加载退出0，总回归131项全通过，见[checks.json](../evidence/step-5/continuation/final-regression/checks.json)。

本地模拟CLI/npm演示已运行，默认持久数据库位于项目.local（Git忽略），仅接受合成数据；生产鉴权/同步/手机API未接入。原型文件与旧红灯保留；缺设备/SDK/Mac的环境状态沿用已有事实，没有重复安装/构建/真实拨号。node:sqlite仍只作为本地仿真选择，不把RC接口视作已选生产架构。

运行记录跨夜，容量出现长时样本；保留全部原始时间，并针对异常完成一次独立复测，功能结果一致。耗时差异未归因，不以墙钟跨度估算有效工日。下一步为步骤6验收本地范围。

## 2026-10-15步骤6实测

[baseline](../evidence/step-6/baseline.json)实际复核Windows build26300、Node24.18.0、Git2.55.0.windows.3、Python3.14.3，交互记录PowerShell7.6.6；未安装新依赖。Java/javac/adb/Gradle/xcodebuild/xcrun/Swift未找到，无新增设备/Mac访问。两端构建/安装与真实通话未运行，早期构建启动失败证据仍保留。

本轮136项npm测试退出0、28mjs语法检查退出0、69项原型静态检查退出0；npm演示与两次交互启停退出0。node:sqlite仍仅本地仿真，未选择生产栈。当前交付状态见[acceptance](acceptance.md)；下一步2补平台证据，相关行为缺口回3。

## 持续推进：项目内Android工具和实际浏览器

D020已明确接受许可并授权安装，仅本项目.tooling。Temurin17.0.20.1+1来自Adoptium官方GitHub发布，下载SHA-256核对；Android commandline-tools15859902来自Google官方，SHA-256核对。原Adoptium API请求403，改用官方GitHub发布元数据，无第三方镜像。来源：[Temurin发布](https://github.com/adoptium/temurin17-binaries/releases)、[Android官方下载/许可](https://developer.android.com/studio)。[下载记录](../evidence/continuation-1/toolchain-downloads.json)。

实际安装SDK platform android-36、build-tools35.0.0、platform-tools37.0.1（adb1.0.41）。Java/SDK/Gradle用户与缓存目录均在.tooling，环境变量仅子进程/当前脚本生效，不改系统PATH、注册表或全局Git。Gradle8.13/AGP8.13.2原锁定配置实际构建APK成功；lint修复后0错误、10警告。APK和源码哈希见[android-apk](../evidence/continuation-1/android-apk.json)。

本机已有Chrome/Edge，未装浏览器/npm依赖；实际Chrome CDP执行13个工作台检查点，通过且无运行时异常。浏览器版本见[browser-version](../evidence/continuation-1/browser-final/browser-version.json)。本地服务127.0.0.1:8787已启动并HTTP200。iOS仍无可访问Mac/Xcode/签名真机，未构建/未运行；Android模拟器不替代销售SIM/显号证据。

## Android模拟器实际结果（2026-10-15）

AOSP Android16/API36 x86_64、Emulator37.2.12、独立AVD，06:17:02～06:21:33（东八区），已完成APK安装/启动。5检查通过：人工一次产生simulated_request；定时后暂停，等待35秒无新增请求；暂停时人工触发被挡；重新配置后30秒定时，回桌面后产生第二条模拟请求；全程没有request_about_to_submit/request_submitted事件。精确定时app-op在此自有模拟器上显式允许，不能据此假定用户手机已授权。

[完整命令/退出码/设备/断言](../evidence/continuation-1/emulator/result.json)、[事件](../evidence/continuation-1/emulator/events.jsonl)、[实际截图](../evidence/continuation-1/emulator/android-simulation.png)。模拟器测试完成后已关闭；物理设备列表为空。真实SIM、双卡、显号、接通/讲话、撤权/来电/锁屏实际外呼及全天队列仍未验证，不能标整端通过。

启动时发现模拟器在用户.android生成4个运行缓存。已核对创建时间均属于本次自有模拟器，逐文件移入项目.tooling保留，未碰原有ADB文件；补ANDROID_EMULATOR_HOME与兼容目录配置。[修正记录](../evidence/continuation-1/emulator-cache-correction.json)。此项为工具缓存修正，不是手机业务通过证据。


## 2026-10-15 S23 Ultra物理设备

USB授权连接实测SM-S9180、Android16/API36、系统安全补丁2026-08-05、One UI属性80500、时区Asia/Shanghai；不是模拟器。既有0.1-spike APK哈希一致，adb install返回Success，Activity启动成功。电话/状态/号码权限已通过系统界面授予；原型列出电销卡/长治卡，用户指定电销卡。测试应用精确闹钟权限经系统界面从关闭开启；后台RUN_ANY_IN_BACKGROUND初值ignore（限制），保留该条件下失败证据。连接/安装记录见[evidence](../evidence/platform-validation/s23u-20261015/install.json)。iOS环境仍未提供。


## 安卓交接实现增量（2026-10-15）

新增安卓开发入口沿用原Node24.18.0/SDK36/JDK17/Gradle，无新增依赖或全局设置。新APK已安装同一S23 Ultra，包SHA与本机构建相符；原电话提交仍3次，见evidence/android-handoff/device-final.json。


2026-10-15只读能力增量：同一S23 Android16/API36安装新debug包SHA-256 `6a7ded77498047660d0b31ea31ca7b2da8729cdd457c63922d11cd5404d36e95`；项目现有Java/SDK/Gradle构建与lint通过（0错误10原有警告），未新增依赖/修改全局配置。手机墙钟相对主机读取结束时间曾快27136ms；未修改设备时钟，快照采用主机读取时间并保留设备时间。


2026-10-15 R035更新：同一S23安装APK `72ef99c348e6c2bf14988c517343cffacb77635deea38a4a8bcb0ff66b2d0cd8`；项目JDK/SDK/Gradle复用，无新增依赖。Android构建/lint通过（0错误10原有警告）。本轮没有调整手机/电脑系统时钟；测试注入主机命令时间±1天，设备接收使用elapsedRealtime及BOOT_COUNT。


2026-10-15 R041：沿用项目JDK17/SDK36/Gradle；新APK SHA256 `495dfa7a0b0d05e5fd73c0fa14478273932d124734964542770a8ec47d358718` 已安装S23并在脚本inspect核对一致。构建/lint通过（0错误10原有警告）。Windows PowerShell5首次构建包装命令因stderr处理失败，改用已安装pwsh7执行成功；无新增依赖/全局配置。


2026-10-15 R046：复用JDK17.0.20.1、SDK36、AGP8.13.2、Gradle8.13；新APK `85ce25aa66d65e7c639c57e593bc7bed99e42e3eede0af9f911d3f6666e8712f` 仅本地构建，未安装。S23原已装SHA仍为495dfa7a…358718，本轮未读取/更改手机。构建/lint及aapt2 Manifest检查通过，无新依赖或全局设置；现有运行服务保持旧批准指纹，新APK安装前不要直接重启到新指纹配置。


2026-10-15 R048增量：沿用Node v24.18.0、项目JDK17.0.20.1和既有Android工具，无新增依赖或全局修改。最终APK SHA256为4ba21408adebd361d9b06993a971a125ef84daaa37f4c04ac096f7ee4cd38d59；构建/lint成功，0错误/10警告。新APK未安装，设备连接状态本轮未检查；现有网页服务未重启。


2026-10-15 R050：S23 SM-S9180（YOUR_DEVICE_SERIAL，Android16/API36）USB实测连接。安装前手机空闲，Probe dryRun=true/paused=true/armed=false；保留现有数据与旧APK备份.local/native-db-prior-installed.apk。安装-r成功，新APK SHA256 cb3691179c5a9fd249ed0ace534bb1a3aaed18862f0a676bc259c347205dd834；手机摘要一致。安装后仍空闲/暂停仿真，ControlledCallActivity与ControlledReconcileActivity打包disabled且无系统启用覆盖。网页PID22480，HTTP /observed 200；浏览器34项通过。无新依赖，无真实外呼。


2026-10-16 R060实测：项目内adb成功发现既有S23，USB provider读取SM-S9180/API36，APK摘要匹配，权限齐全，双卡可识别，电销卡唯一且可选，读取当时空闲。证据evidence/contact-config/usb，非持续状态保证。Node24.18.0，未安装新依赖；首次访问工作台连接拒绝（服务未运行），随后使用既有启动脚本恢复。

## 2026-10-16 14:17 R082设备快照
S23 SM-S9180，Android SDK API36；安装SHA256 cb3691179c5a9fd249ed0ace534bb1a3aaed18862f0a676bc259c347205dd834与既有绑定一致，双卡中指定卡匹配1个且启用；CALL_PHONE/READ_PHONE_STATE/READ_PHONE_NUMBERS均已授予，inCall=false。Node24.18.0；evidence/android-readiness-r082/readiness，退出0。是当时快照，不作为后续呼叫永久前置条件。最终原生许可关闭/组件禁用见final-collector。

## 2026-10-16 R093工作区实测
沿用项目内Java17.0.20.1、Gradle8.13/AGP8.13.2、SDK36/adb、Node24.18.0，无新依赖或全局配置。S23 SM-S9180/API36 USB已授权，用户解锁后实际UI操作通过；末尾仿真包强停。安装APK SHA256 724997ec4a6b964585c7122ecd1a677655ef1dc6f185e4585358c0ea3be3c0bc与本地一致，仅SCHEDULE_EXACT_ALARM；新工作区当前未用闹钟调度，无电话/网络权限。构建/lint退出0，0错误6警告；实际UI30/隔离21/闭环回归97及容量200均有证据evidence/android-workspace-r093。原受控APK摘要不变，未改其许可/绑定或拨电话。其它机型/locale/全天可靠性未验，iPhone环境本轮未使用。


2026-10-16 R094：沿用Node24.18.0、Java17.0.20.1、Gradle8.13/AGP8.13.2、SDK36，无新依赖/全局改动。S23 SM-S9180/API36实际前台/桌面后台闹钟、暂停/强停重开及同包SIGKILL模拟进程丢失后新PID回调通过；并非系统内存压力或锁屏深度休眠实测。APK 6df4ef7654c017f4005cba8136cc322d6a66e3dd281cb94b635a19975dd3bbde与手机安装匹配，仅SCHEDULE_EXACT_ALARM。构建/lint0错误6警告，旧真实APK/许可保持，0电话。最终工作区4联系人6模拟尝试/0待核对、version29暂停。证据evidence/android-workspace-timer-r094/acceptance.json。


2026-10-16 R095：沿用Node24.18.0、项目Java17.0.20.1、Gradle8.13/AGP8.13.2、SDK36，无新增依赖/全局修改。S23 SM-S9180/API36，用户解锁后号码暂存UI19检查及固定隔离30断言通过；末尾独立包强停。新APK 95bcd53c30e908ad603937cb8e618e0b462c63e8f5afcce846d12f7abf94ebe9与手机安装匹配，仅SCHEDULE_EXACT_ALARM，无电话/网络权限，allowBackup=false。构建/lint0错误7警告（新增号码UI国际化1条）。当前不安排任务，超18:00仍可做号码输入检查，没有改拨号时段。首次锁屏UI未运行；SQLite重开仅头27/95变化的独立复现及业务摘要证据保留。旧真实APK/许可未改，0电话。


2026-10-18 R096/R097：沿用Node24.18.0/项目Java17.0.20.1/Gradle8.13/AGP8.13.2/SDK36，无新依赖或全局配置。首轮USB未检测到设备，用户开启调试后S23 SM-S9180/API36连接并解锁；98隔离SQLite和20/21界面检查通过。最终APK b014d26fa6c26c1ee1f75bbaf0a12c47b18c5f8038b2dfa119ef4f8a012be0e3与手机安装匹配，仅SCHEDULE_EXACT_ALARM，无电话/网络权限，allowBackup=false。无真实外呼，当前周日，真实外呼规则仍为工作日09:00～18:00。结束仿真包强停；未改原app/绑定/许可或系统全局设置。


2026-10-18 R098/R099：沿用Node24.18.0/Java17.0.20.1/Gradle8.13/AGP8.13.2/SDK36，未安装依赖/改全局。原仿真APK 780741882df60518f53e66031fb6c3b699e373b381111433a362d5c9d8289af9安装匹配，schema5、355原生/647Java/600解析及用户区升级10检查通过，仅SCHEDULE_EXACT_ALARM且DEX无Telecom。新包com.mantou.salesdialer.pilot已安装用户0（S23 SM-S9180/API36），APK a180d4af90e3086ece308a16d31251a3bb5fe29bcfc6a78746fd591386a8bce0，build/lint0错误6警告。原真实/仿真包与名单文件保持。
新包安装时call/state/number权限false、exactAlarmAllowed false、backgroundRestricted true、idle未知；当前实际名单0/尝试0/许可停用。09:31只读系统检查3项phone权限仍false、RUN_ANY_IN_BACKGROUND ignore，SCHEDULE_EXACT_ALARM无操作记录/default；未自动grant或改后台设置，必要操作已通过async请求用户。Android存在不可访问的user150，包枚举明确--user0，未访问其它用户。新包不继承旧包授权；没有真实外呼，也未用iPhone环境。


## 2026-10-18 09:35～09:36 R099设置后实际核验

用户答复“三项已设置”；postgrant实测CALL_PHONE/READ_PHONE_STATE/READ_PHONE_NUMBERS全true、exactAlarmAllowed true、backgroundRestricted false；S23/user0空闲，显式选择电销卡与旧accountKey摘要一致，不输出完整号码/标识。临时撤回READ_PHONE_STATE后idle未知且无许可/尝试；仅恢复原已授予权限，绑定保留。新APK摘要仍a180d4af90e3086ece308a16d31251a3bb5fe29bcfc6a78746fd591386a8bce0，无代码/依赖/全局设置修改。46驱动检查通过，最终强停本包；本次测试0电话。原包/原数据库字节不变；新试点格式1生成记录/1草稿/计划2暂停，实际0/0/计划0暂停。证据evidence/android-pilot-app-r099/postgrant与audit-postgrant，退出0。原09:31未满足是历史观察，不覆盖本次状态。


## 2026-10-18 10:45 R100/R101当前软件与设备

2026-10-18 10:45（R100/R101）：已连续交付本机批量草稿预览/明确原子创建，以及不同目标、授权尝试、API确认、人工结果分离的累计/北京时间今日统计。689 Java断言、600解析向量、398 S23隔离断言、批量UI44驱动检查、新版只读UI43驱动检查及20配置/停用断言通过。试点0.3-batch-metrics已安装S23；本轮0真实电话，实际区0联系人/0尝试/plan0暂停/许可停用，格式区2生成记录/2草稿/plan2暂停。原资料/权限/电销卡保留；整体仍部分通过，新包真实通话、自动批量队列、企业身份与全天多机型尚未验收，iPhone暂缓。当前继续步骤5可独立实现项；真实通话条件只影响该部分。

复用Node24.18.0、Java17.0.20.1、Gradle8.13/AGP8.13.2、SDK36，无新依赖。试点APK SHA256 fe55ddb990fe9d698ee74ef84574600e7a0ab7787307cc59021bc7f3b9be7454；仿真0.2-simulation-batch APK 86b3e8f874a133a26b56f7748e820d0bb06230ccacd9fe0f4a4a25f5a1acc0e9，均与S23安装一致。BuildAll一次Gradle构建两模块通过；pilot lint0错误6警告、standalone0错误8警告。只读界面/报告核对3手机权限/精确闹钟均true、后台不受限，电销卡保留。新包应用更新后只有元数据读取、许可停用；结束两包强停，旧spike APK不变。首轮HexFormat API34 lint错误改兼容十六进制编码，不提高minSdk31。其它机型/系统/locale与真实新通话仍未验证。


## 2026-10-18 企业本地集成

现有Node v24.18.0/npm11.16.0；Windows PowerShell7；项目内JDK17.0.20.1/Gradle8.13/AGP8.13.2/SDK36继续复用。新增企业工程仅使用内置node:sqlite/http/crypto，无安装依赖或全局配置修改。Android试点增加普通INTERNET权限，明文流量仅127.0.0.1；仿真包仍无网络/电话权限。企业会话由Android Keystore保护，服务私有资料目录.local/enterprise设置当前Windows用户与SYSTEM访问；实际凭据不进入evidence或Git。

S23 SM-S9180/API36通过USB连接，当前界面验收需解锁。构建使用离线缓存成功；历史SDK XML版本警告保留，不记为失败。python不是PATH命令，执行脚本使用既有py；本轮一次误用python和一次Windows直接spawn npm失败均保留，改正后以真实命令复验。


2026-10-18 17:36 R105许可准备验证仍仅Node24内置crypto/fs/node:test/sqlite，无安装依赖/费用/全局变更。隔离测试使用项目.local/enterprise-tests，测试从npm包目录运行时路径已改为模块位置解析，避免CWD差异。只读核查S23/当前APK/默认禁用状态，无实际许可部署或电话。


2026-10-18 R105关闭工具继续使用Node24内置fs/crypto/sqlite和已有adb，无安装依赖/云服务/全局设置变更。S23不需解锁即完成仅已停用状态的真实CLI检查，未写入许可、未新建任务、未改权限/选卡。准备与关闭仅项目私有锁/临时文件操作，无递归删除业务资料。


2026-10-20 R108增量：沿用Node24.18.0、项目JDK17.0.20.1、SDK36/现有离线Gradle，无新依赖；S23用户0升级0.6/code5，SHA256 e93cc8288577d89e85d5af03855eeb1445e4e38965960ff0fba8671a4a9cad5c。原服务SQLite schema2→3，迁移私有快照及12表不变核对通过。隔离生成LIVE测试期间撤销CALL_PHONE，结束已恢复用户0原权限，原服务已恢复。构建有既有SDK XML版本提示，assemble/lint退出0。


2026-10-20修复后最终APK仍为0.6/code5，SHA256 463339eb00d7aa75d8bb471daca275c8f9e91d310f5b16ad186de6b4d47b5c57；此前e93摘要对应单勾选失效修复前候选。最终installed/build摘要相符，原服务和用户0电话权限恢复，详见operator-batch-r108/final-audit。


2026-10-21：S23 SM-S9180 Android16/API36 用户0安装0.7-result-navigation/code6，SHA256 54e455d99c2f8372dd2b5561f5f6f74b4793b5d03fe22ba14b55b21ac78146ec，与项目构建一致。Node24.18.0及现有JDK/SDK/Gradle复用，无新增依赖。临时REHEARSAL服务stdin正常退出，原8790服务恢复，13业务表保持、CALL_PHONE用户0原权限保持，退出/许可清除/闹钟DISABLED/手机空闲。版本与命令见result-navigation-r109/{build,package,device,final-audit}。


2026-10-21 D034/R110：方案①Wi-Fi改造完成并安装0.8-wifi-enterprise/code7，APK SHA256 17ec89e777ddb411409ed31f0d101af1c29a4dbb8c5bcee699313517373a2158。仅指定私有IPv4的TLS网关8791代理原127.0.0.1:8790；原生配对、固定证书/默认主机名校验、独立配对凭据和原账号认证，WebView仍只加载APK可信资产。无新依赖、无新增权限、未改全局网络/防火墙或部署公网。72项企业回归、S23纯Wi-Fi路径生成YOUR_DEVICE_SERIAL项及最终断线/错误证书18项通过；构建/lint/包检查通过。移除adb reverse8790后正式LIVE登录绑定9检查通过；未实际拔线作为独立观察，ADB仅用于调试控制。临时夹具已正常退出，原企业服务及Wi-Fi网关恢复、13张真实业务表保持，LIVE仍9尝试/9API接受/人工完成3未接6/待核对0，手机已正式登录、双端无许可/闹钟DISABLED。0新增电话。原USB通话证据不直接替代新版真实无线通话；该项待新有界授权。证据evidence/wifi-r110/acceptance.json及各run.json（Node24.18.0/命令/版本/退出码/源码摘要）。


## 2026-10-21 0.10增量

S23 SM-S9180 Android16/API36用户0，0.10/code9已安装，APK摘要aec0a27a8b10fadde3ac256388e5d651bfcfe300f086587dc4ae6513924e7ecc；Node24.18.0/JDK17.0.20.1/SDK36沿用。无新依赖/权限，无全局配置变化。原本地服务/配对Wi-Fi网关已恢复；业务USB转接不存在，ADB仅UI调试。正式账号已登录，无定时票据/有效批次许可/待核对。47项真机REHEARSAL通过，0真实电话；电脑与手机仍须同网，完全独立手机版未实现。


2026-10-22 R113：Node24.18.0、项目JDK/SDK及Gradle缓存复用，无新增依赖/权限。0.11/code10构建/lint完成；adb devices无已连接设备，未安装/未运行；原企业服务/schema3未重启迁移。源码升级目标schema4，先备份再安全部署。


2026-10-22当前：S23已连接、0.11.1/code11安装，与构建SHA256 2cd0a510daae889528b32cae8c2c254c14a2a8ed68bf49ed95c36e28b7ad7649一致。原企业服务8790和Wi-Fi网关8791恢复，schema4；正式账号已登录，现有电销卡绑定保持，0许可/闹钟DISABLED/0待核对，USB业务转接不存在。新CSV不新增权限/依赖；超限/坏编码读取路径未独立真机注入。


2026-10-22：0.12-excel-import/code12已安装，SHA256 3a96e32be510162057260fcb023e0d6714db2009814908918b81a61b6c09e45d；Node24.18.0/JDK17.0.20.1/SDK36沿用。项目内新增read-excel-file 9.3.12，npm安装报告新增7包/审计8包/0漏洞；MIT及捆绑fflate/saxen许可已保存，不改全局配置。新增2可信Web资产，总计6；原5权限保持。schema4与原账号/原SIM绑定保留，正式服务与Wi-Fi已恢复，0许可/0待核对。
