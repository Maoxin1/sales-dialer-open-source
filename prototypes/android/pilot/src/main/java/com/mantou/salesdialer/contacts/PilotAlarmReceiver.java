package com.mantou.salesdialer.contacts;
import android.content.*;
public final class PilotAlarmReceiver extends BroadcastReceiver {
 @Override public void onReceive(Context context,Intent intent){if(intent==null||!((context.getPackageName()+".PILOT_DUE").equals(intent.getAction())))return;String token=intent.getStringExtra("token");PendingResult result=goAsync();new Thread(()->{try{PilotPhoneRuntime.fire(context.getApplicationContext(),token);}finally{result.finish();}},"controlled-pilot-due").start();}
}
