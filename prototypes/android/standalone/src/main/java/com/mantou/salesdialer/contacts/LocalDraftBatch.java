package com.mantou.salesdialer.contacts;
import java.util.*;
import com.mantou.salesdialer.contacts.PhoneIntakeModel.DataClass;
/** A metadata-only preview; contains neither telephone numbers nor call grants. */
public final class LocalDraftBatch {
 public enum Status { CREATE, EXISTING_CURRENT, EXISTING_STALE, NOT_QUALIFIED, REFUSED }
 public static final class Row {public final String targetId;public final long contactRevision,draftRevision;public final Status status;Row(String t,long c,long d,Status s){targetId=t;contactRevision=c;draftRevision=d;status=s;}}
 public static final class Preview {
  public final DataClass dataClass;public final List<Row> rows;private final String slot,fingerprint;
  Preview(DataClass d,String s,List<Row> r,String f){dataClass=d;slot=s;rows=List.copyOf(r);fingerprint=f;}
  public long count(Status s){return rows.stream().filter(r->r.status==s).count();}
  public boolean sameSnapshot(Preview other){return other!=null&&dataClass==other.dataClass&&slot.equals(other.slot)&&fingerprint.equals(other.fingerprint);}
 }
 public static Preview prepare(DataClass mode,String slot,List<LocalDraftBinding.Snapshot> contacts,List<LocalDraftBinding.Draft> drafts){if(mode==null||slot==null||!slot.matches("[a-f0-9]{32}")||contacts==null||drafts==null)throw new IllegalArgumentException("INVALID_BATCH_SNAPSHOT");
  List<LocalDraftBinding.Snapshot> input;List<LocalDraftBinding.Draft> previous;try{input=List.copyOf(contacts);previous=List.copyOf(drafts);}catch(NullPointerException e){throw new IllegalArgumentException("INVALID_BATCH_SNAPSHOT");}
  Map<String,LocalDraftBinding.Snapshot> byId=new TreeMap<>();for(var c:input){if(c.dataClass!=mode||!slot.equals(c.slot)||byId.put(c.targetId,c)!=null)throw new IllegalArgumentException("INVALID_BATCH_SNAPSHOT");}
  Map<String,LocalDraftBinding.Draft> byDraft=new HashMap<>();for(var d:previous){var c=byId.get(d.targetId);if(c==null||d.dataClass!=mode||!slot.equals(d.slot)||d.contactRevision>c.revision||byDraft.put(d.targetId,d)!=null||LocalDraftBinding.status(c,d).equals("FORBIDDEN"))throw new IllegalArgumentException("INVALID_BATCH_SNAPSHOT");}
  List<Row> result=new ArrayList<>();for(var c:byId.values()){var d=byDraft.get(c.targetId);Status state;
   try{LocalDraftBinding.create(c);state=d==null?Status.CREATE:(LocalDraftBinding.status(c,d).equals("ELIGIBLE_FOR_PLANNING")?Status.EXISTING_CURRENT:Status.EXISTING_STALE);}
   catch(IllegalStateException e){if("DO_NOT_CONTACT".equals(e.getMessage()))state=Status.REFUSED;else if("CONTACT_NOT_QUALIFIED".equals(e.getMessage()))state=Status.NOT_QUALIFIED;else throw e;}
   result.add(new Row(c.targetId,c.revision,d==null?0:d.contactRevision,state));
  }
  try{var bytes=new java.io.ByteArrayOutputStream();var out=new java.io.DataOutputStream(bytes);out.writeUTF(mode.name());out.writeUTF(slot);out.writeInt(result.size());for(var r:result){out.writeUTF(r.targetId);out.writeLong(r.contactRevision);out.writeLong(r.draftRevision);out.writeUTF(r.status.name());}out.flush();byte[] hash=java.security.MessageDigest.getInstance("SHA-256").digest(bytes.toByteArray());StringBuilder hex=new StringBuilder(64);for(byte b:hash){hex.append("0123456789abcdef".charAt((b>>>4)&15));hex.append("0123456789abcdef".charAt(b&15));}String digest=hex.toString();return new Preview(mode,slot,result,digest);}catch(java.io.IOException|java.security.NoSuchAlgorithmException e){throw new IllegalStateException("BATCH_SNAPSHOT_FAILED",e);}}
}
