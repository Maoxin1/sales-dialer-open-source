package com.mantou.salesdialer.spike;

import android.Manifest;
import android.app.Activity;
import android.os.Bundle;
import android.content.ContentValues;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.telecom.PhoneAccount;
import android.telecom.PhoneAccountHandle;
import android.telecom.TelecomManager;
import android.util.Base64;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/** Debug-only final-state dry run. No phone-number input, dial API, or Probe path. */
public final class DeviceGuardActivity extends Activity {
 private static String digest(byte[] value)throws Exception{StringBuilder s=new StringBuilder();for(byte b:MessageDigest.getInstance("SHA-256").digest(value))s.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return s.toString();}
 private String deviceKey()throws Exception{
  android.content.SharedPreferences p=getSharedPreferences("guard_identity",MODE_PRIVATE);String value=p.getString("key",null);
  if(value==null){value=digest(java.util.UUID.randomUUID().toString().getBytes(StandardCharsets.UTF_8));if(!p.edit().putString("key",value).commit())throw new Exception("DEVICE_ID_WRITE_FAILED");}
  if(!value.matches("[a-f0-9]{64}"))throw new Exception("DEVICE_ID_INVALID");return value;
 }
 private boolean granted(String permission){return checkSelfPermission(permission)==PackageManager.PERMISSION_GRANTED;}
 private void verify(JSONObject c,String hash)throws Exception{
  SyntheticLease.validate(this,hash,getIntent().getStringExtra("leaseToken"),getIntent().getStringExtra("validUntilElapsed"));
  if(!deviceKey().equals(c.getString("deviceKey")))throw new Exception("DEVICE_MISMATCH");
  boolean call=granted(Manifest.permission.CALL_PHONE),state=granted(Manifest.permission.READ_PHONE_STATE),numbers=granted(Manifest.permission.READ_PHONE_NUMBERS);
  Boolean busy=null;int matches=0;boolean enabled=false;
  TelecomManager tm=getSystemService(TelecomManager.class);
  if(call&&state&&numbers&&tm!=null){
   try{for(PhoneAccountHandle h:tm.getCallCapablePhoneAccounts()){
    PhoneAccount a=tm.getPhoneAccount(h);
    if(a!=null&&a.hasCapabilities(PhoneAccount.CAPABILITY_SIM_SUBSCRIPTION)&&a.supportsUriScheme("tel")&&PhoneCapabilitiesActivity.key(h).equals(c.getString("accountKey"))){matches++;enabled=a.isEnabled();}
   }busy=tm.isInCall();}catch(SecurityException e){throw new Exception("PERMISSION_REQUIRED");}
  }
  String decision=DeviceGuardRules.check(call,state,numbers,busy,matches,enabled);if(!"READY".equals(decision))throw new Exception(decision);
  // Enumeration may take time: validate the device-local deadline again.
  SyntheticLease.validate(this,hash,getIntent().getStringExtra("leaseToken"),getIntent().getStringExtra("validUntilElapsed"));
 }
 private final class Ledger extends SQLiteOpenHelper {
  Ledger(){super(DeviceGuardActivity.this,"device_guard.db",null,1);}
  @Override public void onCreate(SQLiteDatabase db){db.execSQL("CREATE TABLE checks(request TEXT PRIMARY KEY,digest TEXT NOT NULL,receipt TEXT NOT NULL)");}
  @Override public void onUpgrade(SQLiteDatabase db,int a,int b){throw new IllegalStateException("UNSUPPORTED_GUARD_SCHEMA");}
 }
 private JSONObject accept(JSONObject c,String hash,JSONObject receipt)throws Exception{
  try(Ledger helper=new Ledger()){
   SQLiteDatabase db=helper.getWritableDatabase();db.beginTransaction();
   try{
    verify(c,hash);
    try(Cursor cursor=db.rawQuery("SELECT digest,receipt FROM checks WHERE request=?",new String[]{c.getString("requestId")})){
     if(cursor.moveToFirst()){
      if(!hash.equals(cursor.getString(0)))throw new Exception("REQUEST_CONFLICT");
      JSONObject old=new JSONObject(cursor.getString(1));old.put("duplicate",true);db.setTransactionSuccessful();return old;
     }
    }
    receipt.put("status","DRY_RUN_READY");receipt.put("duplicate",false);receipt.put("checksForRequest",1);
    ContentValues row=new ContentValues();row.put("request",c.getString("requestId"));row.put("digest",hash);row.put("receipt",receipt.toString());db.insertOrThrow("checks",null,row);
    db.setTransactionSuccessful();return receipt;
   }finally{db.endTransaction();}
  }
 }
 @Override public void onCreate(Bundle saved){super.onCreate(saved);
  try{
   if((getApplicationInfo().flags&ApplicationInfo.FLAG_DEBUGGABLE)==0)return;
   if("identity".equals(getIntent().getStringExtra("op"))){
    String nonce=getIntent().getStringExtra("nonce");if(nonce==null||!nonce.matches("[a-f0-9]{32}"))return;
    JSONObject r=new JSONObject();r.put("nonce",nonce);r.put("deviceKey",deviceKey());r.put("source","ANDROID_GUARD_IDENTITY");r.put("actualPhoneApiCalls",0);SyntheticLease.write(this,"guard-identity.json",r);return;
   }
   String encoded=getIntent().getStringExtra("command");if(encoded==null||encoded.length()>8000)throw new Exception("INVALID_ENVELOPE");
   byte[] raw=Base64.decode(encoded,Base64.URL_SAFE|Base64.NO_WRAP);if(raw.length>4096)throw new Exception("INVALID_ENVELOPE");
   String hash=digest(raw);JSONObject c=new JSONObject(new String(raw,StandardCharsets.UTF_8));
   JSONObject r=new JSONObject();r.put("source","ANDROID_GUARD_DRY_RUN");r.put("commandDigest",hash);r.put("actualPhoneApiCalls",0);r.put("realCallsEnabled",false);
   try{
    Set<String> fields=new HashSet<>(Arrays.asList("schemaVersion","mode","requestId","deviceKey","accountKey"));
    if(c.length()!=fields.size()||!(c.get("schemaVersion") instanceof Integer)||c.getInt("schemaVersion")!=1||!"dry-run".equals(c.get("mode")))throw new Exception("DRY_RUN_ONLY");
    java.util.Iterator<String> keys=c.keys();while(keys.hasNext())if(!fields.contains(keys.next()))throw new Exception("UNKNOWN_FIELD");
    if(!(c.get("requestId") instanceof String)||!c.getString("requestId").matches("SYNTHETIC-[A-Z0-9-]{1,120}"))throw new Exception("SYNTHETIC_REQUEST_REQUIRED");
    for(String field:new String[]{"deviceKey","accountKey"})if(!(c.get(field) instanceof String)||!c.getString(field).matches("[a-f0-9]{64}"))throw new Exception("INVALID_SCOPE");
    r=accept(c,hash,r);
   }catch(Exception e){r.put("status","REJECTED");r.put("reason",e.getMessage()==null?"GUARD_FAILED":e.getMessage());}
   SyntheticLease.write(this,"guard-"+hash+".json",r);
  }catch(Exception e){android.util.Log.e("DeviceGuard","guard_failed:"+e.getClass().getSimpleName());}finally{finish();}
 }
}
