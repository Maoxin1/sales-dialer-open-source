package com.mantou.salesdialer.spike;
import android.content.Context;
import android.content.ContentValues;
import android.database.Cursor;
import org.json.JSONObject;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
/** Native submission journal, not the host business ledger. Never refunds permit use. */
class ControlledCallDatabase extends SQLiteOpenHelper {
 ControlledCallDatabase(Context c){super(c,"controlled_calls.db",null,2);}
 ControlledCallDatabase(Context c,String testName){super(c,isolated(testName),null,2);}
 private static String isolated(String name){if(name==null||!name.matches("controlled-test-[a-f0-9]{32}(-legacy|-rollback)?\\.db"))throw new IllegalArgumentException("ISOLATED_TEST_DATABASE_REQUIRED");return name;}
 interface BusyProbe { Boolean read(); }
 @Override public void onConfigure(SQLiteDatabase db){super.onConfigure(db);db.execSQL("PRAGMA synchronous=FULL");}
 @Override public void onCreate(SQLiteDatabase db){
  db.execSQL("CREATE TABLE requests(request TEXT PRIMARY KEY,digest TEXT NOT NULL,status TEXT NOT NULL,command TEXT,token_hash TEXT)");
  db.execSQL("CREATE TABLE permits(id TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,used INTEGER NOT NULL)");
 }
 @Override public void onUpgrade(SQLiteDatabase db,int old,int next){
  if(old==1&&next==2){db.execSQL("ALTER TABLE requests ADD COLUMN command TEXT");db.execSQL("ALTER TABLE requests ADD COLUMN token_hash TEXT");}
  else throw new IllegalStateException("UNSUPPORTED_CALL_SCHEMA");
  // Legacy rows intentionally retain null authorization metadata: never auto-close them.
 }
 public String claim(String request,String digest,String permitId,String fingerprint,long maxAttempts,String commandJson,String tokenHash,ControlledCallExecutor.Guard guard)throws Exception{
   SQLiteDatabase db=getWritableDatabase();db.beginTransaction();
   try{
    guard.verify();
    try(Cursor c=db.rawQuery("SELECT digest,status FROM requests WHERE request=?",new String[]{request})){if(c.moveToFirst())return digest.equals(c.getString(0))?"DUPLICATE:"+c.getString(1):"REQUEST_CONFLICT";}
    // All prior native calls require explicit authenticated reconciliation.
    try(Cursor c=db.rawQuery("SELECT COUNT(*) FROM requests WHERE status!='RECONCILED'",null)){if(c.moveToFirst()&&c.getLong(0)>0)return "NATIVE_RECONCILIATION_REQUIRED";}
    String id=permitId;long used=0;
    try(Cursor c=db.rawQuery("SELECT fingerprint,used FROM permits WHERE id=?",new String[]{id})){if(c.moveToFirst()){if(!fingerprint.equals(c.getString(0)))return "PERMIT_CONFLICT";used=c.getLong(1);}}
    if(used>=maxAttempts)return "PERMIT_EXHAUSTED";
    ContentValues quota=new ContentValues();quota.put("id",id);quota.put("fingerprint",fingerprint);quota.put("used",used+1);if(db.insertWithOnConflict("permits",null,quota,SQLiteDatabase.CONFLICT_REPLACE)==-1)throw new Exception("QUOTA_WRITE_FAILED");
    ContentValues row=new ContentValues();row.put("request",request);row.put("digest",digest);row.put("status","HANDOFF_UNKNOWN");row.put("command",commandJson);row.put("token_hash",tokenHash);db.insertOrThrow("requests",null,row);db.setTransactionSuccessful();return "NEW";
   }finally{db.endTransaction();}
 }
  public void complete(String request,String status)throws Exception{
   SQLiteDatabase db=getWritableDatabase();db.beginTransaction();
   try{String current;try(Cursor c=db.rawQuery("SELECT status FROM requests WHERE request=?",new String[]{request})){if(!c.moveToFirst())throw new Exception("MISSING_CLAIM");current=c.getString(0);}
    ContentValues row=new ContentValues();row.put("status",ControlledReconcileRules.completionState(current,status));
    if(db.update("requests",row,"request=?",new String[]{request})!=1)throw new Exception("MISSING_CLAIM");db.setTransactionSuccessful();
   }finally{db.endTransaction();}
  }
 String reconcile(String request,String digest,String token,String installation,boolean confirmed,BusyProbe busy)throws Exception{
  SQLiteDatabase db=getWritableDatabase();db.beginTransaction();
  try(Cursor c=db.rawQuery("SELECT digest,command,token_hash FROM requests WHERE request=?",new String[]{request})){
   if(!c.moveToFirst()||c.isNull(1))return "REJECTED";
   JSONObject stored=new JSONObject(c.getString(1));
   if(!ControlledReconcileRules.allowed(c.getString(0),digest,c.getString(2),token,stored.getString("installationKey"),installation,confirmed,busy.read()))return "REJECTED";
   ContentValues row=new ContentValues();row.put("status","RECONCILED");
   if(db.update("requests",row,"request=? AND digest=?",new String[]{request,digest})!=1)throw new Exception("MISSING_REQUEST");
   db.setTransactionSuccessful();return "RECONCILED";
  }finally{db.endTransaction();}
 }
}
