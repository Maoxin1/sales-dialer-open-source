# S23自主批次试用（0.6版）

2026-10-20；D-CALL-033已采纳。已安装0.6-operator-batch/code5，仅本电脑服务＋USB S23；销售在手机自行确认本批，无需工程助手生成许可文件。iPhone、停卡/换卡继续暂停。

1. USB连接手机并允许调试，电脑双击项目根目录的prepare-s23-trial.cmd。手机打开“销售拨号·受控试点 → 企业账号与自动队列”，用LIVE销售账号登录，绑定既有电销卡。电脑保持开机和服务运行。
2. 导入自己的名单、填写来源和已有联系资格；已有尾5235/7214记录可直接复用，无须重复导入。勾选本批合格联系人。筛选、翻页不改变已勾选集合。
3. 选择北京时间的计划时间，点“安排选中联系人”。首次操作建议安排在至少1分钟后，留出阅读确认的时间；留空仍为既有5秒后规则。过时不补拨，跨日计划须到执行当日工作时段再确认。
4. 点“确认本批并启动”。核对手机弹窗中的条数、SIM和规则；点“确认本批”后按计划开始。每个目标本批最多一次，只在当日周一至周五09:00含～18:00不含有效；取消不会授予新许可。
5. 通话挂断后回到原工作区，在该条结果点“未接听”或“已接通并结束”。上一条手机空闲且结果已填，才自动处理下一条，两次提交至少间隔30秒。聊天回复不会自动写入手机结果。
6. 结果不确定就选“结果未知”，先核对，不重放。需要停止就点“暂停我的队列”；当前系统通话由自己挂断。改选名单、重新安排、退出或冷开后必须重新确认。暂停后先重新安排，不自动补拨。
7. 结束时核对待核对为0并退出账号，然后双击stop-enterprise.cmd；再拔USB。电脑停服不能代替手机暂停。管理员可停用销售账号；登录到期后须重新登录并确认，许可不能延长登录会话。

本批次数由所选剩余联系人决定，不把200设为每日硬上限。重复点击确认不会重置本批消耗；另建计划重试是销售的新操作，不能用它处理未核对结果。

当前已验证：69项企业服务回归、批次时间边界11项Java检查、构建/lint/权限及浏览器回归；S23在隔离生成LIVE服务、拨号权限被明确撤销的条件下通过42项确认/取消/失效/拒绝启动检查。原服务与权限已恢复，原业务12张表内容逐行核对未变；本轮0真实电话。

边界：0.6新版自主批次的实际呼出/讲话及完整下一条仍未运行；之前7通受控电话和两条用户操作闭环属于0.5版，不升级为新版已验收。首次真实使用仍建议两个已同意的受控目标，由操作者亲自确认；未完成这轮之前不批量放开真实客户。全天/更多机型/费用仍待试点；期限未定继续不自动删除。

账号和企业代码仅在本电脑.local/enterprise/bootstrap-private.json的LIVE项查看，不发送密码或文件；改过密码使用新密码。


---

以下为历史记录：

2026-10-20状态：当前0.5-controlled-window/code4在S23上的正式受控闭环已含接通、双向讲话和显号尾9486（用户确认），结果COMPLETED已归档；5尝试/0待核对、真实许可已撤销、会话退出/闹钟禁用。本机服务入口与安装操作沿用下文；目前需新有界许可才能再实拨。全天/更多机型尚未验收。

---

以下为历史记录：

# 安卓本地企业工作区

2026-10-19本轮增量：按D032暂停停卡/换卡，仅推进其他验证。S23真实重启13检查通过，启动计数299→300，旧系统闹钟清除、冷开旧队列停止、无新增授权/自动恢复。前台有人操作的20条生成数据真实节拍演练通过，耗时约9.73分钟，最短提交间隔30.053秒，20条记录型请求/合成结果完成，队列FINISHED、待核对0。本轮真实外呼0；临时REHEARSAL业务时钟已按原字节恢复，系统时钟与LIVE时间未改。手机空闲、闹钟DISABLED、会话退出、双端无真实许可，LIVE仍为2联系人/4授权尝试/4API接受/待核对0。

本文件下方2026-10-18“真实部署/通话未运行”的说明是历史版本；当前0.5/code4已有普通时段双目标自动下一条、后台锁屏及真实来电响铃占用证据，实际呼出累计4次且用户均未接。默认真实许可仍关闭，现已全部撤销，不可复用旧授权。演练时钟本轮仅临时用于连续记录测试，现已恢复原独立业务时间；界面仍需选择演练的有效工作时段。

---

以下为历史快照：

2026-10-18；R102～105；D-CALL-030。本机和USB连接的S23使用，不发布公网；iPhone暂停。新版真实通话默认关闭。旧本机资料只保留为开发诊断，不使用旧固定身份拨号。

## 启动与账号

在项目根运行：

```powershell
pwsh -NoProfile -File tools/start-enterprise.ps1
.tooling/android-sdk/platform-tools/adb.exe -s YOUR_DEVICE_SERIAL reverse tcp:8790 tcp:8790
.tooling/android-sdk/platform-tools/adb.exe -s YOUR_DEVICE_SERIAL install -r prototypes/android/pilot/build/outputs/apk/debug/pilot-debug.apk
.tooling/android-sdk/platform-tools/adb.exe -s YOUR_DEVICE_SERIAL shell am start -W -n com.mantou.salesdialer.pilot/com.mantou.salesdialer.contacts.PilotLauncherActivity
```

