package com.mantou.salesdialer.contacts;
import java.util.*;
import com.mantou.salesdialer.contacts.ContactTaskModel.*;
public final class ContactDraftRefreshCheck {
 static int checks;
 static void eq(Object a,Object b){checks++;if(!Objects.equals(a,b))throw new AssertionError(a+" != "+b);}
 static void fail(Runnable r,String reason){checks++;try{r.run();}catch(Exception e){if(!reason.equals(e.getMessage()))throw new AssertionError(e);return;}throw new AssertionError("expected "+reason);}
 public static void main(String[] args){
  Actor a=new Actor("TENANT-FIXTURE","SALES-FIXTURE",EnumSet.allOf(Permission.class));
  Admission first=ContactTaskModel.admit(a,new Input(Origin.CONTACT_INTAKE,"a".repeat(64),Qualification.CONFIRMED,"SYNTHETIC"),List.of());Contact initial=first.contact;Task old=first.task;
  Contact latest=ContactTaskModel.qualify(a,initial,1,Qualification.CONFIRMED,"SYNTHETIC-UPDATED");
  Task refreshed=ContactTaskModel.refreshDraft(a,old,latest,2,1);
  eq(refreshed.id,old.id);eq(refreshed.contactRevision,2L);eq(old.contactRevision,1L);eq(refreshed.state,"DRAFT");eq(ContactTaskModel.planningStatus(a,refreshed,latest),"ELIGIBLE_FOR_PLANNING");
  eq(ContactTaskModel.refreshDraft(a,refreshed,latest,2,1),refreshed);eq(ContactTaskModel.refreshDraft(a,refreshed,latest,2,2),refreshed);
  System.out.println("T591 explicit draft refresh keeps identity, is immutable and idempotent passed");
  fail(()->ContactTaskModel.refreshDraft(a,old,latest,1,1),"STALE_CONTACT");
  fail(()->ContactTaskModel.refreshDraft(a,old,latest,2,2),"STALE_DRAFT");
  fail(()->ContactTaskModel.refreshDraft(a,refreshed,latest,2,3),"STALE_DRAFT");
  fail(()->ContactTaskModel.refreshDraft(a,old,latest,2,0),"INVALID_REVISION");
  Actor other=new Actor(a.tenantId,"OTHER",EnumSet.allOf(Permission.class));fail(()->ContactTaskModel.refreshDraft(other,old,latest,2,1),"FORBIDDEN");
  Actor limited=new Actor(a.tenantId,a.salesId,Set.of(Permission.READ));fail(()->ContactTaskModel.refreshDraft(limited,old,latest,2,1),"FORBIDDEN");
  System.out.println("T592 revision conflicts, ownership and PLAN capability fail closed passed");
  Contact unknown=ContactTaskModel.qualify(a,initial,1,Qualification.UNKNOWN,"SYNTHETIC");Contact withdrawn=ContactTaskModel.qualify(a,initial,1,Qualification.WITHDRAWN,"SYNTHETIC");Contact refused=ContactTaskModel.refuse(a,initial,1);
  fail(()->ContactTaskModel.refreshDraft(a,old,unknown,2,1),"CONTACT_NOT_QUALIFIED");fail(()->ContactTaskModel.refreshDraft(a,old,withdrawn,2,1),"CONTACT_NOT_QUALIFIED");fail(()->ContactTaskModel.refreshDraft(a,old,refused,2,1),"DO_NOT_CONTACT");
  eq(ContactTaskModel.planningStatus(a,refreshed,ContactTaskModel.refuse(a,latest,2)),"STALE_CONTACT");
  System.out.println("T593 latest qualification/refusal blocks refresh and later change invalidates it passed");
  System.out.println("PASS: "+checks+" assertions; 3 draft-refresh scenarios; no phone or plan");
 }
}
