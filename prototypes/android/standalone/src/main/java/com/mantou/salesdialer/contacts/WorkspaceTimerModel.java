package com.mantou.salesdialer.contacts;
/** Single synthetic alarm ticket. It is never a telephone permission. */
public final class WorkspaceTimerModel {
 public static final class Ticket {
  public final long version,dueWall,dueElapsed;public final String boot,token;
  public Ticket(long version,long dueWall,long dueElapsed,String boot,String token){this(version,dueWall,dueElapsed,boot,token,false);}
  Ticket(long version,long dueWall,long dueElapsed,String boot,String token,boolean controlledException){if(version<1||dueElapsed<0||dueElapsed>Long.MAX_VALUE-30000||boot==null||boot.isBlank()||boot.length()>80||token==null||!token.matches("[a-f0-9]{32}"))throw new IllegalArgumentException("INVALID_TIMER_TICKET");SalesPlanModel.time(dueWall);if(!controlledException&&!SalesPlanModel.window(dueWall))throw new IllegalArgumentException("OUTSIDE_WINDOW");this.version=version;this.dueWall=dueWall;this.dueElapsed=dueElapsed;this.boot=boot;this.token=token;}
 }
 public static Ticket create(long version,long due,long wall,long elapsed,String boot,String token){SalesPlanModel.time(wall);if(elapsed<0||boot==null||boot.isBlank())throw new IllegalStateException("EXECUTION_CLOCK_UNKNOWN");if(due<wall)throw new IllegalStateException("PAST_DUE");long dueElapsed;try{dueElapsed=Math.addExact(elapsed,due-wall);}catch(ArithmeticException e){throw new IllegalArgumentException("INVALID_TIMER_TICKET");}return new Ticket(version,due,dueElapsed,boot,token);}
 public static String status(Ticket t,long version,String token,long wall,long elapsed,String boot){return status(t,version,token,wall,elapsed,boot,false);}
 static String status(Ticket t,long version,String token,long wall,long elapsed,String boot,boolean controlledException){if(t==null||t.version!=version||!t.token.equals(token))return "STALE_TIMER";if(!t.boot.equals(boot)||elapsed<0)return "TIMER_CLOCK_CHANGED";if(wall<t.dueWall||elapsed<t.dueElapsed)return "EARLY_TIMER";long w=wall-t.dueWall,m=elapsed-t.dueElapsed;if(w>30000||m>30000)return "EXPIRED";if(Math.abs(w-m)>2000)return "TIMER_CLOCK_CHANGED";if(!controlledException&&!SalesPlanModel.window(wall))return "OUTSIDE_WINDOW";return "DUE";}
}
