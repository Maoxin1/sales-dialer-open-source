# 安卓本机号码暂存 R095

2026-10-16，步骤5。R-CALL-095、F-CALL-001/010/011/012/013、T-CALL-656～671。手机提供本地号码输入与持久化入口，当前没有企业认证、任务计划或电话适配；真实发送固定禁用。iPhone暂停，原Android自动拨号目标保留。

## 使用

手机“销售任务仿真”→“打开本机号码暂存”。默认进入本机真实号码暂存（未认证）：可逐行保存手机号、批次来源和资格声明，修改资格、拒绝联系、查看掩码及检查拨号边界。不要求上传资格证明；既有资格可在本批选择“我已有联系资格或同意记录”。新批默认“尚未确认”，不会把其它批次的资格自动继承过来。

“切换号码资料区”明确选择“格式测试区（生成数据，不转拨号目标）”用于生成格式数据演练。两个资料区完全独立，切换不复制数据。外部Intent不能指定区、身份、号码、路径或开启发送。返回用系统返回键，重开保留已提交记录；没有清库/撤销拒绝/启用拨号按钮。

“导入逐行号码”：单批1～200行，每行至128个UTF-16单位，来源非空且至200字符。仅去除首尾空白后的大陆11位手机号形状VALID；国家码、座机、分机及其它电话式输入UNSUPPORTED，其它INVALID。号码形状不证明分配、存在、可联系或资格。与桌面端contact-workspace.mjs的parseLocalNumber保持同一规则，暂不自动转换其它格式。

结构不合法时整批不保存；结构合法后每行保存原值和结果，合法行导入或去重，无效/不支持行没有联系人或任务。这与SIM合成ID的“任一非法行整批拒绝”不同，沿用已有桌面端真实号码暂存语义。整批数据库写失败仍全部回滚。去重保留旧资格/拒绝/修订/审计，不能用再次导入恢复资格。资格与拒绝基于界面所见revision，拒绝后改资格被阻挡。

## 数据和发送边界

LOCAL_PHONE_INTAKE使用local-phone-intake-v1.db；FORMAT_FIXTURE使用phone-format-workspace-v1.db；固定随机隔离检查只建phone-fixture-随机ID.db。三者都不同于simulation-tasks.bin、synthetic-workspace-v1.db及正式contact-tasks-v1.db。类型/版本/结构不匹配、数值类型错误或审计不一致会停止并保留，不清库重建，不枚举历史fixture作为用户数据。

PhoneIntakeStore schema1保存5张业务表：phone_meta（类型、版本、私有随机资料槽）、phone_contacts（不透明稳定ID/规范号码/资格/拒绝/修订）、phone_batches（来源及批次声明）、phone_rows（原值/逐行结果/映射）、phone_events（连续变更审计）。WAL、FULL同步、外键；元数据与审计同事务。两个连接对同一规范号码导入只产生一个目标，不覆盖先前声明。原始号码/来源留在应用私有SQLite；没有宣称数据库加密、企业同步、备份迁移或生产保留期限已经实现。manifest仍allowBackup=false，仅闹钟权限，无网络/电话权限。

列表、诊断和证据只显示掩码、状态及不透明ID，错误文本使用固定代码，不回显原输入。输入框不请求自动填充或个性化学习；所有输入/来源按数据保存，不当作工作指令。资料槽只用于本机隔离，不是租户或销售登录凭证，不能由客户端填写企业名获得权限。

“检查拨号边界”始终DENY：真实暂存为PRODUCTION_IDENTITY_UNVERIFIED，格式测试区为FORMAT_FIXTURE_ONLY；已有资格CONFIRMED也不能绕过。没有建立任务、计划、尝试、票据或调用模拟/真实发送器。当前没有公开原始号码读取接口，未来适配必须另接可信身份/来源和明确许可，不能把稳定ID或摘要变成电话授权。

## 真实检查与失败处理

纯解析接口可加载NOT_IMPLEMENTED形成有效红灯，旧527 Java断言通过；实现后新增4组24，总66组551断言。T660额外用固定种子0x095bca17、上限600组生成格式输入，与宿主解析器跨运行时逐项核对状态和规范结果摘要；不输出完整号码，不把600组加进Java断言数冒充产品功能数。宿主contact-workspace定向回归实际运行，结果见host-reference。

