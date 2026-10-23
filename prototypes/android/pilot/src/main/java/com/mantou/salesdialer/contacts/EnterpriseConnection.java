package com.mantou.salesdialer.contacts;
import android.content.Context;import android.util.AtomicFile;import java.io.*;import java.net.*;import java.nio.charset.StandardCharsets;import java.security.*;import java.security.cert.*;import java.util.*;import javax.net.ssl.*;import org.json.*;
/** Native-only pairing. APK assets keep their fixed virtual origin; credentials travel over paired TLS. */
final class EnterpriseConnection {
 private static AtomicFile file(Context c){return new AtomicFile(new File(c.getFilesDir(),"enterprise-connection.json"));}
 static boolean privateIp(String host){if(host==null||!host.matches("[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+"))return false;String[] p=host.split("\\.");int[] a=new int[4];try{for(int i=0;i<4;i++){a[i]=Integer.parseInt(p[i]);if(a[i]>255||!Integer.toString(a[i]).equals(p[i]))return false;}}catch(Exception e){return false;}return a[0]==10||a[0]==172&&a[1]>=16&&a[1]<=31||a[0]==192&&a[1]==168;}
 static JSONObject validate(JSONObject j)throws Exception{
  if(j.length()!=4||j.getInt("schema")!=1||!j.getString("fingerprint").matches("[a-f0-9]{64}")||!j.getString("key").matches("[A-Za-z0-9_-]{43}"))throw new IllegalArgumentException("INVALID_LAN_PAIRING");
  URI u=new URI(j.getString("origin"));if(!"https".equals(u.getScheme())||!privateIp(u.getHost())||u.getPort()!=8791||u.getRawUserInfo()!=null||u.getRawQuery()!=null||u.getRawFragment()!=null||!u.getRawPath().isEmpty()||!j.getString("origin").equals("https://"+u.getHost()+":8791"))throw new IllegalArgumentException("INVALID_LAN_PAIRING");return j;
 }
 static JSONObject config(Context c)throws Exception{AtomicFile f=file(c);if(!f.getBaseFile().exists())return null;byte[] bytes=f.readFully();if(bytes.length>2048)throw new IOException("INVALID_LAN_PAIRING");return validate(new JSONObject(new String(bytes,StandardCharsets.UTF_8)));}
 private static String tagOf(JSONObject j)throws Exception{return j==null?EnterpriseSession.ORIGIN:j.getString("origin")+"#"+j.getString("fingerprint")+"#"+j.getString("key");}
 static String tag(Context c)throws Exception{return tagOf(config(c));}
 static String label(Context c){try{JSONObject j=config(c);return j==null?"USB本机企业服务":"Wi-Fi企业服务："+j.getString("origin");}catch(Exception e){return "连接配置无效，请重新配对";}}
 static void pair(Context c,String code)throws Exception{if(code==null||code.length()>3000||!code.startsWith("DIALER-LAN-1."))throw new IllegalArgumentException("INVALID_LAN_PAIRING");JSONObject j=validate(new JSONObject(new String(Base64.getUrlDecoder().decode(code.substring(13)),StandardCharsets.UTF_8)));save(c,j);}
 private static void save(Context c,JSONObject j)throws Exception{EnterpriseQueue.disable(c);EnterpriseOperatorBatch.clear(c);try{EnterpriseSession.pauseRemote(c);}catch(Exception ignored){}EnterpriseSession.clear(c);AtomicFile f=file(c);FileOutputStream out=f.startWrite();try{out.write(j.toString().getBytes(StandardCharsets.UTF_8));f.finishWrite(out);}catch(Exception e){f.failWrite(out);throw e;}}
 static void usb(Context c)throws Exception{EnterpriseQueue.disable(c);EnterpriseOperatorBatch.clear(c);try{EnterpriseSession.pauseRemote(c);}catch(Exception ignored){}EnterpriseSession.clear(c);file(c).delete();}
 static HttpURLConnection open(Context c,String path,String expectedTag)throws Exception{
  JSONObject j=config(c);if(!tagOf(j).equals(expectedTag))throw new IllegalStateException("CONNECTION_CHANGED_LOGIN_REQUIRED");if(j==null)return (HttpURLConnection)new URL(EnterpriseSession.ORIGIN+path).openConnection(Proxy.NO_PROXY);
  String expected=j.getString("fingerprint");HttpsURLConnection conn=(HttpsURLConnection)new URL(j.getString("origin")+path).openConnection(Proxy.NO_PROXY);
  X509TrustManager trust=new X509TrustManager(){public java.security.cert.X509Certificate[] getAcceptedIssuers(){return new java.security.cert.X509Certificate[0];}public void checkClientTrusted(java.security.cert.X509Certificate[] chain,String type)throws CertificateException{throw new CertificateException("CLIENT_CERT_NOT_USED");}public void checkServerTrusted(java.security.cert.X509Certificate[] chain,String type)throws CertificateException{if(chain==null||chain.length!=1)throw new CertificateException("LAN_CERT_MISMATCH");chain[0].checkValidity();try{byte[] actual=MessageDigest.getInstance("SHA-256").digest(chain[0].getEncoded());StringBuilder s=new StringBuilder();for(byte b:actual)s.append(String.format(Locale.ROOT,"%02x",b&255));if(!MessageDigest.isEqual(s.toString().getBytes(StandardCharsets.US_ASCII),expected.getBytes(StandardCharsets.US_ASCII)))throw new CertificateException("LAN_CERT_MISMATCH");}catch(GeneralSecurityException e){throw new CertificateException("LAN_CERT_MISMATCH",e);}}};
  SSLContext ssl=SSLContext.getInstance("TLS");ssl.init(null,new TrustManager[]{trust},null);conn.setSSLSocketFactory(ssl.getSocketFactory()); // Default hostname verification remains enabled.
  conn.setRequestProperty("X-Sales-Pairing",j.getString("key"));return conn;
 }
}
