package com.mantou.salesdialer.spike;

import android.Manifest;
import android.app.Activity;
import android.os.Bundle;
import android.os.SystemClock;
import android.provider.Settings;
import android.content.ContentValues;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.net.Uri;
import android.telecom.PhoneAccount;
import android.telecom.PhoneAccountHandle;
import android.telecom.TelecomManager;
import android.util.Base64;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.io.File;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Calendar;
import java.util.TimeZone;

/** Disabled by default. No permit provisioning, arming, scheduling or reconciliation UI.
 * Developer-controlled receiver only, NOT production authentication. */
public final class ControlledCallActivity extends Activity {
 private JSONObject command,permit;private String commandHash,permitHash;private PhoneAccountHandle selected;
 private static String hash(byte[] bytes)throws Exception{StringBuilder s=new StringBuilder();for(byte b:MessageDigest.getInstance("SHA-256").digest(bytes))s.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return s.toString();}
 private static void fields(JSONObject o,String... fields)throws Exception{
  HashSet<String> allowed=new HashSet<>(Arrays.asList(fields));if(o.length()!=allowed.size())throw new Exception("FIELDS");
  java.util.Iterator<String> keys=o.keys();while(keys.hasNext())if(!allowed.contains(keys.next()))throw new Exception("FIELDS");
 }
 private static String string(JSONObject o,String key,String pattern)throws Exception{Object v=o.get(key);if(!(v instanceof String)||!((String)v).matches(pattern))throw new Exception("FORMAT");return (String)v;}
 private static long number(JSONObject o,String key)throws Exception{Object v=o.get(key);if(!(v instanceof Integer)&&!(v instanceof Long))throw new Exception("FORMAT");long n=((Number)v).longValue();if(n<0)throw new Exception("FORMAT");return n;}
 private boolean granted(String p){return checkSelfPermission(p)==PackageManager.PERMISSION_GRANTED;}
 private void verify()throws Exception{
  if((getApplicationInfo().flags&ApplicationInfo.FLAG_DEBUGGABLE)==0)throw new Exception("DEBUG_ONLY");
  File file=new File(getFilesDir(),"controlled-call-permit.json");if(!file.isFile()||file.length()>8192)throw new Exception("NO_LOCAL_PERMIT");
  byte[] raw=Files.readAllBytes(file.toPath());if(raw.length>8192)throw new Exception("PERMIT_SIZE");
  JSONObject p=new JSONObject(new String(raw,StandardCharsets.UTF_8));
  fields(p,"schemaVersion","mode","enabled","permitId","approvalRef","token","installationKey","accountKey","tenantId","salesId","targetKey","targetNumber","maxAttempts","notBefore","expiresAt","bootCount","issuedElapsed","expiresElapsed");
  if(number(p,"schemaVersion")!=1||!"LOCAL_CONTROLLED_CALL".equals(p.get("mode"))||!Boolean.TRUE.equals(p.get("enabled")))throw new Exception("PERMIT_DISABLED");
  string(p,"approvalRef","CONTROLLED-[A-Z0-9-]{1,100}");
  String secret=string(p,"token","[a-f0-9]{64}");String supplied=getIntent().getStringExtra("permitToken");
  if(supplied==null||!MessageDigest.isEqual(secret.getBytes(StandardCharsets.UTF_8),supplied.getBytes(StandardCharsets.UTF_8)))throw new Exception("PERMIT_TOKEN");
  for(String k:new String[]{"permitId","tenantId","salesId","targetKey"})if(!string(p,k,"[A-Z][A-Z0-9-]{1,120}").equals(command.getString(k)))throw new Exception("SCOPE_MISMATCH");
  for(String k:new String[]{"installationKey","accountKey"})if(!string(p,k,"[a-f0-9]{64}").equals(command.getString(k)))throw new Exception("SCOPE_MISMATCH");
  if(!p.getString("installationKey").equals(getSharedPreferences("guard_identity",MODE_PRIVATE).getString("key","")))throw new Exception("INSTALLATION_CHANGED");
  string(p,"targetNumber","1[3-9][0-9]{9}"); // Single mainland mobile only; no URI/MMI/emergency/extension parsing.
  if(number(p,"maxAttempts")<1)throw new Exception("INVALID_LIMIT");
  long wall=System.currentTimeMillis(),elapsed=SystemClock.elapsedRealtime(),from=number(p,"notBefore"),until=number(p,"expiresAt"),issued=number(p,"issuedElapsed"),end=number(p,"expiresElapsed");
  if(until<=from||wall<from||wall>=until||end<=issued||end-issued>900000||elapsed<issued||elapsed>=end||number(p,"bootCount")!=Settings.Global.getInt(getContentResolver(),Settings.Global.BOOT_COUNT,-1))throw new Exception("PERMIT_EXPIRED");
  Calendar cal=Calendar.getInstance(TimeZone.getTimeZone("Asia/Shanghai"));int day=cal.get(Calendar.DAY_OF_WEEK),hour=cal.get(Calendar.HOUR_OF_DAY);
  if(day==Calendar.SATURDAY||day==Calendar.SUNDAY||hour<9||hour>=18)throw new Exception("WINDOW_CLOSED");
  String currentHash=hash(raw);if(permitHash!=null&&!permitHash.equals(currentHash))throw new Exception("PERMIT_CHANGED");permitHash=currentHash;permit=p;
  SyntheticLease.validate(this,commandHash,getIntent().getStringExtra("leaseToken"),getIntent().getStringExtra("validUntilElapsed"));
  boolean call=granted(Manifest.permission.CALL_PHONE),state=granted(Manifest.permission.READ_PHONE_STATE),numbers=granted(Manifest.permission.READ_PHONE_NUMBERS);
  TelecomManager tm=getSystemService(TelecomManager.class);int matches=0;boolean enabled=false;Boolean busy=null;selected=null;
  if(call&&state&&numbers&&tm!=null){try{for(PhoneAccountHandle h:tm.getCallCapablePhoneAccounts()){
   PhoneAccount a=tm.getPhoneAccount(h);if(a!=null&&a.hasCapabilities(PhoneAccount.CAPABILITY_SIM_SUBSCRIPTION)&&a.supportsUriScheme("tel")&&PhoneCapabilitiesActivity.key(h).equals(p.getString("accountKey"))){matches++;enabled=a.isEnabled();selected=h;}
  }busy=tm.isInCall();}catch(SecurityException e){throw new Exception("PERMISSION_REVOKED");}}
  if(!"READY".equals(DeviceGuardRules.check(call,state,numbers,busy,matches,enabled)))throw new Exception("DEVICE_BLOCKED");
  SyntheticLease.validate(this,commandHash,getIntent().getStringExtra("leaseToken"),getIntent().getStringExtra("validUntilElapsed"));
 }
 private final class Ledger extends ControlledCallDatabase implements ControlledCallExecutor.Ledger {
  Ledger(){super(ControlledCallActivity.this);}
  public String claim(String request,String digest)throws Exception{
   verify();
   return super.claim(request,digest,permit.getString("permitId"),permitHash,permit.getLong("maxAttempts"),command.toString(),hash(permit.getString("token").getBytes(StandardCharsets.UTF_8)),ControlledCallActivity.this::verify);
  }
 }
 @Override public void onCreate(Bundle saved){super.onCreate(saved);
  try{
   String encoded=getIntent().getStringExtra("command");if(encoded==null||encoded.length()>8000)return;byte[] raw=Base64.decode(encoded,Base64.URL_SAFE|Base64.NO_WRAP);if(raw.length>4096)return;
   commandHash=hash(raw);command=new JSONObject(new String(raw,StandardCharsets.UTF_8));
   fields(command,"schemaVersion","mode","permitId","attemptId","ticketId","tenantId","salesId","targetKey","installationKey","accountKey");
   if(number(command,"schemaVersion")!=1||!"controlled-call".equals(command.get("mode")))return;
   for(String k:new String[]{"permitId","attemptId","ticketId","tenantId","salesId","targetKey"})string(command,k,"[A-Z][A-Z0-9-]{1,120}");
   for(String k:new String[]{"installationKey","accountKey"})string(command,k,"[a-f0-9]{64}");
   String status;
   try(Ledger ledger=new Ledger()){
    status=ControlledCallExecutor.execute(command.getString("attemptId"),commandHash,this::verify,ledger,()->{
     // verify just ran after durable claim. No fallback account and no automatic retry.
     Bundle extras=new Bundle();extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE,selected);
     try{getSystemService(TelecomManager.class).placeCall(Uri.fromParts("tel",permit.getString("targetNumber"),null),extras);}
     catch(SecurityException e){throw new Exception("PERMISSION_REVOKED_AT_SUBMISSION");}
    });
   }
   JSONObject receipt=new JSONObject();receipt.put("source","ANDROID_CONTROLLED_CALL");receipt.put("commandDigest",commandHash);receipt.put("attemptId",command.getString("attemptId"));receipt.put("ticketId",command.getString("ticketId"));receipt.put("status",status);
   receipt.put("outgoingConfirmed",JSONObject.NULL);receipt.put("connectedConfirmed",JSONObject.NULL);receipt.put("manualResult",JSONObject.NULL);
   SyntheticLease.write(this,"controlled-call-"+commandHash+".json",receipt);
  }catch(Exception e){android.util.Log.e("ControlledCall","request_failed:"+e.getClass().getSimpleName());}finally{finish();}
 }
}
