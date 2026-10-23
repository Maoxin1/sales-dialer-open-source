package com.mantou.salesdialer.contacts;
import android.content.*;
/** Package replacement only revokes and pauses; it never schedules or calls. */
public final class PilotResetReceiver extends BroadcastReceiver {
 @Override public void onReceive(Context c,Intent i){if(i==null||!Intent.ACTION_MY_PACKAGE_REPLACED.equals(i.getAction()))return;PendingResult pending=goAsync();new Thread(()->{try{PilotPhoneRuntime.stopAll(c.getApplicationContext());}catch(Exception ignored){}finally{pending.finish();}},"pilot-updated").start();}
}
