package com.mantou.salesdialer.contacts;
import android.app.*;import android.content.*;import android.os.SystemClock;import android.provider.Settings;import android.util.AtomicFile;
import java.io.*;import java.time.Clock;import org.json.JSONObject;
import com.mantou.salesdialer.contacts.WorkspaceTimerModel.Ticket;
/** Android-only binding; fixed private files, receiver and synthetic recording port. */
final class WorkspaceTimerRuntime {
 static final String ACTION="com.mantou.salesdialer.standalone.WORKSPACE_TIMER";static volatile boolean visible;static volatile Runnable listener;
 static SyntheticTaskLoop.Time time(Context c){return new SyntheticTaskLoop.Time(){public Clock wall(){return Clock.systemUTC();}public long elapsedMillis(){return SystemClock.elapsedRealtime();}public String bootId(){int b=Settings.Global.getInt(c.getContentResolver(),Settings.Global.BOOT_COUNT,-1);return b<0?"":"ANDROID-BOOT-"+b;}};}
 static final class TicketFile implements WorkspaceTimerCoordinator.Tickets {
  final AtomicFile file;TicketFile(File path){file=new AtomicFile(path);}
  public Ticket read(){if(!file.getBaseFile().exists()&&!new File(file.getBaseFile()+".bak").exists())return null;try(DataInputStream in=new DataInputStream(file.openRead())){if(in.readInt()!=0x57535431)throw new IOException();Ticket t=in.readBoolean()?new Ticket(in.readLong(),in.readLong(),in.readLong(),in.readUTF(),in.readUTF()):null;if(in.read()!=-1)throw new IOException();return t;}catch(Exception e){throw new IllegalStateException("TIMER_FILE_INVALID",e);}}
  public void write(Ticket t){FileOutputStream out=null;try{out=file.startWrite();DataOutputStream data=new DataOutputStream(out);data.writeInt(0x57535431);data.writeBoolean(t!=null);if(t!=null){data.writeLong(t.version);data.writeLong(t.dueWall);data.writeLong(t.dueElapsed);data.writeUTF(t.boot);data.writeUTF(t.token);}data.flush();file.finishWrite(out);Ticket saved=read();if(t==null?saved!=null:saved==null||!saved.token.equals(t.token)||saved.version!=t.version)throw new IOException();}catch(Exception e){if(out!=null)file.failWrite(out);throw new IllegalStateException("TIMER_WRITE_FAILED",e);}}
 }
 static WorkspaceTimerCoordinator coordinator(Context context,ContactTaskStore store,SyntheticTaskLoop.Time time){Context c=context.getApplicationContext();return new WorkspaceTimerCoordinator(store,time,new TicketFile(new File(c.getFilesDir(),"workspace-timer.bin")),new WorkspaceTimerCoordinator.Alarm(){
  private AlarmManager manager(){AlarmManager a=c.getSystemService(AlarmManager.class);if(a==null)throw new IllegalStateException("ALARM_UNAVAILABLE");return a;}
  private PendingIntent pending(Ticket t){Intent i=new Intent(c,WorkspaceAlarmReceiver.class).setAction(ACTION);if(t!=null)i.putExtra("version",t.version).putExtra("token",t.token);return PendingIntent.getBroadcast(c,9401,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
  public void ready(){if(!manager().canScheduleExactAlarms())throw new IllegalStateException("EXACT_ALARM_REQUIRED");ActivityManager a=c.getSystemService(ActivityManager.class);if(a==null||a.isBackgroundRestricted())throw new IllegalStateException("BACKGROUND_RESTRICTED");}
  public void arm(Ticket t){manager().setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP,t.dueElapsed,pending(t));}
  public void cancel(){manager().cancel(pending(null));}
 },new SyntheticTaskLoop.RecordingPort(SyntheticTaskLoop.RecordingPort.Mode.ACK));}
 static void fire(Context c,long version,String token){String result;try(ContactTaskStore store=ContactTaskStore.openSyntheticWorkspace(c)){result=coordinator(c,store,time(c)).fire(version,token);}catch(Exception e){result=String.valueOf(e.getMessage());}record(c,result,version);Runnable update=listener;if(update!=null)update.run();}
 static void record(Context c,String result,long version){try{JSONObject j=new JSONObject().put("source","SYNTHETIC_WORKSPACE_TIMER").put("version",version).put("result",result).put("wall",System.currentTimeMillis()).put("elapsed",SystemClock.elapsedRealtime()).put("background",!visible).put("actualPhoneCalls",0).put("realCallsEnabled",false);AtomicFile f=new AtomicFile(new File(c.getFilesDir(),"workspace-timer-observation.json"));FileOutputStream out=null;try{out=f.startWrite();out.write(j.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));f.finishWrite(out);}catch(Exception e){if(out!=null)f.failWrite(out);}}catch(Exception ignored){}}
}
