package com.mantou.salesdialer.spike;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
public final class ControlledReconcileRules {
 private static boolean key(String v){return v!=null&&v.matches("[a-f0-9]{64}");}
 public static boolean allowed(String storedDigest,String suppliedDigest,String storedTokenHash,String suppliedToken,String expectedInstallation,String currentInstallation,boolean confirmed,Boolean busy){
  if(!confirmed||!Boolean.FALSE.equals(busy)||!key(storedDigest)||!storedDigest.equals(suppliedDigest)||!key(storedTokenHash)||!key(suppliedToken)||!key(expectedInstallation)||!expectedInstallation.equals(currentInstallation))return false;
  try{StringBuilder h=new StringBuilder();for(byte b:MessageDigest.getInstance("SHA-256").digest(suppliedToken.getBytes(StandardCharsets.UTF_8)))h.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return MessageDigest.isEqual(storedTokenHash.getBytes(StandardCharsets.UTF_8),h.toString().getBytes(StandardCharsets.UTF_8));}catch(Exception e){return false;}
 }
 public static String completionState(String current,String incoming){return "RECONCILED".equals(current)?current:incoming;}
}
