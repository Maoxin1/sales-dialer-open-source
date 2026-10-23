package com.mantou.salesdialer.standalone;

import android.app.Activity;
import android.os.Bundle;
import android.util.AtomicFile;
import android.widget.*;
import com.mantou.salesdialer.contacts.ContactTaskModel;
import com.mantou.salesdialer.contacts.ContactTaskModel.*;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Fixed in-memory fixtures only. No Intent input, contact store, runtime task engine or phone port. */
public final class ContactModelCheckActivity extends Activity {
    private static void require(boolean value){if(!value)throw new IllegalStateException("MODEL_CHECK_FAILED");}
    @Override public void onCreate(Bundle saved){super.onCreate(saved);JSONObject report=new JSONObject();boolean passed=false;
        try{
            Actor actor=new Actor("TENANT-FIXTURE-A","SALES-FIXTURE-A",EnumSet.allOf(Permission.class));
            Input input=new Input(Origin.CONTACT_INTAKE,"a".repeat(64),Qualification.CONFIRMED,"SYNTHETIC-FIXTURE");
            Admission first=ContactTaskModel.admit(actor,input,List.of());Admission repeated=ContactTaskModel.admit(actor,input,List.of());
            require(first.contact.id.equals(repeated.contact.id)&&first.task.id.equals(repeated.task.id)&&first.task.state.equals("DRAFT"));
            Contact refused=ContactTaskModel.refuse(actor,first.contact,1);Admission duplicate=ContactTaskModel.admit(actor,input,List.of(refused));
            require(duplicate.contact==refused&&duplicate.contact.revision==2&&ContactTaskModel.planningStatus(actor,duplicate.task,refused).equals("DO_NOT_CONTACT"));
            Contact unknown=ContactTaskModel.qualify(actor,first.contact,1,Qualification.UNKNOWN,"SYNTHETIC-CHANGE");
            require(ContactTaskModel.planningStatus(actor,first.task,unknown).equals("STALE_CONTACT")&&ContactTaskModel.planningStatus(actor,ContactTaskModel.draft(actor,unknown),unknown).equals("CONTACT_NOT_QUALIFIED"));
            Actor other=new Actor(actor.tenantId,"SALES-FIXTURE-B",EnumSet.allOf(Permission.class));Admission conflict=ContactTaskModel.admit(other,input,List.of(first.contact));
            require(conflict.status.equals("CONFLICT")&&conflict.contact==null&&conflict.task==null&&ContactTaskModel.planningStatus(other,first.task,first.contact).equals("FORBIDDEN"));
            boolean demoRejected=false;try{ContactTaskModel.admit(actor,new Input(Origin.DEMO,input.targetKey,input.qualification,input.declarationSource),List.of());}catch(IllegalArgumentException ex){demoRejected="SOURCE_MISMATCH".equals(ex.getMessage());}require(demoRejected);
            report.put("source","ANDROID_CONTACT_MODEL_FIXTURE");report.put("decision","PASSED");report.put("fixtureOnly",true);report.put("productionAuthenticated",false);report.put("persistentContacts",0);report.put("realCallsEnabled",false);report.put("nativeAdapterLinked",false);
            report.put("stableIdentity",true);report.put("refusalPreserved",true);report.put("staleRevisionBlocked",true);report.put("unknownBlocked",true);report.put("salesConflictHidden",true);report.put("demoSourceRejected",true);report.put("taskState",first.task.state);
            report.put("contactId",first.contact.id);report.put("taskId",first.task.id);report.put("nativeVector",ContactTaskModel.nativeId("TARGET","TARGET-fixture-001"));passed=true;
        }catch(Exception e){try{report.put("decision","FAILED");report.put("error",e.getClass().getSimpleName());}catch(Exception ignored){}}
        AtomicFile file=new AtomicFile(new File(getFilesDir(),"contact-model-check.json"));FileOutputStream out=null;
        try{out=file.startWrite();out.write(report.toString().getBytes(StandardCharsets.UTF_8));file.finishWrite(out);}catch(Exception e){if(out!=null)file.failWrite(out);passed=false;}
        LinearLayout layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);layout.setPadding(24,48,24,24);
        TextView text=new TextView(this);text.setText(passed?"联系人模型检查通过\n仅使用合成数据。正式联系人持久化、登录与真实拨号尚未接入。":"联系人模型检查未通过\n仅使用合成数据。正式联系人持久化、登录与真实拨号尚未接入。");layout.addView(text);
        Button back=new Button(this);back.setText("返回");back.setOnClickListener(v->finish());layout.addView(back);setContentView(layout);
    }
}
