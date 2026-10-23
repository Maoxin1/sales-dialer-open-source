package com.mantou.salesdialer.contacts;

import android.app.Activity;
import android.os.Bundle;
import android.util.AtomicFile;
import android.widget.*;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.CountDownLatch;
import java.time.*;
import com.mantou.salesdialer.contacts.SalesPlanModel.Plan;
import com.mantou.salesdialer.contacts.ContactTaskModel.*;

/** Developer fixture runner. Only fixed phases are accepted; no caller identity, path, SQL or number. */
public final class ContactStoreCheckActivity extends Activity {
    private int checks;private TextView status;
    private Actor actor(){return new Actor("TENANT-FIXTURE-A","SALES-FIXTURE-A",EnumSet.allOf(Permission.class));}
    private Input input(String key){return new Input(Origin.CONTACT_INTAKE,key.repeat(64),Qualification.CONFIRMED,"SYNTHETIC-FIXTURE");}
    private void check(boolean ok){checks++;if(!ok)throw new IllegalStateException("FIXTURE_ASSERTION_"+checks);}
    private void counts(ContactTaskStore s,long c,long t,long e){check(Arrays.equals(s.fixtureCounts(),new long[]{c,t,e}));}
    private void denied(Runnable r,String reason){checks++;try{r.run();}catch(RuntimeException e){if(reason.equals(e.getMessage()))return;throw new IllegalStateException("UNEXPECTED_FIXTURE_ERROR:"+e.getMessage(),e);}throw new IllegalStateException("EXPECTED_"+reason);}
    private String name(String suffix){return "contact-fixture-"+UUID.randomUUID().toString().replace("-","")+(suffix.isEmpty()?"":"-"+suffix)+".db";}
    private ContactTaskStore open(String name){return ContactTaskStore.fixture(this,actor(),name,point->{});}
    private JSONObject state()throws Exception{File f=new File(getFilesDir(),"contact-store-fixture-state.json");if(!f.exists())return new JSONObject().put("purpose","CONTACT_STORE_FIXTURE_V1");if(f.length()>8192)throw new IllegalStateException("BAD_FIXTURE_STATE");JSONObject s=new JSONObject(new String(java.nio.file.Files.readAllBytes(f.toPath()),StandardCharsets.UTF_8));if(!"CONTACT_STORE_FIXTURE_V1".equals(s.optString("purpose")))throw new IllegalStateException("BAD_FIXTURE_STATE");return s;}
    private void write(String name,JSONObject value)throws Exception{AtomicFile f=new AtomicFile(new File(getFilesDir(),name));FileOutputStream out=null;try{out=f.startWrite();out.write(value.toString().getBytes(StandardCharsets.UTF_8));f.finishWrite(out);}catch(Exception e){if(out!=null)f.failWrite(out);throw e;}}
    private SQLiteDatabase raw(String name){SQLiteDatabase db=SQLiteDatabase.openDatabase(getDatabasePath(name).getAbsolutePath(),null,SQLiteDatabase.OPEN_READWRITE);db.setForeignKeyConstraintsEnabled(false);return db;}
    private long scalar(SQLiteDatabase db,String sql){try(Cursor c=db.rawQuery(sql,null)){if(!c.moveToFirst())throw new IllegalStateException("NO_FIXTURE_ROW");return c.getLong(0);}}
    private interface Call{String run()throws Exception;}
    private String[] race(Call a,Call b)throws Exception{
        CountDownLatch start=new CountDownLatch(1);String[] results=new String[2];Throwable[] errors=new Throwable[2];Call[] calls={a,b};Thread[] threads=new Thread[2];
        for(int i=0;i<2;i++){final int n=i;threads[i]=new Thread(()->{try{start.await();results[n]=calls[n].run();}catch(Throwable e){errors[n]=e;}});threads[i].start();}
        start.countDown();for(Thread t:threads){t.join(7000);if(t.isAlive())throw new IllegalStateException("FIXTURE_RACE_TIMEOUT");}for(Throwable e:errors)if(e!=null)throw new IllegalStateException("FIXTURE_RACE_FAILED",e);return results;
    }
    private void all(JSONObject report)throws Exception{
        String main=name("");String id,taskId;Actor a=actor();
        try(ContactTaskStore s=open(main)){
            ContactTaskStore.Result first=s.importContact(input("a"));check("IMPORTED".equals(first.status));id=first.contact.id;taskId=first.task.id;counts(s,1,1,1);
            check("ELIGIBLE_FOR_PLANNING".equals(s.planningStatus(id)));Contact changed=s.qualify(id,1,Qualification.UNKNOWN,"SYNTHETIC-CHANGE");check(changed.revision==2);check("STALE_CONTACT".equals(s.planningStatus(id)));
            Contact refused=s.refuse(id,2);check(refused.revision==3&&refused.refused);ContactTaskStore.Result duplicate=s.importContact(input("a"));check("DUPLICATE".equals(duplicate.status)&&duplicate.contact.refused&&duplicate.contact.qualification==Qualification.UNKNOWN&&duplicate.task.contactRevision==1);counts(s,1,1,3);
            denied(()->s.qualify(id,3,Qualification.CONFIRMED,"SYNTHETIC-REIMPORT"),"DO_NOT_CONTACT");denied(()->s.refuse(id,1),"STALE_CONTACT");denied(()->s.importContact(new Input(Origin.DEMO,input("a").targetKey,Qualification.CONFIRMED,"SYNTHETIC")),"SOURCE_MISMATCH");
        }
        try(ContactTaskStore s=open(main)){ContactTaskStore.Result loaded=s.get(id);check(loaded.contact.id.equals(id)&&loaded.task.id.equals(taskId)&&loaded.contact.revision==3&&loaded.task.contactRevision==1&&loaded.contact.refused);counts(s,1,1,3);}
        Actor colleague=new Actor(a.tenantId,"SALES-FIXTURE-B",EnumSet.allOf(Permission.class));
        try(ContactTaskStore other=ContactTaskStore.fixture(this,colleague,main,p->{})){check(other.list().isEmpty());denied(()->other.get(id),"FORBIDDEN");ContactTaskStore.Result conflict=other.importContact(input("a"));check("CONFLICT".equals(conflict.status)&&conflict.contact==null&&conflict.task==null);counts(other,1,1,3);}
        Actor tenant=new Actor("TENANT-FIXTURE-B",a.salesId,EnumSet.allOf(Permission.class));
        try(ContactTaskStore other=ContactTaskStore.fixture(this,tenant,main,p->{})){ContactTaskStore.Result independent=other.importContact(input("a"));check("IMPORTED".equals(independent.status)&&!independent.contact.id.equals(id));denied(()->other.get(id),"FORBIDDEN");check(other.list().size()==1);}
        Actor limited=new Actor(a.tenantId,a.salesId,Set.of());try(ContactTaskStore s=ContactTaskStore.fixture(this,limited,main,p->{})){denied(()->s.list(),"FORBIDDEN");denied(()->s.importContact(input("b")),"FORBIDDEN");}
        for(String point:List.of("AFTER_CONTACT_INSERT","AFTER_TASK_INSERT","AFTER_EVENT_INSERT","BEFORE_COMMIT")){
            String rollback=name("rollback");try(ContactTaskStore s=ContactTaskStore.fixture(this,a,rollback,p->{if(p.equals(point))throw new IllegalStateException("INJECTED_ROLLBACK");})){denied(()->s.importContact(input("a")),"INJECTED_ROLLBACK");}
            try(ContactTaskStore s=open(rollback)){counts(s,0,0,0);}
        }
        String update=name("update");String updateId;try(ContactTaskStore s=open(update)){updateId=s.importContact(input("a")).contact.id;}
        try(ContactTaskStore s=ContactTaskStore.fixture(this,a,update,p->{if(p.equals("AFTER_CONTACT_UPDATE"))throw new IllegalStateException("INJECTED_ROLLBACK");})){denied(()->s.qualify(updateId,1,Qualification.WITHDRAWN,"SYNTHETIC"),"INJECTED_ROLLBACK");}
        try(ContactTaskStore s=open(update)){check(s.get(updateId).contact.revision==1&&s.get(updateId).contact.qualification==Qualification.CONFIRMED);counts(s,1,1,1);}
        String concurrent=name("race");try(ContactTaskStore init=open(concurrent)){}try(ContactTaskStore one=open(concurrent);ContactTaskStore two=open(concurrent)){
            String[] result=race(()->one.importContact(input("b")).status,()->two.importContact(input("b")).status);check(new HashSet<>(Arrays.asList(result)).equals(Set.of("IMPORTED","DUPLICATE")));counts(one,1,1,1);String raceId=one.list().get(0).id;
            result=race(()->{try{one.qualify(raceId,1,Qualification.UNKNOWN,"SYNTHETIC-RACE");return "UPDATED";}catch(IllegalStateException e){return e.getMessage();}},()->{try{two.refuse(raceId,1);return "UPDATED";}catch(IllegalStateException e){return e.getMessage();}});check(new HashSet<>(Arrays.asList(result)).equals(Set.of("UPDATED","STALE_CONTACT")));check(one.get(raceId).contact.revision==2);counts(one,1,1,2);
        }
        String ownerRace=name("owners");try(ContactTaskStore init=open(ownerRace)){}try(ContactTaskStore one=open(ownerRace);ContactTaskStore two=ContactTaskStore.fixture(this,colleague,ownerRace,p->{})){
            String[] result=race(()->one.importContact(input("c")).status,()->{ContactTaskStore.Result r=two.importContact(input("c"));if(r.status.equals("CONFLICT")&&(r.contact!=null||r.task!=null))throw new IllegalStateException("LEAKED_CONFLICT");return r.status;});check(new HashSet<>(Arrays.asList(result)).equals(Set.of("IMPORTED","CONFLICT")));counts(one,1,1,1);
        }
        String foreign=name("foreign");try(SQLiteDatabase db=SQLiteDatabase.openOrCreateDatabase(getDatabasePath(foreign),null)){db.execSQL("CREATE TABLE other_state(value TEXT)");db.execSQL("INSERT INTO other_state VALUES('KEEP')");db.setVersion(1);}
        denied(()->{try(ContactTaskStore ignored=open(foreign)){}},"CONTACT_STORE_SCHEMA_MISMATCH");try(SQLiteDatabase db=raw(foreign)){check(scalar(db,"SELECT COUNT(*) FROM other_state WHERE value='KEEP'")==1);}
        String version=name("version");try(ContactTaskStore ignored=open(version)){}try(SQLiteDatabase db=raw(version)){db.setVersion(5);}denied(()->{try(ContactTaskStore ignored=open(version)){}},"CONTACT_STORE_SCHEMA_MISMATCH");try(SQLiteDatabase db=raw(version)){check(db.getVersion()==5);}
        String corrupt=name("identity");try(ContactTaskStore s=open(corrupt)){s.importContact(input("a"));}try(SQLiteDatabase db=raw(corrupt)){db.execSQL("UPDATE contacts SET id='CONTACT-BAD'");db.execSQL("UPDATE tasks SET contact_id='CONTACT-BAD'");db.execSQL("UPDATE contact_events SET contact_id='CONTACT-BAD'");}
        denied(()->{try(ContactTaskStore ignored=open(corrupt)){}},"INVALID_STORED_CONTACT");try(SQLiteDatabase db=raw(corrupt)){check(scalar(db,"SELECT COUNT(*) FROM contacts WHERE id='CONTACT-BAD'")==1);}
        String audit=name("audit");try(ContactTaskStore s=open(audit)){String target=s.importContact(input("a")).contact.id;s.refuse(target,1);}try(SQLiteDatabase db=raw(audit)){db.execSQL("UPDATE contacts SET refused=0");}
        denied(()->{try(ContactTaskStore ignored=open(audit)){}},"CONTACT_AUDIT_MISMATCH");try(SQLiteDatabase db=raw(audit)){check(scalar(db,"SELECT COUNT(*) FROM contact_events")==2);}
        String numeric=name("numeric");try(ContactTaskStore s=open(numeric)){s.importContact(input("a"));}try(SQLiteDatabase db=raw(numeric)){db.execSQL("UPDATE contacts SET revision=1.5");}
        denied(()->{try(ContactTaskStore ignored=open(numeric)){}},"INVALID_STORED_CONTACT");try(SQLiteDatabase db=raw(numeric)){check(scalar(db,"SELECT COUNT(*) FROM contacts WHERE typeof(revision)='real'")==1);}
        String bytes=name("bytes");byte[] invalid="SYNTHETIC-NOT-A-SQLITE-FILE".getBytes(StandardCharsets.UTF_8);try(FileOutputStream out=new FileOutputStream(getDatabasePath(bytes))){out.write(invalid);}boolean rejected=false;try(ContactTaskStore ignored=open(bytes)){}catch(RuntimeException expected){rejected=true;}check(rejected);check(Arrays.equals(invalid,java.nio.file.Files.readAllBytes(getDatabasePath(bytes).toPath())));
        JSONObject state=state();state.put("committed",main);write("contact-store-fixture-state.json",state);
        report.put("tests","T583-T587");report.put("committedFixture",main);report.put("contactId",id);report.put("taskId",taskId);report.put("rollbackPoints",5);report.put("concurrentChecks",3);report.put("wrongStorePreserved",true);report.put("corruptStorePreserved",true);report.put("contactRevision",3);report.put("draftRevision",1);report.put("catalogContacts",2);report.put("catalogTasks",2);report.put("catalogEvents",4);
    }
    private void verify(JSONObject report)throws Exception{
        String name=state().getString("committed");try(ContactTaskStore s=open(name)){counts(s,2,2,4);check(s.list().size()==1);Contact c=s.list().get(0);ContactTaskStore.Result r=s.get(c.id);check(c.refused&&c.revision==3&&c.qualification==Qualification.UNKNOWN&&r.task.contactRevision==1);check("STALE_CONTACT".equals(s.planningStatus(c.id)));}
        report.put("tests","T588");report.put("committedProcessRestart",true);
    }
    private void interrupt(JSONObject report)throws Exception{
        String name=name("interrupt");JSONObject state=state();state.put("interrupted",name);write("contact-store-fixture-state.json",state);
        try(ContactTaskStore s=ContactTaskStore.fixture(this,actor(),name,point->{if(point.equals("AFTER_CONTACT_INSERT")){try{JSONObject waiting=new JSONObject().put("decision","WAITING_FOR_KILL").put("phase","interrupt").put("fixtureOnly",true).put("afterContactInsert",true);write("contact-store-check.json",waiting);Thread.sleep(20000);}catch(Exception e){Thread.currentThread().interrupt();}throw new IllegalStateException("FIXTURE_KILL_TIMEOUT");}})){s.importContact(input("d"));}
    }
    private void verifyInterrupted(JSONObject report)throws Exception{
        String name=state().getString("interrupted");try(ContactTaskStore s=open(name)){counts(s,0,0,0);check(s.list().isEmpty());}report.put("tests","T589");report.put("uncommittedProcessKillRecovered",true);
    }
    private long draftEvents(String name){try(SQLiteDatabase db=raw(name)){return scalar(db,"SELECT COUNT(*) FROM draft_events");}}
    private String prepared(String name){try(ContactTaskStore s=open(name)){String id=s.importContact(input("a")).contact.id;s.qualify(id,1,Qualification.CONFIRMED,"SYNTHETIC-REFRESH");return id;}}
    private void legacy(String name){prepared(name);try(SQLiteDatabase db=raw(name)){db.execSQL("DROP TABLE synthetic_attempt_events");db.execSQL("DROP TABLE synthetic_attempts");db.execSQL("DROP TABLE sales_plan_events");db.execSQL("DROP TABLE draft_events");db.execSQL("UPDATE catalog_meta SET version=1");db.setVersion(1);}}
    private void draftAll(JSONObject report)throws Exception{
        String main=name("draft");legacy(main);
        for(String point:List.of("AFTER_DRAFT_SCHEMA_CREATE","BEFORE_SCHEMA_COMMIT")){
            String failed=name("migration");legacy(failed);
            denied(()->{try(ContactTaskStore ignored=ContactTaskStore.fixture(this,actor(),failed,p->{if(point.equals(p))throw new IllegalStateException("INJECTED_MIGRATION");})){}},"INJECTED_MIGRATION");
            try(SQLiteDatabase db=raw(failed)){check(db.getVersion()==1&&scalar(db,"SELECT version FROM catalog_meta")==1&&scalar(db,"SELECT COUNT(*) FROM sqlite_master WHERE name='draft_events'")==0&&scalar(db,"SELECT COUNT(*) FROM contact_events")==2);}
            try(ContactTaskStore s=open(failed)){counts(s,1,1,2);check(s.list().get(0).revision==2&&s.get(s.list().get(0).id).task.contactRevision==1);}
        }
        String id;
        String invalidLegacy=name("badlegacy");legacy(invalidLegacy);try(SQLiteDatabase db=raw(invalidLegacy)){db.execSQL("UPDATE tasks SET contact_revision=2");}
        denied(()->{try(ContactTaskStore ignored=open(invalidLegacy)){}},"DRAFT_AUDIT_MISMATCH");try(SQLiteDatabase db=raw(invalidLegacy)){check(db.getVersion()==1&&scalar(db,"SELECT COUNT(*) FROM sqlite_master WHERE name='draft_events'")==0&&scalar(db,"SELECT contact_revision FROM tasks")==2);}
        try(ContactTaskStore s=open(main)){
            Contact c=s.list().get(0);id=c.id;String stable=s.get(id).task.id;counts(s,1,1,2);check(c.revision==2&&s.get(id).task.contactRevision==1);check(draftEvents(main)==0);
            check("REFRESHED".equals(s.refreshDraft(id,2,1).status));check(s.get(id).task.id.equals(stable)&&s.get(id).task.contactRevision==2);check("ALREADY_CURRENT".equals(s.refreshDraft(id,2,1).status));check(draftEvents(main)==1);
            s.qualify(id,2,Qualification.CONFIRMED,"SYNTHETIC-THIRD");denied(()->s.refreshDraft(id,2,2),"STALE_CONTACT");denied(()->s.refreshDraft(id,3,1),"STALE_DRAFT");check("REFRESHED".equals(s.refreshDraft(id,3,2).status));
            check(s.importContact(input("a")).task.contactRevision==3);s.qualify(id,3,Qualification.UNKNOWN,"SYNTHETIC-UNKNOWN");denied(()->s.refreshDraft(id,4,3),"CONTACT_NOT_QUALIFIED");check(s.get(id).task.contactRevision==3);
            s.qualify(id,4,Qualification.CONFIRMED,"SYNTHETIC-FIFTH");check("REFRESHED".equals(s.refreshDraft(id,5,3).status));s.refuse(id,5);denied(()->s.refreshDraft(id,6,5),"DO_NOT_CONTACT");counts(s,1,1,6);check(draftEvents(main)==3);
        }
        Actor wrong=new Actor(actor().tenantId,"OTHER",EnumSet.allOf(Permission.class)),limited=new Actor(actor().tenantId,actor().salesId,Set.of(Permission.READ));
        for(Actor a:List.of(wrong,limited))try(ContactTaskStore s=ContactTaskStore.fixture(this,a,main,p->{})){denied(()->s.refreshDraft(id,6,5),"FORBIDDEN");}
        for(String point:List.of("AFTER_DRAFT_UPDATE","AFTER_DRAFT_EVENT_INSERT","BEFORE_COMMIT")){
            String failed=name("draftfail"),target=prepared(failed);
            try(ContactTaskStore s=ContactTaskStore.fixture(this,actor(),failed,p->{if(point.equals(p))throw new IllegalStateException("INJECTED_DRAFT");})){denied(()->s.refreshDraft(target,2,1),"INJECTED_DRAFT");}
            try(ContactTaskStore s=open(failed)){check(s.get(target).task.contactRevision==1&&s.get(target).contact.revision==2);counts(s,1,1,2);check(draftEvents(failed)==0);}
        }
        String concurrent=name("draftrace"),target=prepared(concurrent);try(ContactTaskStore one=open(concurrent);ContactTaskStore two=open(concurrent)){
            String[] results=race(()->one.refreshDraft(target,2,1).status,()->two.refreshDraft(target,2,1).status);check(new HashSet<>(Arrays.asList(results)).equals(Set.of("REFRESHED","ALREADY_CURRENT")));check(draftEvents(concurrent)==1);check(one.get(target).task.contactRevision==2);
        }
        String withdrawal=name("draftwithdraw"),withdrawId=prepared(withdrawal);try(ContactTaskStore one=open(withdrawal);ContactTaskStore two=open(withdrawal)){
            String[] results=race(()->{try{return one.refreshDraft(withdrawId,2,1).status;}catch(IllegalStateException e){return e.getMessage();}},()->{two.qualify(withdrawId,2,Qualification.WITHDRAWN,"SYNTHETIC-RACE");return "WITHDRAWN";});
            check(Set.of("REFRESHED","STALE_CONTACT").contains(results[0])&&results[1].equals("WITHDRAWN"));check(one.get(withdrawId).contact.qualification==Qualification.WITHDRAWN);check("STALE_CONTACT".equals(one.planningStatus(withdrawId)));check(draftEvents(withdrawal)==(results[0].equals("REFRESHED")?1:0));
        }
        try(ContactTaskStore ignored=open(withdrawal)){}
        String audit=name("draftaudit"),auditId=prepared(audit);try(SQLiteDatabase db=raw(audit)){db.execSQL("UPDATE tasks SET contact_revision=2");}
        denied(()->{try(ContactTaskStore ignored=open(audit)){}},"DRAFT_AUDIT_MISMATCH");check(draftEvents(audit)==0);try(SQLiteDatabase db=raw(audit)){check(scalar(db,"SELECT contact_revision FROM tasks")==2);}
        String bad=name("draftnumeric"),badId=prepared(bad);try(ContactTaskStore s=open(bad)){s.refreshDraft(badId,2,1);}try(SQLiteDatabase db=raw(bad)){db.execSQL("UPDATE draft_events SET to_revision=2.5");}
        denied(()->{try(ContactTaskStore ignored=open(bad)){}},"DRAFT_AUDIT_MISMATCH");try(SQLiteDatabase db=raw(bad)){check(scalar(db,"SELECT COUNT(*) FROM draft_events WHERE typeof(to_revision)='real'")==1);}
        String ineligible=name("draftineligible"),ineligibleId=prepared(ineligible);String ineligibleTask;
        try(ContactTaskStore s=open(ineligible)){s.qualify(ineligibleId,2,Qualification.UNKNOWN,"SYNTHETIC-UNKNOWN");ineligibleTask=s.get(ineligibleId).task.id;}
        try(SQLiteDatabase db=raw(ineligible)){db.execSQL("UPDATE tasks SET contact_revision=3");db.execSQL("INSERT INTO draft_events(task_id,from_revision,to_revision,kind) VALUES(?,1,3,'REFRESHED')",new Object[]{ineligibleTask});}
        denied(()->{try(ContactTaskStore ignored=open(ineligible)){}},"DRAFT_AUDIT_MISMATCH");check(draftEvents(ineligible)==1);
        JSONObject state=state();state.put("draftCommitted",main);write("contact-store-fixture-state.json",state);
        report.put("tests","T594-T598");report.put("draftRollbackPoints",3);report.put("migrationRollbackPoints",2);report.put("draftConcurrentChecks",2);report.put("draftEvents",3);report.put("contactRevision",6);report.put("draftRevision",5);report.put("schemaVersion",4);
    }
    private void draftVerify(JSONObject report)throws Exception{
        String name=state().getString("draftCommitted");try(ContactTaskStore s=open(name)){counts(s,1,1,6);Contact c=s.list().get(0);check(c.refused&&c.revision==6&&s.get(c.id).task.contactRevision==5);denied(()->s.refreshDraft(c.id,6,5),"DO_NOT_CONTACT");check(draftEvents(name)==3);}
        report.put("tests","T599");report.put("draftCommittedProcessRestart",true);
    }
    private void draftInterrupt(JSONObject report)throws Exception{
        String name=name("draftinterrupt"),id=prepared(name);JSONObject state=state();state.put("draftInterrupted",name);write("contact-store-fixture-state.json",state);
        try(ContactTaskStore s=ContactTaskStore.fixture(this,actor(),name,p->{if(p.equals("AFTER_DRAFT_UPDATE")){try{write("contact-store-check.json",new JSONObject().put("decision","WAITING_FOR_KILL").put("phase","draft-interrupt").put("afterDraftUpdate",true));Thread.sleep(20000);}catch(Exception e){Thread.currentThread().interrupt();}throw new IllegalStateException("FIXTURE_KILL_TIMEOUT");}})){s.refreshDraft(id,2,1);}
    }
    private void draftRecover(JSONObject report)throws Exception{
        String name=state().getString("draftInterrupted");try(ContactTaskStore s=open(name)){Contact c=s.list().get(0);counts(s,1,1,2);check(c.revision==2&&s.get(c.id).task.contactRevision==1);check(draftEvents(name)==0);check("STALE_CONTACT".equals(s.planningStatus(c.id)));}
        report.put("tests","T600");report.put("draftUncommittedKillRecovered",true);
    }
    private long planDue(){return Instant.parse("2026-10-19T01:00:00Z").toEpochMilli();}
    private Clock clock(long time){return Clock.fixed(Instant.ofEpochMilli(time),ZoneOffset.UTC);}
    private String planPrepared(String name){String id=prepared(name);try(ContactTaskStore s=open(name)){s.refreshDraft(id,2,1);}return id;}
    private void schemaTwo(String name){planPrepared(name);try(SQLiteDatabase db=raw(name)){db.execSQL("DROP TABLE synthetic_attempt_events");db.execSQL("DROP TABLE synthetic_attempts");db.execSQL("DROP TABLE sales_plan_events");db.execSQL("UPDATE catalog_meta SET version=2");db.setVersion(2);}}
    private long planEvents(String name){try(SQLiteDatabase db=raw(name)){return scalar(db,"SELECT COUNT(*) FROM sales_plan_events");}}
    private void planAll(JSONObject report)throws Exception{
        long due=planDue();Clock before=clock(due-60000);String main=name("plan");schemaTwo(main);String id;
        for(String point:List.of("AFTER_PLAN_SCHEMA_CREATE","BEFORE_SCHEMA_COMMIT")){
            String failed=name("planmigration");schemaTwo(failed);
            denied(()->{try(ContactTaskStore ignored=ContactTaskStore.fixture(this,actor(),failed,p->{if(p.equals(point))throw new IllegalStateException("INJECTED_PLAN_MIGRATION");})){}},"INJECTED_PLAN_MIGRATION");
            try(SQLiteDatabase db=raw(failed)){check(db.getVersion()==2&&scalar(db,"SELECT version FROM catalog_meta")==2&&scalar(db,"SELECT COUNT(*) FROM sqlite_master WHERE name='sales_plan_events'")==0&&scalar(db,"SELECT COUNT(*) FROM draft_events")==1);}
            try(ContactTaskStore s=open(failed)){check(s.getPlan().version==0&&s.get(s.list().get(0).id).task.contactRevision==2);}
        }
        try(ContactTaskStore s=open(main)){
            id=s.list().get(0).id;check(s.getPlan().paused&&s.getPlan().version==0);check(planEvents(main)==0);check(s.get(id).task.contactRevision==2);
            ContactTaskStore.PlanResult p=s.arrangePlan(id,2,2,0,due,before);check(p.status.equals("PLANNED")&&p.plan.version==1&&!p.executionAuthorized&&!p.realCallsEnabled);
            check(s.inspectPlan(1,clock(due-1)).status.equals("NOT_DUE"));check(s.inspectPlan(1,clock(due)).status.equals("DUE_METADATA_ONLY"));check(s.inspectPlan(1,clock(due+30000)).status.equals("DUE_METADATA_ONLY"));
            check(s.arrangePlan(id,2,2,1,due+60000,before).plan.version==2);check(s.inspectPlan(1,clock(due)).status.equals("STALE_PLAN"));
            check(s.pausePlan(2,before).plan.version==3);check(s.pausePlan(3,before).status.equals("ALREADY_PAUSED"));check(s.inspectPlan(3,clock(due)).status.equals("PAUSED"));denied(()->s.arrangePlan(id,2,2,2,due,before),"STALE_PLAN");
            check(s.arrangePlan(id,2,2,3,due,before).plan.version==4);ContactTaskStore.PlanResult expired=s.inspectPlan(4,clock(due+30001));check(expired.status.equals("EXPIRED")&&expired.plan.paused&&expired.plan.version==5);check(s.inspectPlan(5,clock(due)).status.equals("PAUSED"));
            check(s.arrangePlan(id,2,2,5,due,before).plan.version==6);check(planEvents(main)==6);check(s.importContact(input("a")).task.contactRevision==2&&s.getPlan().version==6);
        }
        Actor other=new Actor(actor().tenantId,"SALES-FIXTURE-B",EnumSet.allOf(Permission.class));try(ContactTaskStore s=ContactTaskStore.fixture(this,other,main,p->{})){check(s.getPlan().version==0);denied(()->s.arrangePlan(id,2,2,0,due,before),"FORBIDDEN");String own=s.importContact(input("b")).contact.id;check(s.arrangePlan(own,1,1,0,due,before).plan.version==1);}
        try(ContactTaskStore s=open(main)){check(s.getPlan().version==6&&!s.getPlan().paused);}
        Actor limited=new Actor(actor().tenantId,actor().salesId,Set.of(Permission.READ));try(ContactTaskStore s=ContactTaskStore.fixture(this,limited,main,p->{})){denied(()->s.pausePlan(6,before),"FORBIDDEN");denied(()->s.inspectPlan(6,before),"FORBIDDEN");}
        for(String point:List.of("AFTER_PLAN_EVENT_INSERT","BEFORE_COMMIT")){
            String failed=name("planrollback"),target=planPrepared(failed);try(ContactTaskStore s=ContactTaskStore.fixture(this,actor(),failed,p->{if(point.equals(p))throw new IllegalStateException("INJECTED_PLAN");})){denied(()->s.arrangePlan(target,2,2,0,due,before),"INJECTED_PLAN");}
            try(ContactTaskStore s=open(failed)){check(s.getPlan().version==0&&s.getPlan().paused);check(planEvents(failed)==0);}
        }
        String pauseFailed=name("pausefailed"),pauseId=planPrepared(pauseFailed);try(ContactTaskStore s=open(pauseFailed)){s.arrangePlan(pauseId,2,2,0,due,before);}try(ContactTaskStore s=ContactTaskStore.fixture(this,actor(),pauseFailed,p->{if(p.equals("AFTER_PLAN_EVENT_INSERT"))throw new IllegalStateException("INJECTED_PLAN");})){denied(()->s.pausePlan(1,before),"INJECTED_PLAN");}try(ContactTaskStore s=open(pauseFailed)){check(s.getPlan().version==1&&!s.getPlan().paused);check(planEvents(pauseFailed)==1);}
        String concurrent=name("planrace"),raceId=planPrepared(concurrent);try(ContactTaskStore one=open(concurrent);ContactTaskStore two=open(concurrent)){
            String[] results=race(()->{try{return one.arrangePlan(raceId,2,2,0,due,before).status;}catch(IllegalStateException e){return e.getMessage();}},()->{try{return two.arrangePlan(raceId,2,2,0,due,before).status;}catch(IllegalStateException e){return e.getMessage();}});check(new HashSet<>(Arrays.asList(results)).equals(Set.of("PLANNED","STALE_PLAN")));check(planEvents(concurrent)==1);
            results=race(()->{try{return one.arrangePlan(raceId,2,2,1,due+1000,before).status;}catch(IllegalStateException e){return e.getMessage();}},()->{try{return two.pausePlan(1,before).status;}catch(IllegalStateException e){return e.getMessage();}});check(Arrays.asList(results).contains("STALE_PLAN")&&(Arrays.asList(results).contains("PLANNED")||Arrays.asList(results).contains("PAUSED")));check(one.getPlan().version==2&&planEvents(concurrent)==2);
        }
        String qualified=name("planqual"),qId=planPrepared(qualified);try(ContactTaskStore s=open(qualified)){s.arrangePlan(qId,2,2,0,due,before);s.qualify(qId,2,Qualification.UNKNOWN,"SYNTHETIC-UNKNOWN");check(s.inspectPlan(1,clock(due)).status.equals("STALE_CONTACT"));denied(()->s.arrangePlan(qId,3,2,1,due,before),"STALE_CONTACT");check(planEvents(qualified)==1);}
        String expiredDb=name("planexpired"),expiredId=planPrepared(expiredDb);try(ContactTaskStore s=open(expiredDb)){s.arrangePlan(expiredId,2,2,0,due,before);check(s.inspectPlan(1,clock(due+30001)).status.equals("EXPIRED"));}
        String corrupt=name("plancorrupt"),badId=planPrepared(corrupt);try(ContactTaskStore s=open(corrupt)){s.arrangePlan(badId,2,2,0,due,before);}try(SQLiteDatabase db=raw(corrupt)){db.execSQL("UPDATE sales_plan_events SET version=2");}denied(()->{try(ContactTaskStore ignored=open(corrupt)){}},"PLAN_AUDIT_MISMATCH");try(SQLiteDatabase db=raw(corrupt)){check(scalar(db,"SELECT version FROM sales_plan_events")==2);}
        String numeric=name("plannumeric"),numericId=planPrepared(numeric);try(ContactTaskStore s=open(numeric)){s.arrangePlan(numericId,2,2,0,due,before);}try(SQLiteDatabase db=raw(numeric)){db.execSQL("UPDATE sales_plan_events SET due_at=1.5");}denied(()->{try(ContactTaskStore ignored=open(numeric)){}},"INVALID_STORED_PLAN");try(SQLiteDatabase db=raw(numeric)){check(scalar(db,"SELECT COUNT(*) FROM sales_plan_events WHERE typeof(due_at)='real'")==1);}
        JSONObject state=state();state.put("planCommitted",main);state.put("planExpired",expiredDb);write("contact-store-fixture-state.json",state);
        report.put("tests","T605-T609");report.put("schemaVersion",4);report.put("planRollbackCases",3);report.put("migrationRollbackPoints",2);report.put("planConcurrentChecks",2);report.put("planVersion",6);report.put("planEvents",7);
    }
    private void planVerify(JSONObject report)throws Exception{
        long due=planDue();String name=state().getString("planCommitted");try(ContactTaskStore s=open(name)){Plan p=s.getPlan();check(p.version==6&&!p.paused&&p.dueAt==due);check(s.recoverPlan(6,clock(due-30000)).plan.version==7);check(s.getPlan().paused&&s.inspectPlan(7,clock(due)).status.equals("PAUSED"));check(planEvents(name)==8);}
        Actor other=new Actor(actor().tenantId,"SALES-FIXTURE-B",EnumSet.allOf(Permission.class));try(ContactTaskStore s=ContactTaskStore.fixture(this,other,name,p->{})){check(s.getPlan().version==1&&!s.getPlan().paused);}
        try(ContactTaskStore s=open(state().getString("planExpired"))){check(s.getPlan().version==2&&s.getPlan().paused);check(s.inspectPlan(2,clock(due)).status.equals("PAUSED"));}
        report.put("tests","T610");report.put("committedProcessRestart",true);report.put("recoveryPaused",true);report.put("expiredCannotRevive",true);
    }
    private void planInterrupt(JSONObject report)throws Exception{
        String name=name("planinterrupt"),id=planPrepared(name);JSONObject state=state();state.put("planInterrupted",name);write("contact-store-fixture-state.json",state);
        try(ContactTaskStore s=ContactTaskStore.fixture(this,actor(),name,p->{if(p.equals("AFTER_PLAN_EVENT_INSERT")){try{write("contact-store-check.json",new JSONObject().put("decision","WAITING_FOR_KILL").put("phase","plan-interrupt").put("afterPlanEventInsert",true));Thread.sleep(20000);}catch(Exception e){Thread.currentThread().interrupt();}throw new IllegalStateException("FIXTURE_KILL_TIMEOUT");}})){s.arrangePlan(id,2,2,0,planDue(),clock(planDue()-60000));}
    }
    private void planRecover(JSONObject report)throws Exception{
        String name=state().getString("planInterrupted");try(ContactTaskStore s=open(name)){check(s.getPlan().version==0&&s.getPlan().paused);check(planEvents(name)==0);Contact c=s.list().get(0);check(c.revision==2&&s.get(c.id).task.contactRevision==2);}
        report.put("tests","T611");report.put("uncommittedKillRecovered",true);
    }
    @Override public void onCreate(Bundle saved){super.onCreate(saved);LinearLayout layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);layout.setPadding(24,48,24,24);status=new TextView(this);status.setText("正在检查隔离联系人存储……");layout.addView(status);Button back=new Button(this);back.setText("返回");back.setOnClickListener(v->finish());layout.addView(back);setContentView(layout);
        String requested=getIntent().getStringExtra("phase");final String phase=requested==null?"all":requested;
        new Thread(()->{JSONObject r=new JSONObject();boolean ok=false;try{r.put("source","ANDROID_CONTACT_STORE_FIXTURE");r.put("phase",phase);r.put("fixtureOnly",true);r.put("productionAuthenticated",false);r.put("realCallsEnabled",false);r.put("actualPhoneCalls",0);
            switch(phase){case "all":all(r);break;case "verify":verify(r);break;case "interrupt":interrupt(r);break;case "verify-interrupt":verifyInterrupted(r);break;case "draft-all":draftAll(r);break;case "draft-verify":draftVerify(r);break;case "draft-interrupt":draftInterrupt(r);break;case "draft-recover":draftRecover(r);break;case "plan-all":planAll(r);break;case "plan-verify":planVerify(r);break;case "plan-interrupt":planInterrupt(r);break;case "plan-recover":planRecover(r);break;default:throw new IllegalArgumentException("INVALID_FIXTURE_PHASE");}
            r.put("decision","PASSED");r.put("assertions",checks);ok=true;
        }catch(Exception e){try{r.put("decision","FAILED");r.put("error",e.getClass().getSimpleName());r.put("reason",String.valueOf(e.getMessage()));r.put("assertions",checks);}catch(Exception ignored){}}
        try{write("contact-store-check.json",r);}catch(Exception e){ok=false;}final boolean passed=ok;runOnUiThread(()->status.setText(passed?"联系人存储检查通过\n仅使用隔离合成数据，未连接真实联系人、登录或拨号。":"联系人存储检查未通过\n保留现场与检查记录。"));},"contact-store-fixture").start();
    }
}
