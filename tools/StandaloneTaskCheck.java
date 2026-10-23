import com.mantou.salesdialer.standalone.TaskEngine;
import java.time.Instant;
import java.util.Arrays;
public final class StandaloneTaskCheck {
 static int checks=0;static long now=Instant.parse("2026-10-16T02:00:00Z").toEpochMilli();
 static void eq(Object actual,Object expected){checks++;if(!expected.equals(actual))throw new AssertionError("expected="+expected+" actual="+actual);}
 interface Action {void run()throws Exception;}
 static void fails(Action a)throws Exception{checks++;try{a.run();}catch(Exception expected){return;}throw new AssertionError("expected failure");}
 static final class Store implements TaskEngine.Store {byte[] bytes;boolean fail,after;public byte[] read(){return bytes==null?null:bytes.clone();}public void write(byte[] next)throws Exception{if(fail&&!after)throw new Exception("DISK");bytes=next.clone();if(fail)throw new Exception("LOST_ACK");}}
 static TaskEngine engine(Store s)throws Exception{return new TaskEngine(s,()->now);}
 public static void main(String[] args)throws Exception{
  Store store=new Store();TaskEngine e=engine(store);e.seed(3);eq(e.snapshot().paused,true);e.plan();long version=e.snapshot().version;int[] calls={0};
  eq(e.trigger("DEMO-001",version,id->{eq(engine(store).snapshot().tasks.get(0).state,TaskEngine.UNKNOWN);calls[0]++;}),"SIMULATED_API_SUBMITTED");
  eq(e.trigger("DEMO-001",version,id->calls[0]++),"ALREADY_ATTEMPTED");eq(e.trigger("DEMO-002",version,id->calls[0]++),"OCCUPIED");eq(calls[0],1);
  e=engine(store);eq(e.snapshot().tasks.get(0).api,true);e.reconcile("DEMO-001","NO_ANSWER");eq(e.trigger("DEMO-001",version,id->calls[0]++),"ALREADY_ATTEMPTED");eq(calls[0],1);System.out.println("T531 durable claim, duplicate, occupation, reopen and explicit result passed");
  e.pause();eq(e.trigger("DEMO-002",version,id->calls[0]++),"STALE_PLAN");e=engine(store);eq(e.snapshot().paused,true);eq(e.snapshot().tasks.get(1).state,TaskEngine.NEW);e.plan();e.refuse("DEMO-002");eq(e.trigger("DEMO-002",e.snapshot().version,id->calls[0]++),"REFUSED");eq(calls[0],1);System.out.println("T532 pause invalidates plan; refusal blocks next attempt passed");
  eq(e.trigger("DEMO-003",e.snapshot().version,id->{throw new Exception("LOST");}),"RECONCILE_REQUIRED");e=engine(store);eq(e.snapshot().tasks.get(2).api,false);eq(e.trigger("DEMO-003",e.snapshot().version,id->calls[0]++),"ALREADY_ATTEMPTED");TaskEngine pending=e;fails(()->pending.plan());e.reconcile("DEMO-003","UNKNOWN");eq(e.snapshot().tasks.get(2).api,false);System.out.println("T533 unknown result survives reopen; no replay or fabricated API receipt passed");
  for(String stamp:new String[]{"2026-10-16T00:59:59Z","2026-10-16T10:00:00Z","2026-10-17T02:00:00Z"})eq(TaskEngine.inWindow(Instant.parse(stamp).toEpochMilli()),false);
  eq(TaskEngine.inWindow(Instant.parse("2026-10-16T01:00:00Z").toEpochMilli()),true);eq(TaskEngine.inWindow(Instant.parse("2026-10-16T09:59:59Z").toEpochMilli()),true);
  Store off=new Store();TaskEngine out=engine(off);out.seed(1);out.plan();now=Instant.parse("2026-10-17T02:00:00Z").toEpochMilli();eq(out.trigger("DEMO-001",out.snapshot().version,id->calls[0]++),"OUTSIDE_WINDOW");eq(out.snapshot().tasks.get(0).state,TaskEngine.PLANNED);now=Instant.parse("2026-10-16T02:00:00Z").toEpochMilli();System.out.println("T534 Beijing weekday window applies before adapter passed");
  Store failed=new Store();TaskEngine f=engine(failed);f.seed(1);f.plan();failed.fail=true;fails(()->f.trigger("DEMO-001",1,id->calls[0]++));eq(calls[0],1);eq(engine(failed).snapshot().tasks.get(0).state,TaskEngine.PLANNED);failed.after=true;fails(()->f.trigger("DEMO-001",1,id->calls[0]++));eq(calls[0],1);System.out.println("T535 failed persistence stops adapter and poisons current engine passed");
  Store uncertain=new Store();TaskEngine u=engine(uncertain);u.seed(1);u.plan();uncertain.fail=true;uncertain.after=true;fails(()->u.trigger("DEMO-001",1,id->calls[0]++));uncertain.fail=false;eq(engine(uncertain).snapshot().tasks.get(0).state,TaskEngine.UNKNOWN);eq(calls[0],1);System.out.println("T536 committed claim with lost acknowledgement remains unknown after reopen passed");
  Store corrupt=new Store();corrupt.bytes=new byte[]{1,2,3};fails(()->engine(corrupt));byte[] previous=store.bytes.clone();TaskEngine.Snapshot copy=engine(store).snapshot();copy.tasks.clear();eq(Arrays.equals(previous,store.bytes),true);System.out.println("T537 corrupt state refuses startup; snapshot mutation cannot change persisted state passed");
  Store bulk=new Store();TaskEngine b=engine(bulk);b.seed(200);b.plan();int[] submitted={0};for(int i=1;i<=200;i++){String id=String.format(java.util.Locale.ROOT,"DEMO-%03d",i);eq(b.trigger(id,1,key->submitted[0]++),"SIMULATED_API_SUBMITTED");b.reconcile(id,"NO_ANSWER");}eq(submitted[0],200);eq(engine(bulk).snapshot().tasks.stream().filter(t->t.state==TaskEngine.FINISHED).count(),200L);System.out.println("T538 200 synthetic tasks survive reopen; zero phone APIs passed");
  System.out.println("PASS: "+checks+" assertions; 8 scenarios; no phone access");
 }
}
