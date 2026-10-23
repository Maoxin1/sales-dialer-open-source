package com.mantou.salesdialer.contacts;
import java.util.*;
import com.mantou.salesdialer.contacts.ContactTaskModel.*;
public final class ContactTaskRestoreCheck {
 static int checks;
 static void eq(Object a,Object b){checks++;if(!Objects.equals(a,b))throw new AssertionError(a+" != "+b);}
 static void fail(Runnable r,String reason){checks++;try{r.run();}catch(Exception e){if(!reason.equals(e.getMessage()))throw new AssertionError(e);return;}throw new AssertionError("expected "+reason);}
 public static void main(String[] args){
  Actor actor=new Actor("TENANT-FIXTURE","SALES-FIXTURE",EnumSet.allOf(Permission.class));Admission imported=ContactTaskModel.admit(actor,new Input(Origin.CONTACT_INTAKE,"a".repeat(64),Qualification.CONFIRMED,"SYNTHETIC"),List.of());Contact c=imported.contact;
  Contact restored=ContactTaskModel.restoreContact(c.id,c.tenantId,c.salesId,c.targetKey,"CONTACT_INTAKE",c.qualification,c.declarationSource,false,1);eq(restored.id,c.id);eq(restored.revision,1L);
  fail(()->ContactTaskModel.restoreContact("CONTACT-BAD",c.tenantId,c.salesId,c.targetKey,"CONTACT_INTAKE",c.qualification,c.declarationSource,false,1),"INVALID_STORED_CONTACT");
  fail(()->ContactTaskModel.restoreContact(c.id,c.tenantId,c.salesId,c.targetKey,"DEMO",c.qualification,c.declarationSource,false,1),"INVALID_STORED_CONTACT");
  fail(()->ContactTaskModel.restoreContact(c.id,c.tenantId,c.salesId,c.targetKey,"CONTACT_INTAKE",c.qualification,"",false,1),"INVALID_STORED_CONTACT");
  fail(()->ContactTaskModel.restoreContact(c.id,c.tenantId,c.salesId,c.targetKey,"CONTACT_INTAKE",c.qualification,c.declarationSource,false,0),"INVALID_STORED_CONTACT");
  System.out.println("T581 canonical contact restore rejects source, identity and revision corruption passed");
  Contact latest=ContactTaskModel.refuse(actor,c,1);Task t=ContactTaskModel.restoreTask(imported.task.id,latest,c.tenantId,c.salesId,c.targetKey,1,"DRAFT");eq(t.contactRevision,1L);eq(ContactTaskModel.planningStatus(actor,t,latest),"STALE_CONTACT");
  fail(()->ContactTaskModel.restoreTask(imported.task.id,latest,c.tenantId,"OTHER",c.targetKey,1,"DRAFT"),"INVALID_STORED_TASK");
  fail(()->ContactTaskModel.restoreTask(imported.task.id,latest,c.tenantId,c.salesId,c.targetKey,3,"DRAFT"),"INVALID_STORED_TASK");
  fail(()->ContactTaskModel.restoreTask(imported.task.id,latest,c.tenantId,c.salesId,c.targetKey,1,"READY"),"INVALID_STORED_TASK");
  System.out.println("T582 task restore retains stale snapshot and rejects forged scope/future revision passed");
  System.out.println("PASS: "+checks+" assertions; 2 restore scenarios; no database or phone");
 }
}
