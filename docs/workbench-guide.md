# 销售自助工作台

2026-10-15。mantou已采纳销售自行导入/处理自己的名单，以及周一至周五09:00–18:00、过时不补拨、个人暂停、恢复后重新安排、忙线立即请求不排队。此页面实现这些行为的**本地合成操作入口**，不连接手机、不提供生产企业登录，也不接受真实客户号码。

## 打开、启动与停止

在项目根双击 [start-workbench.cmd](../start-workbench.cmd)，脚本会启动服务并打开默认浏览器；已经运行时复用原进程。也可在项目根运行：

```powershell
& .\tools\start-workbench.ps1 -OpenBrowser
```

地址：http://127.0.0.1:8787 。请在运行项目的这台电脑的浏览器中打开，手机/其他电脑不能使用此地址访问；聊天内嵌预览也不代表本机浏览器可达性。仅监听本机，不暴露局域网。

服务不是开机自启服务：重启电脑、进程退出后需要再次双击启动。关闭浏览器本身不停止服务。2026-10-15排查发现旧PID已退出、端口无监听，旧日志没有记录退出原因；已重新启动，HTTP资源/API均200，Chrome实际渲染通过。[恢复检查](../evidence/web-access-fix/result.json)。每次启动保存独立日志，当前PID和日志路径在`.local/workbench-service.json`。

停止本轮后台服务：

```powershell
& .\tools\stop-workbench.ps1
```

脚本先核对记录PID确实对应本项目workbench-cli，PID被其他程序复用时拒绝停止；保留数据库。本轮用-WhatIf核对目标。之后从项目根以前台方式启动：

```powershell
npm.cmd --prefix packages/core run workbench
```

打开输出地址；Ctrl+C停止前台进程。默认端口8787、数据库项目.local/workbench.db。端口冲突时可`npm.cmd --prefix packages/core run workbench -- --port 0`，查看实际分配地址；自定义数据库用绝对路径。不要把legacy CLI的simulation.db传入工作台，里面有历史跨销售能力，工作台会拒绝SELF_SERVICE_STORE_REQUIRED；旧仿真库保留，不静默修改。

## 完整本地操作

1. 点击“填入示例”，保持已确认的模拟资格，点击“导入我的名单”。每行一个SYNTHETIC标识。输入错误/冲突逐行显示，重导入不会清除拒绝状态。
2. 在“安排新任务”选择自己的联系人和北京时间，点击“为我创建任务”。不需要管理员分配，不能为其他销售创建任务；导入/创建本身不触发电话。
3. 选中任务。在“模拟提交结果”选择提交成功、忙线、明确未提交或结果丢失，然后点“人工触发选中任务”或“模拟计划到点”。到点按钮使用当前计划/策略版本，校验工作日、窗口、资格、暂停/占用和防重。
4. 暂停后旧计划失效；恢复不补执行。选择任务，在重新安排时间框填新时刻，点击“重新安排”。“明确再次尝试”仅对已结束任务建立新周期，不自动调用。
5. 提交成功不增加接通数。“记录模拟呼出/接通”分别注入模拟观察，人工结果不会冒充这些观察。结果丢失保留待核对；刷新/重开不会重放。
6. 核对后选择人工结果，勾选“没有活动或待处理请求”，再保存关闭本次。未知历史保留。真实设备操作时该确认必须有真实核对依据；此页面仅模拟。
7. “标记拒绝联系”后，该目标不能新授权；重导入、换销售仍不得绕过企业级拒绝。工作台没有清除拒绝按钮。
8. “模拟环境控制”可设置虚拟北京时间和设备空闲/占用/未知。虚拟时间不自动流逝，初始2026-10-14 09:00。60秒迟到容忍仍是实验参数，生产误差阈值未决定。

## 实际检查与限制

[浏览器检查](../evidence/continuation-1/browser-final/browser-check.json)已用实际Chrome完成13个检查点：导入→创建→未知→刷新保留→人工核对→拒绝后重试阻断→第二任务→暂停恢复/重排→模拟提交/呼出/接通→关闭，窄屏390像素无页面横向溢出、0运行时异常。最终U/G/Q/O/C=2/2/1/1/1，全为合成事实，真实电话0。桌面截图：[workbench-desktop.png](../evidence/continuation-1/browser-final/workbench-desktop.png)，窄屏截图：[workbench-narrow.png](../evidence/continuation-1/browser-final/workbench-narrow.png)。

```powershell
npm.cmd --prefix packages/core test
npm.cmd --prefix packages/core run check
npm.cmd --prefix packages/core run test:browser
```

当前143个共用测试通过；浏览器检查另记13检查点，不与手机E2E混算。浏览器脚本使用已安装Chrome/Edge、内置CDP接口，创建独立忽略目录/合成库，不使用个人浏览器资料。没有新增npm依赖。API需要本地会话令牌并检查Origin/Host、限制正文，不代表已实现生产鉴权。真实格式/保留、企业账号与正式手机链路未完成。
