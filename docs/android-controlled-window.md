# 本次受控时段例外与实机结果

2026-10-19 R106：新版0.5-controlled-window/code4正式企业名单→签名许可→S23原生定时→电销卡实际呼出→用户反馈未接→结果归档→双端撤销已完成1次。系统OFFHOOK与指定号码电话界面共同取证，连续观察8239ms，按用户本次8秒呼出标准通过；不代表接收端响铃/显号/接通/双向语音或全天可靠。企业56测试、14企业定时器断言（含新增5个时钟/版本边界）、Java其余回归和双APK构建/lint通过。证据evidence/enterprise-afterhours-r106/acceptance.json；整体产品仍部分通过。

仅为D031明确同意的本次测试，schema2许可由本机密钥签名，绑定单一目标、队列/准备ID、企业销售、设备/SIM与最多10分钟；公共企业API不接受“跳过时段”字段。没有许可或撤销后，生产时段外继续拒绝。prepare仍只准备，手机启动按钮设置单次原生定时；真实呼叫由原EnterpriseQueue/TelecomManager端口提交，不另写绕过拨号脚本。

首次15秒准备未启动，主动撤销并重新准备；没有产生尝试。第二次准备后由正式手机按钮启动，8.239秒系统OFFHOOK且电话界面匹配指定接收端，结束后两卡状态空闲；随后关闭工具返回REVOKED/双端true，用户“未接听”通过匹配尝试界面归档，账号退出，无待核对或活动队列。仅1通，不为用完额度再拨。系统OFFHOOK不区分拨号与接通，不声称接收端响铃/显号/讲话通过，接通字段保持未知。

运行命令（项目根）：

```powershell
npm --prefix packages/enterprise test
pwsh -NoProfile -File tools/check-pilot.ps1 -Mode Test
pwsh -NoProfile -File tools/check-pilot.ps1 -Mode BuildAll
node tools/prepare-enterprise-live-permit.mjs --request-file .local/enterprise/consent-request-private.json --ack-current-bounded-authorization
node tools/close-enterprise-live-permit.mjs --permit-id <本次完整许可ID>
```

准备命令必须先有当次明确授权的私有请求，字段沿用enterprise-permit-validation.md；只有确有时段例外时增加allowOutOfHours=true。默认请求仍按原工作日规则。此次一次性UI/观察脚本在evidence/enterprise-afterhours-r106保存，不是可重复自动实拨入口。不得直接重跑取证脚本来消耗旧授权。实拨run没有套用记录器默认“未连接电话端口”的声明；call-one/live-one.json和result-archive分别记录真实观察与零额外电话。当前手机APK SHA256 9805b088d1c60f46ca66ab2fae55c0834e6a39e73a1832a9772d541cb59dd4da。原仿真APK仅重建未安装，不新增电话权限。

证据边界：56企业测试含真实SQLite/签名替身；Java和构建不代表电话可靠。当前仅此S23、一次前台原生定时、一次未接结果，正常生产时段/后台锁屏/来电与换卡/批量下一条/全天更多机型仍缺当前版真实证据；iPhone暂停。下一步2，非必要不增加功能。


2026-10-19最终补充：已使用原授权剩余1通，后台+锁屏8495ms；手机锁屏延迟5000ms，前两次500ms前置不足的准备已停用，无新增电话。第2通仅最终CDP页面刷新超时，原始失败保留；实际电话与8秒/空闲独立证据完整，后续用户解锁反馈未接，结果归档通过。两通接收端均有记录/显号9486由用户核对。累计2通已用完，禁止复用旧请求创建新实拨，双端许可/会话/闹钟已收尾。

随后必要回归发现NOT_DUE的1ms新时刻误判，固定读钟递增T811红转绿，服务57绿，新版S23记录型37和控制13通过；201容量在57套内通过。最终证据final-acceptance.json。当前运行时服务修复后源码摘要已对齐，无Android改动。
