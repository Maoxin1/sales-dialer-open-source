package com.mantou.salesdialer.contacts;
import java.time.Instant;
public final class OperatorBatchPolicyCheck {
 static int checks;static void check(boolean v){if(!v)throw new AssertionError("batch policy "+checks);checks++;}
 public static void main(String[] args){long morning=Instant.parse("2026-10-19T01:00:00Z").toEpochMilli(),end=Instant.parse("2026-10-19T10:00:00Z").toEpochMilli()-1;
 check(OperatorBatchPolicy.dayEnd(morning)==end);check(OperatorBatchPolicy.valid(morning,morning,end,201,201));check(OperatorBatchPolicy.valid(end,morning,end,1,1));check(!OperatorBatchPolicy.valid(end+1,morning,end,1,1));check(!OperatorBatchPolicy.valid(morning-1,morning,end,1,1));check(!OperatorBatchPolicy.valid(morning,morning,end+86400000,1,1));check(!OperatorBatchPolicy.valid(morning,morning,end,0,0));check(!OperatorBatchPolicy.valid(morning,morning,end,2,1));check(!OperatorBatchPolicy.valid(morning,morning,end,10001,10001));check(OperatorBatchPolicy.valid(morning,morning,end,10000,10000));long sunday=morning-86400000;check(!OperatorBatchPolicy.valid(sunday,sunday,OperatorBatchPolicy.dayEnd(sunday),1,1));System.out.println("OperatorBatchPolicyCheck "+checks+" passed; no phone adapter");}
}
