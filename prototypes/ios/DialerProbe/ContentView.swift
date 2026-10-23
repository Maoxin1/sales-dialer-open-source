import SwiftUI

@MainActor
struct ContentView: View {
    @StateObject private var model = ProbeModel()
    @Environment(\.scenePhase) private var phase

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("公开 tel: 路径探索。系统可能要求逐通确认；不代表原自动拨号目标已实现。单一受控接收端，一次定时，默认仿真。")
                    TextField("接收端手机号；仿真可填 SYNTHETIC-001", text: $model.target)
                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                        .textFieldStyle(.roundedBorder)
                    Toggle("仿真（不调用电话系统）", isOn: $model.simulation)
                    Toggle("双方同意，允许一次受控真实请求（15分钟）", isOn: $model.consent)
                    Button("应用实验配置", action: model.applyConfiguration)
                    Button("人工触发一次", action: model.manualOnce)
                    Button("30秒后触发一次", action: model.scheduleOnce)
                    Button("暂停并取消计划", action: model.pause)
                    Button("确认上一请求已结束/未呼出", action: model.reconcile)
                    Text(model.status).font(.callout)
                    Button("刷新日志", action: model.refreshLog)
                    Text(model.logText).font(.system(.caption, design: .monospaced)).textSelection(.enabled)
                }.padding()
            }.navigationTitle("销售拨号探索")
        }
        .onAppear { model.sceneChanged(phase) }
        .onChange(of: phase) { _, value in model.sceneChanged(value) }
        .onChange(of: model.target) { _, _ in model.configurationEdited() }
        .onChange(of: model.simulation) { _, _ in model.configurationEdited() }
        .onChange(of: model.consent) { _, _ in model.configurationEdited() }
    }
}
