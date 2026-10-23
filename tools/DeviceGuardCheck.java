import com.mantou.salesdialer.spike.DeviceGuardRules;
public final class DeviceGuardCheck {
 public static void main(String[] args){
  Object[][] rows={{true,true,true,false,1,true,"READY"},{false,true,true,false,1,true,"PERMISSION_REQUIRED"},{true,false,true,false,1,true,"PERMISSION_REQUIRED"},{true,true,false,false,1,true,"PERMISSION_REQUIRED"},{true,true,true,null,1,true,"CALL_STATE_UNKNOWN"},{true,true,true,true,1,true,"CALL_BUSY"},{true,true,true,false,0,true,"ACCOUNT_UNAVAILABLE"},{true,true,true,false,2,true,"ACCOUNT_UNAVAILABLE"},{true,true,true,false,1,false,"ACCOUNT_UNAVAILABLE"}};
  for(Object[] r:rows){String actual=DeviceGuardRules.check((Boolean)r[0],(Boolean)r[1],(Boolean)r[2],(Boolean)r[3],(Integer)r[4],(Boolean)r[5]);if(!actual.equals(r[6]))throw new AssertionError("expected="+r[6]+" actual="+actual);}
  System.out.println("T-CALL-190: 9 native rule cases passed; no phone API");
 }
}
