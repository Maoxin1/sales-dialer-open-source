package com.mantou.salesdialer.contacts;
import java.util.*;import java.time.*;
import com.mantou.salesdialer.contacts.ContactTaskModel.*;import com.mantou.salesdialer.contacts.SalesPlanModel.*;
public final class SalesPlanCheck {
 static int checks;static long at(String s){return Instant.parse(s).toEpochMilli();}
 static void eq(Object a,Object b){checks++;if(!Objects.equals(a,b))throw new AssertionError(a+" != "+b);}
 static void fail(Runnable r,String reason){checks++;try{r.run();}catch(Exception e){if(!reason.equals(e.getMessage()))throw new AssertionError(e);return;}throw new AssertionError("expected "+reason);}
 public static void main(String[] args){
  Actor a=new Actor("TENANT-FIXTURE","SALES-FIXTURE",EnumSet.allOf(Permission.class));Admission i=ContactTaskModel.admit(a,new Input(Origin.CONTACT_INTAKE,"a".repeat(64),Qualification.CONFIRMED,"SYNTHETIC"),List.of());Contact c=i.contact;Task t=i.task;
  long due=at("2026-10-19T01:00:00Z"),now=due-60000;Plan initial=SalesPlanModel.initial(a);
  Plan p=SalesPlanModel.arrange(a,initial,t,c,0,1,1,due,now);eq(p.version,1L);eq(p.paused,false);eq(p.taskId,t.id);eq(p.contactRevision,1L);
  eq(SalesPlanModel.status(a,p,t,c,1,due-1),"NOT_DUE");eq(SalesPlanModel.status(a,p,t,c,1,due),"DUE_METADATA_ONLY");eq(SalesPlanModel.status(a,p,t,c,1,due+30000),"DUE_METADATA_ONLY");eq(SalesPlanModel.status(a,p,t,c,1,due+30001),"EXPIRED");
  System.out.println("T601 explicit future plan, injected time and inclusive 30 second window passed");
  Plan replaced=SalesPlanModel.arrange(a,p,t,c,1,1,1,due+60000,now);eq(replaced.version,2L);eq(SalesPlanModel.status(a,replaced,t,c,1,due),"STALE_PLAN");Plan paused=SalesPlanModel.stop(a,replaced,2);eq(paused.version,3L);eq(paused.paused,true);eq(paused.taskId,"");eq(SalesPlanModel.stop(a,paused,3),paused);eq(SalesPlanModel.status(a,paused,null,null,3,due),"PAUSED");
  fail(()->SalesPlanModel.arrange(a,paused,t,c,2,1,1,due,now),"STALE_PLAN");eq(SalesPlanModel.arrange(a,paused,t,c,3,1,1,due,now).version,4L);
  System.out.println("T602 replace invalidates old version; pause is scoped, durable-state ready and needs explicit replan passed");
  fail(()->SalesPlanModel.arrange(a,initial,t,c,0,1,1,due, due+1),"PAST_DUE");
  for(String s:List.of("2026-10-17T01:00:00Z","2026-10-19T00:59:59Z","2026-10-19T10:00:00Z"))fail(()->SalesPlanModel.arrange(a,initial,t,c,0,1,1,at(s),at(s)-60000),"OUTSIDE_WINDOW");
  long closing=at("2026-10-19T09:59:50Z");Plan close=SalesPlanModel.arrange(a,initial,t,c,0,1,1,closing,closing-60000);eq(SalesPlanModel.status(a,close,t,c,1,closing+10000),"OUTSIDE_WINDOW");
  System.out.println("T603 Beijing weekday 09 inclusive / 18 exclusive and no late scheduling passed");
  Contact changed=ContactTaskModel.qualify(a,c,1,Qualification.CONFIRMED,"SYNTHETIC-NEW");eq(SalesPlanModel.status(a,p,t,changed,1,due),"STALE_CONTACT");
  fail(()->SalesPlanModel.arrange(a,initial,t,changed,0,2,1,due,now),"STALE_CONTACT");
  fail(()->SalesPlanModel.arrange(a,initial,t,c,0,2,1,due,now),"STALE_CONTACT");fail(()->SalesPlanModel.arrange(a,initial,t,c,0,1,2,due,now),"STALE_DRAFT");
  Contact refused=ContactTaskModel.refuse(a,c,1);Task refusedDraft=ContactTaskModel.draft(a,refused);fail(()->SalesPlanModel.arrange(a,initial,refusedDraft,refused,0,2,2,due,now),"DO_NOT_CONTACT");
  Contact unknown=ContactTaskModel.qualify(a,c,1,Qualification.UNKNOWN,"SYNTHETIC");fail(()->SalesPlanModel.arrange(a,initial,ContactTaskModel.draft(a,unknown),unknown,0,2,2,due,now),"CONTACT_NOT_QUALIFIED");
  Actor other=new Actor(a.tenantId,"OTHER",EnumSet.allOf(Permission.class));fail(()->SalesPlanModel.arrange(other,initial,t,c,0,1,1,due,now),"FORBIDDEN");Actor limited=new Actor(a.tenantId,a.salesId,Set.of(Permission.READ));fail(()->SalesPlanModel.stop(limited,p,1),"FORBIDDEN");
  System.out.println("T604 latest qualification, double revisions and trusted actor ownership stop stale plans passed");
  System.out.println("PASS: "+checks+" assertions; 4 sales-plan scenarios; no execution or phone");
 }
}
