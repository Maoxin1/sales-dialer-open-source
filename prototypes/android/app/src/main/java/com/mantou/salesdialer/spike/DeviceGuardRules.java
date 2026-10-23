package com.mantou.salesdialer.spike;
/** Pure rule shared by Android guard and JVM regression. */
public final class DeviceGuardRules {
 public static String check(boolean call,boolean state,boolean numbers,Boolean inCall,int matches,boolean enabled){
  if(!call||!state||!numbers)return "PERMISSION_REQUIRED";
  if(inCall==null)return "CALL_STATE_UNKNOWN";
  if(inCall)return "CALL_BUSY";
  if(matches!=1||!enabled)return "ACCOUNT_UNAVAILABLE";
  return "READY";
 }
}
