package com.mantou.salesdialer.spike;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.SystemClock;
import android.provider.Settings;
import android.telecom.PhoneAccount;
import android.telecom.PhoneAccountHandle;
import android.telecom.TelecomManager;
import android.telephony.TelephonyCallback;
import android.telephony.TelephonyManager;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import java.util.ArrayList;
import java.util.List;

public final class MainActivity extends Activity {
    private EditText target;
    private CheckBox dryRun, consent;
    private Spinner sim;
    private TextView logs;
    private List<PhoneAccountHandle> accounts = new ArrayList<>();
    private TelephonyManager telephony;
    private StateObserver observer;

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        // Each new activity instance requires explicit arming. Saved unknown requests remain unknown.
        Probe.prefs(this).edit().putBoolean("armed", false).commit();
        ScrollView scroll = new ScrollView(this);
        LinearLayout body = new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setPadding(24, 24, 24, 24);
        scroll.addView(body);
        TextView intro = new TextView(this);
        intro.setText("单目标平台探索；默认仿真。一次人工或30秒定时。真实测试只选择已同意的接收端与销售SIM。API返回不代表接通。");
        body.addView(intro);
        target = new EditText(this);
        target.setSingleLine(true);
        target.setHint("接收端手机号；仿真可填 SYNTHETIC-001");
        target.setText(Probe.prefs(this).getString("target", "SYNTHETIC-001"));
        body.addView(target);
        dryRun = new CheckBox(this);
        dryRun.setText("仿真（不调用电话系统）"); dryRun.setChecked(true); body.addView(dryRun);
        consent = new CheckBox(this);
        consent.setText("双方同意，允许一次受控真实呼出（15分钟内有效）"); body.addView(consent);
        sim = new Spinner(this); body.addView(sim);
        button(body, "授予电话/状态/号码权限", () -> requestPermissions(new String[]{
            Manifest.permission.CALL_PHONE, Manifest.permission.READ_PHONE_STATE, Manifest.permission.READ_PHONE_NUMBERS}, 1));
        button(body, "刷新可用SIM", this::refreshAccounts);
        button(body, "应用实验配置（会取消旧计划）", this::applyConfig);
        button(body, "人工触发一次", () -> { Probe.attempt(this, "manual", null); refreshLog(); });
        button(body, "30秒后触发一次", () -> { Probe.schedule(this, 30); refreshLog(); });
        button(body, "暂停并取消计划", () -> { Probe.pause(this); consent.setChecked(false); refreshLog(); });
        button(body, "确认上一请求已结束/未呼出，解除待核对", () -> {
            try {
                TelecomManager t = getSystemService(TelecomManager.class);
                if (checkSelfPermission(Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED || t == null || t.isInCall()) {
                    Probe.event(this, "reconcile_rejected", "permission missing or active call", "");
                } else {
                    Probe.prefs(this).edit().putBoolean("uncertainRequest", false).putBoolean("armed", false).commit();
                    Probe.event(this, "manually_reconciled", "operator acknowledgement; no automatic replay", "");
                    consent.setChecked(false);
                }
            } catch (Exception e) { Probe.event(this, "reconcile_failed", e.getClass().getSimpleName(), ""); }
            refreshLog();
        });
        button(body, "打开精确定时权限设置（可选）", () -> {
            try { startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + getPackageName()))); }
            catch (Exception e) { Probe.event(this, "alarm_settings_failed", e.getClass().getSimpleName(), ""); }
        });
        button(body, "刷新事件日志", this::refreshLog);
        logs = new TextView(this); logs.setTextIsSelectable(true); body.addView(logs);
        setContentView(scroll);
        dryRun.setOnCheckedChangeListener((button, checked) -> Probe.pause(this));
        consent.setOnCheckedChangeListener((button, checked) -> Probe.pause(this));
        target.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int start, int count, int after) { }
            public void onTextChanged(CharSequence s, int start, int before, int count) { Probe.pause(MainActivity.this); }
            public void afterTextChanged(Editable s) { }
        });
        sim.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) { Probe.pause(MainActivity.this); }
            public void onNothingSelected(AdapterView<?> parent) { Probe.pause(MainActivity.this); }
        });
        refreshAccounts(); refreshLog();
    }

    private void button(LinearLayout parent, String text, Runnable action) {
        Button b = new Button(this); b.setText(text); b.setOnClickListener(v -> action.run()); parent.addView(b);
    }

    private void applyConfig() {
        String value = target.getText().toString().trim();
        boolean dry = dryRun.isChecked();
        if (!(value.matches("1[3-9][0-9]{9}") || (dry && value.equals("SYNTHETIC-001")))) {
            Probe.event(this, "config_rejected", "use controlled mainland mobile or synthetic identifier", ""); refreshLog(); return;
        }
        if (!dry && (!consent.isChecked() || sim.getSelectedItemPosition() <= 0 || !Probe.phonePermissions(this))) {
            Probe.event(this, "config_rejected", "real mode needs consent, permissions and an explicitly selected SIM", ""); refreshLog(); return;
        }
        Probe.cancelPlan(this);
        SharedPreferences.Editor e = Probe.prefs(this).edit().putString("target", value)
            .putBoolean("dryRun", dry).putBoolean("paused", false).putBoolean("armed", !dry && consent.isChecked())
            .putLong("armedUntilElapsedMs", SystemClock.elapsedRealtime() + 15 * 60 * 1000L);
        if (!dry) {
            PhoneAccountHandle h = accounts.get(sim.getSelectedItemPosition() - 1);
            e.putString("accountComponent", h.getComponentName().flattenToString()).putString("accountId", h.getId());
        } else { e.remove("accountComponent").remove("accountId"); }
        if (!e.commit()) { Probe.event(this, "config_failed", "persistence failed", ""); return; }
        Probe.event(this, "config_applied", "dryRun=" + dry + ";target=" + Probe.masked(value), ""); refreshLog();
    }

    private void refreshAccounts() {
        List<String> labels = new ArrayList<>(); labels.add("未选择SIM（真实测试需选择）");
        try {
            accounts = Probe.simAccounts(this);
            TelecomManager t = getSystemService(TelecomManager.class);
            for (int i = 0; i < accounts.size(); i++) {
                PhoneAccount a = t.getPhoneAccount(accounts.get(i));
                labels.add("SIM账户 " + (i + 1) + "：" + (a == null ? "unknown" : a.getLabel()));
            }
        } catch (Exception e) {
            accounts.clear(); Probe.event(this, "sim_read_failed", e.getClass().getSimpleName(), "");
        }
        sim.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, labels));
        observe();
    }

    private void observe() {
        if (!Probe.permission(this, Manifest.permission.READ_PHONE_STATE) || observer != null) return;
        try {
            telephony = getSystemService(TelephonyManager.class);
            if (telephony == null) return;
            StateObserver next = new StateObserver();
            telephony.registerTelephonyCallback(getMainExecutor(), next); observer = next;
            Probe.event(this, "observer_registered", "default telephony manager; not authoritative task/recipient association", "");
        } catch (Exception e) { Probe.event(this, "observer_failed", e.getClass().getSimpleName(), ""); }
    }

    private final class StateObserver extends TelephonyCallback implements TelephonyCallback.CallStateListener {
        @Override public void onCallStateChanged(int state) {
            String name = state == TelephonyManager.CALL_STATE_IDLE ? "IDLE" :
                state == TelephonyManager.CALL_STATE_RINGING ? "RINGING" : "OFFHOOK_NOT_PROOF_OF_CONNECTION";
            Probe.event(MainActivity.this, "observed_phone_state", name + ";device/default subscription scope",
                Probe.prefs(MainActivity.this).getString("lastRequestId", "")); refreshLog();
        }
    }

    private void refreshLog() { if (logs != null) logs.setText(Probe.log(this)); }
    @Override public void onResume() { super.onResume(); Probe.prefs(this).edit().putBoolean("visible", true).commit(); Probe.event(this, "activity_resumed", "", ""); observe(); refreshLog(); }
    @Override public void onStop() { Probe.prefs(this).edit().putBoolean("visible", false).commit(); Probe.event(this, "activity_stopped", "", ""); super.onStop(); }
    @Override public void onDestroy() {
        if (telephony != null && observer != null) {
            try { telephony.unregisterTelephonyCallback(observer); }
            catch (Exception e) { Probe.event(this, "observer_unregister_failed", e.getClass().getSimpleName(), ""); }
        }
        super.onDestroy();
    }
    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        Probe.event(this, "permission_result", "no automatic call after permission grant", ""); refreshAccounts(); refreshLog();
    }
}
