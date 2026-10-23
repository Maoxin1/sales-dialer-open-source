package com.mantou.salesdialer.spike;
import android.app.Activity;
import android.os.Bundle;
import org.json.JSONObject;
/** USB development handshake. No call APIs or Probe access. */
public final class SyntheticLeaseActivity extends Activity {
    @Override public void onCreate(Bundle saved){super.onCreate(saved);
        try{
            String hash=getIntent().getStringExtra("digest");if(hash==null||!hash.matches("[a-f0-9]{64}"))return;
            JSONObject r;
            try{r=SyntheticLease.prepare(this,hash,getIntent().getIntExtra("ttl",0));}
            catch(Exception e){r=new JSONObject();r.put("status","REJECTED");r.put("reason",e.getClass().getSimpleName());}
            SyntheticLease.write(this,"lease-reply-"+hash+".json",r);
        }catch(Exception e){android.util.Log.e("SyntheticLease","lease_failed:"+e.getClass().getSimpleName());}finally{finish();}
    }
}
