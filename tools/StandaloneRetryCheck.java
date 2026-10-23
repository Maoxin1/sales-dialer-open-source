import com.mantou.salesdialer.standalone.TaskEngine;
import java.time.Instant;
public final class StandaloneRetryCheck {
 static int checks;static long now=Instant.parse("2026-10-16T02:00:00Z").toEpochMilli();
 static void eq(Object a,Object b){checks++;if(!a.equals(b))throw new AssertionError(a+" != "+b);}
 static final class Store implements TaskEngine.Store {byte[] bytes;boolean fail;public byte[] read(){return bytes;}public void write(byte[] b)throws Exception{if(fail)throw new Exception("DISK");bytes=b;}}
 static TaskEngine fresh(Store s)throws Exception{TaskEngine e=new TaskEngine(s,()->now);e.seed(3);e.plan();e.trigger("DEMO-001",e.snapshot().version,id->{});e.reconcile("DEMO-001","NO_ANSWER");return e;}
 public static void main(String[] args)throws Exception{
  Store s=new Store();TaskEngine e=fresh(s);long version=e.snapshot().version;
  eq(e.retry("DEMO-001",version),"RETRY_PREPARED");
  eq(e.snapshot().paused,true);eq(e.snapshot().tasks.get(0).state,TaskEngine.NEW);
  eq(e.retry("DEMO-001",version),"STALE_PLAN");
  eq(e.trigger("DEMO-001",e.snapshot().version,id->{throw new AssertionError("unexpected submit");}),"PAUSED");
  System.out.println("T550 explicit retry prepares once and requires replan passed");
  eq(TaskEngine.attemptCount(e.snapshot()),1L);eq(e.snapshot().tasks.get(0).history.get(0).id,"DEMO-001/A1");eq(e.snapshot().tasks.get(0).history.get(0).result,"NO_ANSWER");eq(e.snapshot().tasks.get(0).history.get(0).api,true);
  e=new TaskEngine(s,()->now);eq(e.snapshot().tasks.get(0).attemptId(),"DEMO-001/A2");e.plan();eq(e.trigger("DEMO-001",e.snapshot().version,id->{}),"SIMULATED_API_SUBMITTED");e.reconcile("DEMO-001","COMPLETED");e=new TaskEngine(s,()->now);
  eq(TaskEngine.attemptCount(e.snapshot()),2L);eq(e.snapshot().tasks.size(),3);eq(e.snapshot().tasks.get(0).result,"COMPLETED");eq(e.snapshot().tasks.get(0).history.get(0).result,"NO_ANSWER");
  System.out.println("T551 two attempts retain independent results and survive reopen passed");
  TaskEngine refused=fresh(new Store());refused.refuse("DEMO-001");eq(refused.retry("DEMO-001",refused.snapshot().version),"REFUSED");eq(refused.snapshot().tasks.get(0).history.size(),0);
  TaskEngine uncertain=fresh(new Store());uncertain.trigger("DEMO-002",uncertain.snapshot().version,id->{});eq(uncertain.retry("DEMO-001",uncertain.snapshot().version),"RECONCILE_REQUIRED");uncertain.reconcile("DEMO-002","UNKNOWN");eq(uncertain.retry("DEMO-002",uncertain.snapshot().version),"RESULT_UNCERTAIN");
  System.out.println("T552 refusal, occupied and reconciled unknown block retry passed");
  TaskEngine timer=fresh(new Store());long tv=timer.schedule("DEMO-002",now+30000,40000,1);eq(timer.retry("DEMO-001",tv),"RETRY_PREPARED");eq(timer.fire(tv,1,40000,id->{throw new AssertionError("stale callback");}),"STALE_ALARM");eq(timer.snapshot().tasks.get(1).state,TaskEngine.NEW);
  timer.plan();now=Instant.parse("2026-10-17T02:00:00Z").toEpochMilli();eq(timer.trigger("DEMO-001",timer.snapshot().version,id->{throw new AssertionError("weekend submit");}),"OUTSIDE_WINDOW");now=Instant.parse("2026-10-16T02:00:00Z").toEpochMilli();
  System.out.println("T553 retry cancels old timer; new submit still follows work window passed");
  Store fail=new Store();TaskEngine failed=fresh(fail);fail.fail=true;boolean rejected=false;try{failed.retry("DEMO-001",failed.snapshot().version);}catch(Exception expected){rejected=true;}eq(rejected,true);fail.fail=false;TaskEngine reopened=new TaskEngine(fail,()->now);eq(reopened.snapshot().tasks.get(0).state,TaskEngine.FINISHED);eq(reopened.snapshot().tasks.get(0).history.size(),0);
  System.out.println("T554 failed retry write preserves prior result passed");
  // A genuine schema2 record, independent of the current encoder.
  java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream();java.io.DataOutputStream out=new java.io.DataOutputStream(bytes);out.writeInt(2);out.writeLong(4);out.writeBoolean(true);out.writeInt(1);out.writeUTF("DEMO-001");out.writeInt(3);out.writeBoolean(false);out.writeBoolean(false);out.writeUTF("NO_ANSWER");out.writeUTF("");out.writeUTF("NONE");out.writeLong(0);out.writeLong(0);out.writeInt(0);
  Store legacy=new Store();legacy.bytes=bytes.toByteArray();TaskEngine migrated=new TaskEngine(legacy,()->now);eq(migrated.retry("DEMO-001",4),"RETRY_PREPARED");eq(new TaskEngine(legacy,()->now).snapshot().tasks.get(0).history.get(0).api,false);eq(TaskEngine.attemptCount(migrated.snapshot()),1L);
  System.out.println("T555 schema2 migration never fabricates an API receipt passed");
  Store corrupt=new Store();TaskEngine.Snapshot bad=migrated.snapshot();bad.tasks.get(0).history.get(0).id="DEMO-001/A9";corrupt.bytes=TaskEngine.encode(bad);boolean invalid=false;try{new TaskEngine(corrupt,()->now);}catch(java.io.IOException expected){invalid=true;}eq(invalid,true);
  System.out.println("T556 corrupt attempt identity refuses startup passed");
  System.out.println("PASS: "+checks+" assertions; 7 retry scenarios; no phone access");
 }
}
