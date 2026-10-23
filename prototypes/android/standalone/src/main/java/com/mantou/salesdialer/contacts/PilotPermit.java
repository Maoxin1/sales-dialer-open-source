package com.mantou.salesdialer.contacts;
import com.mantou.salesdialer.contacts.PhoneIntakeModel.DataClass;
/** One explicitly authorized local pilot plan. Not enterprise identity or an unlimited dial grant. */
public final class PilotPermit {
 public final String slot,targetId,accountKey,installationKey;public final long contactRevision;public final WorkspaceTimerModel.Ticket ticket;
 public PilotPermit(DataClass kind,String slot,String target,long revision,String account,String installation,WorkspaceTimerModel.Ticket ticket){
  if(kind!=DataClass.LOCAL_PHONE_INTAKE)throw new IllegalArgumentException("FORMAT_FIXTURE_ONLY");if(slot==null||!slot.matches("[a-f0-9]{32}")||target==null||!target.matches("LOCAL-TARGET-[a-f0-9]{32}")||revision<1||account==null||!account.matches("[a-f0-9]{64}")||installation==null||!installation.matches("[a-f0-9]{32}")||ticket==null)throw new IllegalArgumentException("INVALID_PILOT_PERMIT");this.slot=slot;targetId=target;contactRevision=revision;accountKey=account;installationKey=installation;this.ticket=ticket;
 }
 public void due(long wall,long elapsed,String boot){String status=WorkspaceTimerModel.status(ticket,ticket.version,ticket.token,wall,elapsed,boot);if(!status.equals("DUE"))throw new IllegalStateException(status);}
 public String fingerprint(){try{var digest=java.security.MessageDigest.getInstance("SHA-256");for(String value:new String[]{"LOCAL_PILOT_V1",slot,targetId,Long.toString(contactRevision),accountKey,installationKey,Long.toString(ticket.version),Long.toString(ticket.dueWall),Long.toString(ticket.dueElapsed),ticket.boot,ticket.token}){byte[] b=value.getBytes(java.nio.charset.StandardCharsets.UTF_8);digest.update(java.nio.ByteBuffer.allocate(4).putInt(b.length).array());digest.update(b);}StringBuilder result=new StringBuilder();for(byte b:digest.digest())result.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return result.toString();}catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException("PILOT_DIGEST_FAILED");}}
}
