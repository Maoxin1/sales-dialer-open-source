package com.mantou.salesdialer.contacts;
import java.util.*;import java.time.*;import java.time.format.*;import java.nio.charset.StandardCharsets;import java.security.MessageDigest;
import com.mantou.salesdialer.contacts.ContactTaskModel.*;import com.mantou.salesdialer.contacts.SyntheticAttemptModel.Snapshot;
/** Local synthetic workspace input/presentation rules, never production identity or phone input. */
public final class SyntheticWorkspaceModel {
 public static final String KIND="SYNTHETIC_WORKSPACE",INPUT_SOURCE="SYNTHETIC_UI_INPUT",CHANGE_SOURCE="SYNTHETIC_UI_CHANGE";
 public static Actor actor(){return new Actor("SYNTHETIC-WORKSPACE","LOCAL-SALES",EnumSet.allOf(Permission.class));}
 public static final class Batch {public final List<String> ids;public final int duplicates,blanks;private Batch(List<String> ids,int duplicates,int blanks){this.ids=List.copyOf(ids);this.duplicates=duplicates;this.blanks=blanks;}}
 public static Batch parse(String text){
  if(text==null||text.length()>8000)throw new IllegalArgumentException("INPUT_TOO_LARGE");String[] lines=text.split("\\R",-1);if(lines.length>200)throw new IllegalArgumentException("TOO_MANY_LINES");LinkedHashSet<String> ids=new LinkedHashSet<>();int duplicates=0,blanks=0;
  for(int i=0;i<lines.length;i++){String id=lines[i].trim();if(id.isEmpty()){blanks++;continue;}if(!id.matches("SIM-[0-9]{3}"))throw new IllegalArgumentException("INVALID_LINE_"+(i+1));if(!ids.add(id))duplicates++;}return new Batch(new ArrayList<>(ids),duplicates,blanks);
 }
 public static String key(String id){
  if(id==null||!id.matches("SIM-[0-9]{3}"))throw new IllegalArgumentException("INVALID_SYNTHETIC_ID");try{byte[] bytes=MessageDigest.getInstance("SHA-256").digest(("SYNTHETIC-WORKSPACE:"+id).getBytes(StandardCharsets.UTF_8));StringBuilder s=new StringBuilder();for(byte b:bytes)s.append(Character.forDigit((b&255)>>>4,16)).append(Character.forDigit(b&15,16));return s.toString();}catch(Exception e){throw new IllegalStateException("SYNTHETIC_KEY_FAILURE",e);}
 }
 private static final class Labels {static final Map<String,String> VALUES=labels();private static Map<String,String> labels(){Map<String,String> rows=new HashMap<>();for(int i=0;i<1000;i++){String id=String.format(Locale.ROOT,"SIM-%03d",i);rows.put(key(id),id);}return Map.copyOf(rows);}}
 public static String label(String key){String label=Labels.VALUES.get(key);if(label==null)throw new IllegalStateException("FOREIGN_WORKSPACE_TARGET");return label;}
 public static long parseTime(String text){try{return LocalDateTime.parse(text.trim(),DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm",Locale.ROOT).withResolverStyle(ResolverStyle.STRICT)).toInstant(ZoneOffset.ofHours(8)).toEpochMilli();}catch(Exception e){throw new IllegalArgumentException("INVALID_BEIJING_TIME");}}
 public static String formatTime(long at){return DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm",Locale.ROOT).format(Instant.ofEpochMilli(at).atZone(ZoneOffset.ofHours(8)));}
 public static final class Counters {
  public final int contacts,attempts,distinctTargets,apiReceipts,pending,manualKnown,closedUnknown;
  public Counters(List<Contact> contacts,List<Snapshot> rows){this.contacts=contacts.size();attempts=rows.size();distinctTargets=(int)rows.stream().map(a->a.targetKey).distinct().count();apiReceipts=(int)rows.stream().filter(a->a.simulatedApiReceipt).count();pending=(int)rows.stream().filter(a->a.state.equals("UNKNOWN")).count();manualKnown=(int)rows.stream().filter(a->Set.of("NO_ANSWER","COMPLETED").contains(a.manualResult)).count();closedUnknown=(int)rows.stream().filter(a->a.unknownClosed).count();}
 }
}
