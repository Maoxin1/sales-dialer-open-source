package com.mantou.salesdialer.standalone;

import java.util.function.LongSupplier;

/** Explicit namespace boundary. This APK contains only a simulation port. */
public final class TaskSubmissionBridge {
    public enum Source { SIMULATION, CONTROLLED_REAL }
    public interface SimulationPort {void submit(String demoTarget,String attemptId)throws Exception;}
    public static final class Receipt {
        public final String status,apiSubmission;
        public final boolean realCallsEnabled=false,nativeAdapterLinked=false;
        public final Boolean outgoingConfirmed=null,connectedConfirmed=null;
        Receipt(String status,String apiSubmission){this.status=status;this.apiSubmission=apiSubmission;}
    }
    private final TaskEngine engine;private final SimulationPort simulation;
    public TaskSubmissionBridge(TaskEngine engine){this(engine,(target,attempt)->{});}
    public TaskSubmissionBridge(TaskEngine engine,SimulationPort simulation){this.engine=java.util.Objects.requireNonNull(engine);this.simulation=java.util.Objects.requireNonNull(simulation);}
    public Receipt submit(Source source,String target,long version)throws Exception {
        if(source==null)return new Receipt("INVALID_SOURCE","NOT_SUBMITTED");
        // No permit, flag, Intent or target can attach a real sender to this build.
        if(source==Source.CONTROLLED_REAL)return inspectReal();
        if(target==null||!target.matches("DEMO-[0-9]{3}"))return new Receipt("INVALID_DEMO_TARGET","NOT_SUBMITTED");
        String status=engine.trigger(target,version,this::simulate);
        return new Receipt(status,status.equals("SIMULATED_API_SUBMITTED")?"SIMULATED":status.equals("RECONCILE_REQUIRED")?"UNKNOWN":"NOT_SUBMITTED");
    }
    private void simulate(String target)throws Exception {
        TaskEngine.Task task=engine.snapshot().tasks.stream().filter(t->t.id.equals(target)).findFirst().orElseThrow();
        if(!target.matches("DEMO-[0-9]{3}")||task.state!=TaskEngine.UNKNOWN)throw new IllegalStateException("SIMULATION_CLAIM_REQUIRED");
        simulation.submit(target,task.attemptId());
    }
    public String fire(long version,int boot,LongSupplier elapsed)throws Exception{return engine.fire(version,boot,elapsed,this::simulate);}
    public Receipt inspectReal(){return new Receipt("REAL_ADAPTER_NOT_LINKED","NOT_SUBMITTED");}
}
