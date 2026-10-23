import com.mantou.salesdialer.standalone.TaskEngine;
import java.time.Instant;
import java.io.*;
public final class StandaloneTimerCheck {
 static long now=Instant.parse("2026-10-16T02:00:00Z").toEpochMilli();static final long BASE=now;static int checks,calls;
 static void eq(Object a,Object b){checks++;if(!a.equals(b))throw new AssertionError(a+" != "+b);}
 static final class Store implements TaskEngine.Store{byte[] bytes;Runnable onWrite=()->{};public byte[] read(){return bytes;}public void write(byte[] v){bytes=v;onWrite.run();}}
 static TaskEngine fresh(Store s)throws Exception{TaskEngine e=new TaskEngine(s,()->now);e.seed(3);e.plan();return e;}
 public static void main(String[] args)throws Exception{
  Store s=new Store();TaskEngine e=fresh(s);long v=e.schedule("DEMO-001",BASE+30000,40000,1);eq(e.fire(v,1,39999,id->calls++),"EARLY_ALARM");now=BASE+30000;eq(e.fire(v,1,40000,id->calls++),"SIMULATED_API_SUBMITTED");eq(e.fire(v,1,40000,id->calls++),"STALE_ALARM");eq(calls,1);System.out.println("T540 single due callback and duplicate rejection passed");
  now=BASE;Store p=new Store();TaskEngine paused=fresh(p);long pv=paused.schedule("DEMO-001",BASE+30000,40000,1);paused.pause();now+=30000;eq(paused.fire(pv,1,40000,id->calls++),"STALE_ALARM");eq(calls,1);System.out.println("T541 pause invalidates durable alarm version passed");
  now=BASE;Store late=new Store();TaskEngine l=fresh(late);long lv=l.schedule("DEMO-001",BASE+30000,40000,1);now=BASE+60001;eq(l.fire(lv,1,70001,id->calls++),"SKIPPED_EXPIRED");eq(new TaskEngine(late,()->now).fire(lv,1,70001,id->calls++),"STALE_ALARM");eq(calls,1);System.out.println("T542 late callback consumed durably without replay passed");
  now=BASE;TaskEngine reboot=fresh(new Store());long bv=reboot.schedule("DEMO-001",BASE+30000,40000,1);now+=30000;eq(reboot.fire(bv,2,40000,id->calls++),"SKIPPED_REBOOT");eq(calls,1);System.out.println("T543 reboot mismatch blocks callback passed");
  now=BASE;TaskEngine r=fresh(new Store());long rv=r.schedule("DEMO-001",BASE+30000,40000,1);r.refuse("DEMO-001");now+=30000;eq(r.fire(rv,1,40000,id->calls++),"REFUSED");eq(calls,1);System.out.println("T544 refusal before delivery blocks submit passed");
  now=BASE;Store m=new Store();TaskEngine manual=fresh(m);long mv=manual.schedule("DEMO-001",BASE+30000,40000,1);eq(manual.trigger("DEMO-001",mv,id->calls++),"SIMULATED_API_SUBMITTED");now+=30000;eq(manual.fire(mv,1,40000,id->calls++),"STALE_ALARM");eq(calls,2);System.out.println("T545 manual versus timer competition passed");
  now=BASE;Store boundary=new Store();TaskEngine b=fresh(boundary);long boundaryV=b.schedule("DEMO-001",BASE+30000,40000,1);now=BASE+60000;eq(b.fire(boundaryV,1,70000,id->calls++),"SIMULATED_API_SUBMITTED");eq(calls,3);System.out.println("T546 inclusive 30 second boundary passed");
  now=BASE;Store delay=new Store();TaskEngine d=fresh(delay);long dv=d.schedule("DEMO-001",BASE+30000,40000,1);now+=30000;long[] elapsed={40000};delay.onWrite=()->elapsed[0]+=16000;eq(d.fire(dv,1,()->elapsed[0],id->calls++),"RECONCILE_REQUIRED");eq(calls,3);eq(d.snapshot().tasks.get(0).api,false);System.out.println("T547 slow durable claim cannot exceed monotonic submit deadline passed");
  ByteArrayOutputStream bytes=new ByteArrayOutputStream();DataOutputStream out=new DataOutputStream(bytes);out.writeInt(1);out.writeLong(4);out.writeBoolean(true);out.writeInt(1);out.writeUTF("DEMO-001");out.writeInt(3);out.writeBoolean(false);out.writeBoolean(true);out.writeUTF("NO_ANSWER");TaskEngine.Snapshot old=TaskEngine.decode(bytes.toByteArray());eq(old.version,4L);eq(old.tasks.get(0).result,"NO_ANSWER");eq(old.timerTarget,"");System.out.println("T548 schema1 migration preserves results and has no implicit alarm passed");
  System.out.println("PASS: "+checks+" assertions; 9 timer scenarios; calls are simulation only");
 }
}
