package com.mantou.salesdialer.contacts;
import java.util.*;import java.time.*;
import com.mantou.salesdialer.contacts.ContactTaskModel.*;import com.mantou.salesdialer.contacts.SalesPlanModel.Plan;import com.mantou.salesdialer.contacts.SyntheticAttemptModel.*;
public final class SyntheticAttemptCheck {
 static int checks;static void eq(Object a,Object b){checks++;if(!Objects.equals(a,b))throw new AssertionError(a+" != "+b);}static void fail(Runnable r,String reason){checks++;try{r.run();}catch(Exception e){if(!reason.equals(e.getMessage()))throw new AssertionError(e);return;}throw new AssertionError("expected "+reason);}
 public static void main(String[] args){
  Actor a=new Actor("TENANT-FIXTURE","SALES-FIXTURE",EnumSet.allOf(Permission.class));Admission i=ContactTaskModel.admit(a,new Input(Origin.CONTACT_INTAKE,"a".repeat(64),Qualification.CONFIRMED,"SYNTHETIC"),List.of());long due=Instant.parse("2026-10-19T01:00:00Z").toEpochMilli();Plan p=SalesPlanModel.arrange(a,SalesPlanModel.initial(a),i.task,i.contact,0,1,1,due,due-1);
  Snapshot s=SyntheticAttemptModel.claim(a,p,i.task,i.contact,1,Availability.IDLE,due);eq(s.state,"UNKNOWN");eq(s.revision,1L);eq(s.simulatedApiReceipt,false);eq(s.realCallsEnabled,false);eq(s.outgoingConfirmed,null);eq(s.connectedConfirmed,null);eq(s.id,SyntheticAttemptModel.claim(a,p,i.task,i.contact,1,Availability.IDLE,due).id);
  fail(()->SyntheticAttemptModel.claim(a,p,i.task,i.contact,1,Availability.BUSY,due),"DEVICE_BUSY");fail(()->SyntheticAttemptModel.claim(a,p,i.task,i.contact,1,Availability.UNKNOWN,due),"DEVICE_STATE_UNKNOWN");fail(()->SyntheticAttemptModel.claim(a,p,i.task,i.contact,1,Availability.IDLE,due+30001),"EXPIRED");
  System.out.println("T612 synthetic claim remains UNKNOWN with stable identity and device/time guards passed");
  Snapshot api=SyntheticAttemptModel.receipt(a,s);eq(api.state,"UNKNOWN");eq(api.simulatedApiReceipt,true);eq(api.revision,2L);eq(SyntheticAttemptModel.receipt(a,api),api);eq(api.connectedConfirmed,null);
  Snapshot unknown=SyntheticAttemptModel.reconcile(a,api,"UNKNOWN");eq(unknown.state,"UNKNOWN");eq(SyntheticAttemptModel.reconcile(a,unknown,"UNKNOWN"),unknown);Snapshot result=SyntheticAttemptModel.reconcile(a,unknown,"NO_ANSWER");eq(result.state,"RECONCILED");eq(result.manualResult,"NO_ANSWER");eq(SyntheticAttemptModel.reconcile(a,result,"NO_ANSWER"),result);fail(()->SyntheticAttemptModel.reconcile(a,result,"COMPLETED"),"RESULT_CONFLICT");
  Snapshot late=SyntheticAttemptModel.receipt(a,SyntheticAttemptModel.reconcile(a,s,"COMPLETED"));eq(late.state,"RECONCILED");eq(late.simulatedApiReceipt,true);eq(late.connectedConfirmed,null);
  System.out.println("T613 receipt and manual result are independent, UNKNOWN retains occupation and updates are idempotent passed");
  Actor other=new Actor(a.tenantId,"OTHER",EnumSet.allOf(Permission.class));fail(()->SyntheticAttemptModel.receipt(other,s),"FORBIDDEN");Actor limited=new Actor(a.tenantId,a.salesId,Set.of(Permission.READ));fail(()->SyntheticAttemptModel.reconcile(limited,s,"NO_ANSWER"),"FORBIDDEN");fail(()->SyntheticAttemptModel.reconcile(a,s,"BAD"),"INVALID_RESULT");
  System.out.println("T614 attempt owner/capability and result enum are enforced passed");
  fail(()->SyntheticAttemptModel.closeUnknown(a,unknown,Availability.BUSY,true),"DEVICE_BUSY");fail(()->SyntheticAttemptModel.closeUnknown(a,unknown,Availability.UNKNOWN,true),"DEVICE_STATE_UNKNOWN");fail(()->SyntheticAttemptModel.closeUnknown(a,unknown,Availability.IDLE,false),"NO_PENDING_CONFIRMATION_REQUIRED");
  Snapshot closed=SyntheticAttemptModel.closeUnknown(a,unknown,Availability.IDLE,true);eq(closed.state,"RECONCILED");eq(closed.manualResult,"UNKNOWN");eq(closed.unknownClosed,true);eq(closed.connectedConfirmed,null);eq(SyntheticAttemptModel.closeUnknown(a,closed,Availability.IDLE,true),closed);fail(()->SyntheticAttemptModel.reconcile(a,closed,"NO_ANSWER"),"RESULT_CONFLICT");
  System.out.println("T625 explicit no-active/no-pending closure releases occupation while preserving unknown outcome passed");System.out.println("PASS: "+checks+" assertions; 4 synthetic-attempt scenarios; no telephone");
 }
}
