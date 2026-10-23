# Sales Dialer · 开源版

Android 销售拨号工具：本机 SIM 通话、名单导入、批次安排、结果记录，以及可通过配对 Wi-Fi 访问的本地企业服务。

本仓库为脱敏后的独立开源快照，采用 [MIT 许可证](LICENSE)。不包含原私有仓库的提交历史、真实客户名单、运行数据库、账号密码、签名密钥或原始设备日志。

## 主要能力

- Android 原生调用与销售 SIM 选择，批次启动需要手机明确确认。
- Excel `.xlsx`、UTF-8 CSV 与三列粘贴，电话／公司／姓氏先预览再导入。
- 企业账号、名单隔离、批次计划、通话结果与状态恢复。
- 局域网配对访问本地企业服务，运行数据保存在自己的电脑。
- 核心规则仿真、REHEARSAL 演练、自动测试和 Android 原型。

Android pilot 源码版本为 `0.13-import-feedback/code13`；历史安装情况见 [开发记录](README.history.md)，不将历史记录视为本次开源重新完成了真机验收。iOS 目录为探索原型，不能视为与 Android 等价可用。

## 快速开始：先运行仿真

需要 Node.js **24.18.0 或以上**（使用内置 SQLite）。

```sh
git clone https://github.com/Maoxin1/sales-dialer-open-source.git
cd sales-dialer-open-source
npm --prefix packages/core run demo
npm --prefix packages/core run check
npm --prefix packages/core test
```

此入口运行合成数据仿真，不连接手机，不拨打真实电话。

## 本地企业服务

企业服务的 TLS 回归测试还需 JDK 17：通过 `JAVA_HOME` 指定，或让 `keytool` 可在 PATH 中找到。

```sh
npm ci --prefix packages/enterprise --ignore-scripts
npm --prefix packages/enterprise test
npm --prefix packages/enterprise start
```

启动后在自己的电脑打开 `http://127.0.0.1:8790`。首次启动在 `.local/enterprise/` 生成本机数据库、加密密钥和 `bootstrap-private.json` 账号文件；凭据只在本机读取，不要贴到 Issue 或提交到 Git。优先使用 REHEARSAL 账号与生成数据。

仅启动服务不会获得真实外呼许可。电脑服务默认监听回环地址；手机 Wi-Fi 访问需要另行初始化局域网地址、配对与证书信任，见 [Wi-Fi 说明](docs/wifi-quickstart.md)。Windows 启动脚本依赖 PowerShell 7。

## Android 构建

使用 JDK 17、Android SDK 36 和仓库中的 Gradle Wrapper，在 `prototypes/android/` 执行：

```sh
./gradlew :pilot:assembleDebug
# Windows: gradlew.bat :pilot:assembleDebug
```

需自行安装 SDK，并通过 Android Studio 或本机 `local.properties` 配置 SDK 路径。私有工作站的 `.tooling/` 不在开源包中；仓库中的部分设备验收脚本需要先配置自己的工具链与设备序列号 `YOUR_DEVICE_SERIAL`。

输出为本机调试构建。本次开源不提供 APK、签名密钥，也没有重新安装手机或执行真实通话。

## 导入模板与使用说明

- [Excel 模板](templates/contacts.xlsx) · [CSV 模板](templates/contacts.csv)：仅列头，无客户数据。
- [Excel 导入](docs/excel-import.md) · [三列导入](docs/contact-import.md)。
- [企业服务](docs/android-enterprise.md) · [试用流程](docs/s23-trial-quickstart.md)。
- [证据边界](evidence/README.md)：仅发布整理后的统计摘要，原始证据未公开。

## 运行边界

请只联系具备相应联系资格的接收方，并遵守所在地规则及运营商要求。测试中的号码与凭据是夹具，不是可直接外呼的名单。

真实通话需要自己的 SIM、权限、接收端同意及应用确认。未知结果应核对，不自动重拨。历史测试与许可不能复用为新的外呼授权。仓库中的数据恢复、拒绝联系、暂停和身份校验逻辑不应在部署时跳过。

## 目录

| 目录 | 内容 |
| --- | --- |
| `packages/core/` | 调度、规则、SQLite 存储、模拟与工作台 |
| `packages/enterprise/` | 企业服务、名单导入和网页界面 |
| `prototypes/android/` | Android app、standalone、pilot 模块 |
| `prototypes/ios/` | iOS 探索原型 |
| `templates/` | 空白导入模板 |
| `tools/` | 构建、静态检查和设备验收工具 |
| `docs/` | 设计说明与历史验证记录 |

文档中的原工作站路径是历史上下文；源码当前目录应以自己的克隆位置为准。

欢迎通过 Issue／Pull Request 贡献，见 [CONTRIBUTING.md](CONTRIBUTING.md)。漏洞私下报告方式见 [SECURITY.md](SECURITY.md)。第三方版权与许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
