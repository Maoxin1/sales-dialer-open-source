package com.mantou.salesdialer.spike;

import android.app.Activity;
import android.os.Bundle;
import android.util.Base64;
import android.util.AtomicFile;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.database.sqlite.SQLiteConstraintException;
import android.content.ContentValues;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/** Debug USB development inbox. This class has no phone API or Probe call path. */
public final class SyntheticBridgeActivity extends Activity {
    private static final String[] IDS={"tenantId","salesId","taskId","attemptId","intentId","targetKey","deviceId","simId"};
    private static final String[] VERSIONS={"cycle","planVersion","policyVersion","qualificationRevision"};
    private static boolean id(Object v) { return v instanceof String && ((String)v).matches("SYNTHETIC-[A-Z0-9-]{1,120}"); }
    private static long integer(JSONObject c,String key) throws Exception {
        Object v=c.get(key);
        if(!(v instanceof Number))throw new Exception("INVALID_INTEGER");
        long n=((Number)v).longValue();
        if(((Number)v).doubleValue()!=n || Math.abs((double)n)>9007199254740991D)throw new Exception("INVALID_INTEGER");
        return n;
    }
    private static void validate(JSONObject c) throws Exception {
        Set<String> fields=new HashSet<>(Arrays.asList("schemaVersion","mode","issuedAt","expiresAt"));
        fields.addAll(Arrays.asList(IDS));fields.addAll(Arrays.asList(VERSIONS));
        if(c.length()!=fields.size() || integer(c,"schemaVersion")!=1 || !"simulation".equals(c.get("mode")))throw new Exception("SYNTHETIC_ONLY");
        java.util.Iterator<String> keys=c.keys();while(keys.hasNext())if(!fields.contains(keys.next()))throw new Exception("UNKNOWN_FIELD");
        for(String k:IDS)if(!id(c.get(k)))throw new Exception("SYNTHETIC_ONLY");
        for(String k:VERSIONS)if(integer(c,k)<1)throw new Exception("INVALID_VERSION");
        long issued=integer(c,"issuedAt"),expires=integer(c,"expiresAt");
        if(issued<0 || expires<=issued || expires-issued>60000)throw new Exception("INVALID_HOST_LIFETIME");
    }
    private static String digest(byte[] raw) throws Exception {
        byte[] hash=MessageDigest.getInstance("SHA-256").digest(raw);StringBuilder s=new StringBuilder();
        for(byte b:hash)s.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return s.toString();
    }
    private final class Ledger extends SQLiteOpenHelper {
        Ledger(){super(SyntheticBridgeActivity.this,"synthetic_bridge.db",null,1);}
        @Override public void onCreate(SQLiteDatabase db){db.execSQL("CREATE TABLE grants(tenant TEXT NOT NULL,attempt TEXT NOT NULL,intent TEXT NOT NULL,task TEXT NOT NULL,cycle INTEGER NOT NULL,plan INTEGER NOT NULL,digest TEXT NOT NULL,body TEXT NOT NULL,receipt TEXT NOT NULL,PRIMARY KEY(tenant,attempt),UNIQUE(tenant,intent),UNIQUE(tenant,task,cycle))");}
        @Override public void onUpgrade(SQLiteDatabase db,int oldVersion,int newVersion){throw new IllegalStateException("UNSUPPORTED_BRIDGE_SCHEMA");}
    }
    private JSONObject accept(JSONObject c,String hash,String body,JSONObject base) throws Exception {
        try(Ledger ledger=new Ledger()) {
            SQLiteDatabase db=ledger.getWritableDatabase();db.beginTransaction();
            try {
                String tenant=c.getString("tenantId"),attempt=c.getString("attemptId");
                try(Cursor cursor=db.rawQuery("SELECT digest,receipt FROM grants WHERE tenant=? AND attempt=?",new String[]{tenant,attempt})) {
                    if(cursor.moveToFirst()) {
                        if(!hash.equals(cursor.getString(0)))throw new Exception("GRANT_CONFLICT");
                        JSONObject old=new JSONObject(cursor.getString(1));old.put("duplicate",true);db.setTransactionSuccessful();return old;
                    }
                }
                try(Cursor cursor=db.rawQuery("SELECT MAX(plan) FROM grants WHERE tenant=? AND task=?",new String[]{tenant,c.getString("taskId")})) {
                    if(cursor.moveToFirst()&&!cursor.isNull(0)&&cursor.getLong(0)>c.getLong("planVersion"))throw new Exception("STALE_PLAN");
                }
                base.put("status","SIMULATED_ACCEPTED");base.put("duplicate",false);base.put("executionCountForGrant",1);
                ContentValues v=new ContentValues();v.put("tenant",tenant);v.put("attempt",attempt);v.put("intent",c.getString("intentId"));v.put("task",c.getString("taskId"));v.put("cycle",c.getLong("cycle"));v.put("plan",c.getLong("planVersion"));v.put("digest",hash);v.put("body",body);v.put("receipt",base.toString());
                try{db.insertOrThrow("grants",null,v);}catch(SQLiteConstraintException e){throw new Exception("GRANT_CONFLICT");}
                db.setTransactionSuccessful();return base;
            } finally {db.endTransaction();}
        }
    }
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        try {
            String encoded=getIntent().getStringExtra("command");
            if(encoded==null||encoded.length()>12000)throw new Exception("INVALID_ENVELOPE_SIZE");
            byte[] raw=Base64.decode(encoded,Base64.URL_SAFE|Base64.NO_WRAP);if(raw.length>8192)throw new Exception("INVALID_ENVELOPE_SIZE");
            String body=new String(raw,StandardCharsets.UTF_8),hash=digest(raw);JSONObject c=new JSONObject(body);
            JSONObject r=new JSONObject();r.put("schemaVersion",1);r.put("mode","simulation");r.put("source","ANDROID_SIMULATION");r.put("commandDigest",hash);r.put("actualPhoneApiCalls",0);
            r.put("attemptId",id(c.opt("attemptId"))?c.getString("attemptId"):"INVALID");r.put("deviceId",id(c.opt("deviceId"))?c.getString("deviceId"):"INVALID");
            try{validate(c);SyntheticLease.validate(this,hash,getIntent().getStringExtra("leaseToken"),getIntent().getStringExtra("validUntilElapsed"));r=accept(c,hash,body,r);}catch(Exception e){r.put("status","REJECTED");r.put("reason",e.getMessage()==null?"VALIDATION_FAILED":e.getMessage());}
            // Ledger commit precedes receipt publication. Replaying an identical inbox cannot execute twice.
            AtomicFile file=new AtomicFile(new File(getFilesDir(),"bridge-"+hash+".json"));FileOutputStream stream=null;
            try{stream=file.startWrite();stream.write(r.toString().getBytes(StandardCharsets.UTF_8));file.finishWrite(stream);}
            catch(Exception e){if(stream!=null)file.failWrite(stream);throw e;}
        } catch(Exception e) {
            // No receipt is an unknown outcome; host must retain occupancy and must not automatically replay.
            android.util.Log.e("SyntheticBridge","bridge_failed:"+e.getClass().getSimpleName());
        } finally {finish();}
    }
}
