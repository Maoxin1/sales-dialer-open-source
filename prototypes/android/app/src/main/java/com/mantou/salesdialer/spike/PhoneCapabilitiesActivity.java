package com.mantou.salesdialer.spike;

import android.Manifest;
import android.app.Activity;
import android.app.ActivityManager;
import android.app.AlarmManager;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.PowerManager;
import android.telecom.PhoneAccount;
import android.telecom.PhoneAccountHandle;
import android.telecom.TelecomManager;
import android.util.AtomicFile;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Debug-only read-only capability probe. No phone numbers, dial API, permission requests or Probe calls. */
public final class PhoneCapabilitiesActivity extends Activity {
    private boolean granted(String name){return checkSelfPermission(name)==PackageManager.PERMISSION_GRANTED;}
    static String key(PhoneAccountHandle h) throws Exception {
        String raw=h.getComponentName().flattenToString()+"\n"+h.getId()+"\n"+h.getUserHandle().toString();
        StringBuilder s=new StringBuilder();for(byte b:MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8)))s.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return s.toString();
    }
    @Override public void onCreate(Bundle saved){
        super.onCreate(saved);
        try{
            String nonce=getIntent().getStringExtra("nonce");
            if((getApplicationInfo().flags&ApplicationInfo.FLAG_DEBUGGABLE)==0||nonce==null||!nonce.matches("[a-f0-9]{32}"))return;
            JSONObject r=new JSONObject(),permissions=new JSONObject();
            r.put("schemaVersion",1);r.put("source","ANDROID_READ_ONLY");r.put("nonce",nonce);r.put("observedAt",System.currentTimeMillis());r.put("realCallsEnabled",false);
            permissions.put("callPhone",granted(Manifest.permission.CALL_PHONE));permissions.put("readPhoneState",granted(Manifest.permission.READ_PHONE_STATE));permissions.put("readPhoneNumbers",granted(Manifest.permission.READ_PHONE_NUMBERS));r.put("permissions",permissions);
            r.put("inCall",JSONObject.NULL);r.put("exactAlarm",JSONObject.NULL);r.put("backgroundRestricted",JSONObject.NULL);r.put("ignoringBatteryOptimizations",JSONObject.NULL);
            TelecomManager tm=getSystemService(TelecomManager.class);JSONArray accounts=new JSONArray();String status="UNKNOWN";
            if(tm!=null&&granted(Manifest.permission.READ_PHONE_STATE)&&granted(Manifest.permission.READ_PHONE_NUMBERS)){
                try{
                    for(PhoneAccountHandle h:tm.getCallCapablePhoneAccounts()){
                        PhoneAccount a=tm.getPhoneAccount(h);
                        if(a!=null&&a.hasCapabilities(PhoneAccount.CAPABILITY_SIM_SUBSCRIPTION)&&a.supportsUriScheme("tel")){
                            JSONObject row=new JSONObject();row.put("key",key(h));String label=String.valueOf(a.getLabel()).replaceAll("[0-9]{5,}","[redacted]");
                            row.put("label",label.substring(0,Math.min(label.length(),80)));row.put("enabled",a.isEnabled());accounts.put(row);
                        }
                    }
                    status="KNOWN";r.put("inCall",tm.isInCall());
                }catch(SecurityException e){accounts=new JSONArray();status="UNKNOWN";}
            }
            r.put("accounts",accounts);r.put("accountsStatus",status);
            AlarmManager alarm=getSystemService(AlarmManager.class);if(alarm!=null)r.put("exactAlarm",alarm.canScheduleExactAlarms());
            ActivityManager activity=getSystemService(ActivityManager.class);if(activity!=null)r.put("backgroundRestricted",activity.isBackgroundRestricted());
            PowerManager power=getSystemService(PowerManager.class);if(power!=null)r.put("ignoringBatteryOptimizations",power.isIgnoringBatteryOptimizations(getPackageName()));
            AtomicFile file=new AtomicFile(new File(getFilesDir(),"phone-capabilities.json"));FileOutputStream stream=null;
            try{stream=file.startWrite();stream.write(r.toString().getBytes(StandardCharsets.UTF_8));file.finishWrite(stream);}catch(Exception e){if(stream!=null)file.failWrite(stream);throw e;}
        }catch(Exception e){android.util.Log.e("PhoneCapabilities","read_failed:"+e.getClass().getSimpleName());}
        finally{finish();}
    }
}
