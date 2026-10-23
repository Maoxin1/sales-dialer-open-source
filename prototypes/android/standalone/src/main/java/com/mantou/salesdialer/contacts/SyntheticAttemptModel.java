package com.mantou.salesdialer.contacts;
import java.util.*;
import com.mantou.salesdialer.contacts.ContactTaskModel.*;
import com.mantou.salesdialer.contacts.SalesPlanModel.Plan;
/** Synthetic-only immutable attempts; API receipt is never outgoing/connected evidence. */
public final class SyntheticAttemptModel {
 public enum Availability { IDLE, BUSY, UNKNOWN }
 public static final class Snapshot {
  public final String id,tenantId,salesId,taskId,targetKey,manualResult,state;
  public final long planVersion,contactRevision,claimedAt,dueAt,revision;
  public final boolean simulatedApiReceipt,unknownClosed,realCallsEnabled=false;
  public final Boolean outgoingConfirmed=null,connectedConfirmed=null;
  private Snapshot(String id,Actor a,Plan p,String key,long at,long revision,boolean api,String result,boolean closed){this.id=id;tenantId=a.tenantId;salesId=a.salesId;taskId=p.taskId;targetKey=key;planVersion=p.version;contactRevision=p.contactRevision;dueAt=p.dueAt;claimedAt=at;this.revision=revision;simulatedApiReceipt=api;manualResult=result;unknownClosed=closed;state=!closed&&(result.isEmpty()||result.equals("UNKNOWN"))?"UNKNOWN":"RECONCILED";}
 }
 public static Snapshot claim(Actor a,Plan p,Task t,Contact c,long expected,Availability availability,long now){
  String status=SalesPlanModel.status(a,p,t,c,expected,now);if(!status.equals("DUE_METADATA_ONLY"))throw new IllegalStateException(status);
  if(availability!=Availability.IDLE)throw new IllegalStateException(availability==Availability.BUSY?"DEVICE_BUSY":"DEVICE_STATE_UNKNOWN");return restore(a,p,c.targetKey,now);
 }
 private static void owned(Actor a,Snapshot s){if(a==null||!a.permissions.contains(Permission.PLAN)||s==null||!a.tenantId.equals(s.tenantId)||!a.salesId.equals(s.salesId))throw new IllegalStateException("FORBIDDEN");}
 public static Snapshot receipt(Actor a,Snapshot s){owned(a,s);return s.simulatedApiReceipt?s:copy(s,true,s.manualResult);}
 public static Snapshot reconcile(Actor a,Snapshot s,String result){owned(a,s);if(result==null||!Set.of("UNKNOWN","NO_ANSWER","COMPLETED").contains(result))throw new IllegalArgumentException("INVALID_RESULT");if(result.equals(s.manualResult))return s;if(s.state.equals("RECONCILED"))throw new IllegalStateException("RESULT_CONFLICT");return copy(s,s.simulatedApiReceipt,result);}
 public static Snapshot closeUnknown(Actor a,Snapshot s,Availability availability,boolean confirmedNoPending){owned(a,s);if(!s.manualResult.equals("UNKNOWN"))throw new IllegalStateException("UNKNOWN_RESULT_REQUIRED");if(s.unknownClosed)return s;if(availability!=Availability.IDLE)throw new IllegalStateException(availability==Availability.BUSY?"DEVICE_BUSY":"DEVICE_STATE_UNKNOWN");if(!confirmedNoPending)throw new IllegalStateException("NO_PENDING_CONFIRMATION_REQUIRED");return copy(s,s.simulatedApiReceipt,s.manualResult,true);}
 static Snapshot restore(Actor a,Plan p,String target,long at){
  if(p.paused||!a.tenantId.equals(p.tenantId)||!a.salesId.equals(p.salesId)||target==null||!target.matches("[a-f0-9]{64}")||at<p.dueAt||at-p.dueAt>30000||!SalesPlanModel.window(at))throw new IllegalStateException("INVALID_STORED_ATTEMPT");
  return new Snapshot("SIM-"+ContactTaskModel.nativeId("ATTEMPT",p.taskId+":"+p.version),a,p,target,at,1,false,"",false);
 }
 private static Snapshot copy(Snapshot s,boolean api,String result){return copy(s,api,result,s.unknownClosed);}
 private static Snapshot copy(Snapshot s,boolean api,String result,boolean closed){Actor a=new Actor(s.tenantId,s.salesId,EnumSet.allOf(Permission.class));Plan p=SalesPlanModel.restore(a,s.planVersion,s.taskId,s.contactRevision,s.dueAt,false);return new Snapshot(s.id,a,p,s.targetKey,s.claimedAt,Math.addExact(s.revision,1),api,result,closed);}
}
