import com.mantou.salesdialer.contacts.ContactTaskModel;
import com.mantou.salesdialer.contacts.ContactTaskModel.*;
import java.util.*;
public final class ContactTaskModelCheck {
 static int checks;
 static void eq(Object a,Object b){checks++;if(!Objects.equals(a,b))throw new AssertionError(a+" != "+b);}
 static void fail(Runnable action,String reason){checks++;try{action.run();}catch(Exception e){if(!reason.equals(e.getMessage()))throw new AssertionError(e);return;}throw new AssertionError("expected "+reason);}
 static Actor actor(String tenant,String sales){return new Actor(tenant,sales,EnumSet.allOf(Permission.class));}
 static Input input(Qualification q){return new Input(Origin.CONTACT_INTAKE,"a".repeat(64),q,"SYNTHETIC-FIXTURE");}
 public static void main(String[] args){
  Actor a=actor("TENANT-A","SALES-A");Admission first=ContactTaskModel.admit(a,input(Qualification.CONFIRMED),List.of());eq(first.status,"IMPORTED");
  eq(first.task.state,"DRAFT");eq(first.contact.revision,1L);eq(ContactTaskModel.planningStatus(a,first.task,first.contact),"ELIGIBLE_FOR_PLANNING");eq(first.realCallsEnabled,false);eq(first.productionAuthenticated,false);
  Admission repeat=ContactTaskModel.admit(a,input(Qualification.CONFIRMED),List.of());eq(repeat.contact.id,first.contact.id);eq(repeat.task.id,first.task.id);
  System.out.println("T574 stable scoped contact and initial draft identity, without dialing authorization passed");
  Contact refused=ContactTaskModel.refuse(a,first.contact,1);Admission duplicate=ContactTaskModel.admit(a,input(Qualification.CONFIRMED),List.of(refused));eq(duplicate.status,"DUPLICATE");eq(duplicate.contact,refused);eq(duplicate.contact.refused,true);eq(duplicate.contact.revision,2L);eq(ContactTaskModel.planningStatus(a,duplicate.task,duplicate.contact),"DO_NOT_CONTACT");
  System.out.println("T575 reimport preserves refusal, source and qualification revision passed");
  Actor colleague=actor("TENANT-A","SALES-B");Admission conflict=ContactTaskModel.admit(colleague,input(Qualification.CONFIRMED),List.of(first.contact));eq(conflict.status,"CONFLICT");eq(conflict.contact,null);eq(conflict.task,null);eq(ContactTaskModel.planningStatus(colleague,first.task,first.contact),"FORBIDDEN");
  Admission tenant=ContactTaskModel.admit(actor("TENANT-B","SALES-A"),input(Qualification.CONFIRMED),List.of(first.contact));eq(tenant.status,"IMPORTED");eq(tenant.contact.id.equals(first.contact.id),false);eq(ContactTaskModel.planningStatus(actor("TENANT-B","SALES-A"),first.task,first.contact),"FORBIDDEN");
  fail(()->ContactTaskModel.admit(new Actor("TENANT-A","SALES-A",Set.of(Permission.READ)),input(Qualification.CONFIRMED),List.of()),"FORBIDDEN");
  System.out.println("T576 own-sales permissions, tenant separation and conflict without target disclosure passed");
  Contact unknown=ContactTaskModel.qualify(a,first.contact,1,Qualification.UNKNOWN,"SYNTHETIC-WITHDRAWAL");eq(unknown.revision,2L);eq(ContactTaskModel.planningStatus(a,first.task,unknown),"STALE_CONTACT");Task refreshed=ContactTaskModel.draft(a,unknown);eq(refreshed.id,first.task.id);eq(ContactTaskModel.planningStatus(a,refreshed,unknown),"CONTACT_NOT_QUALIFIED");Contact withdrawn=ContactTaskModel.qualify(a,unknown,2,Qualification.WITHDRAWN,"SYNTHETIC-WITHDRAWAL");eq(ContactTaskModel.planningStatus(a,ContactTaskModel.draft(a,withdrawn),withdrawn),"CONTACT_NOT_QUALIFIED");
  fail(()->ContactTaskModel.qualify(a,refused,2,Qualification.CONFIRMED,"SYNTHETIC-REIMPORT"),"DO_NOT_CONTACT");fail(()->ContactTaskModel.refuse(a,unknown,1),"STALE_CONTACT");
  System.out.println("T577 qualification changes invalidate prior task revision; refusal remains sticky passed");
  for(Origin source:List.of(Origin.DEMO,Origin.SIMULATED_RECEIPT))fail(()->ContactTaskModel.admit(a,new Input(source,"a".repeat(64),Qualification.CONFIRMED,"SYNTHETIC"),List.of()),"SOURCE_MISMATCH");
  fail(()->ContactTaskModel.admit(a,new Input(Origin.CONTACT_INTAKE,"DEMO-001",Qualification.CONFIRMED,"SYNTHETIC"),List.of()),"INVALID_INPUT");fail(()->ContactTaskModel.admit(a,new Input(Origin.CONTACT_INTAKE,"a".repeat(64),Qualification.CONFIRMED,""),List.of()),"INVALID_INPUT");
  fail(()->ContactTaskModel.admit(a,input(Qualification.CONFIRMED),List.of(first.contact,first.contact)),"INCONSISTENT_CATALOG");
  System.out.println("T578 demo/receipt input, invalid target/source and inconsistent snapshots fail closed passed");
  eq(ContactTaskModel.nativeId("TARGET","TARGET-fixture-001"),"TARGET-57A1A49B507760B7D2D764A13466002CAA8881FD3C5050F811649F6720EBC24B");
  fail(()->new Actor("\uD800","SALES-A",Set.of()),"INVALID_IDENTITY");fail(()->ContactTaskModel.nativeId("unknown","TARGET-fixture-001"),"INVALID_NATIVE_KIND");
  System.out.println("T579 native ID encoding matches independently generated host vector passed");
  System.out.println("PASS: "+checks+" assertions; 6 contact-model scenarios; no storage or phone adapter");
 }
}
