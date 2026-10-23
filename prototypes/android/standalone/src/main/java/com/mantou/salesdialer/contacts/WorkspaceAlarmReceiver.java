package com.mantou.salesdialer.contacts;
import android.content.*;
/** Non-exported one-shot callback. No caller can supply data or enable telephone access. */
public final class WorkspaceAlarmReceiver extends BroadcastReceiver {
 @Override public void onReceive(Context context,Intent intent){if(!WorkspaceTimerRuntime.ACTION.equals(intent.getAction()))return;long version=intent.getLongExtra("version",-1);String token=intent.getStringExtra("token");PendingResult pending=goAsync();new Thread(()->{try{synchronized(WorkspaceTimerCoordinator.LOCK){WorkspaceTimerRuntime.fire(context.getApplicationContext(),version,token);}}finally{pending.finish();}},"workspace-alarm").start();}
}
