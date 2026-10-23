package com.mantou.salesdialer.contacts;
import android.content.*;
public final class EnterpriseResetReceiver extends BroadcastReceiver {
 @Override public void onReceive(Context context,Intent intent){if(intent!=null&&Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction()))EnterpriseQueue.disable(context.getApplicationContext());}
}
