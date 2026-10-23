package com.mantou.salesdialer.contacts;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.*;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.telecom.*;
import android.util.AtomicFile;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import com.mantou.salesdialer.contacts.PhoneIntakeModel.DataClass;

/** Debug-only, one explicitly confirmed local plan. No server identity, incoming command or default grant. */
final class PilotPhoneRuntime {
 static final Object LOCK=new Object();
 private static final int ALARM_ID=7391;
 static final class Account {
  final PhoneAccountHandle handle;final String key,label,maskedNumber;
  Account(PhoneAccountHandle h,String key,String label,String mask){handle=h;this.key=key;this.label=label;maskedNumber=mask;}
 }
 private static boolean granted(Context c,String p){return c.checkSelfPermission(p)==PackageManager.PERMISSION_GRANTED;}
 private static void pilot(Context c){if(!c.getPackageName().equals("com.mantou.salesdialer.pilot")||(c.getApplicationInfo().flags&ApplicationInfo.FLAG_DEBUGGABLE)==0)throw new IllegalStateException("CONTROLLED_PILOT_ONLY");}
 private static String key(PhoneAccountHandle h)throws Exception{
  String raw=h.getComponentName().flattenToString()+"\n"+h.getId()+"\n"+h.getUserHandle();StringBuilder s=new StringBuilder();for(byte b:MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8)))s.append(String.format(Locale.ROOT,"%02x",b&255));return s.toString();
 }
 static List<Account> accounts(Context c)throws Exception{
  pilot(c);
  if(c.checkSelfPermission(Manifest.permission.READ_PHONE_STATE)!=PackageManager.PERMISSION_GRANTED||c.checkSelfPermission(Manifest.permission.READ_PHONE_NUMBERS)!=PackageManager.PERMISSION_GRANTED)throw new IllegalStateException("PHONE_PERMISSION_REQUIRED");
  TelecomManager tm=c.getSystemService(TelecomManager.class);if(tm==null)throw new IllegalStateException("PHONE_SERVICE_UNAVAILABLE");List<Account> rows=new ArrayList<>();
  for(PhoneAccountHandle h:tm.getCallCapablePhoneAccounts()){
   PhoneAccount a=tm.getPhoneAccount(h);if(a==null||!a.isEnabled()||!a.hasCapabilities(PhoneAccount.CAPABILITY_SIM_SUBSCRIPTION)||!a.supportsUriScheme("tel"))continue;
   String n=a.getAddress()==null?"":a.getAddress().getSchemeSpecificPart(),mask=n!=null&&n.length()>=4?"尾号"+n.substring(n.length()-4):"号码未提供";
   rows.add(new Account(h,key(h),String.valueOf(a.getLabel()),mask));
  }
  return List.copyOf(rows);
 }
 static boolean idle(Context c){
  if(c.checkSelfPermission(Manifest.permission.READ_PHONE_STATE)!=PackageManager.PERMISSION_GRANTED)throw new IllegalStateException("PHONE_PERMISSION_REQUIRED");TelecomManager tm=c.getSystemService(TelecomManager.class);if(tm==null)throw new IllegalStateException("PHONE_SERVICE_UNAVAILABLE");return !tm.isInCall();
 }
 private static String selected(Context c){return c.getSharedPreferences("pilot-binding",Context.MODE_PRIVATE).getString("account","");}
 private static String installation(Context c){var prefs=c.getSharedPreferences("pilot-binding",Context.MODE_PRIVATE);String id=prefs.getString("installation",null);if(id==null){id=UUID.randomUUID().toString().replace("-","");if(!prefs.edit().putString("installation",id).commit())throw new IllegalStateException("INSTALLATION_WRITE_FAILED");}if(!id.matches("[a-f0-9]{32}"))throw new IllegalStateException("INSTALLATION_INVALID");return id;}
 private static String boot(Context c){int n=Settings.Global.getInt(c.getContentResolver(),Settings.Global.BOOT_COUNT,-1);if(n<0)throw new IllegalStateException("EXECUTION_CLOCK_UNKNOWN");return Integer.toString(n);}
 static Account selectedAccount(Context c)throws Exception{String wanted=selected(c);if(wanted.isEmpty())throw new IllegalStateException("SALES_SIM_REQUIRED");List<Account> matches=new ArrayList<>();for(Account a:accounts(c))if(a.key.equals(wanted))matches.add(a);if(matches.size()!=1)throw new IllegalStateException("SALES_SIM_UNAVAILABLE");return matches.get(0);}
 private static Account phoneReady(Context c,String expected)throws Exception{
  pilot(c);if(!granted(c,Manifest.permission.CALL_PHONE)||!granted(c,Manifest.permission.READ_PHONE_STATE)||!granted(c,Manifest.permission.READ_PHONE_NUMBERS))throw new IllegalStateException("PHONE_PERMISSION_REQUIRED");
  Account a=selectedAccount(c);if(!a.key.equals(expected))throw new IllegalStateException("SALES_SIM_CHANGED");if(!idle(c))throw new IllegalStateException("DEVICE_BUSY");return a;
 }
 private static AtomicFile permitFile(Context c){return new AtomicFile(new File(c.getFilesDir(),"pilot-permit.json"));}
 private static void write(Context c,JSONObject value)throws Exception{
  AtomicFile f=permitFile(c);FileOutputStream out=null;try{out=f.startWrite();out.write(value.toString().getBytes(StandardCharsets.UTF_8));f.finishWrite(out);}catch(Exception e){if(out!=null)f.failWrite(out);throw e;}
 }
 private static byte[] boundedRead(InputStream in)throws IOException{ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[1024];int read;while((read=in.read(buffer))!=-1){if(out.size()+read>4096)throw new IOException("PILOT_PERMIT_INVALID");out.write(buffer,0,read);}return out.toByteArray();}

 static JSONObject parseEnvelope(byte[] raw)throws Exception{if(raw==null||raw.length>4096)throw new IllegalStateException("PILOT_PERMIT_INVALID");JSONObject j=new JSONObject(new String(raw,StandardCharsets.UTF_8));if(!(j.get("schema") instanceof Integer)||j.getInt("schema")!=1||!(j.get("state") instanceof String)||!Set.of("DISABLED","READY","CONSUMING").contains(j.getString("state")))throw new IllegalStateException("PILOT_PERMIT_INVALID");if(j.getString("state").equals("DISABLED")){if(j.length()!=2)throw new IllegalStateException("PILOT_PERMIT_INVALID");}else decode(j);return j;}
 private static JSONObject envelope(Context c)throws Exception{AtomicFile f=permitFile(c);if(!f.getBaseFile().exists())return new JSONObject().put("schema",1).put("state","DISABLED");if(f.getBaseFile().length()>4096)throw new IllegalStateException("PILOT_PERMIT_INVALID");try(InputStream in=f.openRead()){return parseEnvelope(boundedRead(in));}}

 static JSONObject encode(PilotPermit p,String state)throws Exception{return new JSONObject().put("schema",1).put("state",state).put("kind",DataClass.LOCAL_PHONE_INTAKE.name()).put("slot",p.slot).put("target",p.targetId).put("contactRevision",p.contactRevision).put("account",p.accountKey).put("installation",p.installationKey).put("version",p.ticket.version).put("dueWall",p.ticket.dueWall).put("dueElapsed",p.ticket.dueElapsed).put("boot",p.ticket.boot).put("token",p.ticket.token);}
 static PilotPermit decode(JSONObject j)throws Exception{
  Set<String> keys=new HashSet<>();j.keys().forEachRemaining(keys::add);if(!keys.equals(Set.of("schema","state","kind","slot","target","contactRevision","account","installation","version","dueWall","dueElapsed","boot","token")))throw new IllegalStateException("PILOT_PERMIT_INVALID");
  for(String n:List.of("schema","contactRevision","version","dueWall","dueElapsed"))if(!(j.get(n) instanceof Integer)&&!(j.get(n) instanceof Long))throw new IllegalStateException("PILOT_PERMIT_INVALID");
  for(String n:List.of("state","kind","slot","target","account","installation","boot","token"))if(!(j.get(n) instanceof String))throw new IllegalStateException("PILOT_PERMIT_INVALID");
  return new PilotPermit(DataClass.valueOf(j.getString("kind")),j.getString("slot"),j.getString("target"),j.getLong("contactRevision"),j.getString("account"),j.getString("installation"),new WorkspaceTimerModel.Ticket(j.getLong("version"),j.getLong("dueWall"),j.getLong("dueElapsed"),j.getString("boot"),j.getString("token")));
 }
 private static void disabled(Context c)throws Exception{write(c,new JSONObject().put("schema",1).put("state","DISABLED"));}
 private static PendingIntent alarmIntent(Context c,String token,int flags){return PendingIntent.getBroadcast(c,ALARM_ID,new Intent(c,PilotAlarmReceiver.class).setAction(c.getPackageName()+".PILOT_DUE").putExtra("token",token),flags|PendingIntent.FLAG_IMMUTABLE);}
 private static void cancelAlarm(Context c){AlarmManager am=c.getSystemService(AlarmManager.class);PendingIntent pi=alarmIntent(c,"",PendingIntent.FLAG_NO_CREATE);if(pi!=null){if(am!=null)am.cancel(pi);pi.cancel();}}
 static void stopAll(Context c)throws Exception{pilot(c);Exception failure=null;try(PhoneIntakeStore s=PhoneIntakeStore.open(c,DataClass.LOCAL_PHONE_INTAKE)){s.recoverPlan();}catch(Exception e){failure=e;}synchronized(LOCK){disabled(c);cancelAlarm(c);if(failure!=null)throw failure;}}
 static void select(Context c,Account a)throws Exception{synchronized(LOCK){if(accounts(c).stream().filter(row->row.key.equals(a.key)).count()!=1)throw new IllegalStateException("SALES_SIM_UNAVAILABLE");try(PhoneIntakeStore s=PhoneIntakeStore.open(c,DataClass.LOCAL_PHONE_INTAKE)){if(s.pilotAttempts().stream().anyMatch(r->r.pending))throw new IllegalStateException("PENDING_RECONCILIATION");}stopAll(c);if(!c.getSharedPreferences("pilot-binding",Context.MODE_PRIVATE).edit().putString("account",a.key).commit())throw new IllegalStateException("SIM_BINDING_WRITE_FAILED");}}
 private static void verify(Context c,PilotPermit permit)throws Exception{
  JSONObject current=envelope(c);if(!current.getString("state").equals("CONSUMING")||!decode(current).fingerprint().equals(permit.fingerprint()))throw new IllegalStateException("PILOT_AUTHORIZATION_REVOKED");
  ActivityManager activity=c.getSystemService(ActivityManager.class);if(activity==null||activity.isBackgroundRestricted())throw new IllegalStateException("BACKGROUND_RESTRICTED");if(!installation(c).equals(permit.installationKey))throw new IllegalStateException("INSTALLATION_CHANGED");phoneReady(c,permit.accountKey);permit.due(System.currentTimeMillis(),SystemClock.elapsedRealtime(),boot(c));
 }
 private static void place(Context c,PilotPermit permit,String canonical)throws Exception{
  Account account=phoneReady(c,permit.accountKey);verify(c,permit); // Includes a final deadline check after account enumeration.
  if(c.checkSelfPermission(Manifest.permission.CALL_PHONE)!=PackageManager.PERMISSION_GRANTED)throw new IllegalStateException("PHONE_PERMISSION_REQUIRED");
  Bundle extras=new Bundle();extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE,account.handle);c.getSystemService(TelecomManager.class).placeCall(Uri.fromParts("tel",canonical,null),extras);
 }
 private static void saveOutcome(Context c,String status){try{JSONObject j=new JSONObject().put("source","CONTROLLED_ANDROID_PILOT").put("status",status).put("at",System.currentTimeMillis()).put("outgoingConfirmed",JSONObject.NULL).put("connectedConfirmed",JSONObject.NULL);AtomicFile f=new AtomicFile(new File(c.getFilesDir(),"pilot-last-execution.json"));FileOutputStream out=f.startWrite();out.write(j.toString().getBytes(StandardCharsets.UTF_8));f.finishWrite(out);}catch(Exception ignored){}}
 private static void enterpriseRequired(){throw new IllegalStateException("ENTERPRISE_WORKSPACE_REQUIRED");}
 private static String submit(Context c,PilotPermit p)throws Exception{enterpriseRequired();
  write(c,encode(p,"CONSUMING"));String status;
  try(PhoneIntakeStore s=PhoneIntakeStore.open(c,DataClass.LOCAL_PHONE_INTAKE)){status=s.executePilot(p,()->verify(c,p),number->place(c,p,number));}
  finally{disabled(c);cancelAlarm(c);}saveOutcome(c,status);return status;
 }
 static String immediate(Context c,String target,long expectedPlan,long expectedContact,long expectedDraft,String expectedAccount)throws Exception{enterpriseRequired();synchronized(LOCK){pilot(c);Account a=phoneReady(c,expectedAccount);if(!SalesPlanModel.window(System.currentTimeMillis()))throw new IllegalStateException("OUTSIDE_WINDOW");disabled(c);cancelAlarm(c);
  try(PhoneIntakeStore s=PhoneIntakeStore.open(c,DataClass.LOCAL_PHONE_INTAKE)){var contact=s.list().stream().filter(r->r.id.equals(target)).findFirst().orElseThrow(()->new IllegalStateException("NOT_FOUND"));var d=s.drafts().stream().filter(r->r.draft.targetId.equals(target)).findFirst().orElseThrow(()->new IllegalStateException("DRAFT_NOT_FOUND"));var p=s.arrangeDraftNow(target,expectedPlan,expectedContact,expectedDraft);long wall=System.currentTimeMillis(),elapsed=SystemClock.elapsedRealtime();if(wall<p.dueAt||wall-p.dueAt>30000)throw new IllegalStateException("EXPIRED");var ticket=new WorkspaceTimerModel.Ticket(p.version,p.dueAt,elapsed-(wall-p.dueAt),boot(c),UUID.randomUUID().toString().replace("-",""));return submit(c,new PilotPermit(s.mode(),s.slot(),target,contact.revision,a.key,installation(c),ticket));}
 }}
 static void arm(Context c,String target,long expectedPlan,long expectedContact,long expectedDraft,String expectedAccount)throws Exception{enterpriseRequired();synchronized(LOCK){pilot(c);Account a=phoneReady(c,expectedAccount);AlarmManager am=c.getSystemService(AlarmManager.class);if(am==null||!am.canScheduleExactAlarms())throw new IllegalStateException("EXACT_ALARM_PERMISSION_REQUIRED");ActivityManager activity=c.getSystemService(ActivityManager.class);if(activity==null||activity.isBackgroundRestricted())throw new IllegalStateException("BACKGROUND_RESTRICTED");
  try(PhoneIntakeStore s=PhoneIntakeStore.open(c,DataClass.LOCAL_PHONE_INTAKE)){var view=s.plan();if(view.plan.version!=expectedPlan)throw new IllegalStateException("STALE_PLAN");if(view.plan.paused||!view.targetId.equals(target)||!view.status.equals("NOT_DUE"))throw new IllegalStateException("FUTURE_PLAN_REQUIRED");if(s.pilotAttempts().stream().anyMatch(r->r.pending))throw new IllegalStateException("PENDING_RECONCILIATION");var contact=s.list().stream().filter(r->r.id.equals(target)).findFirst().orElseThrow();var d=s.drafts().stream().filter(r->r.draft.targetId.equals(target)).findFirst().orElseThrow();if(contact.revision!=expectedContact)throw new IllegalStateException("STALE_CONTACT");if(d.draft.contactRevision!=expectedDraft)throw new IllegalStateException("STALE_DRAFT");if(!d.status.equals("ELIGIBLE_FOR_PLANNING"))throw new IllegalStateException(d.status);
   var ticket=WorkspaceTimerModel.create(view.plan.version,view.plan.dueAt,System.currentTimeMillis(),SystemClock.elapsedRealtime(),boot(c),UUID.randomUUID().toString().replace("-",""));var permit=new PilotPermit(s.mode(),s.slot(),target,contact.revision,a.key,installation(c),ticket);disabled(c);cancelAlarm(c);write(c,encode(permit,"READY"));try{am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP,ticket.dueElapsed,alarmIntent(c,ticket.token,PendingIntent.FLAG_UPDATE_CURRENT));}catch(Exception e){disabled(c);cancelAlarm(c);s.pausePlan(s.plan().plan.version);throw e;}
  }
 }}
 static void fire(Context c,String token){synchronized(LOCK){try{JSONObject e=envelope(c);if(!e.getString("state").equals("READY"))return;PilotPermit p=decode(e);if(token==null||!p.ticket.token.equals(token))return;submit(c,p);}catch(Exception ex){try{disabled(c);cancelAlarm(c);}catch(Exception ignored){}saveOutcome(c,"STOPPED_WITHOUT_RETRY");}}}
 static void result(Context c,String attempt,long revision,String result,boolean closeUnknown)throws Exception{synchronized(LOCK){if(!envelope(c).getString("state").equals("DISABLED"))throw new IllegalStateException("STOP_PENDING_SUBMISSION_FIRST");try(PhoneIntakeStore s=PhoneIntakeStore.open(c,DataClass.LOCAL_PHONE_INTAKE)){PhoneIntakeStore.PilotGuard idleGuard=()->{if(!idle(c))throw new Exception("BUSY");};if(closeUnknown)s.closePilotUnknown(attempt,revision,true,idleGuard);else s.recordPilotResult(attempt,revision,result,idleGuard);}}}
 static JSONObject snapshot(Context c)throws Exception{synchronized(LOCK){JSONObject j=new JSONObject().put("source","CONTROLLED_PILOT_UI").put("productionAuthenticated",false).put("outgoingConfirmed",JSONObject.NULL).put("connectedConfirmed",JSONObject.NULL).put("actualPhoneCalls",JSONObject.NULL);JSONObject e=envelope(c);j.put("armed",e.getString("state").equals("READY")).put("sending",e.getString("state").equals("CONSUMING"));j.put("callPermission",granted(c,Manifest.permission.CALL_PHONE)).put("statePermission",granted(c,Manifest.permission.READ_PHONE_STATE)).put("numberPermission",granted(c,Manifest.permission.READ_PHONE_NUMBERS));AlarmManager am=c.getSystemService(AlarmManager.class);j.put("exactAlarmAllowed",am!=null&&am.canScheduleExactAlarms());ActivityManager activity=c.getSystemService(ActivityManager.class);j.put("backgroundRestricted",activity==null||activity.isBackgroundRestricted());j.put("dialWindow",SalesPlanModel.window(System.currentTimeMillis()));try{Account a=selectedAccount(c);j.put("simLabel",a.label).put("simNumber",a.maskedNumber);}catch(Exception ex){j.put("simLabel","").put("simNumber","");}try{j.put("idle",idle(c));}catch(Exception ex){j.put("idle",JSONObject.NULL);}return j;}}
}
