import com.mantou.salesdialer.spike.ControlledCallExecutor;
import java.util.HashMap;
public final class ControlledCallCheck {
 static int checks=0;
 static void eq(Object actual,Object expected){checks++;if(!expected.equals(actual))throw new AssertionError("expected="+expected+" actual="+actual);}
 static final class Store implements ControlledCallExecutor.Ledger {
  final HashMap<String,String> hashes=new HashMap<>(),states=new HashMap<>();int used=0;boolean failClaim=false,failComplete=false;
  public synchronized String claim(String request,String digest)throws Exception {
   if(failClaim)throw new Exception("STORE_FAILURE");
   if(hashes.containsKey(request))return hashes.get(request).equals(digest)?"DUPLICATE:"+states.get(request):"REQUEST_CONFLICT";
   if(used>=1)return "PERMIT_EXHAUSTED";hashes.put(request,digest);states.put(request,"HANDOFF_UNKNOWN");used++;return "NEW";
  }
  public void complete(String request,String status)throws Exception{if(failComplete)throw new Exception("WRITE_FAILURE");states.put(request,status);}
 }
 public static void main(String[] args){
  Store s=new Store();int[] calls={0};String r=ControlledCallExecutor.execute("A","hash",()->{},s,()->{eq(s.states.get("A"),"HANDOFF_UNKNOWN");eq(s.used,1);calls[0]++;});eq(r,"API_SUBMITTED");eq(calls[0],1);
  eq(ControlledCallExecutor.execute("A","hash",()->{},s,()->calls[0]++),"DUPLICATE:API_SUBMITTED");eq(calls[0],1);
  eq(ControlledCallExecutor.execute("A","other",()->{},s,()->calls[0]++),"REQUEST_CONFLICT");eq(calls[0],1);
  eq(ControlledCallExecutor.execute("B","hash",()->{},s,()->calls[0]++),"PERMIT_EXHAUSTED");
  Store blocked=new Store();eq(ControlledCallExecutor.execute("A","hash",()->{throw new Exception("DISABLED");},blocked,()->calls[0]++),"REJECTED");eq(blocked.used,0);
  Store failed=new Store();failed.failClaim=true;eq(ControlledCallExecutor.execute("A","hash",()->{},failed,()->calls[0]++),"REJECTED");eq(calls[0],1);
  Store lost=new Store();eq(ControlledCallExecutor.execute("A","hash",()->{},lost,()->{throw new Exception("MAY_HAVE_SUBMITTED");}),"RECONCILE_REQUIRED");eq(lost.used,1);
  eq(ControlledCallExecutor.execute("A","hash",()->{},lost,()->calls[0]++),"DUPLICATE:RECONCILE_REQUIRED");eq(calls[0],1);
  Store late=new Store();int[] guards={0};eq(ControlledCallExecutor.execute("A","hash",()->{if(++guards[0]==2)throw new Exception("REVOKED");},late,()->calls[0]++),"RECONCILE_REQUIRED");eq(calls[0],1);eq(late.used,1);
  Store disk=new Store();disk.failComplete=true;eq(ControlledCallExecutor.execute("A","hash",()->{},disk,()->calls[0]++),"RECONCILE_REQUIRED");eq(disk.states.get("A"),"HANDOFF_UNKNOWN");
  eq(ControlledCallExecutor.execute("A","hash",()->{},disk,()->calls[0]++),"DUPLICATE:HANDOFF_UNKNOWN");eq(calls[0],2);
  Store crash=new Store();try{ControlledCallExecutor.execute("A","hash",()->{},crash,()->{throw new AssertionError("CRASH");});throw new RuntimeException("expected crash");}catch(AssertionError expected){}
  eq(crash.states.get("A"),"HANDOFF_UNKNOWN");eq(ControlledCallExecutor.execute("A","hash",()->{},crash,()->calls[0]++),"DUPLICATE:HANDOFF_UNKNOWN");eq(calls[0],2);
  System.out.println("T-CALL-224/225/226: "+checks+" native executor assertions passed; phone is recording substitute; no phone API");
 }
}
