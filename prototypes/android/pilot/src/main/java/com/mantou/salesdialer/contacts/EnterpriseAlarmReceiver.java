package com.mantou.salesdialer.contacts;
import android.content.*;
public final class EnterpriseAlarmReceiver extends BroadcastReceiver {
 @Override public void onReceive(Context context,Intent intent){if(intent==null||!"com.mantou.salesdialer.ENTERPRISE_ALARM".equals(intent.getAction()))return;String token=intent.getStringExtra("token");if(token==null||!token.matches("[a-f0-9]{32}"))return;PendingResult pending=goAsync();new Thread(()->{try{EnterpriseQueue.fire(context.getApplicationContext(),token);}finally{pending.finish();}},"enterprise-alarm").start();}
}
