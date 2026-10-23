import Foundation
import Combine
import UIKit
import SwiftUI
import CallKit

/// Public tel: exploration, not an implementation of confirmation-free cellular dialing.
@MainActor
final class ProbeModel: NSObject, ObservableObject, CXCallObserverDelegate {
    @Published var target = "SYNTHETIC-001"
    @Published var simulation = true
    @Published var consent = false
    @Published private(set) var logText = ""
    @Published private(set) var status = "暂停；默认仿真"
    private let observer = CXCallObserver()
    private var phase: ScenePhase = .inactive
    private var paused = true
    private var armed = false
    private var armedUntil: TimeInterval = 0
    private var configuredTarget = ""
    private var configuredSimulation = true
    private var pending: DispatchWorkItem?
    private var planID: String?
    private var uncertain = false
    private var lastRequestID = ""

    private struct Marker: Codable {
        var uncertain: Bool
        var lastRequestID: String
    }

    private var directory: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }
    private var markerURL: URL { directory.appendingPathComponent("request-marker.json") }
    private var logURL: URL { directory.appendingPathComponent("events.jsonl") }

    override init() {
        super.init()
        if FileManager.default.fileExists(atPath: markerURL.path) {
            if let data = try? Data(contentsOf: markerURL), let marker = try? JSONDecoder().decode(Marker.self, from: data) {
                uncertain = marker.uncertain
                lastRequestID = marker.lastRequestID
            } else {
                uncertain = true // Corrupt marker is not proof that no request was submitted.
            }
        }
        observer.setDelegate(self, queue: .main)
        refreshLog()
        event("probe_started", ["uncertainPreviousRequest": uncertain])
    }

    private var uptime: TimeInterval { ProcessInfo.processInfo.systemUptime }

    private func mobile(_ value: String) -> Bool {
        value.range(of: "^1[3-9][0-9]{9}$", options: .regularExpression) != nil
    }

    private func mask(_ value: String) -> String {
        value == "SYNTHETIC-001" ? value : "***" + String(value.suffix(4))
    }

    @discardableResult
    private func persistMarker(_ value: Bool, requestID: String) -> Bool {
        do {
            let data = try JSONEncoder().encode(Marker(uncertain: value, lastRequestID: requestID))
            try data.write(to: markerURL, options: .atomic)
            uncertain = value; lastRequestID = requestID
            return true
        } catch {
            status = "请求标记写入失败；停止真实呼出"
            return false
        }
    }

    @discardableResult
    private func event(_ name: String, _ detail: [String: Any] = [:]) -> Bool {
        do {
            let row: [String: Any] = ["wallTime": ISO8601DateFormatter().string(from: Date()),
                "uptimeSeconds": uptime, "event": name, "detail": detail,
                "scenePhase": String(describing: phase), "systemVersion": UIDevice.current.systemVersion]
            var data = try JSONSerialization.data(withJSONObject: row, options: [.sortedKeys])
            data.append(0x0A)
            if !FileManager.default.fileExists(atPath: logURL.path) {
                guard FileManager.default.createFile(atPath: logURL.path, contents: nil) else { return false }
            }
            let handle = try FileHandle(forWritingTo: logURL)
            defer { try? handle.close() }
            try handle.seekToEnd(); try handle.write(contentsOf: data); try handle.synchronize()
            refreshLog()
            return true
        } catch {
            status = "日志写入失败；真实呼出停止"
            return false
        }
    }

    func refreshLog() {
        if let text = try? String(contentsOf: logURL, encoding: .utf8) {
            logText = String(text.suffix(14000))
        }
    }

    func sceneChanged(_ value: ScenePhase) {
        phase = value
        event("scene_changed", ["phase": String(describing: value)])
    }

    func applyConfiguration() {
        let value = target.trimmingCharacters(in: .whitespacesAndNewlines)
        guard mobile(value) || (simulation && value == "SYNTHETIC-001") else {
            status = "受控目标无效"; event("config_rejected", ["reason": "invalid_target"]); return
        }
        guard simulation || consent else {
            status = "真实模式需确认受控测试同意"; return
        }
        cancelPlan()
        configuredTarget = value; configuredSimulation = simulation
        paused = false; armed = !simulation && consent; armedUntil = uptime + 15 * 60
        status = simulation ? "仿真已就绪" : "一次真实请求已启用；iOS仍可能逐通确认"
        event("config_applied", ["simulation": simulation, "target": mask(value)])
    }

    private func cancelPlan() {
        planID = nil
        pending?.cancel(); pending = nil
    }

    func pause() {
        cancelPlan(); paused = true; armed = false
        status = "已暂停，旧计划失效；已提交的电话不由本按钮挂断"
        event("paused")
    }

    func configurationEdited() { pause() }

    func scheduleOnce() {
        cancelPlan()
        guard !paused, !uncertain else {
            event("schedule_rejected", ["reason": "paused_or_unknown_request"]); return
        }
        let id = UUID().uuidString
        let due = uptime + 30
        planID = id
        let work = DispatchWorkItem { [weak self] in
            Task { @MainActor [weak self] in
            guard let self = self, self.planID == id else { return }
            self.planID = nil; self.pending = nil
            guard self.uptime <= due + 5 else {
                self.event("timer_expired", ["planID": id, "reason": "late_callback_no_catch_up"]); return
            }
            self.attempt(origin: "foreground_timer")
            }
        }
        pending = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 30, execute: work)
        event("scheduled", ["planID": id, "delaySeconds": 30, "scope": "foreground_only",
            "lateToleranceSeconds": 5])
        status = "30秒后执行一次；后台/锁屏不保证回调"
    }

    func manualOnce() { cancelPlan(); attempt(origin: "manual") }

    private func attempt(origin: String) {
        guard !paused, !uncertain else {
            event("attempt_blocked", ["reason": "paused_or_unknown_request_no_replay"]); return
        }
        guard phase == .active else {
            event("attempt_blocked", ["reason": "prototype_requires_active_scene"]); return
        }
        let id = UUID().uuidString
        if configuredSimulation {
            event("simulated_request", ["requestID": id, "origin": origin,
                "target": mask(configuredTarget), "phoneAPICalled": false]); return
        }
        guard armed, uptime <= armedUntil, mobile(configuredTarget) else {
            event("attempt_blocked", ["reason": "not_armed_or_expired"]); return
        }
        guard !observer.calls.contains(where: { !$0.hasEnded }) else {
            event("attempt_blocked", ["reason": "another_call_observed"]); return
        }
        guard let url = URL(string: "tel:" + configuredTarget), UIApplication.shared.canOpenURL(url) else {
            event("attempt_blocked", ["reason": "tel_unavailable"]); return
        }
        armed = false
        guard persistMarker(true, requestID: id) else { return }
        guard event("request_about_to_open_tel", ["requestID": id, "origin": origin,
            "target": mask(configuredTarget), "taskCallAssociation": "unverified"]) else { return }
        status = "已向系统请求；确认、实际呼出、接通分别观察"
        UIApplication.shared.open(url, options: [:]) { [weak self] accepted in
            DispatchQueue.main.async {
                self?.event("open_url_returned", ["requestID": id, "systemAcceptedURL": accepted,
                    "actualOutgoingAndConnection": "unconfirmed"])
            }
        }
    }

    func reconcile() {
        guard !observer.calls.contains(where: { !$0.hasEnded }) else {
            event("reconcile_rejected", ["reason": "call_still_observed"]); return
        }
        guard persistMarker(false, requestID: lastRequestID) else { return }
        armed = false; status = "人工已核对；需重新应用配置才能真实请求"
        event("manually_reconciled", ["requestID": lastRequestID, "automaticReplay": false])
    }

    nonisolated func callObserver(_ callObserver: CXCallObserver, callChanged call: CXCall) {
        let uuid = call.uuid.uuidString
        let outgoing = call.isOutgoing
        let connected = call.hasConnected
        let ended = call.hasEnded
        let held = call.isOnHold
        Task { @MainActor [weak self] in
            guard let self = self else { return }
            self.event("observed_call_changed", ["callUUID": uuid,
                "isOutgoing": outgoing, "hasConnected": connected,
                "hasEnded": ended, "isOnHold": held,
                "candidateRequestID": self.lastRequestID, "taskCallAssociation": "unverified"])
        }
        // An arbitrary observed call is not automatically attributed to our request or recipient.
    }
}
