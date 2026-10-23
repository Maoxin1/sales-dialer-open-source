# 当前：0.12已安装，支持直接导入Excel

2026-10-22：0.12-excel-import/code12已安装S23用户0，正式服务与Wi-Fi网关已恢复，正式销售账号已登录。现在手机和电脑可直接选择.xlsx文件；原CSV和三列粘贴继续可用。

**名单→导入名单→选择Excel / CSV文件→预览→确认导入**。Excel首表须含电话、公司、姓氏，列顺序可调；最多200条/批，公式先转值，旧.xls另存.xlsx。

[Excel模板](templates/contacts.xlsx) · [使用说明](docs/excel-import.md)。导入本身不拨号，仍需选中名单并在手机确认批次。

85项企业测试、37项引导浏览器和23项原浏览器检查通过；模板表头/空名单与伪造展开长度拒绝检查通过。S23系统文件选择→实际读取共享字符串.xlsx→预览→确认导入3条生成联系人→选2条定时记录→结果→自动下一条→后台→冷开恢复，共55检查通过，2条记录型请求最短间隔30249ms。本轮0真实电话，未导入真实名单。构建/lint/包检查通过，原5项权限保持、6个可信Web资产与APK一致。

下一步复制步骤6：用户用自己的小批合格Excel名单独立走选择文件→预览→导入→选择/核对→手机确认→结果→结束，观察可用性；T856本人连续两轮/准备≤60秒仍未测。助手代执行真实外呼须新有界授权及接收端当下同意，T845真实Wi-Fi电话仍待证据，不复用旧额度。发现具体问题回步骤5；iPhone和停卡换卡继续暂停。