手机“销售拨号·受控试点→企业账号与自动队列”，电脑 http://127.0.0.1:8790/ 。服务只监听电脑127.0.0.1，手机由USB转接；断线不会自动续拨。

首次生成LIVE实际企业和REHEARSAL演练企业，各有admin/sales。企业代码和初始密码只在本机忽略文件 `.local/enterprise/bootstrap-private.json`，不贴入日志、聊天或截图。管理员可创建/停用/启用/重置销售账号，本人可改密；旧会话随撤销失效。会话有效8小时、不自动续期，手机令牌由Keystore加密，密码不持久化。初始凭据不会随改密同步更新。

目录由启动脚本限制为当前Windows用户与SYSTEM访问。保留server-key.bin/enterprise.db和凭据；不能丢密钥后重建来“修复登录”。schema1升级2保持账号/会话/未知，同设备多个未知冲突拒绝升级而非清库。

## 销售操作

销售自行导入自己的名单，每行一个大陆11位手机号、声明来源和已有联系资格，不用上传证明。资料按企业/销售隔离，同企业重复与拒绝联系共享约束；原始输入与来源加密，界面仅掩码。国家码/座机/分机不猜测转换，无效行分别处理。

掩码/尾号搜索、按资格筛选、分页与勾选；跨页勾选保留，每个目标版本随安排提交，变化后重新选择。计划北京时间留空则5秒后，演练明确显示独立业务时间。绑定已选电销卡后明确启动。工作日09:00含至18:00不含；人工立即下一条和改期遵守同窗口及至少30秒间隔。

上一条手机空闲且销售填完结果后才安排下一条。人工结果、端口接受、实际呼出/接通分开。未知、忙线、暂停、过期、权限/SIM变化或断线停止，不自动补拨/重拨；未知须核对，明确关闭仍保留原未知。重开、换账号、服务重启不会自动恢复。重新安排后启动。

演练只记录请求，不调用电话系统，人工结果是测试输入。相邻提交至少30秒，同手机换销售也保留间隔及未知占用。200不是硬上限；累计/北京时间授权日统计不同目标、授权、接受及人工/未知，实际呼出/接通无证据保持未知。

管理员保留期限未定时留空，默认不自动删除。配置、只读预览、明确清理分别操作；保护活动/未知，保留拒绝与防重最小安全记录。夹具1天不是生产决定。

## 停止与验证

手机先点“暂停我的队列”。退出或重开不续拨；强停后需重开重新安排。电脑停止不会删除记录：

```powershell
.tooling/android-sdk/platform-tools/adb.exe -s YOUR_DEVICE_SERIAL shell am force-stop com.mantou.salesdialer.pilot
pwsh -NoProfile -File tools/stop-enterprise.ps1
npm --prefix packages/enterprise test
npm --prefix packages/core test
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test
pwsh -NoProfile -File tools/check-pilot.ps1 -Mode BuildAll
pwsh -NoProfile -File tools/check-pilot-package.ps1
pwsh -NoProfile -File tools/check-standalone-package.ps1
```

桌面E2E：`node tools/record-core-run.mjs evidence/enterprise-browser-NEW R-CALL-103,R-CALL-104 node tools/check-enterprise-browser.mjs`。随机项目私有夹具、生成联系人、记录端口，不连接手机。

S23 E2E：`node tools/record-core-run.mjs evidence/enterprise-device-NEW R-CALL-103,R-CALL-104,R-CALL-105 node tools/check-enterprise-device.mjs --run`。需解锁/USB、选SIM和已有系统设置；创建独立演练销售，绝不配置LIVE许可。每次证据目录换新，不覆盖历史。源码摘要/命令/退出码见evidence/enterprise-r103和enterprise-android-r105。Node录制器通过pwsh调用npm，避免Windows直接spawn npm失败。

## 真实验证边界

无当次双方同意和目标/设备/SIM/时效/次数绑定许可时，LIVE端口无法启动。旧未认证入口固定拒绝真实提交。tools/prepare-enterprise-live-permit.mjs仅供后续受控步骤2，本轮没有执行；它不启动闹钟。下一次仍按manual-steps核验工作时段、设备空闲、账号/SIM和新有界授权。新版实际拨号、锁屏/来电/撤权/换卡、全天/其他机型需独立真实证据，不能由记录型绿灯验收。


2026-10-18续项：许可准备CLI已完成14项隔离流程与真实CLI拒绝测试，企业套件现36项通过；实际手机许可部署仍未运行，当前默认禁用保持。恢复与具体使用见[许可验证说明](enterprise-permit-validation.md)。安卓APK与服务运行链路源码未改，已有S23证据复用。


2026-10-18 17:50：已增加[本次许可关闭入口](enterprise-permit-closure.md)，企业全套52通过。关闭不发起新通话/挂断系统电话/清UNKNOWN或次数。S23真实CLI仅验证当前无许可时的幂等路径，有效许可手机撤销仍待下一轮取证；APK与已有手机界面未改。
