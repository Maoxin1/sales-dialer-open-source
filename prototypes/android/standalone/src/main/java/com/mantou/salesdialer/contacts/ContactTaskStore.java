package com.mantou.salesdialer.contacts;

import android.content.Context;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import java.io.File;
import java.util.*;
import java.time.Clock;
import com.mantou.salesdialer.contacts.SalesPlanModel.Plan;
import com.mantou.salesdialer.contacts.ContactTaskModel.*;
import com.mantou.salesdialer.contacts.SyntheticAttemptModel.Snapshot;
import com.mantou.salesdialer.contacts.SyntheticAttemptModel.Availability;

/** Metadata only. Actor is trusted composition input, not authentication. No number or phone port. */
public final class ContactTaskStore implements AutoCloseable {
    private static final int APP_ID=0x53444331,VERSION=4;
    private static final String KIND="CONTACT_TASK_CATALOG";
    private static final String[] DDL={
        "CREATE TABLE catalog_meta(singleton INTEGER PRIMARY KEY CHECK(singleton=1),kind TEXT NOT NULL,version INTEGER NOT NULL)",
        "CREATE TABLE contacts(id TEXT PRIMARY KEY NOT NULL,tenant TEXT NOT NULL,sales TEXT NOT NULL,target TEXT NOT NULL,origin TEXT NOT NULL CHECK(origin='CONTACT_INTAKE'),qualification TEXT NOT NULL CHECK(qualification IN ('UNKNOWN','CONFIRMED','WITHDRAWN')),source TEXT NOT NULL,refused INTEGER NOT NULL CHECK(refused IN (0,1)),revision INTEGER NOT NULL CHECK(revision>0),UNIQUE(tenant,target),UNIQUE(id,tenant,sales,target))",
        "CREATE TABLE tasks(id TEXT PRIMARY KEY NOT NULL,tenant TEXT NOT NULL,sales TEXT NOT NULL,contact_id TEXT NOT NULL UNIQUE,target TEXT NOT NULL,contact_revision INTEGER NOT NULL CHECK(contact_revision>0),state TEXT NOT NULL CHECK(state='DRAFT'),FOREIGN KEY(contact_id,tenant,sales,target) REFERENCES contacts(id,tenant,sales,target))",
        "CREATE TABLE contact_events(seq INTEGER PRIMARY KEY AUTOINCREMENT,contact_id TEXT NOT NULL,revision INTEGER NOT NULL CHECK(revision>0),kind TEXT NOT NULL CHECK(kind IN ('IMPORTED','QUALIFIED','REFUSED')),qualification TEXT NOT NULL CHECK(qualification IN ('UNKNOWN','CONFIRMED','WITHDRAWN')),source TEXT NOT NULL,refused INTEGER NOT NULL CHECK(refused IN (0,1)),UNIQUE(contact_id,revision),FOREIGN KEY(contact_id) REFERENCES contacts(id))"
    };
    private static final String DRAFT_DDL="CREATE TABLE draft_events(seq INTEGER PRIMARY KEY AUTOINCREMENT,task_id TEXT NOT NULL,from_revision INTEGER NOT NULL CHECK(from_revision>0),to_revision INTEGER NOT NULL CHECK(to_revision>from_revision),kind TEXT NOT NULL CHECK(kind='REFRESHED'),UNIQUE(task_id,to_revision),FOREIGN KEY(task_id) REFERENCES tasks(id))";
    private static final String PLAN_DDL="CREATE TABLE sales_plan_events(seq INTEGER PRIMARY KEY AUTOINCREMENT,tenant TEXT NOT NULL,sales TEXT NOT NULL,version INTEGER NOT NULL CHECK(version>0),kind TEXT NOT NULL CHECK(kind IN ('PLANNED','PAUSED','EXPIRED','RECOVERED')),task_id TEXT,contact_revision INTEGER NOT NULL CHECK(contact_revision>=0),due_at INTEGER NOT NULL CHECK(due_at>=0),created_at INTEGER NOT NULL CHECK(created_at>0),UNIQUE(tenant,sales,version),FOREIGN KEY(task_id) REFERENCES tasks(id))";
    private static final String ATTEMPT_DDL="CREATE TABLE synthetic_attempts(id TEXT PRIMARY KEY NOT NULL,tenant TEXT NOT NULL,sales TEXT NOT NULL,task_id TEXT NOT NULL,plan_seq INTEGER NOT NULL UNIQUE,plan_version INTEGER NOT NULL CHECK(plan_version>0),contact_revision INTEGER NOT NULL CHECK(contact_revision>0),target TEXT NOT NULL,claimed_at INTEGER NOT NULL CHECK(claimed_at>0),source TEXT NOT NULL CHECK(source='SYNTHETIC'),FOREIGN KEY(task_id) REFERENCES tasks(id),FOREIGN KEY(plan_seq) REFERENCES sales_plan_events(seq))";
    private static final String ATTEMPT_EVENTS_DDL="CREATE TABLE synthetic_attempt_events(seq INTEGER PRIMARY KEY AUTOINCREMENT,attempt_id TEXT NOT NULL,revision INTEGER NOT NULL CHECK(revision>0),kind TEXT NOT NULL CHECK(kind IN ('CLAIMED','SIMULATED_API_RECEIVED','MANUAL_RESULT','CLOSED_UNKNOWN')),api_received INTEGER NOT NULL CHECK(api_received IN (0,1)),manual_result TEXT NOT NULL CHECK(manual_result IN ('','UNKNOWN','NO_ANSWER','COMPLETED')),closed_unknown INTEGER NOT NULL CHECK(closed_unknown IN (0,1)),created_at INTEGER NOT NULL CHECK(created_at>0),UNIQUE(attempt_id,revision),FOREIGN KEY(attempt_id) REFERENCES synthetic_attempts(id))";
    private static final String[] TABLES={"catalog_meta","contacts","tasks","contact_events","draft_events","sales_plan_events","synthetic_attempts","synthetic_attempt_events"};
    interface Fault {void at(String point);}
    private final Actor actor;private final boolean fixture;private final Fault fault;private final String kind;private SQLiteDatabase db;
    public static final class Result {
        public final String status;public final Contact contact;public final Task task;
        public final boolean realCallsEnabled=false,productionAuthenticated=false;
        Result(String status,Contact contact,Task task){this.status=status;this.contact=contact;this.task=task;}
    }
    public ContactTaskStore(Context context,Actor actor){this(context,actor,"contact-tasks-v1.db",false,point->{});}
    public static ContactTaskStore openSyntheticWorkspace(Context context){return new ContactTaskStore(context,SyntheticWorkspaceModel.actor(),"synthetic-workspace-v1.db",false,p->{},SyntheticWorkspaceModel.KIND);}
    static ContactTaskStore workspaceFixture(Context c,String name,Fault fault){if(name==null||!name.matches("workspace-fixture-[a-f0-9]{32}\\.db"))throw new IllegalArgumentException("ISOLATED_WORKSPACE_FIXTURE_REQUIRED");return new ContactTaskStore(c,SyntheticWorkspaceModel.actor(),name,true,fault,SyntheticWorkspaceModel.KIND);}
    static ContactTaskStore fixture(Context c,Actor a,String name,Fault fault){
        if(name==null||!name.matches("contact-fixture-[a-f0-9]{32}(-[a-z]{1,16})?\\.db"))throw new IllegalArgumentException("ISOLATED_CONTACT_FIXTURE_REQUIRED");
        return new ContactTaskStore(c,a,name,true,fault);
    }
    private ContactTaskStore(Context context,Actor actor,String name,boolean fixture,Fault fault){
        this(context,actor,name,fixture,fault,KIND);
    }
    private ContactTaskStore(Context context,Actor actor,String name,boolean fixture,Fault fault,String kind){
        this.actor=Objects.requireNonNull(actor);this.fixture=fixture;this.fault=Objects.requireNonNull(fault);this.kind=kind;
        File file=context.getApplicationContext().getDatabasePath(name);boolean existed=file.exists();
        if(existed&&file.length()==0)throw new IllegalStateException("CONTACT_STORE_TYPE_MISMATCH");
        if(!file.getParentFile().isDirectory()&&!file.getParentFile().mkdirs())throw new IllegalStateException("CONTACT_STORE_DIRECTORY");
        try{
            // A corrupt catalog must never invoke Android's default delete-and-recreate handler.
            db=SQLiteDatabase.openDatabase(file.getAbsolutePath(),null,SQLiteDatabase.OPEN_READWRITE|SQLiteDatabase.CREATE_IF_NECESSARY,bad->{throw new IllegalStateException("CORRUPT_CONTACT_STORE");});
            int openedVersion=existed?db.getVersion():VERSION;
            if(openedVersion<1||openedVersion>VERSION)throw new IllegalStateException("CONTACT_STORE_SCHEMA_MISMATCH");
            if(existed)validateSchema(openedVersion);
            db.setForeignKeyConstraintsEnabled(true);db.enableWriteAheadLogging();db.execSQL("PRAGMA synchronous=FULL");
            try(Cursor c=db.rawQuery("PRAGMA busy_timeout=5000",null)){c.moveToFirst();}
            if(!existed){db.beginTransactionNonExclusive();try{for(String sql:DDL)db.execSQL(sql);db.execSQL(DRAFT_DDL);db.execSQL(PLAN_DDL);db.execSQL(ATTEMPT_DDL);db.execSQL(ATTEMPT_EVENTS_DDL);db.execSQL("INSERT INTO catalog_meta VALUES(1,?,?)",new Object[]{kind,VERSION});db.setVersion(VERSION);db.execSQL("PRAGMA application_id="+APP_ID);db.setTransactionSuccessful();}finally{db.endTransaction();}}
            if(existed&&openedVersion<VERSION){db.beginTransactionNonExclusive();try{validateSchema(openedVersion);validateRows(openedVersion>=2);if(openedVersion==1){db.execSQL(DRAFT_DDL);fault.at("AFTER_DRAFT_SCHEMA_CREATE");}if(openedVersion<3){db.execSQL(PLAN_DDL);fault.at("AFTER_PLAN_SCHEMA_CREATE");}else validatePlans();db.execSQL(ATTEMPT_DDL);db.execSQL(ATTEMPT_EVENTS_DDL);fault.at("AFTER_ATTEMPT_SCHEMA_CREATE");db.execSQL("UPDATE catalog_meta SET version=?",new Object[]{VERSION});db.setVersion(VERSION);fault.at("BEFORE_SCHEMA_COMMIT");db.setTransactionSuccessful();}finally{db.endTransaction();}}
            validateSchema(VERSION);validateRows(true);validatePlans();validateAttempts();
            if(kind.equals(SyntheticWorkspaceModel.KIND))try(Cursor rows=db.rawQuery("SELECT * FROM contacts",null)){while(rows.moveToNext()){Contact c=contact(rows);if(!c.tenantId.equals(actor.tenantId)||!c.salesId.equals(actor.salesId))throw new IllegalStateException("FOREIGN_WORKSPACE_ACTOR");SyntheticWorkspaceModel.label(c.targetKey);}}
        }catch(RuntimeException e){if(db!=null)db.close();db=null;throw e;}
    }
    private static String normalized(String s){return s.replaceAll("\\s+"," ").trim().toUpperCase(Locale.ROOT);}
    private long number(String sql){try(Cursor c=db.rawQuery(sql,null)){if(!c.moveToFirst())throw new IllegalStateException("INVALID_CONTACT_STORE");return c.getLong(0);}}
    private void validateSchema(int version){
        if(db.getVersion()!=version||number("PRAGMA application_id")!=APP_ID)throw new IllegalStateException("CONTACT_STORE_SCHEMA_MISMATCH");
        int tableCount=version==1?4:version==2?5:version==3?6:8;
        if(number("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name!='android_metadata'")!=tableCount||number("SELECT COUNT(*) FROM sqlite_master WHERE type='trigger'")!=0)throw new IllegalStateException("CONTACT_STORE_TYPE_MISMATCH");
        try(Cursor c=db.rawQuery("SELECT sql FROM sqlite_master WHERE type='table' AND name='android_metadata'",null)){if(!c.moveToFirst()||!normalized(c.getString(0)).equals(normalized("CREATE TABLE android_metadata (locale TEXT)")))throw new IllegalStateException("CONTACT_STORE_SCHEMA_MISMATCH");}
        for(int i=0;i<tableCount;i++)try(Cursor c=db.rawQuery("SELECT sql FROM sqlite_master WHERE type='table' AND name=?",new String[]{TABLES[i]})){
            if(!c.moveToFirst()||!normalized(c.getString(0)).equals(normalized(i<4?DDL[i]:i==4?DRAFT_DDL:i==5?PLAN_DDL:i==6?ATTEMPT_DDL:ATTEMPT_EVENTS_DDL)))throw new IllegalStateException("CONTACT_STORE_SCHEMA_MISMATCH");
        }
        try(Cursor c=db.rawQuery("SELECT singleton,kind,version FROM catalog_meta",null)){
            if(c.getCount()!=1||!c.moveToFirst()||c.getType(0)!=Cursor.FIELD_TYPE_INTEGER||c.getType(2)!=Cursor.FIELD_TYPE_INTEGER||c.getLong(0)!=1||!kind.equals(c.getString(1))||c.getLong(2)!=version)throw new IllegalStateException("CONTACT_STORE_TYPE_MISMATCH");
        }
    }
    private static long integer(Cursor c,String column,String error){int index=c.getColumnIndexOrThrow(column);if(c.getType(index)!=Cursor.FIELD_TYPE_INTEGER)throw new IllegalStateException(error);return c.getLong(index);}
    private static Contact contact(Cursor c){
        try{long refused=integer(c,"refused","INVALID_STORED_CONTACT");if(refused!=0&&refused!=1)throw new IllegalArgumentException();
            return ContactTaskModel.restoreContact(c.getString(c.getColumnIndexOrThrow("id")),c.getString(c.getColumnIndexOrThrow("tenant")),c.getString(c.getColumnIndexOrThrow("sales")),c.getString(c.getColumnIndexOrThrow("target")),c.getString(c.getColumnIndexOrThrow("origin")),Qualification.valueOf(c.getString(c.getColumnIndexOrThrow("qualification"))),c.getString(c.getColumnIndexOrThrow("source")),refused==1,integer(c,"revision","INVALID_STORED_CONTACT"));
        }catch(RuntimeException e){throw new IllegalStateException("INVALID_STORED_CONTACT");}
    }
    private Contact find(String id,boolean owned){
        String sql=owned?"SELECT * FROM contacts WHERE id=? AND tenant=? AND sales=?":"SELECT * FROM contacts WHERE id=?";
        String[] args=owned?new String[]{id,actor.tenantId,actor.salesId}:new String[]{id};
        try(Cursor c=db.rawQuery(sql,args)){if(!c.moveToFirst())throw new IllegalStateException("FORBIDDEN");return contact(c);}
    }
    private Task task(Contact contact){
        try(Cursor c=db.rawQuery("SELECT * FROM tasks WHERE contact_id=?",new String[]{contact.id})){
            if(c.getCount()!=1||!c.moveToFirst())throw new IllegalStateException("INVALID_STORED_TASK");
            return ContactTaskModel.restoreTask(c.getString(c.getColumnIndexOrThrow("id")),contact,c.getString(c.getColumnIndexOrThrow("tenant")),c.getString(c.getColumnIndexOrThrow("sales")),c.getString(c.getColumnIndexOrThrow("target")),integer(c,"contact_revision","INVALID_STORED_TASK"),c.getString(c.getColumnIndexOrThrow("state")));
        }
    }
    private void validateRows(boolean drafts){
        db.beginTransactionNonExclusive();try{
            try(Cursor c=db.rawQuery("PRAGMA foreign_key_check",null)){if(c.moveToFirst())throw new IllegalStateException("CONTACT_FOREIGN_KEY_MISMATCH");}
            if(number("SELECT COUNT(*) FROM contacts")!=number("SELECT COUNT(*) FROM tasks"))throw new IllegalStateException("INVALID_STORED_TASK");
            try(Cursor all=db.rawQuery("SELECT * FROM contacts",null)){while(all.moveToNext()){
                Contact current=contact(all);Task storedTask=task(current);Contact replay=null;long expected=1;Set<Long> qualified=new HashSet<>();
                Actor owner=new Actor(current.tenantId,current.salesId,EnumSet.allOf(Permission.class));
                try(Cursor events=db.rawQuery("SELECT * FROM contact_events WHERE contact_id=? ORDER BY revision",new String[]{current.id})){while(events.moveToNext()){
                    long rev=integer(events,"revision","CONTACT_AUDIT_MISMATCH"),refusedValue=integer(events,"refused","CONTACT_AUDIT_MISMATCH");if(refusedValue!=0&&refusedValue!=1)throw new IllegalStateException("CONTACT_AUDIT_MISMATCH");String kind=events.getString(events.getColumnIndexOrThrow("kind")),source=events.getString(events.getColumnIndexOrThrow("source"));Qualification q=Qualification.valueOf(events.getString(events.getColumnIndexOrThrow("qualification")));boolean refused=refusedValue==1;
                    if(rev!=expected++)throw new IllegalStateException("CONTACT_AUDIT_MISMATCH");
                    if(replay==null){if(!"IMPORTED".equals(kind)||refused)throw new IllegalStateException("CONTACT_AUDIT_MISMATCH");replay=ContactTaskModel.restoreContact(current.id,current.tenantId,current.salesId,current.targetKey,"CONTACT_INTAKE",q,source,false,1);}
                    else if("QUALIFIED".equals(kind))replay=ContactTaskModel.qualify(owner,replay,replay.revision,q,source);
                    else if("REFUSED".equals(kind))replay=ContactTaskModel.refuse(owner,replay,replay.revision);
                    else throw new IllegalStateException("CONTACT_AUDIT_MISMATCH");
                    if(replay.revision!=rev||replay.qualification!=q||!replay.declarationSource.equals(source)||replay.refused!=refused)throw new IllegalStateException("CONTACT_AUDIT_MISMATCH");
                    if(!replay.refused&&replay.qualification==Qualification.CONFIRMED)qualified.add(rev);
                }}
                if(replay==null||replay.revision!=current.revision||replay.qualification!=current.qualification||!replay.declarationSource.equals(current.declarationSource)||replay.refused!=current.refused)throw new IllegalStateException("CONTACT_AUDIT_MISMATCH");
                long snapshot=1;
                if(drafts)try(Cursor events=db.rawQuery("SELECT * FROM draft_events WHERE task_id=? ORDER BY seq",new String[]{storedTask.id})){while(events.moveToNext()){
                    long from=integer(events,"from_revision","DRAFT_AUDIT_MISMATCH"),to=integer(events,"to_revision","DRAFT_AUDIT_MISMATCH");
                    if(from!=snapshot||to<=from||!qualified.contains(to)||!"REFRESHED".equals(events.getString(events.getColumnIndexOrThrow("kind"))))throw new IllegalStateException("DRAFT_AUDIT_MISMATCH");snapshot=to;
                }}
                if(snapshot!=storedTask.contactRevision)throw new IllegalStateException("DRAFT_AUDIT_MISMATCH");
            }}db.setTransactionSuccessful();
        }finally{db.endTransaction();}
    }
    private Plan plan(Cursor c,Actor owner){String task=c.getString(c.getColumnIndexOrThrow("task_id"));return SalesPlanModel.restore(owner,integer(c,"version","INVALID_STORED_PLAN"),task==null?"":task,integer(c,"contact_revision","INVALID_STORED_PLAN"),integer(c,"due_at","INVALID_STORED_PLAN"),!"PLANNED".equals(c.getString(c.getColumnIndexOrThrow("kind"))));}
    private Plan readPlan(){try(Cursor c=db.rawQuery("SELECT * FROM sales_plan_events WHERE tenant=? AND sales=? ORDER BY version DESC LIMIT 1",new String[]{actor.tenantId,actor.salesId})){return c.moveToFirst()?plan(c,actor):SalesPlanModel.initial(actor);}}
    private void validatePlans(){
        db.beginTransactionNonExclusive();try{
            Map<String,Plan> previous=new HashMap<>();
            try(Cursor events=db.rawQuery("SELECT * FROM sales_plan_events ORDER BY seq",null)){while(events.moveToNext()){
                Actor owner=new Actor(events.getString(events.getColumnIndexOrThrow("tenant")),events.getString(events.getColumnIndexOrThrow("sales")),EnumSet.allOf(Permission.class));Plan p=plan(events,owner);
                String key=owner.tenantId.length()+":"+owner.tenantId+owner.salesId.length()+":"+owner.salesId;Plan old=previous.getOrDefault(key,SalesPlanModel.initial(owner));
                long at=integer(events,"created_at","INVALID_STORED_PLAN");SalesPlanModel.time(at);
                if(p.version!=Math.addExact(old.version,1))throw new IllegalStateException("PLAN_AUDIT_MISMATCH");
                String kind=events.getString(events.getColumnIndexOrThrow("kind"));
                if(!p.paused){
                    if(!"PLANNED".equals(kind)||at>p.dueAt)throw new IllegalStateException("PLAN_AUDIT_MISMATCH");
                    try(Cursor t=db.rawQuery("SELECT contact_id FROM tasks WHERE id=?",new String[]{p.taskId})){
                        if(!t.moveToFirst())throw new IllegalStateException("PLAN_AUDIT_MISMATCH");Contact c=find(t.getString(0),false);Task task=task(c);
                        if(!c.tenantId.equals(owner.tenantId)||!c.salesId.equals(owner.salesId)||p.contactRevision>task.contactRevision)throw new IllegalStateException("PLAN_AUDIT_MISMATCH");
                        try(Cursor q=db.rawQuery("SELECT 1 FROM contact_events WHERE contact_id=? AND revision=? AND qualification='CONFIRMED' AND refused=0",new String[]{c.id,Long.toString(p.contactRevision)})){if(!q.moveToFirst())throw new IllegalStateException("PLAN_AUDIT_MISMATCH");}
                        if(p.contactRevision!=1)try(Cursor d=db.rawQuery("SELECT 1 FROM draft_events WHERE task_id=? AND to_revision=?",new String[]{task.id,Long.toString(p.contactRevision)})){if(!d.moveToFirst())throw new IllegalStateException("PLAN_AUDIT_MISMATCH");}
                    }
                }else if(old.paused||!Set.of("PAUSED","EXPIRED","RECOVERED").contains(kind)||("EXPIRED".equals(kind)&&at-old.dueAt<=30000))throw new IllegalStateException("PLAN_AUDIT_MISMATCH");
                previous.put(key,p);
            }}db.setTransactionSuccessful();
        }finally{db.endTransaction();}
    }
    private void require(Permission p){if(!actor.permissions.contains(p))throw new IllegalStateException("FORBIDDEN");}
    private interface Work<T>{T run();}
    private <T>T transaction(Work<T> work){if(db==null)throw new IllegalStateException("STORE_CLOSED");db.beginTransactionNonExclusive();try{T result=work.run();fault.at("BEFORE_COMMIT");db.setTransactionSuccessful();return result;}finally{db.endTransaction();}}
    private static ContentValues contactValues(Contact c){ContentValues v=new ContentValues();v.put("id",c.id);v.put("tenant",c.tenantId);v.put("sales",c.salesId);v.put("target",c.targetKey);v.put("origin","CONTACT_INTAKE");v.put("qualification",c.qualification.name());v.put("source",c.declarationSource);v.put("refused",c.refused?1:0);v.put("revision",c.revision);return v;}
    private void event(Contact c,String kind){ContentValues v=new ContentValues();v.put("contact_id",c.id);v.put("revision",c.revision);v.put("kind",kind);v.put("qualification",c.qualification.name());v.put("source",c.declarationSource);v.put("refused",c.refused?1:0);db.insertOrThrow("contact_events",null,v);fault.at("AFTER_EVENT_INSERT");}
    public synchronized Result importContact(Input input){
        require(Permission.IMPORT);ContactTaskModel.admit(actor,input,List.of()); // Validate before reading any target.
        if(kind.equals(SyntheticWorkspaceModel.KIND)){SyntheticWorkspaceModel.label(input.targetKey);if(!SyntheticWorkspaceModel.INPUT_SOURCE.equals(input.declarationSource)||input.qualification!=Qualification.CONFIRMED)throw new IllegalStateException("SYNTHETIC_WORKSPACE_INPUT_REQUIRED");}
        return transaction(()->{
            List<Contact> existing=new ArrayList<>();try(Cursor c=db.rawQuery("SELECT * FROM contacts WHERE tenant=? AND target=?",new String[]{actor.tenantId,input.targetKey})){while(c.moveToNext())existing.add(contact(c));}
            Admission a=ContactTaskModel.admit(actor,input,existing);
            if(a.contact==null)return new Result(a.status,null,null);
            if("DUPLICATE".equals(a.status))return new Result(a.status,a.contact,task(a.contact));
            db.insertOrThrow("contacts",null,contactValues(a.contact));fault.at("AFTER_CONTACT_INSERT");
            Task t=a.task;ContentValues v=new ContentValues();v.put("id",t.id);v.put("tenant",t.tenantId);v.put("sales",t.salesId);v.put("contact_id",t.contactId);v.put("target",t.targetKey);v.put("contact_revision",t.contactRevision);v.put("state",t.state);db.insertOrThrow("tasks",null,v);fault.at("AFTER_TASK_INSERT");event(a.contact,"IMPORTED");
            return new Result(a.status,a.contact,a.task);
        });
    }
    public synchronized Result get(String id){require(Permission.READ);return transaction(()->{Contact c=find(id,true);return new Result("OK",c,task(c));});}
    public static final class WorkspaceImport {public final int added,duplicates,blanks;WorkspaceImport(int added,int duplicates,int blanks){this.added=added;this.duplicates=duplicates;this.blanks=blanks;}}
    public synchronized WorkspaceImport importWorkspaceIds(String text){
        if(!kind.equals(SyntheticWorkspaceModel.KIND))throw new IllegalStateException("SYNTHETIC_WORKSPACE_REQUIRED");SyntheticWorkspaceModel.Batch batch=SyntheticWorkspaceModel.parse(text);
        return transaction(()->{int added=0,duplicates=batch.duplicates;for(String id:batch.ids){Result r=importContact(new Input(Origin.CONTACT_INTAKE,SyntheticWorkspaceModel.key(id),Qualification.CONFIRMED,SyntheticWorkspaceModel.INPUT_SOURCE));if(r.status.equals("IMPORTED"))added++;else if(r.status.equals("DUPLICATE"))duplicates++;else throw new IllegalStateException("WORKSPACE_IMPORT_CONFLICT");}return new WorkspaceImport(added,duplicates,batch.blanks);});
    }
    public synchronized List<Contact> list(){require(Permission.READ);return transaction(()->{List<Contact> rows=new ArrayList<>();try(Cursor c=db.rawQuery("SELECT * FROM contacts WHERE tenant=? AND sales=? ORDER BY id",new String[]{actor.tenantId,actor.salesId})){while(c.moveToNext())rows.add(contact(c));}return List.copyOf(rows);});}
    public synchronized Contact qualify(String id,long revision,Qualification q,String source){require(Permission.QUALIFY);return update(id,c->ContactTaskModel.qualify(actor,c,revision,q,source),"QUALIFIED");}
    public synchronized Contact refuse(String id,long revision){require(Permission.REFUSE);return update(id,c->ContactTaskModel.refuse(actor,c,revision),"REFUSED");}
    private interface Change{Contact run(Contact c);}
    private Contact update(String id,Change change,String kind){return transaction(()->{Contact old=find(id,true),next=change.run(old);if(next==old)return old;if(db.update("contacts",contactValues(next),"id=? AND revision=?",new String[]{old.id,Long.toString(old.revision)})!=1)throw new IllegalStateException("STALE_CONTACT");fault.at("AFTER_CONTACT_UPDATE");event(next,kind);return next;});}
    public synchronized String planningStatus(String id){require(Permission.PLAN);return transaction(()->{Contact c=find(id,true);return ContactTaskModel.planningStatus(actor,task(c),c);});}
    public synchronized Result refreshDraft(String id,long expectedContactRevision,long expectedDraftRevision){
        require(Permission.PLAN);return transaction(()->{
            Contact c=find(id,true);Task old=task(c),next=ContactTaskModel.refreshDraft(actor,old,c,expectedContactRevision,expectedDraftRevision);
            if(next==old)return new Result("ALREADY_CURRENT",c,old);
            ContentValues v=new ContentValues();v.put("contact_revision",next.contactRevision);
            if(db.update("tasks",v,"id=? AND contact_revision=?",new String[]{old.id,Long.toString(old.contactRevision)})!=1)throw new IllegalStateException("STALE_DRAFT");
            fault.at("AFTER_DRAFT_UPDATE");ContentValues e=new ContentValues();e.put("task_id",old.id);e.put("from_revision",old.contactRevision);e.put("to_revision",next.contactRevision);e.put("kind","REFRESHED");db.insertOrThrow("draft_events",null,e);fault.at("AFTER_DRAFT_EVENT_INSERT");
            return new Result("REFRESHED",c,next);
        });
    }
    public static final class PlanResult {
        public final String status;public final Plan plan;public final boolean realCallsEnabled=false,executionAuthorized=false;
        PlanResult(String status,Plan plan){this.status=status;this.plan=plan;}
    }
    private void planEvent(Plan p,String kind,long at){SalesPlanModel.time(at);ContentValues e=new ContentValues();e.put("tenant",actor.tenantId);e.put("sales",actor.salesId);e.put("version",p.version);e.put("kind",kind);if(p.paused)e.putNull("task_id");else e.put("task_id",p.taskId);e.put("contact_revision",p.contactRevision);e.put("due_at",p.dueAt);e.put("created_at",at);db.insertOrThrow("sales_plan_events",null,e);fault.at("AFTER_PLAN_EVENT_INSERT");}
    public synchronized Plan getPlan(){require(Permission.READ);return transaction(()->readPlan());}
    public synchronized PlanResult arrangePlan(String contactId,long expectedContact,long expectedDraft,long expectedPlan,long due,Clock clock){
        return arrangePlanAt(contactId,expectedContact,expectedDraft,expectedPlan,due,clock,false);
    }
    /** Derive an immediate due time from the same transaction clock sample used for validation. */
    public synchronized PlanResult arrangeImmediatePlan(String contactId,long expectedContact,long expectedDraft,long expectedPlan,Clock clock){
        return arrangePlanAt(contactId,expectedContact,expectedDraft,expectedPlan,0,clock,true);
    }
    private PlanResult arrangePlanAt(String contactId,long expectedContact,long expectedDraft,long expectedPlan,long due,Clock clock,boolean immediate){
        require(Permission.PLAN);Objects.requireNonNull(clock);return transaction(()->{if(hasPendingAttempt())throw new IllegalStateException("OCCUPIED");Contact c=find(contactId,true);Plan old=readPlan();long now=clock.millis();Plan next=SalesPlanModel.arrange(actor,old,task(c),c,expectedPlan,expectedContact,expectedDraft,immediate?now:due,now);planEvent(next,"PLANNED",now);return new PlanResult("PLANNED",next);});
    }
    private PlanResult stopPlan(long expected,Clock clock,String kind){require(Permission.PLAN);Objects.requireNonNull(clock);return transaction(()->{Plan old=readPlan(),next=SalesPlanModel.stop(actor,old,expected);if(old==next)return new PlanResult("ALREADY_PAUSED",old);planEvent(next,kind,clock.millis());return new PlanResult(kind,next);});}
    public synchronized PlanResult pausePlan(long expected,Clock clock){return stopPlan(expected,clock,"PAUSED");}
    public synchronized PlanResult recoverPlan(long expected,Clock clock){return stopPlan(expected,clock,"RECOVERED");}
    public synchronized PlanResult inspectPlan(long expected,Clock clock){
        require(Permission.PLAN);Objects.requireNonNull(clock);return transaction(()->{
            Plan p=readPlan();Task t=null;Contact c=null;
            if(!p.paused)try(Cursor row=db.rawQuery("SELECT contact_id FROM tasks WHERE id=?",new String[]{p.taskId})){if(!row.moveToFirst())throw new IllegalStateException("INVALID_STORED_PLAN");c=find(row.getString(0),true);t=task(c);}
            long now=clock.millis();String status=SalesPlanModel.status(actor,p,t,c,expected,now);
            if("EXPIRED".equals(status)){p=SalesPlanModel.stop(actor,p,expected);planEvent(p,"EXPIRED",now);}return new PlanResult(status,p);
        });
    }
    private Snapshot attempt(String id,boolean owned){
        String sql="SELECT * FROM synthetic_attempts WHERE id=?"+(owned?" AND tenant=? AND sales=?":"");
        try(Cursor row=db.rawQuery(sql,owned?new String[]{id,actor.tenantId,actor.salesId}:new String[]{id})){
            if(!row.moveToFirst())throw new IllegalStateException("FORBIDDEN");Actor owner=new Actor(row.getString(row.getColumnIndexOrThrow("tenant")),row.getString(row.getColumnIndexOrThrow("sales")),EnumSet.allOf(Permission.class));
            Snapshot s;long at=integer(row,"claimed_at","INVALID_STORED_ATTEMPT");
            try(Cursor original=db.rawQuery("SELECT * FROM sales_plan_events WHERE seq=?",new String[]{Long.toString(integer(row,"plan_seq","INVALID_STORED_ATTEMPT"))})){
                if(!original.moveToFirst()||!"PLANNED".equals(original.getString(original.getColumnIndexOrThrow("kind")))||!owner.tenantId.equals(original.getString(original.getColumnIndexOrThrow("tenant")))||!owner.salesId.equals(original.getString(original.getColumnIndexOrThrow("sales"))))throw new IllegalStateException("INVALID_STORED_ATTEMPT");
                Plan p=plan(original,owner);s=SyntheticAttemptModel.restore(owner,p,row.getString(row.getColumnIndexOrThrow("target")),at);
                if(!s.id.equals(id)||!s.taskId.equals(row.getString(row.getColumnIndexOrThrow("task_id")))||s.planVersion!=integer(row,"plan_version","INVALID_STORED_ATTEMPT")||s.contactRevision!=integer(row,"contact_revision","INVALID_STORED_ATTEMPT")||!"SYNTHETIC".equals(row.getString(row.getColumnIndexOrThrow("source"))))throw new IllegalStateException("INVALID_STORED_ATTEMPT");
                try(Cursor consumed=db.rawQuery("SELECT * FROM sales_plan_events WHERE tenant=? AND sales=? AND version=?",new String[]{owner.tenantId,owner.salesId,Long.toString(p.version+1)})){if(!consumed.moveToFirst()||!"PAUSED".equals(consumed.getString(consumed.getColumnIndexOrThrow("kind")))||integer(consumed,"created_at","INVALID_STORED_ATTEMPT")!=at)throw new IllegalStateException("ATTEMPT_CONSUMPTION_MISMATCH");}
                try(Cursor target=db.rawQuery("SELECT target FROM tasks WHERE id=?",new String[]{s.taskId})){if(!target.moveToFirst()||!s.targetKey.equals(target.getString(0)))throw new IllegalStateException("INVALID_STORED_ATTEMPT");}
            }
            long expected=1;try(Cursor events=db.rawQuery("SELECT * FROM synthetic_attempt_events WHERE attempt_id=? ORDER BY revision",new String[]{id})){while(events.moveToNext()){
                long rev=integer(events,"revision","ATTEMPT_AUDIT_MISMATCH"),api=integer(events,"api_received","ATTEMPT_AUDIT_MISMATCH"),closed=integer(events,"closed_unknown","ATTEMPT_AUDIT_MISMATCH");SalesPlanModel.time(integer(events,"created_at","ATTEMPT_AUDIT_MISMATCH"));String kind=events.getString(events.getColumnIndexOrThrow("kind")),result=events.getString(events.getColumnIndexOrThrow("manual_result"));
                if(rev!=expected++||api<0||api>1||closed<0||closed>1)throw new IllegalStateException("ATTEMPT_AUDIT_MISMATCH");
                if(rev==1){if(!"CLAIMED".equals(kind))throw new IllegalStateException("ATTEMPT_AUDIT_MISMATCH");}
                else if("SIMULATED_API_RECEIVED".equals(kind))s=SyntheticAttemptModel.receipt(owner,s);
                else if("MANUAL_RESULT".equals(kind))s=SyntheticAttemptModel.reconcile(owner,s,result);
                else if("CLOSED_UNKNOWN".equals(kind))s=SyntheticAttemptModel.closeUnknown(owner,s,Availability.IDLE,true);
                else throw new IllegalStateException("ATTEMPT_AUDIT_MISMATCH");
                if(s.revision!=rev||s.simulatedApiReceipt!=(api==1)||s.unknownClosed!=(closed==1)||!s.manualResult.equals(result))throw new IllegalStateException("ATTEMPT_AUDIT_MISMATCH");
            }}if(expected==1)throw new IllegalStateException("ATTEMPT_AUDIT_MISMATCH");return s;
        }
    }
    private List<Snapshot> attemptRows(){List<Snapshot> rows=new ArrayList<>();try(Cursor c=db.rawQuery("SELECT id FROM synthetic_attempts WHERE tenant=? AND sales=? ORDER BY claimed_at,id",new String[]{actor.tenantId,actor.salesId})){while(c.moveToNext())rows.add(attempt(c.getString(0),true));}return List.copyOf(rows);}
    private boolean hasPendingAttempt(){try(Cursor c=db.rawQuery("SELECT a.id FROM synthetic_attempts a JOIN synthetic_attempt_events e ON e.attempt_id=a.id WHERE a.tenant=? AND a.sales=? AND e.revision=(SELECT MAX(last.revision) FROM synthetic_attempt_events last WHERE last.attempt_id=a.id) AND e.closed_unknown=0 AND e.manual_result IN ('','UNKNOWN') LIMIT 1",new String[]{actor.tenantId,actor.salesId})){return c.moveToFirst()&&attempt(c.getString(0),true).state.equals("UNKNOWN");}}
    private void validateAttempts(){db.beginTransactionNonExclusive();try{Map<String,Integer> pending=new HashMap<>();try(Cursor rows=db.rawQuery("SELECT id FROM synthetic_attempts",null)){while(rows.moveToNext()){Snapshot s=attempt(rows.getString(0),false);if(s.state.equals("UNKNOWN")){String key=s.tenantId.length()+":"+s.tenantId+s.salesId.length()+":"+s.salesId;if(pending.merge(key,1,Integer::sum)>1)throw new IllegalStateException("ATTEMPT_OCCUPANCY_MISMATCH");}}}db.setTransactionSuccessful();}finally{db.endTransaction();}}
    public synchronized List<Snapshot> listSyntheticAttempts(){require(Permission.READ);return transaction(()->attemptRows());}
    public synchronized Snapshot getSyntheticAttempt(String id){require(Permission.READ);return transaction(()->attempt(id,true));}
    private void attemptEvent(Snapshot s,String kind,long at){SalesPlanModel.time(at);ContentValues v=new ContentValues();v.put("attempt_id",s.id);v.put("revision",s.revision);v.put("kind",kind);v.put("api_received",s.simulatedApiReceipt?1:0);v.put("manual_result",s.manualResult);v.put("closed_unknown",s.unknownClosed?1:0);v.put("created_at",at);db.insertOrThrow("synthetic_attempt_events",null,v);fault.at(kind.equals("CLAIMED")?"AFTER_ATTEMPT_EVENT_INSERT":kind.equals("SIMULATED_API_RECEIVED")?"AFTER_RECEIPT_EVENT_INSERT":"AFTER_RESULT_EVENT_INSERT");}
    synchronized Snapshot claimSynthetic(long expected,Availability availability,Clock clock){
        require(Permission.PLAN);Snapshot claimed=transaction(()->{
            if(hasPendingAttempt())throw new IllegalStateException("OCCUPIED");Plan p=readPlan();
            if(p.paused||p.version!=expected)throw new IllegalStateException(p.version!=expected?"STALE_PLAN":"PAUSED");
            Contact c;try(Cursor row=db.rawQuery("SELECT contact_id FROM tasks WHERE id=?",new String[]{p.taskId})){if(!row.moveToFirst())throw new IllegalStateException("INVALID_STORED_PLAN");c=find(row.getString(0),true);}
            long now=clock.millis();Task current=task(c);
            if(SalesPlanModel.status(actor,p,current,c,expected,now).equals("EXPIRED")){planEvent(SalesPlanModel.stop(actor,p,expected),"EXPIRED",now);return null;}
            Snapshot s=SyntheticAttemptModel.claim(actor,p,current,c,expected,availability,now);
            long planSeq;try(Cursor row=db.rawQuery("SELECT seq FROM sales_plan_events WHERE tenant=? AND sales=? AND version=?",new String[]{actor.tenantId,actor.salesId,Long.toString(expected)})){if(!row.moveToFirst())throw new IllegalStateException("INVALID_STORED_PLAN");planSeq=row.getLong(0);}
            planEvent(SalesPlanModel.stop(actor,p,expected),"PAUSED",now);
            ContentValues v=new ContentValues();v.put("id",s.id);v.put("tenant",s.tenantId);v.put("sales",s.salesId);v.put("task_id",s.taskId);v.put("plan_seq",planSeq);v.put("plan_version",s.planVersion);v.put("contact_revision",s.contactRevision);v.put("target",s.targetKey);v.put("claimed_at",s.claimedAt);v.put("source","SYNTHETIC");db.insertOrThrow("synthetic_attempts",null,v);fault.at("AFTER_ATTEMPT_INSERT");attemptEvent(s,"CLAIMED",now);return s;
        });if(claimed==null)throw new IllegalStateException("EXPIRED");fault.at("AFTER_ATTEMPT_COMMIT");return claimed;
    }
    synchronized Snapshot recordSyntheticReceipt(String id,Clock clock){require(Permission.PLAN);return transaction(()->{Snapshot old=attempt(id,true),next=SyntheticAttemptModel.receipt(actor,old);if(next!=old)attemptEvent(next,"SIMULATED_API_RECEIVED",clock.millis());return next;});}
    public synchronized Snapshot reconcileSynthetic(String id,String result,Clock clock){require(Permission.PLAN);return transaction(()->{Snapshot old=attempt(id,true),next=SyntheticAttemptModel.reconcile(actor,old,result);if(next!=old)attemptEvent(next,"MANUAL_RESULT",clock.millis());return next;});}
    public synchronized Snapshot closeSyntheticUnknown(String id,Availability availability,boolean confirmedNoPending,Clock clock){require(Permission.PLAN);return transaction(()->{Snapshot old=attempt(id,true),next=SyntheticAttemptModel.closeUnknown(actor,old,availability,confirmedNoPending);if(next!=old)attemptEvent(next,"CLOSED_UNKNOWN",clock.millis());return next;});}
    synchronized long[] fixtureCounts(){if(!fixture)throw new IllegalStateException("FIXTURE_ONLY");return transaction(()->new long[]{number("SELECT COUNT(*) FROM contacts"),number("SELECT COUNT(*) FROM tasks"),number("SELECT COUNT(*) FROM contact_events")});}
    @Override public synchronized void close(){if(db!=null){db.close();db=null;}}
}