S23固定隔离检查最终30断言：原值保存、混合行去重、资格/拒绝/CAS及重开、写入与更新故障回滚、两连接竞争、类型错库/浮点修订损坏拒绝且保留、资料槽/目标隔离、发送始终拒绝。仅生成格式数据，不打开两个用户区。

T670具体Bug：最初先遍历调用方List做校验，再复制为不可变List，变化中的调用方列表能让未校验的超长行落库。snapshot-regression-red以CALLER_INPUT_SNAPSHOT_REQUIRED确定失败；改为先取得单一不可变快照，再校验并遍历同一快照，green通过，不删断言求绿。UI传入的是固定列表，但公开存储接口仍补齐这一边界。

首次UI检查因锁屏没有开始，记录device-ui；用户解锁后device-ui-unlocked通过流程的大部分检查，但“真实区整文件字节不变”失败。独立同复现T671发现只改变文件偏移27和95，对应SQLite文件头change counter及version-valid-for所在字段，所有业务内容和私有槽摘要相同；相关字段说明见[SQLite文件格式](https://sqlite.org/fileformat.html)（核查2026-10-16）。因此最终采用同一事务、固定表/行/字段顺序及类型的全业务摘要，包含私有槽/原值/映射/审计，验证重开和格式操作不改变真实区。摘要掺入私有随机slot，未导出原数据/slot；不是仅放宽为联系人数量相同。旧DEMO/未打开的合成库继续比较字节。原失败保留，不把重跑覆盖成首轮通过。

代码检查另修复读取失败时“忙碌”文字遮住错误提示，并在切换资料区时清除旧界面缓存；持久数据不清除。这是实现审查修复，不冒充已有业务红灯。

## 命令与前提

项目根D:\mx\AI-Workspace\Projects\sales-dialer，使用既有Node24.18.0、Java17.0.20.1、Gradle8.13/AGP8.13.2、SDK36，无新依赖：

```powershell
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Build
node --test packages/core/test/contact-workspace.test.mjs
node tools/record-core-run.mjs evidence/phone-fixture-new-run R-CALL-095 node tools/check-phone-intake-fixture-device.mjs --run
node tools/record-core-run.mjs evidence/phone-ui-new-run R-CALL-095 node tools/check-phone-intake-ui-device.mjs --run
```

每次使用尚不存在的证据目录，手机命令顺序运行。需要已授权USB及.local/contact-android.json、原DEMO暂停、已有合成任务库用于只读保留比较。固定fixture可以锁屏；UI脚本需解锁，不受拨号时段影响，因为不安排任务。UI只读查看真实暂存区，在格式区用未使用尾段的生成输入完成导入/重复/非法批次/声明/拒绝/边界/重开，会保留新增测试记录，不清历史。结束只强停独立仿真包，不改真实app/许可、系统权限或客户名单。

回传phone-fixture.json或phone-ui-cases.json及real-staging/format-final PNG/XML、run.json/output.log。完整当前摘要、版本/命令/退出码和边界见evidence/android-phone-intake-r095/acceptance.json；失败也在同目录保留。当前号码暂存子项不等于独立真实拨号闭环完成；下一项仍步骤5，先把暂存联系人接入可追溯的本地任务草稿/版本，真实提交保持禁用，再补可信身份与手机链路。


## 本轮最终结果
最终APK 95bcd53c30e908ad603937cb8e618e0b462c63e8f5afcce846d12f7abf94ebe9与S23安装一致；构建/lint0错误7警告（6条既有+1条号码UI国际化），无新依赖。66组551 Java断言/600固定生成向量/宿主8、隔离30、UI19通过。实际区只读且全部业务摘要/资料槽不变，当前0联系人；格式区保留首轮2条与最终2条，共4生成联系人。明确声明后发送仍禁用，拒绝/重导入/强停重开保留状态，无任务/计划/尝试或真实电话。原DEMO12目标7模拟尝试、合成任务库4联系人6尝试/version29暂停字节保持，旧受控APK/绑定/许可不动。
R094已有定时/核心97及200容量证据核对22个原生源码摘要匹配，本轮未重跑这些设备场景；新入口只影响MainActivity导航和独立号码模块，当前已实际验证导航及数据保留。旧纯规则在本轮551中运行。真实产品仍部分通过，当前没有生产登录、真实任务生成或电话适配，iPhone暂停。
