package com.mantou.salesdialer.spike;
import android.Manifest;
import android.app.Activity;
import android.os.Bundle;
import android.content.ContentValues;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.telecom.TelecomManager;
import android.util.Base64;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
/** No telephone submission API. Disabled by default; explicitly closes only a matched native row. */
public final class ControlledReconcileActivity extends Activity {
 private String digest(byte[] raw)throws Exception{StringBuilder s=new StringBuilder();for(byte b:MessageDigest.getInstance("SHA-256").digest(raw))s.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return s.toString();}
 private Boolean busy(){
  if(checkSelfPermission(Manifest.permission.READ_PHONE_STATE)!=PackageManager.PERMISSION_GRANTED)return null;
  TelecomManager tm=getSystemService(TelecomManager.class);if(tm==null)return null;
  try{return tm.isInCall();}catch(SecurityException e){return null;}
 }
 @Override public void onCreate(Bundle saved){super.onCreate(saved);
  try{
   if((getApplicationInfo().flags&ApplicationInfo.FLAG_DEBUGGABLE)==0)return;
   String nonce=getIntent().getStringExtra("nonce");if(nonce==null||!nonce.matches("[a-f0-9]{32}"))return;
   String encoded=getIntent().getStringExtra("command");if(encoded==null||encoded.length()>8000)return;
   byte[] raw=Base64.decode(encoded,Base64.URL_SAFE|Base64.NO_WRAP);if(raw.length>4096)return;
   JSONObject command=new JSONObject(new String(raw,StandardCharsets.UTF_8));String hash=digest(raw),request=command.getString("attemptId");
   if(!request.matches("[A-Z][A-Z0-9-]{1,120}"))return;
   String status="REJECTED";
   try(ControlledCallDatabase helper=new ControlledCallDatabase(this)){
    status=helper.reconcile(request,hash,getIntent().getStringExtra("permitToken"),getSharedPreferences("guard_identity",MODE_PRIVATE).getString("key",null),getIntent().getBooleanExtra("noActiveCall",false),this::busy);
   }
   JSONObject receipt=new JSONObject();receipt.put("source","ANDROID_CONTROLLED_RECONCILE");receipt.put("nonce",nonce);receipt.put("commandDigest",hash);receipt.put("attemptId",request);receipt.put("ticketId",command.getString("ticketId"));receipt.put("status",status);
   SyntheticLease.write(this,"controlled-reconcile-"+hash+".json",receipt);
  }catch(Exception e){android.util.Log.e("ControlledReconcile","request_failed:"+e.getClass().getSimpleName());}finally{finish();}
 }
}
