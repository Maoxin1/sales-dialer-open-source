package com.mantou.salesdialer.spike;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class DialAlarmReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        Probe.event(context, "alarm_delivered", "one-shot receiver", intent.getStringExtra("planId"));
        Probe.attempt(context, "alarm", intent.getStringExtra("planId"));
    }
}
