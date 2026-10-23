package com.mantou.salesdialer.contacts;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

/** Phone-independent domain rules. Trusted identity/intake are supplied by a future composition layer.
 * No authentication, persistence transaction, plan authorization or telephone adapter is implemented here. */
public final class ContactTaskModel {
    public enum Origin { CONTACT_INTAKE, DEMO, SIMULATED_RECEIPT }
    public enum Qualification { UNKNOWN, CONFIRMED, WITHDRAWN }
    public enum Permission { READ, IMPORT, PLAN, QUALIFY, REFUSE }
    public static final class Actor {
        public final String tenantId,salesId;public final Set<Permission> permissions;
        public Actor(String tenantId,String salesId,Set<Permission> permissions){
            this.tenantId=identifier(tenantId);this.salesId=identifier(salesId);
            this.permissions=Set.copyOf(Objects.requireNonNull(permissions));
        }
    }
    public static final class Input {
        public final Origin origin;public final String targetKey,declarationSource;public final Qualification qualification;
        public Input(Origin origin,String targetKey,Qualification qualification,String declarationSource){this.origin=origin;this.targetKey=targetKey;this.qualification=qualification;this.declarationSource=declarationSource;}
    }
    public static final class Contact {
        public final String id,tenantId,salesId,targetKey,declarationSource;public final Qualification qualification;public final boolean refused;public final long revision;
        private Contact(String id,String tenant,String sales,String target,Qualification qualification,String source,boolean refused,long revision){this.id=id;tenantId=tenant;salesId=sales;targetKey=target;this.qualification=qualification;declarationSource=source;this.refused=refused;this.revision=revision;}
    }
    public static final class Task {
        public final String id,tenantId,salesId,contactId,targetKey;public final long contactRevision;public final String state="DRAFT";
        private Task(Contact c){this(c,c.revision);}
        private Task(Contact c,long revision){id="TASK-"+scopeHash(c.tenantId,c.salesId,c.id);tenantId=c.tenantId;salesId=c.salesId;contactId=c.id;targetKey=c.targetKey;contactRevision=revision;}
    }
    public static final class Admission {
        public final String status;public final Contact contact;public final Task task;
        public final boolean realCallsEnabled=false,productionAuthenticated=false;
        Admission(String status,Contact c){this.status=status;contact=c;task=c==null?null:new Task(c);}
    }
    public static Admission admit(Actor actor,Input input,List<Contact> existing){
        require(actor,Permission.IMPORT);
        if(input==null)throw new IllegalArgumentException("INVALID_INPUT");
        if(input.origin!=Origin.CONTACT_INTAKE)throw new IllegalArgumentException("SOURCE_MISMATCH");
        if(input.targetKey==null||!input.targetKey.matches("[a-f0-9]{64}")||input.qualification==null||!validSource(input.declarationSource))throw new IllegalArgumentException("INVALID_INPUT");
        if(existing==null)throw new IllegalArgumentException("INCONSISTENT_CATALOG");
        Contact matched=null;
        for(Contact c:existing){if(c==null)throw new IllegalArgumentException("INCONSISTENT_CATALOG");if(c.tenantId.equals(actor.tenantId)&&c.targetKey.equals(input.targetKey)){if(matched!=null)throw new IllegalArgumentException("INCONSISTENT_CATALOG");matched=c;}}
        if(matched!=null)return matched.salesId.equals(actor.salesId)?new Admission("DUPLICATE",matched):new Admission("CONFLICT",null);
        Contact c=new Contact("CONTACT-"+scopeHash("CONTACT-V1",actor.tenantId,input.targetKey),actor.tenantId,actor.salesId,input.targetKey,input.qualification,input.declarationSource,false,1);
        return new Admission("IMPORTED",c);
    }
    public static Contact qualify(Actor actor,Contact contact,long revision,Qualification qualification,String source){
        requireOwned(actor,contact,Permission.QUALIFY);requireRevision(contact,revision);
        if(contact.refused)throw new IllegalStateException("DO_NOT_CONTACT");
        if(qualification==null||!validSource(source))throw new IllegalArgumentException("INVALID_INPUT");
        return new Contact(contact.id,contact.tenantId,contact.salesId,contact.targetKey,qualification,source,false,Math.addExact(contact.revision,1));
    }
    public static Contact refuse(Actor actor,Contact contact,long revision){
        requireOwned(actor,contact,Permission.REFUSE);requireRevision(contact,revision);
        if(contact.refused)return contact;
        return new Contact(contact.id,contact.tenantId,contact.salesId,contact.targetKey,contact.qualification,contact.declarationSource,true,Math.addExact(contact.revision,1));
    }
    public static Task draft(Actor actor,Contact contact){requireOwned(actor,contact,Permission.PLAN);return new Task(contact);}
    public static Task refreshDraft(Actor actor,Task task,Contact contact,long expectedContactRevision,long expectedDraftRevision){
        requireOwned(actor,contact,Permission.PLAN);
        if("FORBIDDEN".equals(planningStatus(actor,task,contact)))throw new IllegalStateException("FORBIDDEN");
        if(expectedContactRevision<1||expectedDraftRevision<1)throw new IllegalArgumentException("INVALID_REVISION");
        requireRevision(contact,expectedContactRevision);
        if(contact.refused)throw new IllegalStateException("DO_NOT_CONTACT");
        if(contact.qualification!=Qualification.CONFIRMED)throw new IllegalStateException("CONTACT_NOT_QUALIFIED");
        if(expectedDraftRevision>task.contactRevision)throw new IllegalStateException("STALE_DRAFT");
        if(task.contactRevision==contact.revision)return task;
        if(expectedDraftRevision!=task.contactRevision)throw new IllegalStateException("STALE_DRAFT");
        return new Task(contact);
    }
    public static String planningStatus(Actor actor,Task task,Contact contact){
        if(actor==null||!actor.permissions.contains(Permission.PLAN)||!owned(actor,contact)||task==null||!task.tenantId.equals(actor.tenantId)||!task.salesId.equals(actor.salesId)||!task.contactId.equals(contact.id)||!task.targetKey.equals(contact.targetKey))return "FORBIDDEN";
        if(task.contactRevision!=contact.revision)return "STALE_CONTACT";
        if(contact.refused)return "DO_NOT_CONTACT";
        if(contact.qualification!=Qualification.CONFIRMED)return "CONTACT_NOT_QUALIFIED";
        return "ELIGIBLE_FOR_PLANNING"; // Not a plan, grant, permit or permission to dial.
    }
    public static String nativeId(String kind,String value){if(kind==null||!Set.of("TARGET","TENANT","SALES","TASK","ATTEMPT","TICKET","PERMIT","INTENT").contains(kind))throw new IllegalArgumentException("INVALID_NATIVE_KIND");return kind+"-"+digest(identifier(value));}
    static Contact restoreContact(String id,String tenant,String sales,String target,String origin,Qualification q,String source,boolean refused,long revision){
        try{identifier(tenant);identifier(sales);if(!"CONTACT_INTAKE".equals(origin)||target==null||!target.matches("[a-f0-9]{64}")||q==null||!validSource(source)||revision<1||!Objects.equals(id,"CONTACT-"+scopeHash("CONTACT-V1",tenant,target)))throw new IllegalArgumentException();
            return new Contact(id,tenant,sales,target,q,source,refused,revision);
        }catch(RuntimeException e){throw new IllegalStateException("INVALID_STORED_CONTACT");}
    }
    static Task restoreTask(String id,Contact c,String tenant,String sales,String target,long revision,String state){
        if(c==null||!Objects.equals(tenant,c.tenantId)||!Objects.equals(sales,c.salesId)||!Objects.equals(target,c.targetKey)||revision<1||revision>c.revision||!"DRAFT".equals(state))throw new IllegalStateException("INVALID_STORED_TASK");
        Task t=new Task(c,revision);if(!t.id.equals(id))throw new IllegalStateException("INVALID_STORED_TASK");return t;
    }
    private static boolean validSource(String s){return s!=null&&!s.isBlank()&&s.length()<=200;}
    private static boolean owned(Actor a,Contact c){return a!=null&&c!=null&&a.tenantId.equals(c.tenantId)&&a.salesId.equals(c.salesId);}
    private static void require(Actor a,Permission permission){if(a==null||!a.permissions.contains(permission))throw new IllegalStateException("FORBIDDEN");}
    private static void requireOwned(Actor a,Contact c,Permission p){require(a,p);if(!owned(a,c))throw new IllegalStateException("FORBIDDEN");}
    private static void requireRevision(Contact c,long revision){if(revision!=c.revision)throw new IllegalStateException("STALE_CONTACT");}
    private static String identifier(String value){if(value==null||value.isBlank()||value.length()>200||!value.equals(value.trim())||value.chars().anyMatch(Character::isISOControl)||!StandardCharsets.UTF_8.newEncoder().canEncode(value))throw new IllegalArgumentException("INVALID_IDENTITY");return value;}
    private static String digest(String value){try{byte[] bytes=MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));StringBuilder s=new StringBuilder();for(byte b:bytes)s.append(String.format(Locale.ROOT,"%02X",b&255));return s.toString();}catch(Exception e){throw new IllegalArgumentException("INVALID_ID",e);}}
    private static String scopeHash(String... values){StringBuilder s=new StringBuilder();for(String v:values)s.append(v.length()).append(':').append(v);return digest(s.toString());}
}
