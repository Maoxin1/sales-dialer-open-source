import com.mantou.salesdialer.standalone.TaskEngine;
public final class StandaloneImportCheck {
 static int checks;static long now=java.time.Instant.parse("2026-10-16T02:00:00Z").toEpochMilli();
 static void eq(Object a,Object b){checks++;if(!a.equals(b))throw new AssertionError(a+" != "+b);}
 interface Action{void run()throws Exception;}
 static void fails(Action r,String expected)throws Exception{checks++;try{r.run();}catch(Exception e){if(!e.getMessage().contains(expected))throw new AssertionError(e);return;}throw new AssertionError("expected "+expected);}
 static final class Store implements TaskEngine.Store{byte[] bytes;public byte[] read(){return bytes;}public void write(byte[] b){bytes=b;}}
 public static void main(String[] args)throws Exception{
  Store store=new Store();TaskEngine e=new TaskEngine(store,()->now);e.seed(3);e.plan();e.refuse("DEMO-002");
  TaskEngine.ImportResult r=e.importDemoLines(" DEMO-004 \r\n\nDEMO-004\nDEMO-001\nDEMO-008\n");eq(r.added,2);eq(r.duplicates,2);eq(r.blankLines,1);
  TaskEngine reloaded=new TaskEngine(store,()->now);eq(reloaded.snapshot().tasks.size(),5);eq(reloaded.snapshot().tasks.get(1).refused,true);eq(reloaded.snapshot().tasks.get(3).id,"DEMO-004");eq(reloaded.snapshot().tasks.get(4).id,"DEMO-008");reloaded.appendDemo();
  java.util.Set<String> ids=new java.util.HashSet<>();for(TaskEngine.Task t:reloaded.snapshot().tasks)eq(ids.add(t.id),true);eq(reloaded.snapshot().tasks.get(5).id,"DEMO-005");eq(reloaded.snapshot().tasks.get(6).id,"DEMO-006");eq(reloaded.snapshot().tasks.get(7).id,"DEMO-007");
  System.out.println("T560 valid IDs, trimming, blanks, duplicates, merge and refusal preservation passed");
  TaskEngine before=reloaded;int size=before.snapshot().tasks.size();fails(()->before.importDemoLines("DEMO-005\n13800138000"),"第2行无效");eq(new TaskEngine(store,()->now).snapshot().tasks.size(),size);
  fails(()->before.importDemoLines("DEMO-005\nDEMO-ABC"),"第2行无效");eq(new TaskEngine(store,()->now).snapshot().tasks.size(),size);
  System.out.println("T561 invalid batch rejects atomically; real-looking numbers rejected passed");
  fails(()->before.importDemoLines("x\n".repeat(201)),"最多200行");fails(()->before.importDemoLines("x".repeat(8001)),"过长");
  System.out.println("T562 input bounds enforced passed");
  StringBuilder full=new StringBuilder();for(int i=10;i<202;i++)full.append(String.format(java.util.Locale.ROOT,"DEMO-%03d%n",i));
  TaskEngine.ImportResult bulk=before.importDemoLines(full.toString());eq(bulk.added,192);eq(before.snapshot().tasks.size(),200);
  fails(()->before.importDemoLines("DEMO-999"),"容量不足");eq(new TaskEngine(store,()->now).snapshot().tasks.size(),200);
  System.out.println("T563 200-target bound and insufficient-capacity atomicity passed");
  System.out.println("PASS: "+checks+" assertions; 4 import scenarios; no phone access");
 }
}
