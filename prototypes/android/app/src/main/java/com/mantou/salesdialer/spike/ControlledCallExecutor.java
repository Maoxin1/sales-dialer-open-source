package com.mantou.salesdialer.spike;
public final class ControlledCallExecutor {
 public interface Guard { void verify() throws Exception; }
 public interface Ledger { String claim(String request,String digest) throws Exception; void complete(String request,String status) throws Exception; }
 public interface Phone { void submit() throws Exception; }
 public static String execute(String request,String digest,Guard guard,Ledger ledger,Phone phone){
  try{guard.verify();String claim=ledger.claim(request,digest);if(!"NEW".equals(claim))return claim;}
  catch(Exception e){return "REJECTED";}
  try{guard.verify();phone.submit();ledger.complete(request,"API_SUBMITTED");return "API_SUBMITTED";}
  catch(Exception e){try{ledger.complete(request,"RECONCILE_REQUIRED");}catch(Exception ignored){}return "RECONCILE_REQUIRED";}
 }
}
