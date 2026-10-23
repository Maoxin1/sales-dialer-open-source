# 手机联系人/初始任务模型（R088）

2026-10-16。源码ContactTaskModel位于com.mantou.salesdialer.contacts，与DEMO TaskEngine类型隔离。本小项是不可变领域规则，尚未建立联系人数据库、生产登录或拨号授权。安卓检查活动只在内存中使用固定合成fixture；contact-model-check.json是诊断报告。

| 对象 | 当前规则 | 信任/实现边界 |
|---|---|---|
| Actor | 企业、销售、READ/IMPORT/PLAN/QUALIFY/REFUSE能力不可变复制 | 将由鉴权组合层注入；当前fixture不证明生产身份，不能接受客户端自行声明 |
| Input | CONTACT_INTAKE来源；64位小写hex targetKey；UNKNOWN/CONFIRMED/WITHDRAWN；声明来源非空≤200字符 | targetKey应由可信号码解析/归一化入口生成；摘要形状不证明号码/资格正确；本模型不读取手机号 |
| Contact | 企业+目标稳定ID；销售本人归属；资格/声明、拒绝、revision | 重复返回原对象；同企业其它销售冲突不返回ID/详情；跨企业不共用身份 |
| Task | 企业+销售+联系人稳定的初始DRAFT及contactRevision | 无plannedAt、意图、尝试或电话许可；不表示已安排；后续手动重试另建意图 |
| 更新 | 归属+能力+期望revision检查；返回新不可变Contact | 旧对象不被覆盖；持久历史、事务唯一性与崩溃恢复尚未实现 |
| 计划前检查 | 按调用者提供的最新权威Contact复核归属、修订、拒绝与资格 | ELIGIBLE_FOR_PLANNING只是联系人前置条件；仍需时段/版本/占用/设备/许可等守卫，不能直接外呼 |

身份构造为带长度字段的字符串摘要，联系人域包含CONTACT-V1，初始任务依据tenant/sales/contactID。身份编码支持有效UTF-8，拒绝不完整代理字符，避免替换字符产生同字节身份。nativeId支持固定kind，采用UTF-8 SHA256大写hex，与现有宿主contactWireId的独立向量一致；它只是编码，不认证或授权，不自动迁移旧UUID记录。

本轮沿用ContactWorkspace当前规则：自助导入本人名单、同企业规范目标重复不更新原资格/拒绝、同企业他人冲突隔离、企业间隔离；qualification采用当前宿主UNKNOWN/CONFIRMED/WITHDRAWN。现有名单资格已由用户确认，不再索取证明。新批次/来源真实性仍是未来可信入口的责任，不能由一个origin枚举保证。

正常：输入→归属/能力/来源/键校验→IMPORTED初始Contact+DRAFT；重导入DUPLICATE保留原记录。失败：错来源、无能力、目录矛盾、非法键/声明拒绝；同企业他人CONFLICT无对象。资格变化后旧DRAFT为STALE_CONTACT；按最新修订建初始DRAFT仍因UNKNOWN/WITHDRAWN/拒绝停止。没有持久Store的情况下，不能据此证明多进程并发唯一或最新事实已事务提交。

实际入口：手机“销售任务仿真→检查联系人模型”；开发检查node tools/check-contact-model-device.mjs --run（安装独立包，不改DEMO任务，不读真实名单/许可，可锁屏生成固定报告）。局部Java测试与构建沿用tools/check-standalone.ps1的Test/Build。T574～579是纯规则，T580为S23合成检查。

下一小项：独立SQLite联系人/任务元数据Store，数据库类型/版本标识、企业+targetKey唯一约束、Actor归属过滤、同事务revision变更及审计，严格恢复身份校验；先在隔离fixture库验证重开/写失败/重复/拒绝更新，不接真实号码和发送器。未来真实号码解析、正式身份与原生许可组合单独接入，不改原Android+iPhone要求。

## R089后续状态
上述“未持久化”描述为R088范围。2026-10-16已新增独立ContactTaskStore并用S23隔离合成SQLite验证原子导入、修订审计、并发及中途强停恢复，详见android-contact-store.md。生产身份/号码入口与发送器仍未连接，不能将纯模型、fixture或可计划前置状态当实际授权。下一小项为显式刷新过期草稿。
