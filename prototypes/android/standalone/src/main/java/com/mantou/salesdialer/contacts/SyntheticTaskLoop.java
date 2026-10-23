package com.mantou.salesdialer.contacts;
import java.time.Clock;
import java.util.*;
import com.mantou.salesdialer.contacts.SyntheticAttemptModel.*;
/** Bounded synthetic execution only; the final recording port has no phone implementation. */
public final class SyntheticTaskLoop {
 public interface Time {Clock wall();long elapsedMillis();String bootId();}
 public static final class RecordingPort {
  public enum Mode { ACK, FAIL, LOSE_ACK }
  private final Mode mode;private final List<String> requests=new ArrayList<>();public boolean durableUnknownObserved;
  public RecordingPort(Mode mode){this.mode=Objects.requireNonNull(mode);}
  public synchronized List<String> requests(){return List.copyOf(requests);}
  private synchronized void submit(ContactTaskStore store,Snapshot s,Runnable guard){
   Snapshot durable=store.getSyntheticAttempt(s.id);if(!durable.state.equals("UNKNOWN")||durable.simulatedApiReceipt)throw new IllegalStateException("DURABLE_UNKNOWN_REQUIRED");durableUnknownObserved=true;guard.run();requests.add(s.id+":"+s.targetKey);
   if(mode!=Mode.ACK)throw new IllegalStateException(mode==Mode.FAIL?"SIMULATED_PORT_FAILURE":"SIMULATED_ACK_LOST");
  }
 }
 private final ContactTaskStore store;private final Time time;private final RecordingPort port;
 public SyntheticTaskLoop(ContactTaskStore store,Time time,RecordingPort port){this(store,time,port,true);}
 private SyntheticTaskLoop(ContactTaskStore store,Time time,RecordingPort port,boolean recover){this.store=Objects.requireNonNull(store);this.time=Objects.requireNonNull(time);this.port=Objects.requireNonNull(port);if(recover)store.recoverPlan(store.getPlan().version,time.wall());}
 static SyntheticTaskLoop scheduledCallback(ContactTaskStore store,Time time,RecordingPort port){return new SyntheticTaskLoop(store,time,port,false);}
 public Snapshot execute(long expectedPlan,Availability availability){
  return executeGuarded(expectedPlan,availability,()->{});
 }
 Snapshot executeGuarded(long expectedPlan,Availability availability,Runnable scheduledGuard){
  long started=time.wall().millis(),elapsed=time.elapsedMillis();String boot=time.bootId();
  if(elapsed<0||boot==null||boot.isBlank())throw new IllegalStateException("EXECUTION_CLOCK_UNKNOWN");
  Snapshot claimed=store.claimSynthetic(expectedPlan,availability,time.wall());
  Runnable guard=()->{long current=time.wall().millis(),after=time.elapsedMillis();if(!boot.equals(time.bootId())||after<elapsed||current<started||current-claimed.dueAt>30000||after-elapsed>claimed.dueAt+30000-started||!SalesPlanModel.window(current))throw new IllegalStateException("EXECUTION_WINDOW_CLOSED");scheduledGuard.run();};
  guard.run();port.submit(store,claimed,guard);return store.recordSyntheticReceipt(claimed.id,time.wall());
 }
}
