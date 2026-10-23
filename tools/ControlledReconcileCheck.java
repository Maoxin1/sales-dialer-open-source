import com.mantou.salesdialer.spike.ControlledReconcileRules;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
public class ControlledReconcileCheck {
 static int checks=0;
 static void eq(Object a,Object b){checks++;if(!b.equals(a))throw new AssertionError("expected="+b+" actual="+a);}
 static String digest(String s)throws Exception{StringBuilder b=new StringBuilder();for(byte v:MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)))b.append(String.format("%02x",v&255));return b.toString();}
 public static void main(String[] args)throws Exception{
  String d="a".repeat(64),token="b".repeat(64),h=digest(token),i="c".repeat(64);
  eq(ControlledReconcileRules.allowed(d,d,h,token,i,i,true,false),true);
  eq(ControlledReconcileRules.allowed(d,"d".repeat(64),h,token,i,i,true,false),false);
  eq(ControlledReconcileRules.allowed(d,d,h,"e".repeat(64),i,i,true,false),false);
  eq(ControlledReconcileRules.allowed(d,d,h,token,i,"f".repeat(64),true,false),false);
  eq(ControlledReconcileRules.allowed(d,d,h,token,i,i,false,false),false);
  eq(ControlledReconcileRules.allowed(d,d,h,token,i,i,true,true),false);
  eq(ControlledReconcileRules.allowed(d,d,h,token,i,i,true,null),false);
  eq(ControlledReconcileRules.allowed(d,d,null,token,i,i,true,false),false);
  eq(ControlledReconcileRules.allowed(d,d,h,null,i,i,true,false),false);
  eq(ControlledReconcileRules.allowed("bad","bad",h,token,i,i,true,false),false);
  for(String s:new String[]{"API_SUBMITTED","RECONCILE_REQUIRED"})eq(ControlledReconcileRules.completionState("RECONCILED",s),"RECONCILED");
  eq(ControlledReconcileRules.completionState("HANDOFF_UNKNOWN","API_SUBMITTED"),"API_SUBMITTED");
  System.out.println("Controlled reconciliation assertions="+checks+"; realPhoneCalls=0");
 }
}
