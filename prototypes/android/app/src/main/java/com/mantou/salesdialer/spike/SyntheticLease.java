package com.mantou.salesdialer.spike;

import android.content.Context;
import android.os.SystemClock;
import android.provider.Settings;
import android.util.AtomicFile;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;

/** Device-local monotonic lifetime. Persisted leases cannot be extended or reused across boots. */
final class SyntheticLease {
    private static int boot(Context c) throws Exception {
        int value=Settings.Global.getInt(c.getContentResolver(),Settings.Global.BOOT_COUNT,-1);
        if(value<0)throw new Exception("BOOT_ID_UNKNOWN");return value;
    }
    static JSONObject read(Context c,String hash) throws Exception {
        try(java.io.FileInputStream in=new AtomicFile(new File(c.getFilesDir(),"lease-"+hash+".json")).openRead()){
            java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream();byte[] buffer=new byte[1024];int n;
            while((n=in.read(buffer))!=-1){bytes.write(buffer,0,n);if(bytes.size()>4096)throw new Exception("INVALID_LEASE_FILE");}
            return new JSONObject(bytes.toString(StandardCharsets.UTF_8.name()));
        }
    }
    static void write(Context c,String name,JSONObject value) throws Exception {
        AtomicFile file=new AtomicFile(new File(c.getFilesDir(),name));FileOutputStream out=null;
        try{out=file.startWrite();out.write(value.toString().getBytes(StandardCharsets.UTF_8));file.finishWrite(out);}
        catch(Exception e){if(out!=null)file.failWrite(out);throw e;}
    }
    static JSONObject prepare(Context c,String hash,int ttl) throws Exception {
        if(hash==null||!hash.matches("[a-f0-9]{64}")||ttl<1||ttl>60000)throw new Exception("INVALID_LEASE_REQUEST");
        String name="lease-"+hash+".json";
        if(new File(c.getFilesDir(),name).exists()||new File(c.getFilesDir(),name+".bak").exists())return read(c,hash); // AtomicFile may need to restore a prior durable backup; never renew it.
        long now=SystemClock.elapsedRealtime();byte[] bytes=new byte[16];new SecureRandom().nextBytes(bytes);StringBuilder nonce=new StringBuilder();
        for(byte b:bytes)nonce.append(String.format(java.util.Locale.ROOT,"%02x",b&255));
        JSONObject r=new JSONObject();r.put("schemaVersion",1);r.put("status","READY");r.put("commandDigest",hash);r.put("nonce",nonce.toString());r.put("issuedElapsed",now);r.put("expiresElapsed",now+ttl);r.put("bootCount",boot(c));
        write(c,"lease-"+hash+".json",r);return r;
    }
    static void validate(Context c,String hash,String nonce,String until) throws Exception {
        if(nonce==null||!nonce.matches("[a-f0-9]{32}")||until==null||!until.matches("[0-9]{1,16}"))throw new Exception("TIME_LEASE_REQUIRED");
        JSONObject r=read(c,hash);long deadline=Long.parseLong(until),now=SystemClock.elapsedRealtime();
        if(!hash.equals(r.getString("commandDigest"))||!nonce.equals(r.getString("nonce"))
            ||!LeaseWindow.valid(now,r.getLong("issuedElapsed"),r.getLong("expiresElapsed"),deadline,boot(c),r.getInt("bootCount")))throw new Exception("TIME_LEASE_INVALID_OR_EXPIRED");
    }
}