首次安装测试依赖：npm ci --prefix packages/enterprise --ignore-scripts；测试：node --test packages/enterprise/test/*.test.mjs。构建/启动沿用下方说明。

---

以下为历史记录（当前状态以上方为准）：

# 当前：0.11.1三列名单已安装可试用

2026-10-22：0.11.1-contact-profile/code11已安装S23用户0，企业服务已恢复并完成schema3→4升级，原账号已通过Wi-Fi登录；日常仍无需USB，电脑须开机并与手机同网。

支持电话、公司、姓氏三列Excel粘贴和UTF-8 CSV；手机“选择CSV文件”打开系统文档选择器，只读取所选单文件，不新增存储权限。文件载入后先预览、再确认导入，不自动创建队列/许可；公司与姓氏加密保存并在名单/核对/结果显示。旧单列兼容，同号不覆盖已有资料，资格/时段/SIM/间隔/未知恢复规则保持。

操作：**名单→导入名单→选择CSV或粘贴三列→填写来源/资格→预览→确认导入→勾选→继续→核对时间与电销卡→手机确认**。挂断后在“拨号”填写真实结果。Excel表头为电话、公司、姓氏；每批最多200条，非每日上限。见[导入说明](docs/contact-import.md)和[模板](templates/contacts.csv)。

81项企业测试、33项引导浏览器与23项原浏览器检查通过；S23实际系统选择器打开/取消/选择测试CSV、三列粘贴、预览/导入、定时记录/结果/自动下一条、后台与冷开恢复共55检查通过，记录请求2次，最短提交间隔30351ms。构建/lint与原5项权限/4可信资产包检查退出0。本轮0真实电话。

下一步复制步骤6：销售本人连续两轮独立完成选择→核对/确认→结果→结束，准备目标≤60秒仍待实测；可先用隔离演练数据，不为界面验收增加真实外呼。T845新版真实Wi-Fi受控通话仍待新有界授权和接收端当下同意，不复用历史额度。发现具体缺陷才回步骤5。iPhone及停卡换卡暂停，不新增.xlsx/CRM/报表。

---

以下为历史记录（当前状态以上方为准）：

## 2026-10-22新增：电话＋公司＋姓氏批量名单

0.11-contact-profile/code10已构建，**尚未安装S23、正式服务尚未升级**，当前手机仍0.10。支持Excel三列含表头复制粘贴/UTF-8 CSV→预览→确认导入；名单、批次和结果显示公司/姓氏，按电话去重。导入不会自动启动电话。见[三列使用与升级说明](docs/contact-import.md)和[CSV表头模板](templates/contacts.csv)。每批最多200条，原自动拨号规则保持；81项企业测试、33项新浏览器与23项原浏览器检查通过。

---

以下为历史记录（当前状态以上方为准）：

# 当前版本：0.10，简化销售工作区

2026-10-21 D035/R112：0.10-guided-workspace/code9已安装S23用户0（Android16/API36），SHA256 aec0a27a8b10fadde3ac256388e5d651bfcfe300f086587dc4ae6513924e7ecc。名单/拨号/记录/设置分区；名单勾选→继续→设置时间→核对本批→原生明确确认后启动。核对预览不创建计划，取消/失败停止已建计划并清理本批许可，不自动重试。导入和维护按需展开，待核对结果留在拨号页，历史中文展示。原默认5秒、工作日09:00–18:00、30秒间隔/执行窗口、资格/未知/选卡/确认规则保持。

使用：

1. 电脑双击项目根目录的 start-enterprise-wifi.cmd；手机与电脑同一Wi-Fi，打开“销售拨号·受控试点”→“企业账号与自动队列”，沿用原账号。
2. 在“名单”勾选有联系资格的联系人，点“继续”。导入新号码时展开“导入名单”。
3. 在“拨号”设置未来开始时间，点“核对本批”，检查名单/数量/时间，再点启动并完成手机原生确认。默认留空仍为5秒后，不改变原规则；建议预留确认时间。
4. 挂断后回“拨号”填写真实结果；已挂断且结果明确后，至少间隔30秒处理下一条。未知结果先核对，不自动重拨。
5. 结束点“暂停新拨号”；历史见“记录”，连接/电销卡/账号见“设置”。停止电脑服务前先暂停、核对、退出，再双击 stop-enterprise-wifi.cmd。

75项企业测试、27项新引导浏览器检查、23项原浏览器回归及47项S23生成REHEARSAL检查通过，构建/lint/可信包检查退出0。S23两条记录请求间隔30348ms，覆盖前后台和冷开未知保留；0真实电话。原服务与Wi-Fi网关已恢复，13张真实业务表逐行快照一致，LIVE仍9尝试/API接受9/人工完成3未接6/待核对0。正式账号Wi-Fi登录绑定9检查通过，闹钟DISABLED、双端无拨号许可，USB业务转接不存在；USB仅用于调试，不声称测试时物理拔线。

下一步复制步骤6：只验本轮可用性，销售本人连续两轮不靠助手找按钮完成选择→时间/核对→确认→结果→结束，准备目标60秒以内（不含等待和通话）；尚未实测，不记作通过。可先使用隔离生成演练数据，不为界面验收强行增加真实通话。无线真实SIM链路T845仍未运行，需新的有界授权和当下接收端同意后回步骤2取证，再步骤6有限验收；旧额度不得复用。发现明确界面缺陷才回步骤5。iPhone、停卡换卡暂停；全天200真实尝试/多机型/费用仍未验证，不新增功能。

本地验证：node --test packages/enterprise/test/*.test.mjs；浏览器生成资料检查：node tools/record-core-run.mjs evidence/guided-workspace-r112/browser-repeat R-CALL-112 node tools/check-enterprise-guided-browser.mjs；构建/lint：pwsh -NoProfile -File tools/check-pilot.ps1 -Mode Build；包边界：pwsh -NoProfile -File tools/check-pilot-package.ps1。不依赖云账号或新增付费服务，未发布公网。原始日志/测试账号/密钥不上传GitHub，见 evidence/release-summary.json。

---

以下为历史记录（当前状态以上方为准）：

# 当前：S23可通过Wi-Fi连接电脑企业服务（0.8版）

日常无需USB；电脑需开机，手机与电脑连接同一局域网。电脑双击start-enterprise-wifi.cmd→手机打开“销售拨号·受控试点”→企业账号与自动队列，沿用原账号。S23已完成配对和正式登录。

72项企业回归、S23无线演练43项、断线/证书拒绝18项及构建/包检查通过，本轮0真实通话。新无线通话仍需受控验收，未宣称全天已可生产。

[Wi-Fi使用说明](docs/wifi-quickstart.md) · [验收状态](docs/acceptance.md)。结束先在手机暂停/核对/退出，再双击stop-enterprise-wifi.cmd。原始证据保留本机，仓库只含[脱敏验证摘要](evidence/release-summary.json)；本机密码、配对密钥、真实号码、APK和SDK未上传。

---

以下为历史记录（当前状态以上方为准）：

# 当前：安卓S23自主小批试用已跑通，0.7已安装

2026-10-21：R108/T835新版自主批次受控实拨通过：销售亲自在手机确认，两条按原顺序提交，第一条尾5235人工COMPLETED、第二条尾7214人工NO_ANSWER；用户确认第一通双向语音清楚，两端来电显号均为尾9486。两次提交间隔178974ms，队列FINISHED、待核对0、两通额度耗尽。累计9授权/9 API接受/人工完成3未接6；系统实际呼出/接通自动统计仍未取证，不冒充人工结果。证据evidence/operator-batch-r108/20261021-acceptance.json。

R109/T836修复长页面找不到结果入口：0.7-result-navigation/code6已安装S23用户0，底部固定“有N通待核对 · 去填写结果”，点击只定位对应卡片，不写结果或发起电话；待核对清空/退出/失效后隐藏。业务红灯为缺少入口，修复后浏览器21项、S23隔离生成REHEARSAL完整流程41项通过，构建/lint/权限与可信资产包检查均退出0；2次记录请求最短间隔30176ms，前后台与冷开UNKNOWN保留。本轮界面验证0真实电话。

启动：双击prepare-s23-trial.cmd，保持USB连接；手机打开“销售拨号·受控试点”（无蓝色副本标记）→企业账号与自动队列→LIVE销售登录→选择合格联系人→安排未来时间→确认本批并启动。挂断后点底部“去填写结果”，保存真实结果后自动下一条，提交至少间隔30秒。停止先暂停/核对/退出手机，再双击stop-enterprise.cmd。

[简明说明](docs/s23-trial-quickstart.md) · [验收](docs/acceptance.md)。当前可用范围为本机本地服务＋USB＋已验证S23的小批试用，全天约200次/更多机型/实际费用尚未验收；iPhone与停卡换卡暂停。

检查命令：`npm --prefix packages/enterprise test`；`pwsh -NoProfile -File tools/check-pilot.ps1 -Mode Build`；`pwsh -NoProfile -File tools/check-pilot-package.ps1`。浏览器：`node tools/record-core-run.mjs evidence/result-navigation-local-check R-CALL-109,T-CALL-836 node tools/check-enterprise-browser.mjs`（每次使用新证据目录）。真机无电话E2E的隔离服务/执行/恢复方法见docs/manual-steps.md；不要对真实企业运行生成夹具。

---

以下为历史记录（当前状态以上方为准）：

# S23自主批次试用：0.6版已安装

2026-10-20：现在可在手机“安排→确认本批并启动”，无需助手生成许可文件。每目标本批一次；当日最迟18:00失效，暂停、改名单/计划、退出和冷开后重新确认，UNKNOWN不重拨。

电脑先双击prepare-s23-trial.cmd，手机用LIVE销售账号；[简明操作说明](docs/s23-trial-quickstart.md)。挂断后在手机填结果，系统再处理下一条；结束退出手机后运行stop-enterprise.cmd。

软件及无电话检查：服务69、Java新增11、浏览器17、S23原生42及记录型完整37通过；原服务和权限已恢复，本轮0真实电话。新版自主许可的实拨仍待受控验证，全天使用尚未验收。

---

以下为历史记录：

# 销售拨号助手：S23自主批次试用

2026-10-20，当前手机已安装0.6-operator-batch/code5。电脑双击prepare-s23-trial.cmd，手机登录LIVE销售账号→勾选合格联系人→安排→“确认本批并启动”。每条本批一次，当日18:00前有效；暂停、改名单/计划、退出或重开后重新确认，未知不重拨。销售无需再让助手生成许可文件。

[简明使用步骤](docs/s23-trial-quickstart.md)。结束先暂停/核对并退出手机，再运行stop-enterprise.cmd。账号保留在本地私有文件，不贴出密码。

69项服务回归、Java新增11边界、构建/lint/权限、浏览器17检查，以及S23隔离生成数据/拨号权限撤销下42检查通过。本轮0真实电话，0.6新版自主许可的实拨闭环仍需受控验证，当前整体部分通过；旧版7通不算新版已验收。iPhone和停卡/换卡继续暂停。

---

以下为历史记录：

# 当前：S23首轮实际操作试用已完成

2026-10-20：两条已有受控目标由用户亲自填写结果，第一条完成后自动处理第二条，队列自然完成；双端许可已撤销，待核对0。累计7尝试/人工完成2未接5。连接入口prepare-s23-trial.cmd已实测可重复运行；[试用操作说明](docs/s23-trial-quickstart.md)。

当前仍需工程协助许可准备/撤销与本轮启动，尚未达到销售完全自主日常批量使用。后续只补这一必要操作缺口，不扩大iPhone或附加功能。证据见[本轮验收](docs/acceptance.md)。

---

以下为历史记录：

# 当前入口：S23受控试用

2026-10-20：正式受控接通讲话闭环已通过；当前累计5次尝试/4未接/1人工完成、0待核对。日常试用先双击prepare-s23-trial.cmd，核对电脑服务与USB；手机进入“销售拨号·受控试点→企业账号与自动队列”。完整简明步骤见[第一轮试用说明](docs/s23-trial-quickstart.md)。新入口在S23首次与重复运行通过，均无新电话或许可。

真实许可仍需工程协助按当轮范围准备/撤销，尚未开放自主全天200条；第一轮选尾5235/7214，不等于已授权拨号。结束先暂停/核对/退出并撤销许可，再运行stop-enterprise.cmd；电脑停服不能代替手机暂停。iPhone与停卡换卡暂停。

---

以下为历史记录：

# 销售拨号助手：当前可用入口

2026-10-19本轮增量：按D032暂停停卡/换卡，仅推进其他验证。S23真实重启13检查通过，启动计数299→300，旧系统闹钟清除、冷开旧队列停止、无新增授权/自动恢复。前台有人操作的20条生成数据真实节拍演练通过，耗时约9.73分钟，最短提交间隔30.053秒，20条记录型请求/合成结果完成，队列FINISHED、待核对0。本轮真实外呼0；临时REHEARSAL业务时钟已按原字节恢复，系统时钟与LIVE时间未改。手机空闲、闹钟DISABLED、会话退出、双端无真实许可，LIVE仍为2联系人/4授权尝试/4API接受/待核对0。

仍为本机企业服务＋USB S23的受控试用版本；日常真实批量拨号未开放，不能仅登录LIVE就外呼。停卡/换卡测试暂缓，全天/更多机型及接通讲话仍需真实证据。安装、启动/停止和账号方式不变，见docs/android-enterprise.md；当前验收见docs/acceptance.md。

---

以下为历史快照：

2026-10-19 09:24：新增真实来电响铃占用检查通过（9检查，DEVICE_BUSY，零新增授权/外呼），以及正常工作时段同一队列两个不同受控目标自动衔接通过：按既有导入顺序尾5235→尾7214，观察呼出8165/8348ms；用户先后反馈未接，第一结果后自动处理下一条，间隔79293ms，最终队列FINISHED。双端许可撤销，手机空闲/账号退出/闹钟DISABLED，待核对0；本轮2次新授权耗尽。准备工具补双目标当前同意/双版本/同一签名许可，新增2测试红转绿，企业59整体通过。原Android APK与服务调度代码未变，不重复构建或旧回归。整体产品仍部分通过。

受控试用仍依赖本机企业服务＋USB S23，真实许可已撤销，不可直接全天批量实拨。原启动/停止命令不变。当前范围与下一步以docs/acceptance.md、docs/next-action.md顶部为准。

---

此前记录按日期与版本理解：

2026-10-19 00:54收口：安卓当前可自主执行的实现与验收已完成。S23正式企业链路累计真实受控2通，分别前台8239ms、后台且确认锁屏8495ms，无解锁/确认拨号操作；用户核对两通均未接且接收端都有记录、显号尾9486。双端许可已撤销，0待核对/0活动队列、账号退出、手机空闲，原电话权限恢复，累计2次额度耗尽。新版57项企业测试、37项真机记录型闭环、13项暂停/强停/撤权控制通过，模拟201条容量通过；没有新增生产功能。整体产品仍部分通过，不能把当前受控范围完成写成全产品已验收。

启动/停止：start-enterprise.cmd / stop-enterprise.cmd。手机入口“销售拨号·受控试点→企业账号与自动队列”。真实许可当前已撤销，不能直接启动实拨；演练可使用生成数据。验收范围见docs/acceptance.md，剩余条件见docs/next-action.md。

---

以下为历史快照：

2026-10-19 R106：新版0.5-controlled-window/code4正式企业名单→签名许可→S23原生定时→电销卡实际呼出→用户反馈未接→结果归档→双端撤销已完成1次。系统OFFHOOK与指定号码电话界面共同取证，连续观察8239ms，按用户本次8秒呼出标准通过；不代表接收端响铃/显号/接通/双向语音或全天可靠。企业56测试、14企业定时器断言（含新增5个时钟/版本边界）、Java其余回归和双APK构建/lint通过。证据evidence/enterprise-afterhours-r106/acceptance.json；整体产品仍部分通过。

启动/停止方式不变：start-enterprise.cmd、stop-enterprise.cmd；手机入口“销售拨号·受控试点→企业账号与自动队列”。真实许可目前已撤销，不会恢复外呼。新增受控例外是用户逐次明确授权的签名短期能力，默认关闭，不改变生产规则。详情见[本次实机验收](docs/android-controlled-window.md)。

---

历史记录（以下按版本/日期理解）：

2026-10-18 R102～105：当前安卓本机+USB S23无真实通话软件范围已通过有限验收。本地企业账号/权限/共享拒绝、导入顺序与30秒队列、保留机制、Keystore/原生定时、未知恢复及筛选已交付。673核心Node、52企业Node、720 Java断言/600向量、398 S23 SQLite、17浏览器、37企业闭环、13控制与29筛选检查通过。整体产品仍部分通过；新版真实SIM通话/全天多机型未验，iPhone暂停。详见android-enterprise.md、acceptance.md及evidence/enterprise-android-r105/final-audit/acceptance.json。下方有日期者为历史快照。

R105许可准备工具已补14项边界/恢复检查，当前企业全套52项通过；本轮没有部署真实许可或拨号，说明见[许可准备与恢复](docs/enterprise-permit-validation.md)。

测试后的[本次许可关闭工具](docs/enterprise-permit-closure.md)已交付；无许可时S23实际入口检查通过，生效许可撤销仍待受控验证。

手机打开“销售拨号·受控试点→企业账号与自动队列”。电脑启动 start-enterprise.cmd，管理员入口 http://127.0.0.1:8790/ 。账号和企业代码仅在本机 .local/enterprise/bootstrap-private.json，演练选择REHEARSAL；实际LIVE默认无通话许可。停止手机队列后运行 stop-enterprise.cmd 可停止电脑服务。

安装、USB连接、启动/停止、配置、测试和真实验证边界见[安卓企业工作区](docs/android-enterprise.md)，下一步见[交接记录](docs/next-action.md)。本轮可执行无真实通话工作已完成，不需逐项同意验收；后续准备实际受控通话时进入步骤2。

---

下方为已有开发入口与历史交付记录，旧本机固定身份/旧8787网页不代表当前企业链路。

# 销售拨号助手：当前交付

2026-10-18 10:45（R100/R101）：已连续交付本机批量草稿预览/明确原子创建，以及不同目标、授权尝试、API确认、人工结果分离的累计/北京时间今日统计。689 Java断言、600解析向量、398 S23隔离断言、批量UI44驱动检查、新版只读UI43驱动检查及20配置/停用断言通过。试点0.3-batch-metrics已安装S23；本轮0真实电话，实际区0联系人/0尝试/plan0暂停/许可停用，格式区2生成记录/2草稿/plan2暂停。原资料/权限/电销卡保留；整体仍部分通过，新包真实通话、自动批量队列、企业身份与全天多机型尚未验收，iPhone暂缓。当前继续步骤5可独立实现项；真实通话条件只影响该部分。

手机入口：“销售拨号·受控试点”。新增操作与命令见[批量草稿与统计](docs/android-batch-metrics.md)，进度见[下一步](docs/next-action.md)。

2026-10-16 R095：**安卓本机号码暂存入口已通过检查，完整销售拨号产品仍部分通过。** 手机“销售任务仿真→打开本机号码暂存”，可逐行输入、查看掩码、记录资格/拒绝和重开恢复；已有资格可直接记录，无需上传证明。实际暂存与格式测试分区，真实发送始终禁用，不生成任务或电话。原合成单次自动流程保留，iPhone暂停。最新说明见[号码暂存](docs/android-phone-intake.md)，整体见[验收报告](docs/acceptance.md)。

当前可以使用合成名单/任务工作台、持久化未知结果恢复演示、安卓只读设备检查和独立SQLite检查。销售SIM实际电话原型此前在S23完成3通，用户确认显号、接通和双向语音；这不代表正式任务队列或全天200次可靠。

R094本轮62组527 Java断言、22隔离断言、78定时驱动检查（含重复等待观察）、18计划编辑及10模拟进程丢失检查、97原闭环回归通过；50目标200模拟尝试约1963ms、重开完整。构建/lint0错误6警告。真实电话0，原DEMO/旧真实APK保留。源码、命令/退出码、截图和摘要在evidence/android-workspace-timer-r094。R093移动时钟PAST_DUE失败回归保留，历史验收按日期区分，不把模拟API回执当实际呼出或接通。

R095验证：66组551 Java断言、600固定生成向量与宿主一致、宿主参考8、S23隔离30/UI19通过。构建/lint0错误7警告，实际区0、格式区4生成联系人，0真实电话。当前APK 95bcd53c30e908ad603937cb8e618e0b462c63e8f5afcce846d12f7abf94ebe9。原任务/真实app保持，失败回归见evidence/android-phone-intake-r095。

## 安卓号码暂存验证

下方安装、启动、停止命令仍适用于同一仿真包。手机选择“打开本机号码暂存”；默认进入未认证实际区，“切换号码资料区”选择格式测试，不会复制数据。输入单批1～200行、每行128字符内的大陆11位手机号、非空来源与资格；国家码/座机/分机不转换，新批默认UNKNOWN。只保存本机资料，当前真实任务/电话接口未接。

项目根依次执行Test/Build。设备固定检查：node tools/record-core-run.mjs evidence/phone-fixture-new-run R-CALL-095 node tools/check-phone-intake-fixture-device.mjs --run；UI替换新目录及tools/check-phone-intake-ui-device.mjs --run。需USB授权/本地绑定/旧DEMO暂停，固定检查可锁屏，UI需解锁；只操作生成格式数据，不拨号，不受拨号时段限制。每次换新证据目录，脚本顺序运行，结果/PNG/XML留存且不清库。独立停止命令同下，重新进入保留记录。完整方法/限制见android-phone-intake.md。

## 安卓合成工作区启动、安装与验证

在项目根执行，无新依赖；已有JDK/SDK在项目.tooling，手机需USB调试授权：

```powershell
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Build
.tooling/android-sdk/platform-tools/adb.exe -s YOUR_DEVICE_SERIAL install -r prototypes/android/standalone/build/outputs/apk/debug/standalone-debug.apk
.tooling/android-sdk/platform-tools/adb.exe -s YOUR_DEVICE_SERIAL shell am start -W -n com.mantou.salesdialer.standalone/.MainActivity
```

手机点“打开合成任务工作区”；每行输入SIM-101等合成ID，不输入电话号码。当前练习身份固定，不需账号配置。保存计划使用北京时间yyyy-MM-dd HH:mm；仅工作日09:00–18:00可模拟提交。按系统返回离开；需要停止应用时：

```powershell
.tooling/android-sdk/platform-tools/adb.exe -s YOUR_DEVICE_SERIAL shell am force-stop com.mantou.salesdialer.standalone
```

持久数据不删除，重开暂停旧计划、保留UNKNOWN且不重放。新工作区使用synthetic-workspace-v1.db，原DEMO独立保留；不要清数据或回退不兼容APK。当前仅闹钟权限，无电话/网络权限。

手动运行UI E2E（脚本真实点击，但只模拟）：

```powershell
node tools/record-core-run.mjs evidence/workspace-ui-new-run R-CALL-093 node tools/check-workspace-ui-device.mjs --run
node tools/record-core-run.mjs evidence/workspace-fixture-new-run R-CALL-093,T-CALL-640 node tools/check-workspace-fixture-device.mjs --run
node tools/check-synthetic-loop-device.mjs --run
```

每次换尚不存在的evidence目录。手机命令顺序运行，绑定使用已有.local/contact-android.json；上方R093 UI回归需解锁、实际工作时段、无待核对并有两个未使用SIM-900～999；原DEMO需暂停。会追加合成联系人/尝试，不清已有历史。固定fixture需用户工作区已创建，可锁屏，不修改它。最后脚本只强停仿真包；其它机型/locale/真实链路不因S23通过而视为通过。R094历史APK摘要6df4ef7654c017f4005cba8136cc322d6a66e3dd281cb94b635a19975dd3bbde，仅闹钟权限。

R094定时E2E：用上述record-core-run包装器及新evidence目录，依次执行tools/check-workspace-timer-device.mjs --run、tools/check-workspace-timer-controls-device.mjs --run、tools/check-workspace-timer-cold-device.mjs --run；固定规则为tools/check-workspace-timer-fixture-device.mjs --run，均以node运行。需已允许精确闹钟和后台运行、已有一个合格SIM联系人及无待核对；定时和进程丢失脚本需处于实际工作时段。冷启动脚本只用仿真包自身UID结束其进程，模拟普通进程丢失，不改真实app。界面“安排模拟时间”现在会自动安排单次闹钟，手动NOT_DUE不取消它。当前新建会话仍暂停旧计划，普通前后台切换只刷新，停止命令同上。锁屏深度休眠/实际撤权/全天仍未验收。

已新增[受控任务页](http://127.0.0.1:8787/controlled)，可查看绑定/额度/任务；合成演示允许显式核对，真实记录模式只读并可查询已有回执。当前服务为独立持久合成演示，顶部标明来源。已新增[我的名单](http://127.0.0.1:8787/contacts)：本机逐行输入、去重、资格/拒绝管理和掩码展示。已支持从名单保存、改期和取消本地任务计划；当前没有生产登录或实际发送操作。网页不进行真实外呼。iPhone原自动拨号目标保留，按mantou决定最后验收；固定语音独立下一轮。

## 本地启动与停止

项目：`D:\mx\AI-Workspace\Projects\sales-dialer`。使用现有Node.js v24.18.0，无需安装core依赖。在项目根执行：

```powershell
pwsh -NoProfile -File tools/start-workbench.ps1 -AndroidSerial YOUR_DEVICE_SERIAL
```

打开[本机工作台](http://127.0.0.1:8787)或[安卓设备验证页](http://127.0.0.1:8787/observed)。该命令启动后台服务；停止时执行：

```powershell
pwsh -NoProfile -File tools/stop-workbench.ps1
```

只运行不连接设备的前台仿真工作台：`npm.cmd --prefix packages/core run workbench`，用Ctrl+C停止。先停止已有后台服务，避免端口8787冲突。双击start-workbench.cmd也可打开普通工作台；安卓配置应使用上述带序列号命令。

数据保存在项目`.local/workbench.db`及相关数据库，重启保留。不要删除库来清空未知结果或恢复测试次数。当前账户/企业为合成身份，不是生产登录。

## 可直接运行的无拨号验证

以下命令从项目根执行，完成后自动退出：

```powershell
npm.cmd --prefix packages/core run local-controlled:demo
npm.cmd --prefix packages/core run test:local-controlled
npm.cmd --prefix packages/core test
npm.cmd --prefix packages/core run check
```

演示创建`.local/controlled-local-demo-*`独立数据库，记录端口提交一次，丢失回执后重开不重拨，显式核对后结束且已用次数仍为1；设备访问禁用。当前496项全量回归、103模块语法通过。14项浏览器检查已在R061集中验收时重跑通过。定时10项浏览器检查沿用R057证据。此前容量与受控页证据单列保留。

安卓SQLite检查：

```powershell
node tools/check-native-database.mjs YOUR_DEVICE_SERIAL
```

需要USB连接S23、手机空闲、已安装与本地构建匹配的APK，旧Probe为仿真/暂停/未armed。每次生成独立合成数据库和evidence报告，实际电话账本不变；已实测36断言通过。权限未知/忙线使用注入值，这不是实际撤权或来电测试。更多操作见[手动验证](docs/manual-steps.md)。

## 安卓包与配置

[当前调试APK](prototypes/android/app/build/outputs/apk/debug/app-debug.apk)已安装在S23 SM-S9180 / Android16(API36)，SHA256：`cb3691179c5a9fd249ed0ace534bb1a3aaed18862f0a676bc259c347205dd834`。

ControlledCallActivity及ControlledReconcileActivity仍默认禁用，历史安装检查时设备无启用覆盖，本轮未重新检查手机。新受控库需要独立的本地许可、批准APK/设备/安装/账户、政策绑定和不可变额度，不会把仿真许可或历史三通额度升级为真实许可。没有自动发放许可或启用组件的脚本。

APK更新改变设备绑定摘要，旧轮次可能返回ROUND_BINDING_CHANGED；历史数据保留，不自动换绑/续期/补额。真实号码和许可只能保存在忽略的本地配置，不能加入源码或证据报告。

项目内构建（每次使用新前缀，不覆盖证据）：

```powershell
pwsh -NoProfile -File tools/build-android-local.ps1 -ExistingTools -RecordPrefix 自选新前缀-
pwsh -NoProfile -File tools/build-android-local.ps1 -ExistingTools -Lint -RecordPrefix 自选新前缀-
```

现有SDK/JDK已配置在项目`.tooling`，不修改全局环境。构建/lint通过，0错误10原有警告。后台启动命令请直接运行，不包进同步record-core-run，否则记录器可能等待后台继承的管道；见执行记录中的实际异常。

## 已验证与仍缺证据

- 通过：419项共用与集成回归；200条模拟任务；S23实际SQLite36断言；浏览器到手机原生dry-run34检查。
- 部分通过：Android单机能力。历史3通人工/前台定时/锁屏定时成功，新受控任务到电话完整链路尚未运行。
- 未验证：实际权限撤回、来电占用/竞争、系统强杀/掉电、真实200次日量、多机兼容、生产身份和真实名单流程。
- iPhone：未构建/未运行，不把提醒或逐通确认算成原自动拨号要求通过。

200任务证据中的U/G/Q/O/C为50/200/180/180/40，其中O/C是模拟注入；真实人工耗时和费用未测。原需求约200次总尝试不是生产硬上限。

当前原始需求、用户决定、范围和下一项见[项目简报](docs/project-brief.md)、[规范](docs/spec.md)、[下一步](docs/next-action.md)。旧README完整内容保留在[历史归档](docs/archive/2026-10-15-before-r050-acceptance-README.md)。


受控页局部测试：`npm.cmd --prefix packages/core run test:controlled-workspace`；浏览器验证：`npm.cmd --prefix packages/core run test:controlled-browser`。当前页保留一条待核对演示任务，勾选确认后可结束占用，次数不返还；重启不会补额。真实记录配置尚未加载，真实拨号按钮不可用。


## R052：连接已有受控记录（只读）
当前8787仍为保留的合成演示。只有具备已有真实受控记录库时才配置本模式；不能把演示改名作为真实记录。配置缺失或错误会明确拒绝，不新建许可、不重置次数。

项目根运行局部检查：
```powershell
npm.cmd --prefix packages/core run test:controlled-records
node tools/check-controlled-browser.mjs --records
npm.cmd --prefix packages/core run check
```
本轮全量426通过；随后新增CLI检查后专项8通过；85模块语法、只读浏览器7及演示11通过，无真机调用。

本地配置`.local/controlled-records.json`字段严格为：schema=1、mode=LOCAL_CONTROLLED_READ_ONLY、storePath（既有SQLite，相对配置目录）、actorId、permitId、serial，以及deviceKey/installationKey/accountKey/expectedApkHash四个原始64位SHA-256标识。身份/许可/绑定须来自同一既有记录；不包含token、手机号或额度，不在网页上传。没有可用真实库时保持当前演示，不编造配置。

配置准备后，从项目根用独立端口启动（需真实配置；本轮实际验证的是缺配置时明确拒绝）：
```powershell
node packages/core/src/workbench-cli.mjs --port 8788 --db .local/record-viewer.db --controlled-config .local/controlled-records.json
```
打开http://127.0.0.1:8788/controlled；Ctrl+C停止。记录库只读，不执行恢复写入。页面可查看历史、刷新列表、显式检查设备绑定；不能发送、查询手机回执或结束占用。设备匹配仅为当次观察，不代表可拨号，10秒后重新刷新显示过期。


## R053增量：查询手机已有回执
R052只读模式现在可点击“查询已有回执”；核对结束、真实发送仍禁用。必须已有匹配的任务、原命令及发送账本；缺失不创建、不补发。前后设备/安装检查通过才采纳匹配回执。新观察仅在当前服务会话单列显示，不改写业务记录，也不证明实际呼出或接通。
验证：433项测试、85模块语法、只读浏览器8/演示11通过。项目根运行`npm.cmd --prefix packages/core run test:controlled-records`、`npm.cmd --prefix packages/core test`、`npm.cmd --prefix packages/core run check`、`node tools/check-controlled-browser.mjs --records`。本轮无真机回执或新电话；当前8787仍是原演示，真实配置方式沿R052。


## 我的名单（本机单人资料区）
入口http://127.0.0.1:8787/contacts；沿用上述启动/停止方式。每行一个11位大陆手机号形式，填写来源与资格后导入；原始输入本地保留，页面掩码显示，重新导入不覆盖资格/拒绝状态。国家码/座机/分机暂不转换。格式识别不是号码存在或联系授权验证。
数据独立保存在.local/workbench.db.contacts.db，未接企业登录，可显式创建本地计划，但不会拨号。测试不会使用用户名单。
```powershell
npm.cmd --prefix packages/core run test:contacts
node tools/check-contact-browser.mjs
```


## 本地任务计划
在[我的名单](http://127.0.0.1:8787/contacts)下方选择已确认资格的联系人，按北京时间保存计划；可改期、取消、个人暂停与恢复。恢复后需逐条重排，旧版本/资格变化/过时会显示阻挡原因。真实外呼始终未开放，保存计划没有创建通话授权。
```powershell
npm.cmd --prefix packages/core run test:contact-plans
node tools/check-contact-plans-browser.mjs
```
计划保存在原名单SQLite的新增表中，重启保留；没有后台拨号定时器。


## 本地尝试与结果闭环（不拨号）
在/contacts已有计划上点“立即本地演练（不拨号）”：先持久占用和未知记录，下面明确核对后再处理下一条。演练重开不重放，待核对期间不能靠改期/取消释放占用。同计划版本仅一次，再试需显式重排。
当前固定记录替身返回未知，来源LOCAL_RECORDING；演练人工“完成”不是实际通话完成。真实手机适配和生产登录仍未实现；本地定时演练现已提供，见下节。
```powershell
npm.cmd --prefix packages/core run test:contact-attempts
node tools/check-contact-attempts-browser.mjs
```


## 我的名单：本地定时演练
在 /contacts 保存未来计划后，点击“开启本地定时演练”，到点点击“刷新执行结果”。默认停止，仅处理开启时的有效未来计划；改期/新增需停止再开启。停止按钮、暂停计划或服务重启会停止计时。未知演练须明确核对后才能处理下一条。
本地计时最多1秒延迟为实验参数，超出/占用即跳过不补跑，不代表正式外呼规则。没有真实电话适配。局部测试：npm.cmd --prefix packages/core run test:contact-timer；浏览器：node tools/check-contact-timer-browser.mjs。全量/启动/停止命令仍见上文，运行结果见evidence/contact-timer。


## 名单闭环容量与分类计数
/contacts现显示“我的演练累计（全部历史）”：涉及不同目标、本地记录尝试、已结束/待核对，以及定时触发/拒绝/中断数量。只统计当前本地销售，实际呼出/接通暂无证据；演练完成不代表电话接通。
200条独立模拟容量：npm.cmd --prefix packages/core run test:contact-capacity。覆盖导入、计划、定时、脚本显式核对、重开计数；另检查忙线、暂停和重复。真实手机号原始输入留在本地库，测试不修改用户库；无真实电话。本地子范围已通过集中验收，真实手机链路与生产身份仍待实现/验证。


## Android对应关系预检查（不拨号）
/contacts每条计划的“检查安卓对应关系”只查看目标/计划及设备/SIM条件，检查通过也不授权电话。CLI现已支持项目.local/contact-android.json可信配置；当前已为尾号7214的受控联系人保存配置，并完成名单目标到S23电销卡的只读预检查。观察会过期，计划过时须重排；该结果不授权真实电话。
局部测试：npm.cmd --prefix packages/core run test:contact-preflight。模块的可信组合接口与字段见docs/manual-steps.md，客户端不能配置SIM或设备。


## 可信Android配置
现有启动命令带-AndroidSerial时，CLI读取固定.local/contact-android.json。文件缺失保持禁用，存在但非法会拒绝启动；修改配置需停止后重新启动。文件被Git忽略，不能从网页上传替换。字段及操作见docs/manual-steps.md的R060段；观察文件不是运行配置。
测试：npm.cmd --prefix packages/core run test:contact-config。S23只读检查证据见evidence/contact-config/usb；未发起真实电话。


## 可信绑定准备与当前状态
工具入口node tools/prepare-contact-binding.mjs --help；preview核对现有本人目标/S23电销卡，save带预览token重新观察后独占创建配置，不覆盖已有文件，保存后重启。示例与字段见docs/manual-steps.md的R061段。局部测试npm.cmd --prefix packages/core run test:binding-setup。
当前已按mantou明确授权，以尾号7214受控端完成实际目标只读绑定与HTTP→USB预检查，未拨号。名单1条、验证计划1条，定时停止，真实外呼禁用。手机状态会过期，应再次检查；当前配置已存在，再次save会拒绝覆盖。


## 当前总体进度与受控预留
总体状态见[progress](docs/progress.md)：本地业务闭环和Android只读绑定已有验收，正式真实拨号闭环、生产身份与iPhone仍未完成。
R062新增可信宿主用的受控许可预留账本，局部npm.cmd --prefix packages/core run test:contact-controlled。仅在独立测试库验证，不提供网页预留或手机发送；当前真实许可未配置，预留数0。未知记录不得自动清除/退款，下一项实现明确核对契约。


## R063安卓受控开发入口
当前只推进Android首闭环（D025）。本地名单页增加受控记录只读展示。它不会通过网页发电话，待核对状态不能用演练按钮解除。
在项目根执行：
```powershell
node --test packages/core/test/contact-controlled-coordinator.test.mjs packages/core/test/contact-controlled-ledger.test.mjs
node --test packages/core/test/*.test.mjs
node tools/check-core-syntax.mjs
node tools/check-contact-attempts-browser.mjs
node tools/contact-controlled.mjs inspect
```
最后一条只读访问已绑定S23；没有创建许可或拨号。本轮已执行并通过。当前源码无原生修改，未重复Android构建。
真实会话另需明确当次授权及固定忽略文件.local/contact-controlled-session.json（permit/transportPermit），并按原生协议部署同范围许可；当前未创建。会话准备完成后开发者可执行以下命令，**本轮尚未运行实际send/reconcile**：
```text
node tools/contact-controlled.mjs send PLAN_ID VERSION REQUEST_ID
node tools/contact-controlled.mjs receipt ATTEMPT_ID
node tools/contact-controlled.mjs reconcile ATTEMPT_ID COMPLETED --confirm-idle
```
缺新会话拒绝；禁止照抄占位符或重放未知发送。电话挂断由操作者确认，原生仍会检查空闲。当前没有网页发送按钮或真实自动调度，企业登录与多目标真实队列尚未完成。

## 安卓首个受控闭环已验证（2026-10-16）
已用正式名单任务完成两次S23电销卡真实电话，用户确认显号与双向语音、无需确认；核对结束后明确重排下一版本，双端账本闭合。证据及适用范围见docs/acceptance.md最新段。
本轮会话已归档、原生许可关闭、两个组件禁用、本人计划暂停。网页可查看2条受控记录；若要继续本地演练，需恢复并重排，恢复不会自动外呼。旧session不再可用，禁止复制旧许可重新拨号。下一步为正式定时/多目标软件实现，iPhone仍暂停。

## 安卓正式定时调度：软件入口
已采纳到点后30秒内完成检查并提交（D027）；超时、忙线、暂停、过时重启不补拨。新增持久票据及多目标协调器，先验证仿真与故障恢复；网页和真实调度开关尚未接入此模块。
在项目根运行：
```powershell
npm.cmd --prefix packages/core run demo:contact-schedule
npm.cmd --prefix packages/core run test:contact-schedule
npm.cmd --prefix packages/core test
node tools/check-core-syntax.mjs
```
演示明确只用合成名单/电话替身/注入时钟，输出2目标、2次模拟提交与核对、真实电话0，独立数据库留在项目.local/controlled-schedule-demo-*。演示执行后自动关闭，不需停止服务。测试另覆盖200目标、超时、停止、未知、跨范围配置和原生lease期限。模块格式ESM，Node内置测试及SQLite，无新增依赖。
可信宿主使用ContactControlledSchedule({coordinators,now,timers})，start/stop/close；coordinators为同库同销售每目标一条ContactControlledCoordinator。构造与启动不会自动创建许可或启用原生组件；没有目标路由的计划不纳入快照。生产配置与真实定时E2E另行取证。

## 多目标调度运行控制（R065）
项目根可直接运行：
```powershell
npm.cmd --prefix packages/core run demo:contact-runtime
node tools/contact-schedule-runtime.mjs --simulate
node tools/contact-schedule-runtime.mjs status
npm.cmd --prefix packages/core run test:contact-runtime
```
第一条自动演示start/stop、两目标定时提交、逐条模拟核对、close；真实电话0。第二条交互支持status、start、stop、reload、advance 65、reconcile 0、advance 125、reconcile 1、close。advance参数是从模拟开始起的秒数，使用固定2026-10-16工作日时钟，不是手机时间；close或Ctrl+C结束。仿真只在项目.local下创建临时合成库，不读取或修改真实名单和许可。
第三条只读检查主项目固定配置文件是否存在/有效，不连接电话、不开启调度，也不声称检测了其他进程的运行状态。当前未配置真实多目标会话。可信宿主可组合ContactScheduleRuntime并调用start/stop/status/reload/close；当前CLI不提供真实start，网页仍仅本地演练开关。
配置文件.local/contact-schedule-routes.json只包含schemaVersion、tenantId、salesId、source、routes；每路由只有targetId、permitId、deviceKey、accountKey。它选择已有可信许可，不创建授权。配置变化在状态读取/任务触发/设备检查后停止，须reload再start；尚有设备检查时先stop并等待inflight归零。详细约束见R065规范。

## 工作台多目标运行区（R066）
“我的名单”底部新增多目标调度运行区，可查看来源、运行态、待触发和检查中数量，以及不能开启的原因。主工作台当前未配置可信会话，因此启动禁用；原本地演练按钮不变。刷新运行状态会同步刷新受控记录，不能用演练完成按钮解除真实未知。
独立网页仿真：
```powershell
npm.cmd --prefix packages/core run demo:contact-runtime-web
```
终端会显示随机端口的/contacts地址。打开后可点“启动多目标仿真”“停止调度”“重载运行配置”。仿真时钟由终端advance 65、advance 125推进；reconcile 0或reconcile 1只核对对应合成记录。close关闭网页服务并清理合成库。不要把该地址与8787真实名单工作区混淆。
验证命令：npm.cmd --prefix packages/core run test:contact-schedule-web；node tools/check-contact-runtime-browser.mjs；npm.cmd --prefix packages/core test。
网页命令不接受许可或配置路径，也不能启动真实受控会话。真机多目标许可切换和正式自动队列需后续实现/新受控验证。

## 原生许可切换只读检查（R067）
项目根运行：
node tools/check-native-permit-readiness.mjs --simulate
此入口只用合成快照演示就绪、切回旧许可保留次数、字节冲突和未核对阻挡，自动退出；不读取主名单/设备，不写许可。READY不是实际运行授权。
局部测试：node --test --test-reporter=tap packages/core/test/native-permit-readiness.test.mjs
相关回归：npm.cmd --prefix packages/core test
语法：node tools/check-core-syntax.mjs
没有新依赖或原生变更。真实许可采集、互斥部署与回读尚待接入，真实E2E仍需新受控授权。

## 安卓原生只读采集（R068）
项目根执行 `node tools/collect-native-permit.mjs --read-only`。使用固定.local/contact-android.json及已归档会话安装标识，输出脱敏状态；原始临时副本立即清理。要求S23 USB已连接、调试已授权、组件禁用、电话空闲，当前原生库无WAL/非空事务日志。退出1表示不能可靠采集，不会修复设备或开启电话。诊断Activity会刷新电话能力文件。
局部：`node --test --test-reporter=tap packages/core/test/native-permit-collector.test.mjs`；回归：`npm.cmd --prefix packages/core test`；语法：`node tools/check-core-syntax.mjs`。COLLECTED仅表示成功读取，不是拨号授权，实际切换尚待互斥部署实现。

## 许可切换故障恢复演示（R069）
项目根运行 `node tools/demo-native-permit-switch.mjs --simulate`。独立.local合成文件替换后模拟响应丢失，重复请求不会重写；显式回读后VERIFIED。程序自动结束并清理临时文件；不访问手机、不启用外呼。
局部测试：`node --test --test-reporter=tap packages/core/test/native-permit-switch.test.mjs`。回归：`npm.cmd --prefix packages/core test`；语法：`node tools/check-core-syntax.mjs`。所有协作进程必须共用一份日志，未知操作不会超时自动释放；真实部署端口当前未接入。

## USB部署预览（R070）
合成演示：`node tools/preview-native-permit.mjs --simulate`；当前项目只读预览：`node tools/preview-native-permit.mjs --preview`。后者需要已明确授权的活动会话及固定.local/contact-controlled-next-permit.json；当前会话关闭，因此退出1/CURRENT_SESSION_REQUIRED是预期，不会复用归档或访问手机。不要为通过检查而复制旧许可。
输出PREVIEW也始终canApply=false，无apply命令。局部测试：`node --test --test-reporter=tap packages/core/test/native-permit-preview.test.mjs`；回归：`npm.cmd --prefix packages/core test`。真实部署与发送共用锁仍待实现。

## 发送与切换共用设备门（R071）
同一日志目录自动使用native-device-gate.db，未知发送会阻挡许可切换，未完成切换会阻挡发送。旧发送日志无核对字段时保守阻挡，不可通过删除数据库或新建目录绕过。只有匹配原生核对或明确切换回读才能释放对应记录。
局部：`node --test --test-reporter=tap packages/core/test/adb-controlled-call-transport.test.mjs packages/core/test/native-permit-switch.test.mjs`；全量：`npm.cmd --prefix packages/core test`；演示仍可运行`node tools/demo-native-permit-switch.mjs --simulate`。真实切换尚未开放；不同目录/外部ADB程序不受这个协作锁约束。

## 历史记录与遗留锁只读审计（R072）
项目根运行 `node tools/audit-device-gate.mjs --read-only`。读取.local已有数据库及可选contact-controlled-native-final.db归档，输出脱敏差异与证据边界，不创建门或修改日志。AUDITED并不表示已修复，canRecover始终false；没有unlock/apply参数。
局部：`node --test --test-reporter=tap packages/core/test/device-gate-audit.test.mjs`；回归：`npm.cmd --prefix packages/core test`。历史两通可匹配宿主及归档原生证据，但旧发送表缺核对标记，不能仅凭本报告释放未来迁移屏障。

## 旧发送元数据迁移（R073）
项目根执行 `node tools/migrate-legacy-delivery.mjs --migrate-local-metadata`：先备份旧本地发送日志，再持设备门读取S23当前原生记录，与宿主完成记录精确匹配后迁移device/reconciled字段。不会修改手机许可、额度或拨号。2026-10-16已完成两条历史记录迁移，通常无需重复运行。
失败时保留设备门，先查看脱敏原因，不删除数据库。commit后中断只能重新取得当前证据恢复。备份位于.local/legacy-migration-backup-*。局部：`node --test --test-reporter=tap packages/core/test/legacy-delivery-migration.test.mjs`；回归：`npm.cmd --prefix packages/core test`；后检：`node tools/audit-device-gate.mjs --read-only`。

### USB许可部署端口（R074）
实现：packages/core/src/adb-permit-deployment.mjs，接入NativePermitSwitch。现有工作台启动/停止方式不变；本模块不启动常驻进程。必须由可信本地入口提供指定候选摘要和时间窗的授权，不应直接向网页暴露replace。
可直接运行的仿真验证：
```powershell
node --test --test-reporter=tap packages/core/test/adb-permit-deployment.test.mjs
npm --prefix packages/core test
node tools/check-core-syntax.mjs
```
这些命令不访问手机。真实部署命令组合尚待接入；当前609项回归通过，不代表真机USB替换或自动队列已验收。

### 受控会话部署命令（R075）
从项目根运行默认只读预检：`node tools/deploy-contact-permit.mjs`（等同--preview）。当前没有活动会话时应返回CURRENT_SESSION_REQUIRED、退出1，不访问手机。
已有新明确授权、当前会话和候选后，受控部署入口为`node tools/deploy-contact-permit.mjs --deploy SWITCH-唯一操作ID`；ID仅大写字母/数字/连字符，前缀后4～100字符。必须先由可信本地流程准备.local/contact-controlled-deployment.json：mode=EXPLICIT_CONTROLLED_DEPLOYMENT、reference与会话consentRef一致、candidateSha256为候选原始字节SHA256、deviceKey/targetId/maxAttempts与会话一致、notBefore/expiresAt为会话内毫秒时间戳。该命令不会启用呼叫组件或拨号。
输入还包括当前contact-controlled-session.json、contact-android.json、contact-controlled-next-permit.json和workbench.db.contacts.db。不得用归档会话替代。REVIEW时停止，保留日志供显式只读恢复；不得删除日志或改操作ID重试。
测试：`node --test --test-reporter=tap packages/core/test/controlled-permit-deployment.test.mjs`；回归：`npm.cmd --prefix packages/core test`。一次性命令结束即停止，无新增服务。真实部署命令未运行。


### 本地会话准备（R076）
项目根运行`node tools/prepare-contact-controlled-session.mjs --prepare-local`。缺有效新授权时应退出1；不会延长或复用旧许可。
可信本地授权文件.local/contact-controlled-approval.json需包含reference（CONTROLLED-大写标识）、confirmed=true、deploymentApproved=true、at/expiresAt（毫秒，最多15分钟）、maxAttempts、receiverNumber、deviceKey、accountKey、targetId、cardLabel。完整号码仅保存在忽略文件中，必须来自用户本轮授权；不得自行填同意或延长时间。
准备只登记本地宿主许可并写next-permit/deployment/session文件，保持现有暂停和计划。需要原生诊断采集，组件必须已禁用。之后运行`node tools/deploy-contact-permit.mjs`预检，符合条件才显式部署。出现残留或SESSION_PREPARATION_BLOCKED不删除文件重试；保留session-preparation-*供核对。
局部测试：`node --test --test-reporter=tap packages/core/test/controlled-session-preparation.test.mjs`。一次性命令退出即停止，无常驻服务。

### 当前真实能力（2026-10-16更新）
S23已验证新许可本地准备、USB受控部署、电脑Node定时驱动两通、原生/宿主结果核对及关闭归档；两通用户确认显号/语音正常且无需系统确认。该定时路径仍依赖运行中的电脑和USB，不是独立手机全天队列。当前已暂停、组件禁用、许可关闭。最终634回归通过，见docs/acceptance.md。

### 正式定时运行命令（R077）
在项目根执行：
```powershell
node tools/run-contact-timer.mjs status
node tools/run-contact-timer.mjs start-approved
node tools/run-contact-timer.mjs stop
```
默认status。start-approved是前台常驻运行，必须具备新的有效受控会话、已部署且匹配的原生许可、已恢复并安排好的未来计划；当前无活动会话时退出1。它不自动改计划或恢复暂停。
在另一终端stop，或原终端Ctrl+C请求停止。STOP_REQUESTED只是请求已写入；等待拥有进程报告CLOSED或NEEDS_RECONCILIATION。停止先暂停并取消未执行定时器，再等待在途提交、禁用组件；不会挂断现有电话或自动核对结果。
CLOSED仅指运行器结束，原生许可关闭/会话归档须另行完成。REVIEW、崩溃残留目录.local/contact-timer-owner或死进程不能直接删除重试，保留供恢复核对。正常运行记录存入.local/contact-timer-history/<UUID>。
测试：`node --test --test-reporter=tap packages/core/test/controlled-run.test.mjs packages/core/test/controlled-run-cli.test.mjs`；回归：`npm.cmd --prefix packages/core test`；语法：`node tools/check-core-syntax.mjs`。


### 会话关闭与恢复（R078）
先用定时运行入口stop并等待进程退出；已有待核对通话先按实际结果reconcile。项目根命令：
```powershell
node tools/close-contact-session.mjs --close CLOSE-本轮唯一标识
node tools/close-contact-session.mjs --resume CLOSE-原标识
```
标识实际使用大写英文字母、数字、连字符，CLOSE-后4～100字符，例如CLOSE-TEST-0001。--close仅用于新任务；--resume仅用于同一中断任务。关闭不会拨号或新增许可，也不要求次数全部用完，但已有尝试必须核对完成。
CLOSED表示许可关闭回读及归档完成；REVIEW时按脱敏reason处理，保留contact-session-close.db、contact-timer-owner、native-device-gate.db和归档，不删除锁重试。RUN_OWNER_ACTIVE等待原进程退出；HOST/NATIVE_RECONCILIATION_REQUIRED先核对通话；断连后恢复需要新鲜设备证据。没有完整会话/关闭记录的owner不由此工具自动清理。
私有归档：.local/contact-session-history/CLOSE-ID；不会覆盖原历史。默认无动作，参数不足拒绝；一次性命令退出即停止。
局部：`node --test --test-reporter=tap packages/core/test/controlled-session-close.test.mjs`。本轮未执行真实手机关闭命令成功路径。

### 离线完整流程验收（R079）
在项目根运行：
```powershell
node --test --test-reporter=tap packages/core/test/controlled-lifecycle-e2e.test.mjs
```
该入口运行6个合成场景，覆盖定时→停止→待核对→核对→关闭→归档及中断恢复；ADB方法全部由替身覆盖，不会访问手机。SQLite、发送日志、设备锁、调度和关闭模块使用真实实现。临时数据仅在项目.local创建并在测试结束清理。
已修复“提前关闭挡住后续核对”的死锁。当前667项全量回归通过；CLI操作系统信号和正式命令真机路径仍独立待验收。

### 正式运行器进程验收（R080，离线）
```powershell
node --test --test-reporter=tap packages/core/test/controlled-run-process.test.mjs
```
自动启动实际CLI子进程并执行stop/竞争/强杀/配置变化，结束时清理本测试隔离目录。测试专用预加载器替换预检和ADB，不访问手机，不使用已有真实名单。成功停止验证退出0和CLOSED归档；强杀验证残留保留及拒绝重启，不表示手机端已停止。生产命令不使用该预加载器。

### 关闭命令跨进程恢复验收（R081）
```powershell
node --test --test-reporter=tap packages/core/test/controlled-close-process.test.mjs packages/core/test/controlled-run-process.test.mjs
```
6个离线场景包含实际CLI启动/停止/强杀/关闭/恢复。测试仅使用项目内临时合成库，预检和手机端口被替换；原生设备与电话不会访问。关闭恢复只继续同一关闭ID，不重新拨号；这组测试不证明安卓断连或全天调度可靠。

## R082正式CLI已在S23执行
两次分开授权的单次计划通过电脑Node+USB正式运行器提交，用户确认两次有响铃或未接记录，均未接听。人工登记NO_ANSWER后，正式关闭命令均完成。证据：evidence/android-readiness-r082/report.md。
正常运行器有待核对尝试时退出1/NEEDS_RECONCILIATION，保留owner；核对结束后用同轮唯一CLOSE-ID关闭，不删owner重启。最新状态为许可关闭、组件禁用、计划暂停、活动会话和owner已归档。本轮没有接通/语音新证据，也不是脱离电脑的安卓自动队列。

### 安卓手机独立仿真入口（R083）
手机打开“销售任务仿真”。创建3条演示任务→重新安排→模拟下一条→记录模拟结果→下一条；结束点“暂停并作废旧计划”。重新打开保留待核对状态。该独立应用没有电话权限，现支持人工及单次原生定时仿真；真实名单/拨号适配尚未接入。
构建、测试和APK路径见[安卓独立仿真说明](docs/android-standalone.md)。它与原“销售拨号探索”分开安装，不改变旧设备绑定。新受控接收端仍为尾号5235，没有新增通话授权。


R084定时入口：“允许精确定时”→在应用电池设置允许后台运行→“30秒后模拟下一条”。退到桌面等待，回到应用核对模拟结果；停止请点“暂停并作废旧计划”。强制停止后重开会作废残留定时，不自动补发。S23单次后台仿真已通过，不能代表锁屏/全天/真实拨号完成。
```powershell
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Build
node tools/check-standalone-timer-device.mjs --run
```
最后一条会在已连接且解锁的S23安装独立仿真APK并操作合成任务；需闹钟/后台权限和工作时段，无真实电话。APK：prototypes/android/standalone/build/outputs/apk/debug/standalone-debug.apk。详细证据：evidence/android-timer-r084。

R085主动重试：在“销售任务仿真”选择“选择目标再次尝试”，选已核对的明确结果目标，重新安排后才可模拟提交。历史按钮按A1/A2保留每次回执和结果；UNKNOWN或拒绝联系不会再次尝试。手机仿真回归入口：`node tools/check-standalone-retry-device.mjs --run`（已解锁、暂停、无待核对且有适合的合成历史任务）；构建/测试命令沿用上节。

### 合成名单导入（R086）
点击“导入合成名单”，每行填写一个DEMO-三位数字，例如DEMO-101。导入以事务式整批校验：空行忽略，重复及已有ID跳过，显示新增/重复/空行数量；手机号或其它非法行使整批拒绝并标行号，不保留部分结果。最大200行/8000字符，总目标不超过200。现有拒绝标记、结果和A序号历史不覆盖。此入口用于本地合成流程，不是客户号码/CSV生产名单导入。
回归：pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test；构建/lint：同脚本-Mode Build；S23：node tools/check-standalone-import-device.mjs --run。手机检查只输入合成ID及一条手机号格式负向样本，确认被拒后不落盘；实际呼叫为0。

## R087提交状态检查
手机“检查真实拨号状态”显示当前真实服务尚未连接。人工和定时模拟共用提交桥接，保持原有操作。开发检查：`node tools/check-standalone-bridge-device.mjs --run` 安装独立APK并启动只读诊断，校验外部启用标志无效、持久任务字节未变、原探索APK摘要不变。它只删除/重写自己的诊断报告files/submission-boundary.json，不清空任务或许可；无需解锁完成诊断。
局部规则测试/构建仍运行`pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test`及`-Mode Build`。真实联系人与原生许可/发送器组合未实现，见[桥接边界](docs/android-submission-bridge.md)。

## R088联系人模型检查
手机打开“销售任务仿真→检查联系人模型”，使用固定合成fixture检查销售归属、去重、拒绝、资格修订和初始任务身份。当前模型在内存，不接受真实联系人，也未接生产登录、持久化或拨号。
```powershell
node tools/check-contact-model-device.mjs --run
```
该命令安装独立仿真APK并采集报告，忽略外部身份/来源覆盖，保持DEMO任务文件不变；不需解锁完成固定检查。局部规则测试与构建命令保持check-standalone.ps1 -Mode Test / -Mode Build。详见[模型边界](docs/android-contact-model.md)。

## 安卓联系人元数据存储（R089）
独立应用“销售任务仿真→检查联系人存储”可运行固定合成SQLite检查。当前具备隔离联系人/初始草稿持久化、本人范围读取、去重/冲突、资格/拒绝审计及失败恢复；尚未连接真实名单输入、生产身份或电话发送器。

~~~powershell
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Build
node tools/check-contact-store-device.mjs --run
~~~

项目根执行；最后一条需S23 USB已授权、本地设备绑定存在、演示任务原本暂停，可锁屏运行。它安装APK，创建隔离合成库并强停/重开独立包检查；不修改原任务/旧受控app或拨号。结束包已停止，可手动重开；暂停仍保留。APK位于prototypes/android/standalone/build/outputs/apk/debug/standalone-debug.apk。41组397 Java断言及58 S23断言通过，不代表正式电话闭环完成；iPhone暂停。见[Store说明与边界](docs/android-contact-store.md)、[最新进度](docs/next-action.md)。

## 安卓草稿显式刷新（R090）
“销售任务仿真→检查草稿刷新”运行固定合成检查，验证旧草稿明确更新到最新合格联系人修订、重复不新增审计、资格撤回停止；仍未接真实名单/身份/手机电话。完整开发回归：

~~~powershell
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Build
node tools/check-draft-refresh-device.mjs --run
node tools/check-contact-store-device.mjs --run
~~~

从项目根执行，两个手机命令顺序运行；需S23 USB已授权及原演示库暂停，可锁屏。脚本升级独立包、建隔离合成库并强停/重开，不清原任务或电话许可、不拨号；结束独立包已停止，手动重开仍暂停。APK仍在prototypes/android/standalone/build/outputs/apk/debug/standalone-debug.apk。当前schema2验证旧schema1后原子迁移，旧记录保持；旧APK不能读取schema2，勿直接回退来代替数据迁移。44组414 Java断言、63刷新真机断言及58联系人相关回归通过，见[刷新边界与证据](docs/android-draft-refresh.md)。下一项是手机任务计划元数据；iPhone暂停。

## 手机任务计划元数据（R091）
“销售任务仿真→检查任务计划”使用固定合成库与注入时钟，验证安排/改时间、计划版本、本人暂停与过期恢复；不执行真实定时任务或拨号。开发命令：

~~~powershell
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Build
node tools/check-sales-plan-device.mjs --run
node tools/check-draft-refresh-device.mjs --run
node tools/check-contact-store-device.mjs --run
~~~

从项目根执行；手机命令顺序运行，需USB授权、原DEMO暂停与本地设备绑定，可锁屏。脚本安装独立包，创建保留的隔离合成库，强停/重开检查；不清原任务/旧许可、不拨电话。结束包已停止，手动重开仍暂停。APK仍为prototypes/android/standalone/build/outputs/apk/debug/standalone-debug.apk。当前schema3验证后迁移schema1/2，旧APK不能读取，不直接回退作数据降级。48组444 Java断言、62计划真机断言及63草稿/58联系人相关回归通过；见[计划实现与边界](docs/android-sales-plan.md)。正式尝试消费、运行器、生产身份/真实输入与手机适配尚未接入，iPhone暂停。

## 安卓核心合成提交闭环（R092）
“销售任务仿真→检查合成提交闭环”验证联系人→明确计划→原子消费→记录型端口→模拟回执→人工合成结果→明确下一次。当前为固定合成检查，没有正式联系人操作界面或真实拨号。UNKNOWN结果保留占用；另有明确无活动/待处理确认的关闭动作，历史结果仍未知，不重放原尝试。

~~~powershell
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Build
node tools/check-synthetic-loop-device.mjs --run
node tools/check-sales-plan-device.mjs --run
node tools/check-draft-refresh-device.mjs --run
node tools/check-contact-store-device.mjs --run
~~~

项目根执行，手机命令按顺序；需S23 USB授权、原DEMO暂停及设备绑定。完整新脚本含200模拟尝试、跨进程及提交前/后强停，仅创建随机隔离合成库；不改DEMO/旧真实app、不拨号。结束独立包已强停，手动重开仍暂停。APK仍在prototypes/android/standalone/build/outputs/apk/debug/standalone-debug.apk。schema4验证迁移旧1～3，旧APK不支持读取；不直接回退作数据降级。52组480 Java断言、97闭环及62/63/58相关真机回归通过；一次驱动超时保留，不证明全天后台可靠。详见[闭环说明与边界](docs/android-synthetic-loop.md)。下一项为可操作的合成联系人/任务工作区，生产身份/号码/实际定时器与真实适配仍未接入，iPhone暂停。


## 本机显式任务草稿和本地计划（R096/R097）

2026-10-18 R096/R097：本机联系人→显式草稿→本地计划编辑子范围通过，整体仍部分通过。74组608 Java断言、600解析向量、S23 SQLite98断言、草稿界面20项/计划界面21项通过；build/lint0错误7警告。实际区0联系人，格式区6生成联系人/2测试草稿/计划version5暂停，无执行请求或电话。新链路未接电话/实际运行器或企业认证；原真实APK/DEMO/合成工作区保持。iPhone暂停。详见[实现边界](android-local-drafts-plans.md)与[本轮证据](../evidence/android-local-plan-r097/acceptance.json)。

操作入口与回传见[完整说明](docs/android-local-drafts-plans.md)。APK在prototypes/android/standalone/build/outputs/apk/debug/standalone-debug.apk；安装无需清数据。停止可退出或强停“销售任务仿真”，重开旧本地计划暂停。当前只有计划元数据，不开启手机拨号。

~~~powershell
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Build
node tools/record-core-run.mjs evidence/local-store-new-run R-CALL-096,R-CALL-097 node tools/check-phone-intake-fixture-device.mjs --run
node tools/record-core-run.mjs evidence/local-draft-new-run R-CALL-096 node tools/check-local-draft-ui-device.mjs --run
node tools/record-core-run.mjs evidence/local-plan-new-run R-CALL-097 node tools/check-local-plan-ui-device.mjs --run
~~~

以上是当前实际通过命令。手机脚本按顺序，UI需解锁，只操作独立格式区；不自动请求实际客户通话。


## 历史R098/R099（2026-10-18 09:36快照）

2026-10-18：R096～098本机草稿/计划/有界尝试核心已通过记录型验证；R099独立“销售拨号·受控试点”APK已构建安装S23，20条配置与停用路径检查、10项安装/界面检查通过。647条Java断言（含原执行器27）、600解析向量、355条S23隔离检查、旧资料升级/界面10项通过。全部本轮0真实外呼；新APK真实通话/完整队列尚未验证，企业认证仍缺，整体部分通过，iPhone暂停。用户完成设置后，已实际核验电话权限、精确闹钟、后台不受限和电销卡绑定；撤权恢复/格式隔离46驱动检查通过，实际资料/尝试仍为空，许可停用，结束强停。

手机打开“销售拨号·受控试点”；新APK在prototypes/android/pilot/build/outputs/apk/debug/pilot-debug.apk，已安装S23用户0。完整安装/系统设置、名单/一次计划/结果/停止方式和E2E前提见[安卓受控说明](docs/android-controlled-pilot.md)。默认停用，不继承旧许可；元数据检查和格式测试不会拨号。系统设置已通过；新包真实通话尚未运行，不能称为完成原安卓真实闭环或整个产品。

~~~powershell
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Build
pwsh -NoProfile -File tools/check-pilot.ps1 -Mode Build
pwsh -NoProfile -File tools/check-standalone-package.ps1
pwsh -NoProfile -File tools/check-pilot-package.ps1
~~~

当前已实际执行并通过；设备脚本和证据见说明。停止可在新包“暂停新外呼”后退出/系统强停，数据不清除；已开始通话需在电话界面挂断。实际受控验证按next-action，iPhone继续暂停。

Excel导入修复0.13：选择.xlsx后立即显示电话/公司/姓氏预览和识别条数；兼容常见表头、标题行与中文姓名提取；错误留在导入区。需安装新版APK生效，详见docs/excel-import.md。
