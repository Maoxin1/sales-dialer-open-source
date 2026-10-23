package com.mantou.salesdialer.contacts;
import java.util.*;
import com.mantou.salesdialer.contacts.PhoneIntakeModel.DataClass;
/** Local metadata scope, never a production identity or telephone capability. */
public final class LocalDraftBinding {
 public static final class Snapshot {
  public final DataClass dataClass;public final String slot,targetId;public final long revision;
  private final ContactTaskModel.Actor actor;private final ContactTaskModel.Contact contact;
  private Snapshot(DataClass type,String slot,String target,long revision,ContactTaskModel.Actor actor,ContactTaskModel.Contact contact){this.dataClass=type;this.slot=slot;targetId=target;this.revision=revision;this.actor=actor;this.contact=contact;}
 }
 public static final class Draft {
  public final DataClass dataClass;public final String slot,targetId,id;public final long contactRevision;
  public final boolean productionAuthenticated=false,realCallsEnabled=false;
  private final ContactTaskModel.Task task;
  private Draft(Snapshot s,ContactTaskModel.Task t){dataClass=s.dataClass;slot=s.slot;targetId=s.targetId;id=t.id;contactRevision=t.contactRevision;task=t;}
 }
 public static Snapshot snapshot(DataClass type,String slot,String target,long revision,PhoneIntakeModel.Qualification q,boolean refused,String source){
  if(type==null||slot==null||!slot.matches("[a-f0-9]{32}")||target==null||!target.matches("LOCAL-TARGET-[a-f0-9]{32}")||revision<1||q==null||source==null||source.length()>200||PhoneIntakeModel.trim(source).isEmpty())throw new IllegalArgumentException("INVALID_LOCAL_SNAPSHOT");
  var actor=actor(type,slot);
  String key=ContactTaskModel.nativeId("TARGET",target).substring(7).toLowerCase(Locale.ROOT);
  var base=ContactTaskModel.admit(actor,new ContactTaskModel.Input(ContactTaskModel.Origin.CONTACT_INTAKE,key,ContactTaskModel.Qualification.valueOf(q.name()),source),List.of()).contact;
  var contact=ContactTaskModel.restoreContact(base.id,actor.tenantId,actor.salesId,key,"CONTACT_INTAKE",base.qualification,source,refused,revision);
  return new Snapshot(type,slot,target,revision,actor,contact);
 }
 public static Draft create(Snapshot s){if(s==null)throw new IllegalArgumentException("INVALID_LOCAL_SNAPSHOT");var task=ContactTaskModel.draft(s.actor,s.contact);String status=ContactTaskModel.planningStatus(s.actor,task,s.contact);if(!status.equals("ELIGIBLE_FOR_PLANNING"))throw new IllegalStateException(status);return new Draft(s,task);}
 private static boolean matches(Snapshot s,Draft d){return s!=null&&d!=null&&s.dataClass==d.dataClass&&s.slot.equals(d.slot)&&s.targetId.equals(d.targetId);}
 public static String status(Snapshot s,Draft d){return matches(s,d)?ContactTaskModel.planningStatus(s.actor,d.task,s.contact):"FORBIDDEN";}
 public static Draft refresh(Snapshot s,Draft d,long expectedContact,long expectedDraft){if(!matches(s,d))throw new IllegalStateException("FORBIDDEN");return new Draft(s,ContactTaskModel.refreshDraft(s.actor,d.task,s.contact,expectedContact,expectedDraft));}
 static Draft restore(Snapshot s,String id,long revision){return new Draft(s,ContactTaskModel.restoreTask(id,s.contact,s.actor.tenantId,s.actor.salesId,s.contact.targetKey,revision,"DRAFT"));}
 static ContactTaskModel.Actor actor(DataClass type,String slot){if(type==null||slot==null||!slot.matches("[a-f0-9]{32}"))throw new IllegalArgumentException("INVALID_LOCAL_SNAPSHOT");return new ContactTaskModel.Actor("LOCAL-"+type.name()+"-"+slot,"UNAUTHENTICATED-LOCAL-SALES",Set.of(ContactTaskModel.Permission.IMPORT,ContactTaskModel.Permission.PLAN));}
 static ContactTaskModel.Contact contact(Snapshot s){return s.contact;}
 static ContactTaskModel.Task task(Draft d){return d.task;}
}
