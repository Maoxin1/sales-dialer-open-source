import com.mantou.salesdialer.standalone.TaskEngine;
import com.mantou.salesdialer.standalone.TaskSubmissionBridge;
import static com.mantou.salesdialer.standalone.TaskSubmissionBridge.Source.*;
import java.time.Instant;
import java.util.Arrays;
public final class StandaloneBridgeCheck {
 static int checks;static long now=Instant.parse("2026-10-16T02:00:00Z").toEpochMilli();
 static void eq(Object a,Object b){checks++;if(!java.util.Objects.equals(a,b))throw new AssertionError(a+" != "+b);}
 static final class Store implements TaskEngine.Store{byte[] bytes;int writes;public byte[] read(){return bytes;}public void write(byte[] v){bytes=v;writes++;}}
 public static void main(String[] args)throws Exception{
  Store s=new Store();TaskEngine e=new TaskEngine(s,()->now);e.seed(3);e.plan();int[] calls={0};
  TaskSubmissionBridge b=new TaskSubmissionBridge(e,(target,attempt)->calls[0]++);byte[] before=s.bytes.clone();int writes=s.writes;
  eq(b.submit(CONTROLLED_REAL,"DEMO-001",e.snapshot().version).status,"REAL_ADAPTER_NOT_LINKED");
  eq(b.submit(CONTROLLED_REAL,"CONTACT-TEST",e.snapshot().version).apiSubmission,"NOT_SUBMITTED");eq(calls[0],0);eq(s.writes,writes);eq(Arrays.equals(before,s.bytes),true);
  eq(b.inspectReal().realCallsEnabled,false);eq(b.inspectReal().nativeAdapterLinked,false);
  System.out.println("T566 real route blocked before claim, port and store writes passed");
  b=new TaskSubmissionBridge(e,(target,attempt)->{eq(target,"DEMO-001");eq(attempt,"DEMO-001/A1");eq(new TaskEngine(s,()->now).snapshot().tasks.get(0).state,TaskEngine.UNKNOWN);calls[0]++;});
  TaskSubmissionBridge.Receipt receipt=b.submit(SIMULATION,"DEMO-001",e.snapshot().version);eq(receipt.status,"SIMULATED_API_SUBMITTED");eq(receipt.apiSubmission,"SIMULATED");eq(receipt.outgoingConfirmed,null);eq(receipt.connectedConfirmed,null);eq(calls[0],1);
  eq(b.submit(SIMULATION,"DEMO-001",e.snapshot().version).apiSubmission,"NOT_SUBMITTED");eq(calls[0],1);
  System.out.println("T567 simulation preserves durable claim, attempt ID and independent receipt facts passed");
  e.reconcile("DEMO-001","NO_ANSWER");TaskSubmissionBridge failing=new TaskSubmissionBridge(e,(target,attempt)->{throw new Exception("LOST");});
  eq(failing.submit(SIMULATION,"DEMO-002",e.snapshot().version).apiSubmission,"UNKNOWN");TaskEngine reopened=new TaskEngine(s,()->now);TaskSubmissionBridge again=new TaskSubmissionBridge(reopened,(target,attempt)->calls[0]++);
  eq(again.submit(SIMULATION,"DEMO-002",reopened.snapshot().version).status,"ALREADY_ATTEMPTED");eq(calls[0],1);eq(reopened.snapshot().tasks.get(1).api,false);
  System.out.println("T568 failed simulation port remains pending after reopen without replay passed");
  Store timed=new Store();TaskEngine t=new TaskEngine(timed,()->now);t.seed(1);t.plan();long v=t.schedule("DEMO-001",now+30000,40000,1);TaskSubmissionBridge timer=new TaskSubmissionBridge(t,(target,attempt)->calls[0]++);now+=30000;
  eq(timer.fire(v,1,()->40000),"SIMULATED_API_SUBMITTED");eq(timer.fire(v,1,()->40000),"STALE_ALARM");eq(calls[0],2);
  System.out.println("T569 timer shares simulation bridge with no duplicate submission passed");
  before=s.bytes.clone();writes=s.writes;eq(again.submit(null,"DEMO-003",1).status,"INVALID_SOURCE");eq(again.submit(SIMULATION,"13800138000",1).status,"INVALID_DEMO_TARGET");eq(again.submit(SIMULATION,null,1).status,"INVALID_DEMO_TARGET");eq(Arrays.equals(before,s.bytes),true);eq(s.writes,writes);eq(calls[0],2);
  System.out.println("T570 unknown source and phone-like payload rejected before task access passed");
  System.out.println("PASS: "+checks+" assertions; 5 bridge scenarios; no native sender");
 }
}
