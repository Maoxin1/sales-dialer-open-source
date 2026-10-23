package com.mantou.salesdialer.standalone;

import java.io.*;
import java.time.*;
import java.util.*;
import java.util.function.LongSupplier;

/** Phone-independent simulation. IDs are synthetic; this module has no dialing capability. */
public final class TaskEngine {
    public interface Store { byte[] read() throws Exception; void write(byte[] bytes) throws Exception; }
    public interface Adapter { void submit(String syntheticId) throws Exception; }
    public static final int NEW=0, PLANNED=1, UNKNOWN=2, FINISHED=3;
    public static final class Attempt {
        public String id,result; public boolean api;
    }
    public static final class Task {
        public String id, result=""; public int state; public boolean refused, api;
        public List<Attempt> history=new ArrayList<>();
        public String attemptId(){return id+"/A"+(history.size()+1);}
    }
    public static final class Snapshot {
        public long version; public boolean paused=true; public List<Task> tasks=new ArrayList<>();
        public String timerTarget="", timerResult="NONE"; public long dueWall, dueElapsed; public int boot;
    }
    public static final class ImportResult {public int added,duplicates,blankLines;}
    private final Store store; private final LongSupplier clock; private Snapshot state; private boolean poisoned;
    public TaskEngine(Store store, LongSupplier clock) throws Exception {
        this.store=store;this.clock=clock;byte[] bytes=store.read();state=bytes==null?new Snapshot():decode(bytes);
    }
    public synchronized Snapshot snapshot() throws Exception {return decode(encode(state));}
    private void commit(Snapshot next) throws Exception {
        if(poisoned)throw new IOException("REOPEN_REQUIRED");
        try{store.write(encode(next));state=next;}catch(Exception e){poisoned=true;throw e;}
    }
    public synchronized void seed(int count) throws Exception {
        if(!state.tasks.isEmpty()||count<1||count>200)throw new IllegalArgumentException("EMPTY_DEMO_REQUIRED");
        Snapshot s=snapshot();for(int i=1;i<=count;i++){Task t=new Task();t.id=String.format(Locale.ROOT,"DEMO-%03d",i);s.tasks.add(t);}commit(s);
    }
    public synchronized void appendDemo() throws Exception {
        if(state.tasks.size()>197)throw new IllegalStateException("DEMO_CAPACITY");
        Snapshot s=snapshot();Set<String> known=new HashSet<>();for(Task t:s.tasks)known.add(t.id);int candidate=1;
        for(int added=0;added<3;){if(candidate>999)throw new IllegalStateException("DEMO_IDS_EXHAUSTED");String id=String.format(Locale.ROOT,"DEMO-%03d",candidate++);if(known.add(id)){Task t=new Task();t.id=id;s.tasks.add(t);added++;}}commit(s);
    }
    public synchronized ImportResult importDemoLines(String input) throws Exception {
        if(poisoned)throw new IOException("REOPEN_REQUIRED");
        if(input==null||input.length()>8000)throw new IllegalArgumentException("名单文本过长");
        Snapshot s=snapshot();Set<String> known=new HashSet<>();for(Task t:s.tasks)known.add(t.id);
        LinkedHashSet<String> incoming=new LinkedHashSet<>();ImportResult result=new ImportResult();
        String[] lines=input.split("\\r?\\n",-1);
        int lineCount=lines.length-(input.endsWith("\n")?1:0);
        if(lineCount>200)throw new IllegalArgumentException("单次最多200行");
        for(int i=0;i<lineCount;i++){
            String id=lines[i].trim();if(id.isEmpty()){result.blankLines++;continue;}
            if(!id.matches("DEMO-[0-9]{3}"))throw new IllegalArgumentException("第"+(i+1)+"行无效：仅接受DEMO-三位数字");
            if(known.contains(id)||!incoming.add(id))result.duplicates++;
        }
        int capacity=200-s.tasks.size();if(incoming.size()>capacity)throw new IllegalStateException("演示目标容量不足：最多还可添加"+capacity+"条");
        for(String id:incoming){Task t=new Task();t.id=id;s.tasks.add(t);}result.added=incoming.size();
        if(result.added>0)commit(s);return result;
    }
    private static void cancelTimer(Snapshot s,String reason){if(!s.timerTarget.isEmpty()){s.timerTarget="";s.timerResult=reason;}}
    public synchronized void plan() throws Exception {
        if(state.tasks.stream().anyMatch(t->t.state==UNKNOWN))throw new IllegalStateException("RECONCILE_REQUIRED");
        Snapshot s=snapshot();s.version=Math.addExact(s.version,1);s.paused=false;
        cancelTimer(s,"CANCELLED_REPLAN");
        for(Task t:s.tasks)if(t.state!=FINISHED)t.state=t.refused?NEW:PLANNED;commit(s);
    }
    public synchronized void pause() throws Exception {
        Snapshot s=snapshot();s.version=Math.addExact(s.version,1);s.paused=true;
        cancelTimer(s,"CANCELLED_PAUSE");
        for(Task t:s.tasks)if(t.state==PLANNED)t.state=NEW;commit(s);
    }
    public synchronized void refuse(String id) throws Exception {
        Snapshot s=snapshot();Task t=find(s,id);t.refused=true;if(t.state==PLANNED)t.state=NEW;commit(s);
    }
    public synchronized long schedule(String id,long dueWall,long dueElapsed,int boot) throws Exception {
        Task t=find(state,id);
        if(state.paused||t.refused||t.state!=PLANNED||state.tasks.stream().anyMatch(x->x.state==UNKNOWN)||dueWall<=clock.getAsLong()||dueWall>Long.MAX_VALUE-30000||dueElapsed<0||dueElapsed>Long.MAX_VALUE-30000||boot<0||!inWindow(dueWall))throw new IllegalStateException("SCHEDULE_BLOCKED");
        Snapshot s=snapshot();s.version=Math.addExact(s.version,1);s.timerTarget=id;s.dueWall=dueWall;s.dueElapsed=dueElapsed;s.boot=boot;s.timerResult="ARMED";commit(s);return s.version;
    }
    public synchronized String fire(long version,int boot,long elapsed,Adapter adapter) throws Exception {
        return fire(version,boot,()->elapsed,adapter);
    }
    public synchronized String fire(long version,int boot,LongSupplier monotonic,Adapter adapter) throws Exception {
        if(version!=state.version||state.timerTarget.isEmpty())return "STALE_ALARM";
        long now=clock.getAsLong(),elapsed=monotonic.getAsLong();String skip=null;
        if(boot!=state.boot||elapsed<0)skip="SKIPPED_REBOOT";
        else if(elapsed<state.dueElapsed)return "EARLY_ALARM";
        else if(now<state.dueWall)skip="SKIPPED_CLOCK_CHANGED";
        else if(now-state.dueWall>30000||elapsed-state.dueElapsed>30000)skip="SKIPPED_EXPIRED";
        String id=state.timerTarget;long wallStart=state.dueWall,elapsedStart=state.dueElapsed;
        Snapshot s=snapshot();s.timerTarget="";s.timerResult=skip==null?"DISPATCHING":skip;commit(s);
        if(skip!=null)return skip;
        String result=trigger(id,version,key->{long wall=clock.getAsLong(),mono=monotonic.getAsLong();if(wall<wallStart||wall-wallStart>30000||mono<elapsedStart||mono-elapsedStart>30000||!inWindow(wall))throw new IllegalStateException("EXPIRED_BEFORE_ADAPTER");adapter.submit(key);});
        s=snapshot();s.timerResult=result;commit(s);return result;
    }
    public static boolean inWindow(long at){
        ZonedDateTime z=Instant.ofEpochMilli(at).atZone(ZoneOffset.ofHours(8));
        return z.getDayOfWeek().getValue()<=5 && z.getHour()>=9 && z.getHour()<18;
    }
    public synchronized String trigger(String id,long version,Adapter adapter) throws Exception {
        if(poisoned)throw new IOException("REOPEN_REQUIRED");
        if(version!=state.version)return "STALE_PLAN";
        Task original=find(state,id);
        if(original.state==UNKNOWN||original.state==FINISHED)return "ALREADY_ATTEMPTED";
        if(state.paused)return "PAUSED";
        if(original.refused)return "REFUSED";
        if(!inWindow(clock.getAsLong()))return "OUTSIDE_WINDOW";
        if(state.tasks.stream().anyMatch(t->t.state==UNKNOWN))return "OCCUPIED";
        if(original.state!=PLANNED)return "NO_PLAN";
        if(attemptCount(state)>=1000)return "DEMO_ATTEMPT_CAPACITY";
        Snapshot next=snapshot();find(next,id).state=UNKNOWN;cancelTimer(next,"CANCELLED_MANUAL");commit(next); // Durable before any adapter action.
        try{adapter.submit(id);}catch(Exception e){return "RECONCILE_REQUIRED";}
        next=snapshot();find(next,id).api=true;commit(next);return "SIMULATED_API_SUBMITTED";
    }
    public synchronized void reconcile(String id,String result) throws Exception {
        if(!Set.of("COMPLETED","NO_ANSWER","UNKNOWN").contains(result))throw new IllegalArgumentException("RESULT_REQUIRED");
        Snapshot s=snapshot();Task t=find(s,id);
        if(t.state!=UNKNOWN)throw new IllegalStateException("NO_PENDING_ATTEMPT");
        t.state=FINISHED;t.result=result;commit(s);
    }
    public synchronized String retry(String id,long expectedVersion) throws Exception {
        if(poisoned)throw new IOException("REOPEN_REQUIRED");
        if(expectedVersion!=state.version)return "STALE_PLAN";
        Task original=find(state,id);
        if(original.refused)return "REFUSED";
        if(state.tasks.stream().anyMatch(t->t.state==UNKNOWN))return "RECONCILE_REQUIRED";
        if(original.state!=FINISHED)return "NO_FINISHED_ATTEMPT";
        if(original.result.equals("UNKNOWN"))return "RESULT_UNCERTAIN";
        if(attemptCount(state)>=1000)return "DEMO_ATTEMPT_CAPACITY";
        Snapshot s=snapshot();Task t=find(s,id);Attempt a=new Attempt();a.id=t.attemptId();a.result=t.result;a.api=t.api;t.history.add(a);
        t.state=NEW;t.api=false;t.result="";
        s.version=Math.addExact(s.version,1);s.paused=true;cancelTimer(s,"CANCELLED_RETRY");
        for(Task other:s.tasks)if(other.state==PLANNED)other.state=NEW;
        commit(s);return "RETRY_PREPARED";
    }
    public static long attemptCount(Snapshot s){return s.tasks.stream().mapToLong(t->t.history.size()+(t.state>=UNKNOWN?1:0)).sum();}
    private static Task find(Snapshot s,String id){return s.tasks.stream().filter(t->t.id.equals(id)).findFirst().orElseThrow(()->new IllegalArgumentException("UNKNOWN_TARGET"));}
    public static byte[] encode(Snapshot s) throws IOException {
        ByteArrayOutputStream bytes=new ByteArrayOutputStream();DataOutputStream out=new DataOutputStream(bytes);
        out.writeInt(3);out.writeLong(s.version);out.writeBoolean(s.paused);out.writeInt(s.tasks.size());
        for(Task t:s.tasks){out.writeUTF(t.id);out.writeInt(t.state);out.writeBoolean(t.refused);out.writeBoolean(t.api);out.writeUTF(t.result);}
        out.writeUTF(s.timerTarget);out.writeUTF(s.timerResult);out.writeLong(s.dueWall);out.writeLong(s.dueElapsed);out.writeInt(s.boot);
        for(Task t:s.tasks){out.writeInt(t.history.size());for(Attempt a:t.history){out.writeUTF(a.id);out.writeBoolean(a.api);out.writeUTF(a.result);}}
        out.flush();if(bytes.size()>65536)throw new IOException("DEMO_STORAGE_CAPACITY");return bytes.toByteArray();
    }
    public static Snapshot decode(byte[] bytes) throws IOException {
        if(bytes.length>65536)throw new IOException("INVALID_SNAPSHOT");
        DataInputStream in=new DataInputStream(new ByteArrayInputStream(bytes));int schema=in.readInt();if(schema<1||schema>3)throw new IOException("SCHEMA");
        Snapshot s=new Snapshot();s.version=in.readLong();s.paused=in.readBoolean();int count=in.readInt();
        if(s.version<0||count<0||count>200)throw new IOException("INVALID_SNAPSHOT");Set<String> ids=new HashSet<>();int pending=0;
        for(int i=0;i<count;i++){Task t=new Task();t.id=in.readUTF();t.state=in.readInt();t.refused=in.readBoolean();t.api=in.readBoolean();t.result=in.readUTF();
            if(!t.id.matches("DEMO-[0-9]{3}")||!ids.add(t.id)||t.state<0||t.state>3||t.state<2&&t.api||t.state!=FINISHED&&!t.result.isEmpty()||t.state==FINISHED&&!Set.of("COMPLETED","NO_ANSWER","UNKNOWN").contains(t.result))throw new IOException("INVALID_TASK");
            if(t.state==UNKNOWN)pending++;s.tasks.add(t);
        }
        if(schema>=2){s.timerTarget=in.readUTF();s.timerResult=in.readUTF();s.dueWall=in.readLong();s.dueElapsed=in.readLong();s.boot=in.readInt();if(s.timerResult.length()>80||s.dueWall<0||s.dueElapsed<0||s.boot<0||!s.timerTarget.isEmpty()&&!ids.contains(s.timerTarget))throw new IOException("INVALID_TIMER");}
        if(schema==3){int total=0;for(Task t:s.tasks){int size=in.readInt();if(size<0||size>1000||(total+=size)>1000)throw new IOException("INVALID_HISTORY");for(int i=0;i<size;i++){Attempt a=new Attempt();a.id=in.readUTF();a.api=in.readBoolean();a.result=in.readUTF();if(!a.id.equals(t.id+"/A"+(i+1))||!Set.of("COMPLETED","NO_ANSWER").contains(a.result))throw new IOException("INVALID_HISTORY");t.history.add(a);}}}
        if(attemptCount(s)>1000)throw new IOException("INVALID_HISTORY");
        if(pending>1||in.available()!=0)throw new IOException("INVALID_SNAPSHOT");return s;
    }
}
