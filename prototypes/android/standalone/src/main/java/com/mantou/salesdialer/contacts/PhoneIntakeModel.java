package com.mantou.salesdialer.contacts;
import java.util.*;
/** Local phone intake grammar only; it neither authenticates a seller nor authorizes a call. */
public final class PhoneIntakeModel {
 public enum DataClass { LOCAL_PHONE_INTAKE, FORMAT_FIXTURE }
 public enum Qualification { UNKNOWN, CONFIRMED, WITHDRAWN }
 public static final class Parsed {public final String status,canonical;Parsed(String status,String canonical){this.status=status;this.canonical=canonical;}}
 public static Parsed parse(String raw){if(raw==null||raw.length()>128)return new Parsed("INVALID",null);String v=trim(raw);if(v.matches("1[3-9][0-9]{9}"))return new Parsed("VALID",v);return new Parsed(v.length()>=7&&v.matches("[+0-9() .#-]+")?"UNSUPPORTED":"INVALID",null);}
 static String trim(String raw){int a=0,b=raw.length();while(a<b&&space(raw.charAt(a)))a++;while(b>a&&space(raw.charAt(b-1)))b--;return raw.substring(a,b);}
 private static boolean space(char c){return c>=9&&c<=13||c==32||c==0xa0||c==0x1680||c>=0x2000&&c<=0x200a||c==0x2028||c==0x2029||c==0x202f||c==0x205f||c==0x3000||c==0xfeff;}
 public static String mask(String canonical){if(canonical==null||!canonical.matches("1[3-9][0-9]{9}"))throw new IllegalArgumentException("INVALID_CANONICAL");return canonical.substring(0,3)+"****"+canonical.substring(7);}
 public static List<String> rows(String text){if(text==null||text.length()>26000)throw new IllegalArgumentException("INVALID_BATCH");List<String> rows=List.of(text.split("\\r\\n|\\n|\\r",-1));validate(rows,"INPUT",Qualification.UNKNOWN);return rows;}
 public static void validate(List<String> rows,String source,Qualification q){if(rows==null||rows.isEmpty()||rows.size()>200||rows.stream().anyMatch(r->r==null||r.length()>128)||source==null||source.length()>200||trim(source).isEmpty()||q==null)throw new IllegalArgumentException("INVALID_BATCH");}
 public static String submissionBoundary(DataClass mode){return mode==DataClass.FORMAT_FIXTURE?"FORMAT_FIXTURE_ONLY":"PRODUCTION_IDENTITY_UNVERIFIED";}
}
