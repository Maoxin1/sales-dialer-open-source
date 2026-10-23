package com.mantou.salesdialer.contacts;
import java.time.*;
/** Pure scope rules for an explicitly confirmed same-day operator batch. */
final class OperatorBatchPolicy {
 static long dayEnd(long at){return Instant.ofEpochMilli(at).atOffset(ZoneOffset.ofHours(8)).toLocalDate().atTime(18,0).toInstant(ZoneOffset.ofHours(8)).toEpochMilli()-1;}
 static boolean valid(long now,long from,long until,int count,int targets){return count>=1&&count<=10000&&count==targets&&SalesPlanModel.window(from)&&SalesPlanModel.window(now)&&until==dayEnd(from)&&now>=from&&now<=until;}
}
