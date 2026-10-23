# Android单目标拨号探索

状态更新2026-10-15：已用项目内JDK17/SDK36实际构建debug APK；权限lint问题已修复，lint0错误/10警告。物理设备和真实呼出未验证；模拟器结果见最新spike。原9009失败日志保留作历史。详见[Android spike](../../docs/spikes/ANDROID.md)。

原生Java/系统Activity、TelecomManager、AlarmManager和TelephonyCallback。Gradle8.13 Wrapper、AGP8.13.2、compile/target36、min31、JDK17。Wrapper来源与官方校验和见 [provenance](../../evidence/step-2/wrapper-provenance.json)。原型版本0.1-spike，不是正式产品。

## 单目标实验入口

- 一个固定实验目标：默认`SYNTHETIC-001`，仿真完全不调用电话API；真实模式只接受一个大陆手机号，接收端尚未提供。
- 手工请求一次或30秒后请求一次；AlarmManager记录exact/inexact模式，未获精确权限时允许观察非精确定时。
- 暂停取消待执行计划并撤回当前启用；修改目标、仿真、同意或SIM选择会暂停，须重新“应用实验配置”。
- 真实模式要求电话/状态/号码权限、操作者选择SIM、受控同意及15分钟有效窗口；消费一次后撤回启用。
- 使用SIM能力账户和EXTRA_PHONE_ACCOUNT_HANDLE；卡变化、权限撤回、已占用等检查失败时拒绝请求，不自动换卡。
- 提交前持久化待核对标记。API返回仅记request_submitted；观察到OFFHOOK不记接通，任意通话事件不自动归属受控客户。
- 请求结果未知不自动重放；操作者核对且系统无通话后可解除标记，再明确启用下一次同目标实验。没有自动批量队列。

30秒、15分钟、单手机号和最低系统只是可逆探索参数，未采纳为产品规则。重启不恢复已消耗请求，未实现全天调度、名单导入、固定语音或客户营销流程。

## 构建、安装与取证

从项目根，在已准备JDK17与SDK36的环境执行：

```powershell
$env:GRADLE_USER_HOME = Join-Path (Get-Location) '.tooling\gradle'
& .\prototypes\android\gradlew.bat -p prototypes/android :app:assembleDebug --no-daemon --console=plain
adb install -r prototypes/android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.mantou.salesdialer.spike/.MainActivity
```

APK已生成在app/build/outputs/apk/debug/app-debug.apk；上述裸adb需设置PATH，或使用项目.tooling/android-sdk/platform-tools/adb.exe。真机安装仍需受控设备连接。完整准备与实验步骤见 [manual-steps.md](../../docs/manual-steps.md)。

事件同时写入应用内部`files/events.jsonl`及logcat标签`SalesDialerProbe`；号码仅记录掩码，不记录SIM原始账户ID。日志区分计划、闹钟送达、仿真、请求提交、设备状态、暂停、失效和待核对。未提供的销售SIM号码不硬编码到源码，也不当作接收端。

```powershell
adb logcat -d -s SalesDialerProbe:I '*:S' > evidence/step-2/ANDROID-DEVICE.log
adb exec-out run-as com.mantou.salesdialer.spike cat files/events.jsonl > evidence/step-2/ANDROID-EVENTS.jsonl
```

API提交与实际呼出/客户显号/客户接通需分别留证。源码静态通过不能证明上述事实。

## 本项目可直接构建

从固定项目根执行`& .\tools\build-android-local.ps1 -ExistingTools`；lint使用`-Lint`。脚本只设置进程环境，JAVA_HOME/SDK/Gradle缓存均项目内；证据写入新的时间前缀，保留旧结果。debug APK为探索产物，仍没有完整销售名单→任务→手机自动队列的产品链路。[APK哈希](../../evidence/continuation-1/android-apk.json)。
