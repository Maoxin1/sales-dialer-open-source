package com.mantou.salesdialer.contacts;
import java.time.*;
import com.mantou.salesdialer.contacts.ContactTaskModel.*;
/** Scheduling metadata only. Never a claim, attempt, phone permit or execution token. */
public final class SalesPlanModel {
 public static final class Plan {
  public final String tenantId,salesId,taskId;public final long version,contactRevision,dueAt;public final boolean paused;
  private Plan(Actor a,long version,String task,long revision,long due,boolean paused){tenantId=a.tenantId;salesId=a.salesId;this.version=version;taskId=task;contactRevision=revision;dueAt=due;this.paused=paused;}
 }
 public static Plan initial(Actor a){return new Plan(a,0,"",0,0,true);}
 private static void owned(Actor a,Plan p){if(a==null||!a.permissions.contains(Permission.PLAN)||p==null||!a.tenantId.equals(p.tenantId)||!a.salesId.equals(p.salesId))throw new IllegalStateException("FORBIDDEN");}
 private static void version(Plan p,long expected){if(expected<0||p.version!=expected)throw new IllegalStateException("STALE_PLAN");}
 static void time(long at){if(at<=0||at>253402300799999L)throw new IllegalArgumentException("INVALID_TIME");}
 public static Plan arrange(Actor a,Plan p,Task t,Contact c,long expectedPlan,long expectedContact,long expectedDraft,long due,long now){
  owned(a,p);version(p,expectedPlan);String eligible=ContactTaskModel.planningStatus(a,t,c);
  if(!"ELIGIBLE_FOR_PLANNING".equals(eligible))throw new IllegalStateException(eligible);
  if(expectedContact!=c.revision)throw new IllegalStateException("STALE_CONTACT");if(expectedDraft!=t.contactRevision)throw new IllegalStateException("STALE_DRAFT");
  time(now);time(due);if(due<now)throw new IllegalStateException("PAST_DUE");if(!window(due))throw new IllegalStateException("OUTSIDE_WINDOW");
  return new Plan(a,Math.addExact(p.version,1),t.id,c.revision,due,false);
 }
 public static Plan stop(Actor a,Plan p,long expected){owned(a,p);version(p,expected);return p.paused?p:new Plan(a,Math.addExact(p.version,1),"",0,0,true);}
 public static String status(Actor a,Plan p,Task t,Contact c,long expected,long now){
  owned(a,p);if(p.version!=expected)return "STALE_PLAN";if(p.paused)return "PAUSED";time(now);
  String eligible=ContactTaskModel.planningStatus(a,t,c);if(!"ELIGIBLE_FOR_PLANNING".equals(eligible))return eligible;
  if(!p.taskId.equals(t.id)||p.contactRevision!=c.revision)return "STALE_CONTACT";
  if(now<p.dueAt)return "NOT_DUE";if(now-p.dueAt>30000)return "EXPIRED";if(!window(now))return "OUTSIDE_WINDOW";
  return "DUE_METADATA_ONLY";
 }
 static Plan restore(Actor a,long version,String task,long revision,long due,boolean paused){
  if(version<1||task==null||(paused?(!task.isEmpty()||revision!=0||due!=0):(task.isEmpty()||revision<1||due<=0)))throw new IllegalStateException("INVALID_STORED_PLAN");
  if(!paused){time(due);if(!window(due))throw new IllegalStateException("INVALID_STORED_PLAN");}return new Plan(a,version,task,revision,due,paused);
 }
 static boolean window(long at){ZonedDateTime z=Instant.ofEpochMilli(at).atZone(ZoneOffset.ofHours(8));return z.getDayOfWeek().getValue()<=5&&z.getHour()>=9&&z.getHour()<18;}
}
