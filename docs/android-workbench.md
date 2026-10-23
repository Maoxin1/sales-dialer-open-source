# 安卓网页仿真操作（2026-10-15）

当前使用同一S23 Ultra、USB调试与已有开发APK；手机收取合成任务，不调用电话系统。原三通真实证据不等于本网页真实链路通过。

项目根启动：

```powershell
.\tools\stop-workbench.ps1
.\tools\start-workbench.ps1 -AndroidSerial YOUR_DEVICE_SERIAL -OpenBrowser
```

浏览器打开 http://127.0.0.1:8787 ，向下找到“安卓手机仿真”。先“绑定 / 重新检查手机”，输入SYNTHETIC前缀目标并创建任务，选中后发送。接收回执后勾选核对并关闭本次。没有自动拨号；不自动认定呼出/接通。再次点击同一任务不重复授权。绑定60秒后需再次明确绑定，过期不自动续期。工作日09:00–18:00才允许新授权，使用当前北京时间，与上方虚拟时钟独立。

暂停手机区只影响该开发区任务；恢复后需重新安排。手机结果未知时先核对，不能靠刷新/重启重发。真实SIM始终未绑定。绑定显示的是检查时的快照，不是持续在线监控；每次发送会重查连接、boot ID和APK哈希。

独立数据文件为`.local/workbench.db.android.db`；原工作台`.local/workbench.db`保留。服务重启保留任务/未知占用，设备需重新绑定；两边均无自动循环。默认不带AndroidSerial启动时手机区显示未配置。已运行服务参数不一致时先用停止脚本再启动；不会自动结束其他服务。

停止：`.\tools\stop-workbench.ps1`。前台可用`npm.cmd --prefix packages/core run workbench -- --android-serial YOUR_DEVICE_SERIAL`并Ctrl+C停止；必须先释放8787。

检查：

```powershell
npm.cmd --prefix packages/core run test:android-binding
npm.cmd --prefix packages/core test
npm.cmd --prefix packages/core run check
# 独立临时库、实际浏览器及手机；只合成任务。工作日09–18时运行。
$env:DIALER_ANDROID_SERIAL='YOUR_DEVICE_SERIAL'
node tools/check-workbench-browser.mjs
Remove-Item Env:DIALER_ANDROID_SERIAL
```

手机E2E默认保存到新evidence/browser-时间目录，包含页面截图、手机命令/退出码、绑定快照、任务和回执；回传该目录即可。无设备时运行前三项；不要把测试替身当真机故障证明。原生源未改，构建命令仍为`tools/build-android-local.ps1 -ExistingTools -RecordPrefix 新前缀-`，本轮复用已核对哈希的既有APK。

绑定不是生产身份认证：本机ADB和受信任开发包是前提。真实电话权限未测、真实SIM未映射；手机boot/包变化在检查时失效，但无法识别检查之间已恢复的短断连。真实自动队列、企业登录/授权、设备通信认证及iPhone不在本次通过范围。


## 定时手机仿真（新增）

创建并选择未结束的手机区任务后，先重新绑定，再选择15/30/45秒，点击“保存定时计划”。计划时间必须落在当前60秒绑定期内；如果提示PLAN_OUTSIDE_BINDING_LEASE，重新绑定后再次保存即可。期间不要重新绑定，否则原计划会因绑定变化阻断。

到点由电脑服务发送合成任务。网页可以关闭；电脑服务与USB必须保持。页面每秒只读刷新结果。需要取消时使用“暂停手机区”，恢复后重新安排；停止服务也停止调度。服务重启后未来/过期计划均保留记录但不自动执行，必须重新安排。忙线、无绑定、超时或未知结果不会稍后自动补发。

1秒容差仅用于本机授权开始，不保证手机接收耗时；本轮实际回执约在计划后1.897秒保存。没有真实通话。单次任务仍需人工核对才能释放占用，不会自动结束后拨下一条。

局部验证：`npm.cmd --prefix packages/core run test:android-scheduler`。原手机浏览器检查命令现增加15秒定时及离开页面检查，只有工作日09–18和USB设备就绪时运行。无需新安装APK（本轮原生未修改）。


## 电话能力只读检查（新增）

更新后的APK已安装到同一S23。网页手机区下方新增“电话能力·只读检查”：点击“读取电话能力”，检查系统状态；在列表中明确选择已确定的“电销卡”，再点“只读绑定选定账户”。不会默认选第一卡，不会申请权限或拨电话。该观察绑定与合成SYNTHETIC-NO-SIM分开；页面真实外呼始终关闭。

快照主机有效期60秒，过期/读取失败/权限或账户变化清除绑定。再次选择会重新读取；不是持续系统权限监听。两个SIM的标签来自系统，绑定并不读取/验证销售号码。保持用户此前确认的电销卡角色，不重新索要手机号。

无浏览器的只读检查入口（证据目录须是新的）：

```powershell
node tools/check-phone-capabilities.mjs YOUR_DEVICE_SERIAL 电销卡 evidence/phone-capabilities/新目录
npm.cmd --prefix packages/core run test:phone-capabilities
```

命令只读取、选定观察账户和再次读取，不调用电话。结果保存APK哈希、快照、设备命令/退出码。PhoneCapabilitiesActivity是debug开发入口，生产发行仍需移除/限制及正式身份通信设计。

本轮发现手机比电脑快约27秒。快照保留手机时间并使用主机请求时间判断新鲜度；没有调整设备时钟。合成命令当前仍有跨端绝对时间依赖，因此其时钟偏差适应性还不能称已验证。


## 跨端时钟修正（R035）

新版APK的合成接收流程已自动加入设备接收期限握手。正常网页/CLI操作不变；手机和电脑日期时间不需相同到毫秒，设备用本机经过时间判断接收截止。主机仍检查本地业务时段与授权期限，旧过期请求不能靠应用重启续期。没有改变手机系统时间或生产迟到容差。

可复现无真实呼叫检查：

```powershell
npm.cmd --prefix packages/core run test:time-lease
node tools/check-time-lease-device.mjs YOUR_DEVICE_SERIAL evidence/time-lease/新目录
node tools/check-android-inbox.mjs YOUR_DEVICE_SERIAL evidence/time-lease/另一新目录
```

第二条模拟主机快/慢一天，包含force-stop测试应用及重复提交，只使用合成标识，不修改系统时钟；它不是整机重启验证。直接ADB调用旧裸命令会因缺少接收凭据被拒绝。请使用现成入口，失败未知不自动重试。验收顺序现为安卓和共用优先，iPhone最后。
