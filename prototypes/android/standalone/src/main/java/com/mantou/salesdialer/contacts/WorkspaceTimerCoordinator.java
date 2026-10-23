package com.mantou.salesdialer.contacts;
import java.util.UUID;
import com.mantou.salesdialer.contacts.SyntheticAttemptModel.Availability;
import com.mantou.salesdialer.contacts.WorkspaceTimerModel.Ticket;
/** Coordinates a durable one-shot synthetic ticket with the authoritative SQLite plan. */
final class WorkspaceTimerCoordinator {
 static final Object LOCK=new Object();
 interface Tickets{Ticket read();void write(Ticket ticket);}
 interface Alarm{void ready();void arm(Ticket ticket);void cancel();}
 private final ContactTaskStore store;private final SyntheticTaskLoop.Time time;private final Tickets tickets;private final Alarm alarm;final SyntheticTaskLoop.RecordingPort port;
 WorkspaceTimerCoordinator(ContactTaskStore store,SyntheticTaskLoop.Time time,Tickets tickets,Alarm alarm,SyntheticTaskLoop.RecordingPort port){this.store=store;this.time=time;this.tickets=tickets;this.alarm=alarm;this.port=port;}
 void invalidate(){synchronized(LOCK){tickets.read();tickets.write(null);alarm.cancel();}}
 void recover(){synchronized(LOCK){store.recoverPlan(store.getPlan().version,time.wall());invalidate();}}
 void arrange(SyntheticWorkspaceSession.Row row,long version,long due){synchronized(LOCK){alarm.ready();tickets.read();if(time.bootId().isBlank()||time.elapsedMillis()<0)throw new IllegalStateException("EXECUTION_CLOCK_UNKNOWN");var p=store.arrangePlan(row.contact.id,row.contact.revision,row.task.contactRevision,version,due,time.wall()).plan;
  try{Ticket t=WorkspaceTimerModel.create(p.version,p.dueAt,time.wall().millis(),time.elapsedMillis(),time.bootId(),UUID.randomUUID().toString().replace("-",""));tickets.write(t);alarm.arm(t);}catch(RuntimeException e){try{store.pausePlan(p.version,time.wall());}finally{invalidate();}throw e;}
 }}
 String fire(long version,String token){synchronized(LOCK){Ticket t=tickets.read();String status=WorkspaceTimerModel.status(t,version,token,time.wall().millis(),time.elapsedMillis(),time.bootId());if(status.equals("STALE_TIMER"))return status;
  var p=store.getPlan();if(p.paused||p.version!=version||p.dueAt!=t.dueWall){invalidate();return "STALE_PLAN";}
  if(!status.equals("DUE")){store.pausePlan(version,time.wall());invalidate();return status;}
  try{alarm.ready();invalidate();SyntheticTaskLoop.scheduledCallback(store,time,port).executeGuarded(version,Availability.IDLE,()->{String current=WorkspaceTimerModel.status(t,version,token,time.wall().millis(),time.elapsedMillis(),time.bootId());if(!current.equals("DUE"))throw new IllegalStateException(current);});return "SIMULATED_API_RECEIVED";}
  catch(RuntimeException e){var latest=store.getPlan();if(!latest.paused&&latest.version==version)store.pausePlan(version,time.wall());throw e;}
 }}
}
