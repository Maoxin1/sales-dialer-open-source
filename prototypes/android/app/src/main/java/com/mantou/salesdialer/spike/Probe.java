package com.mantou.salesdialer.spike;

import android.Manifest;
import android.app.AlarmManager;
import android.app.KeyguardManager;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.SystemClock;
import android.telecom.PhoneAccount;
import android.telecom.PhoneAccountHandle;
import android.telecom.TelecomManager;
import android.util.Log;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Single-target experiment. API submission is never classified as connection. */
final class Probe {
    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences("controlled_probe", Context.MODE_PRIVATE);
    }

    static boolean permission(Context c, String name) {
        return c.checkSelfPermission(name) == PackageManager.PERMISSION_GRANTED;
    }

    static boolean phonePermissions(Context c) {
        return permission(c, Manifest.permission.CALL_PHONE)
            && permission(c, Manifest.permission.READ_PHONE_STATE)
            && permission(c, Manifest.permission.READ_PHONE_NUMBERS);
    }

    static String masked(String s) {
        if (s.equals("SYNTHETIC-001")) return s;
        return s.length() >= 4 ? "***" + s.substring(s.length() - 4) : "unset";
    }

    static synchronized boolean event(Context c, String name, String detail, String request) {
        try {
            JSONObject row = new JSONObject();
            row.put("wallTimeMs", System.currentTimeMillis());
            row.put("elapsedMs", SystemClock.elapsedRealtime());
            row.put("event", name);
            row.put("detail", detail);
            row.put("requestId", request);
            row.put("activityVisible", prefs(c).getBoolean("visible", false));
            KeyguardManager kg = c.getSystemService(KeyguardManager.class);
            row.put("keyguardLocked", kg != null && kg.isKeyguardLocked());
            row.put("sdk", android.os.Build.VERSION.SDK_INT);
            row.put("model", android.os.Build.MODEL);
            String line = row.toString();
            try (FileOutputStream out = new FileOutputStream(new File(c.getFilesDir(), "events.jsonl"), true)) {
                out.write((line + "\n").getBytes(StandardCharsets.UTF_8));
                out.getFD().sync();
            }
            Log.i("SalesDialerProbe", line);
            return true;
        } catch (Exception e) {
            Log.e("SalesDialerProbe", "event_write_failed", e);
            return false;
        }
    }

    static String log(Context c) {
        try {
            String value = new String(Files.readAllBytes(new File(c.getFilesDir(), "events.jsonl").toPath()), StandardCharsets.UTF_8);
            return value.length() > 12000 ? value.substring(value.length() - 12000) : value;
        } catch (Exception e) { return "暂无事件或读取失败"; }
    }

    static List<PhoneAccountHandle> simAccounts(Context c) {
        List<PhoneAccountHandle> result = new ArrayList<>();
        if (c.checkSelfPermission(Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED
                || c.checkSelfPermission(Manifest.permission.READ_PHONE_NUMBERS) != PackageManager.PERMISSION_GRANTED) return result;
        TelecomManager telecom = c.getSystemService(TelecomManager.class);
        if (telecom == null) return result;
        try {
            for (PhoneAccountHandle handle : telecom.getCallCapablePhoneAccounts()) {
                PhoneAccount account = telecom.getPhoneAccount(handle);
                if (account != null && account.hasCapabilities(PhoneAccount.CAPABILITY_SIM_SUBSCRIPTION)
                        && account.supportsUriScheme("tel")) result.add(handle);
            }
        } catch (SecurityException e) {
            result.clear();
            event(c, "account_permission_revoked", "permission changed during account query; no fallback SIM", "");
        }
        return result;
    }

    static PendingIntent alarmIntent(Context c, String id) {
        Intent intent = new Intent(c, DialAlarmReceiver.class).putExtra("planId", id);
        return PendingIntent.getBroadcast(c, 1, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void cancelPlan(Context c) {
        // Invalidate persisted plan first. An already-delivered old intent is also rejected.
        prefs(c).edit().remove("planId").commit();
        AlarmManager alarm = c.getSystemService(AlarmManager.class);
        if (alarm != null) alarm.cancel(alarmIntent(c, ""));
    }

    static void pause(Context c) {
        prefs(c).edit().putBoolean("paused", true).putBoolean("armed", false).commit();
        cancelPlan(c);
        event(c, "paused", "pending plan cancelled; submitted call is not hung up", "");
    }

    static void schedule(Context c, int seconds) {
        cancelPlan(c);
        SharedPreferences p = prefs(c);
        if (p.getBoolean("paused", true) || p.getBoolean("uncertainRequest", false)) {
            event(c, "schedule_rejected", "paused or previous request needs reconciliation", "");
            return;
        }
        String id = UUID.randomUUID().toString();
        long due = SystemClock.elapsedRealtime() + seconds * 1000L;
        if (!p.edit().putString("planId", id).putLong("dueElapsedMs", due).commit()) return;
        AlarmManager alarm = c.getSystemService(AlarmManager.class);
        if (alarm == null) { cancelPlan(c); event(c, "schedule_rejected", "alarm service unavailable", id); return; }
        try {
            String mode;
            if (alarm.canScheduleExactAlarms()) {
                alarm.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, due, alarmIntent(c, id));
                mode = "exact_allow_while_idle";
            } else {
                alarm.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, due, alarmIntent(c, id));
                mode = "inexact_allow_while_idle";
            }
            event(c, "scheduled", mode + ";delaySeconds=" + seconds, id);
        } catch (Exception e) {
            cancelPlan(c);
            event(c, "schedule_failed", e.getClass().getSimpleName(), id);
        }
    }

    static synchronized void attempt(Context c, String origin, String planId) {
        SharedPreferences p = prefs(c);
        if (origin.equals("alarm")) {
            if (planId == null || !planId.equals(p.getString("planId", ""))) {
                event(c, "stale_alarm_ignored", "not current plan", ""); return;
            }
            if (!p.edit().remove("planId").commit()) return; // Consume before any external action.
        } else {
            cancelPlan(c); // Manual intervention replaces the pending one-shot experiment.
        }
        String id = UUID.randomUUID().toString();
        if (p.getBoolean("paused", true)) { event(c, "attempt_blocked", "paused", id); return; }
        if (p.getBoolean("uncertainRequest", false)) { event(c, "attempt_blocked", "previous request unknown; no replay", id); return; }
        String target = p.getString("target", "");
        boolean dry = p.getBoolean("dryRun", true);
        boolean mobile = target.matches("1[3-9][0-9]{9}");
        if (!(mobile || (dry && target.equals("SYNTHETIC-001")))) {
            event(c, "attempt_blocked", "invalid controlled target", id); return;
        }
        if (dry) { event(c, "simulated_request", origin + ";target=" + masked(target) + ";no phone API called", id); return; }
        if (!p.getBoolean("armed", false) || SystemClock.elapsedRealtime() > p.getLong("armedUntilElapsedMs", 0)) {
            event(c, "attempt_blocked", "controlled-call consent not armed or expired", id); return;
        }
        if (c.checkSelfPermission(Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED
                || c.checkSelfPermission(Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED
                || c.checkSelfPermission(Manifest.permission.READ_PHONE_NUMBERS) != PackageManager.PERMISSION_GRANTED) {
            event(c, "attempt_blocked", "phone permission missing/revoked", id); return;
        }
        try {
            TelecomManager telecom = c.getSystemService(TelecomManager.class);
            if (telecom == null || telecom.isInCall()) { event(c, "attempt_blocked", "telecom unavailable or another call exists", id); return; }
            ComponentName component = ComponentName.unflattenFromString(p.getString("accountComponent", ""));
            if (component == null) { event(c, "attempt_blocked", "no explicitly selected SIM", id); return; }
            PhoneAccountHandle selected = new PhoneAccountHandle(component, p.getString("accountId", ""));
            if (!simAccounts(c).contains(selected)) { event(c, "attempt_blocked", "selected SIM changed/unavailable", id); return; }
            if (!p.edit().putBoolean("uncertainRequest", true).putBoolean("armed", false).putString("lastRequestId", id).commit()) return;
            if (!event(c, "request_about_to_submit", origin + ";target=" + masked(target), id)) return;
            Bundle extras = new Bundle();
            extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, selected);
            telecom.placeCall(Uri.fromParts("tel", target, null), extras);
            event(c, "request_submitted", "placeCall returned; actual outgoing/connection unconfirmed", id);
        } catch (Exception e) {
            event(c, "request_error", e.getClass().getSimpleName() + ";reconcile before another attempt", id);
        }
    }
}
