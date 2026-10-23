package com.mantou.salesdialer.contacts;
import android.content.Context;import java.time.*;import java.util.*;
/** Fixed isolated local-type generated input; only an in-memory recording port, never a phone. */
final class PilotStoreChecks {
 static int run(Context context)throws Exception{String name="pilot-fixture-"+UUID.randomUUID().toString().replace("-","")+".db";long now=Instant.parse("2026-10-19T01:00:00Z").toEpochMilli();Clock clock=Clock.fixed(Instant.ofEpochMilli(now),ZoneOffset.UTC);
  try(PhoneIntakeStore s=PhoneIntakeStore.pilotFixture(context,name,clock,p->{})){String id=s.importRows(List.of("19900000301"),"GENERATED_PILOT_FIXTURE",PhoneIntakeModel.Qualification.CONFIRMED).rows.get(0).targetId;s.createDraft(id,1);s.arrangeDraft(id,0,1,1,now);var ticket=WorkspaceTimerModel.create(1,now,now,1000,"fixture-boot","a".repeat(32));var permit=new PilotPermit(s.mode(),s.slot(),id,1,"b".repeat(64),"c".repeat(32),ticket);int[] calls={0};String status=s.executePilot(permit,()->{},number->{if(s.pilotAttempts().size()!=1||!s.pilotAttempts().get(0).pending||!s.plan().plan.paused)throw new IllegalStateException("UNKNOWN_MUST_PRECEDE_PORT");calls[0]++;});if(!status.equals("API_SUBMITTED")||calls[0]!=1)throw new IllegalStateException("PILOT_SUBMISSION_REQUIRED");return 1+PilotFailureChecks.run(context);}
 }
}
