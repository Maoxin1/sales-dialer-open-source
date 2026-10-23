package com.mantou.salesdialer.contacts;
import android.content.Context;import android.os.SystemClock;import android.provider.Settings;
import java.time.Clock;import java.util.*;
import com.mantou.salesdialer.contacts.ContactTaskModel.*;import com.mantou.salesdialer.contacts.SalesPlanModel.Plan;import com.mantou.salesdialer.contacts.SyntheticAttemptModel.*;
/** UI composition for the fixed local synthetic identity. No login or real telephone adapter. */
public final class SyntheticWorkspaceSession implements AutoCloseable {
 public static final class Row {public final Contact contact;public final Task task;public final String label;Row(ContactTaskStore.Result r){contact=r.contact;task=r.task;label=SyntheticWorkspaceModel.label(contact.targetKey);}public boolean eligible(){return ContactTaskModel.planningStatus(SyntheticWorkspaceModel.actor(),task,contact).equals("ELIGIBLE_FOR_PLANNING");}}
 public static final class View {public final List<Row> contacts;public final List<Snapshot> attempts;public final Plan plan;public final SyntheticWorkspaceModel.Counters counters;View(List<Row> contacts,List<Snapshot> attempts,Plan plan){this.contacts=List.copyOf(contacts);this.attempts=List.copyOf(attempts);this.plan=plan;counters=new SyntheticWorkspaceModel.Counters(contacts.stream().map(r->r.contact).collect(java.util.stream.Collectors.toList()),attempts);}public Snapshot pending(){return attempts.stream().filter(a->a.state.equals("UNKNOWN")).findFirst().orElse(null);}}
 private final ContactTaskStore store;private final SyntheticTaskLoop.Time time;private final SyntheticTaskLoop loop;private WorkspaceTimerCoordinator timer;private ContactTaskStore.WorkspaceImport lastImport;
 public SyntheticWorkspaceSession(Context context){this(ContactTaskStore.openSyntheticWorkspace(context),WorkspaceTimerRuntime.time(context));synchronized(WorkspaceTimerCoordinator.LOCK){try{timer=WorkspaceTimerRuntime.coordinator(context,store,time);timer.recover();}catch(RuntimeException e){store.close();throw e;}}}
 SyntheticWorkspaceSession(ContactTaskStore store,SyntheticTaskLoop.Time time){this.store=store;this.time=time;try{loop=new SyntheticTaskLoop(store,time,new SyntheticTaskLoop.RecordingPort(SyntheticTaskLoop.RecordingPort.Mode.ACK));}catch(RuntimeException e){store.close();throw e;}}
 public View view(){List<Row> rows=new ArrayList<>();for(Contact c:store.list())rows.add(new Row(store.get(c.id)));rows.sort(Comparator.comparing(r->r.label));return new View(rows,store.listSyntheticAttempts(),store.getPlan());}
 public ContactTaskStore.WorkspaceImport importIds(String text){lastImport=store.importWorkspaceIds(text);return lastImport;}
 public String importSummary(){return lastImport==null?"尚未导入":"导入完成：新增"+lastImport.added+"，重复跳过"+lastImport.duplicates+"，空行"+lastImport.blanks+"。已有资格、拒绝和历史保持。";}
 public void arrange(Row seen,long planVersion,String text){store.arrangePlan(seen.contact.id,seen.contact.revision,seen.task.contactRevision,planVersion,SyntheticWorkspaceModel.parseTime(text),time.wall());}
 public void arrangeAutomatic(Row seen,long version,String text){if(timer==null)throw new IllegalStateException("NATIVE_TIMER_UNAVAILABLE");timer.arrange(seen,version,SyntheticWorkspaceModel.parseTime(text));}
 public void automaticInThirtySeconds(Row seen,long version){if(timer==null)throw new IllegalStateException("NATIVE_TIMER_UNAVAILABLE");timer.arrange(seen,version,Math.addExact(time.wall().millis(),30000));}
 private void revokeTimer(){if(timer!=null)timer.invalidate();}
 public void immediate(Row seen,long planVersion){var p=store.arrangeImmediatePlan(seen.contact.id,seen.contact.revision,seen.task.contactRevision,planVersion,time.wall());revokeTimer();loop.execute(p.plan.version,Availability.IDLE);}
 public void execute(long planVersion){try{loop.execute(planVersion,Availability.IDLE);}finally{if(store.getPlan().paused)revokeTimer();}}
 public void pause(long planVersion){store.pausePlan(planVersion,time.wall());revokeTimer();}
 private void invalidateContactPlan(Row seen){var p=store.getPlan();if(!p.paused&&p.taskId.equals(seen.task.id)){store.pausePlan(p.version,time.wall());revokeTimer();}}
 public void qualify(Row seen,Qualification q){store.qualify(seen.contact.id,seen.contact.revision,q,SyntheticWorkspaceModel.CHANGE_SOURCE);invalidateContactPlan(seen);}
 public void refuse(Row seen){store.refuse(seen.contact.id,seen.contact.revision);invalidateContactPlan(seen);}
 public void refresh(Row seen){store.refreshDraft(seen.contact.id,seen.contact.revision,seen.task.contactRevision);}
 public void result(Snapshot seen,String result){if(seen==null)throw new IllegalStateException("NO_PENDING_ATTEMPT");store.reconcileSynthetic(seen.id,result,time.wall());}
 public void closeUnknown(Snapshot seen,boolean confirmed){if(seen==null)throw new IllegalStateException("NO_PENDING_ATTEMPT");store.closeSyntheticUnknown(seen.id,Availability.IDLE,confirmed,time.wall());}
 public boolean inWindow(){return SalesPlanModel.window(time.wall().millis());}
 public boolean clockReady(){return !time.bootId().isEmpty();}
 @Override public void close(){store.close();}
}
