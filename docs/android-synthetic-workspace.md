# 安卓可操作合成工作区 R093

最新增量R094已接入原生单次自动模拟，见[定时器说明](android-workspace-timer.md)。下文为R093交付快照，其“到点手动执行/未接定时器”和旧APK摘要是历史状态。

2026-10-16，步骤5。R-CALL-093；F-CALL-001/005/010/011/012/013；T-CALL-626～640。当前子范围为本机练习身份和合成任务，不是生产企业认证或真实电话功能。原Android自动拨号要求保留，iPhone按用户决定暂停。

手机打开“销售任务仿真”→“打开合成任务工作区”。可以输入/选择合成联系人、保存未来计划、到点手动模拟或立即模拟、暂停、核对结果、明确关闭未知占用及查看历史。当前工作区没有自动定时器；原DEMO定时器没有接到新工作区。界面明确显示这项限制。离开页面用系统返回；强停应用后重开会暂停旧计划，未知尝试不重放。

## 输入与持久化

每行SIM-三位数字（000～999），例如SIM-101、SIM-102。最多200行/8000字符是单批输入资源边界，不是日拨号硬上限。忽略空行，合并重复；非法行使整批不写，第二条写入失败也回滚整批。重导入保留已有资格、拒绝、修订、草稿和尝试历史，不自动刷新草稿。不要输入真实号码。

使用独立synthetic-workspace-v1.db，schema4、SYNTHETIC_WORKSPACE类型；与原simulation-tasks.bin、正式contact-tasks-v1.db和随机fixture隔离。固定练习Actor为SYNTHETIC-WORKSPACE/LOCAL-SALES，不是登录身份；只有1000个合成ID的明确命名空间可入库。坏库/类型不符停止并保留，不清空重建。工作区Activity不导出，忽略Intent参数；导出的规则检查仅生成固定隔离fixture，不能传入身份、号码或数据库路径。

## 操作与结果含义

选联系人后“安排模拟时间”，使用严格北京时间yyyy-MM-dd HH:mm；只接受未来工作日09:00含～18:00不含。默认填入的未来时间只是可编辑输入提示，不自动创建任务。“执行当前模拟计划”未到时不提交，超过30秒窗口失效，暂停后须明确重排。“立即模拟所选”也遵守同一时段、资格/修订/版本及未知占用规则。

提交复用ContactTaskStore/SyntheticTaskLoop：同事务消费计划、记录稳定SIM-ATTEMPT/UNKNOWN和审计，再调用固定RecordingPort。它只记录合成请求，没有电话实现。界面串行执行数据库工作，使用操作前看到的版本；核心事务再次检查，不能通过按钮跳过守卫。采用实际系统Clock、elapsedRealtime和BOOT_COUNT；无法读取启动代次时不提交。

模拟API回执、人工结果和实际呼出/接通分别展示。模拟“完成”不证明接通；“结果仍未知”保留占用。另点“明确关闭未知占用”，必须勾选无活动/待处理合成任务才能关闭，历史仍为UNKNOWN，不能重放旧尝试。这里的无活动是合成操作确认，不是对真实手机通话状态的检查。任何下一次都需新的明确计划或立即操作。联系人资格修改后须明确刷新草稿；拒绝后不能重新安排，重导入不撤销拒绝。

## 实测与失败回归

纯规则红灯为可加载接口中的NOT_IMPLEMENTED，旧480断言通过；实现后57组510 Java断言通过。SQLite/Session固定隔离检查21断言：去重/重导入保留、整批校验、第二条写入失败回滚、类型不符拒绝且行保留、未知关闭及启动恢复。

S23 SM-S9180/API36实际点击导入→安排→未到时阻挡→暂停→立即模拟→强停重开未知保留→UNKNOWN不释放→明确关闭→下一明确模拟→未接核对→资格修改/显式刷新→拒绝/重导入→未来计划强停重开暂停→历史，驱动30项检查通过。它还验证隔离检查不修改用户工作区。不是用固定fixture代替实际界面证据。截图pending/history/workspace-final及XML在device-ui-final。

首次界面第2条立即操作报PAST_DUE：dueAt在事务外取时，事务内再次取now，几毫秒延迟即可失败。device-ui保留原始失败与截图；递增Clock在clock-regression-red确定复现PAST_DUE。修复为arrangeImmediatePlan在事务内用同一次Clock样本生成dueAt并校验，执行前仍重新检查实际时钟/单调预算，不冻结执行时间或放宽显式未来计划。clock-regression-green和同流程UI重跑通过。固定检查报告的tests字段仍写T631～635，新增移动时钟断言对应T640，命令IDs与本矩阵补全映射。

首次运行留存SIM-900/901、1次UNKNOWN明确关闭；最终成功重跑新增SIM-902/903及2次尝试。最终工作区4联系人、3不同合成目标已尝试、3模拟尝试/回执、1人工未接、2UNKNOWN明确关闭，待核对0、计划version12暂停。失败历史保留，未删除重跑。原DEMO仍12目标/7模拟尝试/暂停，字节不变；旧真实APK/绑定/许可未改，正式联系人文件未创建，本轮真实电话0。

## 命令与证据

在项目根执行，无新依赖；Node24.18.0、Java17.0.20.1、Gradle8.13/AGP8.13.2、SDK36。

```powershell
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Test
pwsh -NoProfile -File tools/check-standalone.ps1 -Mode Build
node tools/record-core-run.mjs evidence/workspace-ui-new-run R-CALL-093 node tools/check-workspace-ui-device.mjs --run
node tools/record-core-run.mjs evidence/workspace-fixture-new-run R-CALL-093,T-CALL-640 node tools/check-workspace-fixture-device.mjs --run
node tools/check-synthetic-loop-device.mjs --run
```

evidence目录参数必须是项目内尚不存在的新目录。UI脚本实际写入两条未使用合成ID和两次尝试，保留既有数据/历史；需USB已授权、S23解锁、已有本地绑定、原DEMO暂停、工作区无待核对且当前工作时段。条件不符会停止，不代替用户核对已有未知。fixture脚本只读保留已存在的用户工作区并创建隔离fixture，可锁屏；因此首次使用先开工作区创建。手机命令顺序运行，不同时操作同一界面。脚本结束只强停独立仿真包。

APK：prototypes/android/standalone/build/outputs/apk/debug/standalone-debug.apk，SHA256 724997ec4a6b964585c7122ecd1a677655ef1dc6f185e4585358c0ea3be3c0bc。构建/lint退出0，0错误6警告：旧同步SharedPreferences、备份提取规则、图标3类，以及本轮setText国际化3条；当前中文原生探索界面仍未资源化。这些不是通话通过证据。权限仍只有SCHEDULE_EXACT_ALARM，无电话/网络权限。精确闹钟权限当前不参与新工作区计划执行。

完整命令、时间、退出码、失败和源码/APK摘要见evidence/android-workspace-r093及acceptance.json。宿主JS未修改，不把历史673项说成本轮运行。

下一紧密行为组继续步骤5：接入新工作区的原生单次定时仿真，保持版本/暂停/资格/UNKNOWN与30秒守卫，复用已取证的精确闹钟方式，但不接原DEMO库或真实拨号。之后再完成生产身份、真实号码输入及手机状态/受控适配；全天/锁屏/多机型和真实链路仍须单独验收。
