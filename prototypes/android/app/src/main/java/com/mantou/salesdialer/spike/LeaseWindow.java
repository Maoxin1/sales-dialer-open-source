package com.mantou.salesdialer.spike;
/** Pure elapsed-time guard shared by Android and the local JVM regression harness. */
public final class LeaseWindow {
    private LeaseWindow(){}
    public static boolean valid(long now,long issued,long expires,long deadline,int currentBoot,int leaseBoot){
        return currentBoot>=0&&currentBoot==leaseBoot&&issued>=0&&expires>issued&&expires-issued<=60000
            &&deadline>issued&&deadline<=expires&&now>=issued&&now<deadline;
    }
}
