package com.mantou.salesdialer.standalone;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.SystemClock;
public final class TaskAlarmReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context,Intent intent){long version=intent.getLongExtra("version",-1);
        try{String result=AppRuntime.bridge(context).fire(version,AppRuntime.boot(context),SystemClock::elapsedRealtime);AppRuntime.record(context,result,version);}
        catch(Exception e){AppRuntime.record(context,"REVIEW_REQUIRED",version);}
    }
}
