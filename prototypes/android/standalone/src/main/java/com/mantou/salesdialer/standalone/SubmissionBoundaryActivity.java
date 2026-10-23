package com.mantou.salesdialer.standalone;

import android.app.Activity;
import android.os.Bundle;
import android.util.AtomicFile;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

/** Read-only task diagnostic; ignores all Intent extras. Writes only its own report. */
public final class SubmissionBoundaryActivity extends Activity {
    @Override public void onCreate(Bundle saved){super.onCreate(saved);
        try{
            TaskEngine e=AppRuntime.readOnlyEngine(this);TaskEngine.Snapshot s=e.snapshot();TaskSubmissionBridge bridge=new TaskSubmissionBridge(e);
            TaskSubmissionBridge.Receipt demo=bridge.submit(TaskSubmissionBridge.Source.CONTROLLED_REAL,"DEMO-001",s.version);
            TaskSubmissionBridge.Receipt contact=bridge.submit(TaskSubmissionBridge.Source.CONTROLLED_REAL,"CONTACT-TEST",s.version);
            JSONObject r=new JSONObject();r.put("source","ANDROID_STANDALONE_BOUNDARY");r.put("taskSource","SIMULATION");
            r.put("realCallsEnabled",demo.realCallsEnabled);r.put("nativeAdapterLinked",demo.nativeAdapterLinked);
            r.put("status",demo.status);r.put("controlledTargetStatus",contact.status);r.put("apiSubmission",demo.apiSubmission);
            r.put("outgoingConfirmed",JSONObject.NULL);r.put("connectedConfirmed",JSONObject.NULL);
            r.put("paused",s.paused);r.put("targets",s.tasks.size());r.put("simulationAttempts",TaskEngine.attemptCount(s));
            AtomicFile file=new AtomicFile(new File(getFilesDir(),"submission-boundary.json"));FileOutputStream out=null;
            try{out=file.startWrite();out.write(r.toString().getBytes(StandardCharsets.UTF_8));file.finishWrite(out);}catch(Exception ex){if(out!=null)file.failWrite(out);throw ex;}
        }catch(Exception e){android.util.Log.e("SubmissionBoundary","check_failed:"+e.getClass().getSimpleName());}finally{finish();}
    }
}
