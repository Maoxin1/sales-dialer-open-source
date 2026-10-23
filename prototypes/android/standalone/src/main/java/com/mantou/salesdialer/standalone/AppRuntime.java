package com.mantou.salesdialer.standalone;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.SystemClock;
import android.provider.Settings;
import android.util.AtomicFile;
import java.io.*;

final class AppRuntime {
    private static TaskEngine engine;static boolean visible;
    /** Isolated diagnostic view: never initializes the running engine or repairs its files. */
    static TaskEngine readOnlyEngine(Context context)throws Exception{
        File file=new File(context.getApplicationContext().getFilesDir(),"simulation-tasks.bin");
        return new TaskEngine(new TaskEngine.Store(){
            public byte[] read()throws Exception{
                if(new File(file+".bak").exists()||new File(file+".new").exists())throw new IOException("READ_ONLY_RECOVERY_REQUIRED");
                if(!file.exists())return null;
                try(FileInputStream in=new FileInputStream(file)){ByteArrayOutputStream bytes=new ByteArrayOutputStream();byte[] b=new byte[1024];int n;while((n=in.read(b))!=-1){bytes.write(b,0,n);if(bytes.size()>65536)throw new IOException("TOO_LARGE");}return bytes.toByteArray();}
            }
            public void write(byte[] bytes)throws Exception{throw new IOException("READ_ONLY");}
        },System::currentTimeMillis);
    }
    static synchronized TaskEngine open(Context context,boolean foreground)throws Exception{
        Context c=context.getApplicationContext();
        if(engine==null){AtomicFile file=new AtomicFile(new File(c.getFilesDir(),"simulation-tasks.bin"));
            engine=new TaskEngine(new TaskEngine.Store(){
                public byte[] read()throws Exception{if(!file.getBaseFile().exists()&&!new File(file.getBaseFile()+".bak").exists())return null;try(FileInputStream in=file.openRead()){ByteArrayOutputStream bytes=new ByteArrayOutputStream();byte[] b=new byte[1024];int n;while((n=in.read(b))!=-1){bytes.write(b,0,n);if(bytes.size()>65536)throw new IOException("TOO_LARGE");}return bytes.toByteArray();}}
                public void write(byte[] b)throws Exception{FileOutputStream out=null;try{out=file.startWrite();out.write(b);file.finishWrite(out);if(!java.util.Arrays.equals(b,read()))throw new IOException("WRITE_UNCONFIRMED");}catch(Exception e){if(out!=null)file.failWrite(out);throw e;}}
            },System::currentTimeMillis);
            // Explicit app restart never re-arms or catches up a previously scheduled job.
            if(foreground&&!engine.snapshot().timerTarget.isEmpty()){engine.pause();cancel(c);record(c,"RESTART_REPLAN_REQUIRED",engine.snapshot().version);}
        }
        return engine;
    }
    static int boot(Context c){return Settings.Global.getInt(c.getContentResolver(),Settings.Global.BOOT_COUNT,-1);}
    static TaskSubmissionBridge bridge(Context c)throws Exception{return new TaskSubmissionBridge(open(c,false));}
    private static PendingIntent intent(Context c,long version){return PendingIntent.getBroadcast(c,1,new Intent(c,TaskAlarmReceiver.class).putExtra("version",version),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
    static void cancel(Context c){AlarmManager alarm=c.getSystemService(AlarmManager.class);if(alarm!=null)alarm.cancel(intent(c,-1));}
    static void arm(Context c)throws Exception{
        AlarmManager alarm=c.getSystemService(AlarmManager.class);
        if(alarm==null||!alarm.canScheduleExactAlarms())throw new IllegalStateException("请先允许闹钟和提醒权限");
        android.app.ActivityManager activity=c.getSystemService(android.app.ActivityManager.class);
        if(activity==null||activity.isBackgroundRestricted())throw new IllegalStateException("请先允许此仿真应用后台运行");
        TaskEngine e=open(c,false);e.plan();TaskEngine.Snapshot s=e.snapshot();
        TaskEngine.Task task=s.tasks.stream().filter(t->t.state==TaskEngine.PLANNED&&!t.refused).findFirst().orElseThrow(()->new IllegalStateException("没有可执行任务"));
        long due=SystemClock.elapsedRealtime()+30000,version=e.schedule(task.id,System.currentTimeMillis()+30000,due,boot(c));
        try{alarm.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP,due,intent(c,version));record(c,"ARMED_EXACT",version);}
        catch(Exception ex){e.pause();cancel(c);throw ex;}
    }
    static void record(Context c,String result,long version){c.getSharedPreferences("timer_observation",Context.MODE_PRIVATE).edit().putString("result",result).putLong("version",version).putLong("wall",System.currentTimeMillis()).putBoolean("background",!visible).commit();}
}
