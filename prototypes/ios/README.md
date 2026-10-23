# iPhone公开tel路径探索

状态：Xcode工程/元数据静态检查通过，Swift仅词法平衡检查；未编译、未安装、未运行。当前Windows的xcodebuild尝试退出127，未得到app产物。详见 [iOS spike](../../docs/spikes/IOS.md)。

原生SwiftUI、UIKit、CallKit；deployment17、Swift语言模式5，共享scheme为`DialerProbe`。项目文件由 [本地生成器](../../tools/generate-ios-project.py)写入，未声称使用Xcode生成或测试。源码与工程已保留。

## 已写入的实验入口（未运行）

- 单一受控目标；默认`SYNTHETIC-001`及仿真模式，不调用电话API。
- 人工一次、前台30秒定时一次、暂停/取消、日志。配置字段变化会令旧计划和启用失效。
- 真实模式要求受控同意、前台场景、无观察到的通话、一次启用；15分钟后过期。定时回调迟到超过5秒不补拨。
- 通过`UIApplication.open(tel:)`观察系统确认流程。打开URL成功仅记系统接受，不记接通；取消或结果未知需要人工核对再启用。
- `CXCallObserver`记录UUID、isOutgoing、hasConnected、hasEnded和isOnHold；与应用requestID的关联明确标未验证，不能把其他通话当作当前客户。
- 提交前保存待核对标记，进程重启后保留未知，损坏标记按未知处理，不自动重放。

该路径通常逐通确认；不是原“iPhone自动拨号”实现。App timer不宣称可靠后台/锁屏调度；没有编造Default Dialer entitlement、签名或地区权限。程序没有指定蜂窝SIM的公开tel参数，测试前须核对系统默认/联系人语音线。

单手机号、30秒、15分钟和5秒迟到保护是可逆实验参数，未采纳为产品规范。暂停只撤销本原型待提交请求，不挂断已提交电话，不影响系统中独立快捷指令自动化。

## 在Mac构建

将项目验证副本放到Mac可访问目录，以下从副本根执行，结果回写固定Windows项目evidence。Xcode需支持目标设备系统；先查 [官方支持表](https://developer.apple.com/support/xcode/)。

```sh
xcodebuild -version
xcodebuild -project prototypes/ios/DialerProbe.xcodeproj -list
xcodebuild -project prototypes/ios/DialerProbe.xcodeproj -scheme DialerProbe \
  -sdk iphonesimulator -configuration Debug \
  -derivedDataPath prototypes/ios/build CODE_SIGNING_ALLOWED=NO build
```

模拟器只能检查工程/界面与仿真；不能证明真实SIM/显号/通话。真机需要在Xcode选实际设备并配置自己的签名Team；没有账号/签名则只等待安装项。

日志保存在app的Documents/events.jsonl，可在Xcode Devices and Simulators下载Container，或Finder文件共享导出。请求标记为Documents/request-marker.json；没有保存完整目标号码到这些日志。受控接收端证据需与日志独立核对。

另一路径的待执行取证说明见 [Shortcuts实验](shortcuts/README.md)，不与原生tel结果混用。
