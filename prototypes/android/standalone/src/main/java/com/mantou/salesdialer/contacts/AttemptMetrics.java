package com.mantou.salesdialer.contacts;
import java.util.*;import java.time.*;
/** Counts persisted authorization cohorts; never infers carrier outgoing or connection events. */
public final class AttemptMetrics {
 public static final class Entry {
  public final String id,targetId,manualResult;public final long claimedAt;public final boolean apiAccepted,unknownClosed;
  public Entry(String id,String target,long time,boolean api,String result,boolean closed){if(id==null||!id.matches("LOCAL-ATTEMPT-[A-F0-9]{64}")||target==null||!target.matches("LOCAL-TARGET-[a-f0-9]{32}")||time<=0||result==null||!Set.of("","UNKNOWN","NO_ANSWER","COMPLETED").contains(result)||(closed&&!result.equals("UNKNOWN")))throw new IllegalArgumentException("INVALID_METRIC_ENTRY");this.id=id;targetId=target;claimedAt=time;apiAccepted=api;manualResult=result;unknownClosed=closed;}
 }
 public static final class Summary {
  public final long distinctTargets,authorizedAttempts,apiAccepted,pending,manualNoAnswer,manualCompleted,manualUnknown,closedUnknown;
  public final Long actualOutgoing=null,actualConnected=null;
  Summary(long targets,long attempts,long api,long waiting,long noAnswer,long completed,long unknown,long closed){distinctTargets=targets;authorizedAttempts=attempts;apiAccepted=api;pending=waiting;manualNoAnswer=noAnswer;manualCompleted=completed;manualUnknown=unknown;closedUnknown=closed;}
 }
 public static Summary summarize(List<Entry> input,long fromInclusive,long toExclusive){if(input==null||fromInclusive<0||toExclusive<=fromInclusive)throw new IllegalArgumentException("INVALID_METRIC_INPUT");List<Entry> rows;try{rows=List.copyOf(input);}catch(NullPointerException e){throw new IllegalArgumentException("INVALID_METRIC_INPUT");}Set<String> ids=new HashSet<>(),targets=new HashSet<>();long attempts=0,api=0,waiting=0,noAnswer=0,completed=0,unknown=0,closed=0;
  for(var row:rows){if(!ids.add(row.id))throw new IllegalArgumentException("DUPLICATE_METRIC_ATTEMPT");if(row.claimedAt<fromInclusive||row.claimedAt>=toExclusive)continue;targets.add(row.targetId);attempts++;if(row.apiAccepted)api++;if(!row.unknownClosed&&(row.manualResult.isEmpty()||row.manualResult.equals("UNKNOWN")))waiting++;if(row.manualResult.equals("NO_ANSWER"))noAnswer++;if(row.manualResult.equals("COMPLETED"))completed++;if(row.manualResult.equals("UNKNOWN"))unknown++;if(row.unknownClosed)closed++;}return new Summary(targets.size(),attempts,api,waiting,noAnswer,completed,unknown,closed);}
 public static long[] beijingDay(LocalDate date){Objects.requireNonNull(date);long start=date.atStartOfDay(ZoneOffset.ofHours(8)).toInstant().toEpochMilli();return new long[]{start,date.plusDays(1).atStartOfDay(ZoneOffset.ofHours(8)).toInstant().toEpochMilli()};}
}
