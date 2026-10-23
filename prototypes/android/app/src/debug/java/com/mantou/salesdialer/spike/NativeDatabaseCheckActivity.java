package com.mantou.salesdialer.spike;
import android.app.Activity;
import android.os.Bundle;
import android.content.pm.ApplicationInfo;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import org.json.JSONArray;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
/** Debug-only on-device SQLite checks. Never creates a permit file or calls a phone API. */
public final class NativeDatabaseCheckActivity extends Activity {
 private final JSONArray assertions=new JSONArray();
 private final String digest="a".repeat(64),token="b".repeat(64),installation="c".repeat(64),fingerprint="d".repeat(64);
 private String tokenHash,command;
 private void eq(String label,Object actual,Object expected)throws Exception{
  boolean pass=expected.equals(actual);assertions.put(new JSONObject().put("name",label).put("passed",pass).put("actual",actual).put("expected",expected));if(!pass)throw new Exception("ASSERTION_FAILED");
 }
 private long number(ControlledCallDatabase db,String sql){try(Cursor c=db.getReadableDatabase().rawQuery(sql,null)){if(!c.moveToFirst())throw new IllegalStateException("MISSING_ROW");return c.getLong(0);}}
 private String state(ControlledCallDatabase db){try(Cursor c=db.getReadableDatabase().rawQuery("SELECT status FROM requests WHERE request='SYNTHETIC-A'",null)){if(!c.moveToFirst())return "MISSING";return c.getString(0);}}
 private String claim(ControlledCallDatabase db,String id,String d,long limit)throws Exception{return db.claim(id,d,"SYNTHETIC-PERMIT",fingerprint,limit,command,tokenHash,()->{});}
 private void checks(String name)throws Exception{
  StringBuilder h=new StringBuilder();for(byte b:MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)))h.append(String.format(java.util.Locale.ROOT,"%02x",b&255));tokenHash=h.toString();
  command=new JSONObject().put("installationKey",installation).put("targetKey","SYNTHETIC-TARGET").toString();
  try(ControlledCallDatabase db=new ControlledCallDatabase(this,name)){
   eq("first_claim",claim(db,"SYNTHETIC-A",digest,1),"NEW");eq("unknown_durable",state(db),"HANDOFF_UNKNOWN");eq("one_use",number(db,"SELECT used FROM permits"),1L);
   eq("duplicate_no_repeat",claim(db,"SYNTHETIC-A",digest,1),"DUPLICATE:HANDOFF_UNKNOWN");eq("conflicting_digest",claim(db,"SYNTHETIC-A","e".repeat(64),1),"REQUEST_CONFLICT");
   eq("pending_blocks_next",claim(db,"SYNTHETIC-B","e".repeat(64),1),"NATIVE_RECONCILIATION_REQUIRED");
  }
  try(ControlledCallDatabase db=new ControlledCallDatabase(this,name)){
   eq("reopen_unknown",state(db),"HANDOFF_UNKNOWN");eq("reopen_used",number(db,"SELECT used FROM permits"),1L);
   eq("wrong_request",db.reconcile("SYNTHETIC-B",digest,token,installation,true,()->false),"REJECTED");
   eq("wrong_digest",db.reconcile("SYNTHETIC-A","f".repeat(64),token,installation,true,()->false),"REJECTED");
   eq("wrong_token",db.reconcile("SYNTHETIC-A",digest,"e".repeat(64),installation,true,()->false),"REJECTED");
   eq("wrong_installation",db.reconcile("SYNTHETIC-A",digest,token,"f".repeat(64),true,()->false),"REJECTED");
   eq("no_confirmation",db.reconcile("SYNTHETIC-A",digest,token,installation,false,()->false),"REJECTED");
   eq("busy",db.reconcile("SYNTHETIC-A",digest,token,installation,true,()->true),"REJECTED");
   eq("unknown_or_missing_permission",db.reconcile("SYNTHETIC-A",digest,token,installation,true,()->null),"REJECTED");
   eq("rejections_keep_pending",state(db),"HANDOFF_UNKNOWN");
   eq("matched_close",db.reconcile("SYNTHETIC-A",digest,token,installation,true,()->false),"RECONCILED");
   eq("repeat_close",db.reconcile("SYNTHETIC-A",digest,token,installation,true,()->false),"RECONCILED");eq("no_refund",number(db,"SELECT used FROM permits"),1L);
   db.complete("SYNTHETIC-A","API_SUBMITTED");eq("late_submission_does_not_reopen",state(db),"RECONCILED");
   db.complete("SYNTHETIC-A","RECONCILE_REQUIRED");eq("late_unknown_does_not_reopen",state(db),"RECONCILED");
   eq("exhausted_after_close",claim(db,"SYNTHETIC-B","e".repeat(64),1),"PERMIT_EXHAUSTED");
  }
  try(ControlledCallDatabase db=new ControlledCallDatabase(this,name)){eq("reopen_closed",state(db),"RECONCILED");eq("reopen_no_refund",number(db,"SELECT used FROM permits"),1L);}
  String legacy=name.replace(".db","-legacy.db");
  try(SQLiteDatabase old=SQLiteDatabase.openOrCreateDatabase(getDatabasePath(legacy),null)){
   old.execSQL("CREATE TABLE requests(request TEXT PRIMARY KEY,digest TEXT NOT NULL,status TEXT NOT NULL)");old.execSQL("CREATE TABLE permits(id TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,used INTEGER NOT NULL)");
   old.execSQL("INSERT INTO requests VALUES(?,?,?)",new Object[]{"SYNTHETIC-A",digest,"HANDOFF_UNKNOWN"});old.execSQL("INSERT INTO permits VALUES(?,?,?)",new Object[]{"SYNTHETIC-PERMIT",fingerprint,1});old.setVersion(1);
  }
  try(ControlledCallDatabase db=new ControlledCallDatabase(this,legacy)){
   eq("migrated_schema",db.getWritableDatabase().getVersion(),2);eq("legacy_rows_retained",number(db,"SELECT COUNT(*) FROM requests"),1L);eq("legacy_used_retained",number(db,"SELECT used FROM permits"),1L);
   eq("legacy_missing_metadata_denied",db.reconcile("SYNTHETIC-A",digest,token,installation,true,()->false),"REJECTED");eq("legacy_stays_unknown",state(db),"HANDOFF_UNKNOWN");
  }
  String rollback=name.replace(".db","-rollback.db");
  try(ControlledCallDatabase db=new ControlledCallDatabase(this,rollback)){
   db.getWritableDatabase().execSQL("CREATE TRIGGER fail_request BEFORE INSERT ON requests BEGIN SELECT RAISE(ABORT,'SYNTHETIC_WRITE_FAILURE'); END");
   boolean failed=false;try{claim(db,"SYNTHETIC-A",digest,1);}catch(Exception e){failed=true;}eq("injected_write_failed",failed,true);
   eq("failed_request_absent",number(db,"SELECT COUNT(*) FROM requests"),0L);eq("quota_rolled_back",number(db,"SELECT COUNT(*) FROM permits"),0L);
   db.getWritableDatabase().execSQL("DROP TRIGGER fail_request");eq("claim_after_rollback",claim(db,"SYNTHETIC-A",digest,1),"NEW");
  }
  try(ControlledCallDatabase db=new ControlledCallDatabase(this,rollback)){eq("rollback_reopen_count",number(db,"SELECT used FROM permits"),1L);eq("rollback_reopen_unknown",state(db),"HANDOFF_UNKNOWN");}
  boolean isolated=false;try(ControlledCallDatabase ignored=new ControlledCallDatabase(this,"controlled_calls.db")){}catch(IllegalArgumentException e){isolated=true;}eq("actual_database_name_rejected",isolated,true);
 }
 @Override public void onCreate(Bundle saved){super.onCreate(saved);String nonce=getIntent().getStringExtra("nonce");
  try{
   if((getApplicationInfo().flags&ApplicationInfo.FLAG_DEBUGGABLE)==0||nonce==null||!nonce.matches("[a-f0-9]{32}"))return;
   String name="controlled-test-"+nonce+".db";
   for(String suffix:new String[]{".db","-legacy.db","-rollback.db"})if(getDatabasePath("controlled-test-"+nonce+suffix).exists())throw new Exception("FRESH_DATABASE_REQUIRED");
   JSONObject report=new JSONObject().put("source","ANDROID_SQLITE_ISOLATED_CHECK").put("nonce",nonce).put("phoneApiCalls",0).put("database",name).put("databaseEngine","Android SQLite").put("deviceModel",android.os.Build.MODEL).put("sdk",android.os.Build.VERSION.SDK_INT).put("busySource","INJECTED_TEST_VALUES");
   try{checks(name);report.put("passed",true);}catch(Exception e){report.put("passed",false).put("failureType",e.getClass().getSimpleName());}
   report.put("assertions",assertions).put("assertionCount",assertions.length());SyntheticLease.write(this,"native-db-check-"+nonce+".json",report);
  }catch(Exception e){android.util.Log.e("NativeDbCheck","check_failed:"+e.getClass().getSimpleName());}finally{finish();}
 }
}
