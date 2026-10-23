package com.mantou.salesdialer.standalone;

import android.app.Activity;
import android.os.Bundle;
import android.util.AtomicFile;
import android.widget.*;
import android.text.InputType;
import java.io.*;

/** Independent, local, manual simulation UI. No phone permissions, Intents or real numbers. */
public final class MainActivity extends Activity {
    private static TaskEngine engine;
    private TextView status;private String message="";
    interface Action {void run() throws Exception;}
    @Override public void onCreate(Bundle saved){
        super.onCreate(saved);
        LinearLayout layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);layout.setPadding(24,48,24,24);
        ScrollView scroll=new ScrollView(this);scroll.addView(layout);setContentView(scroll);
        TextView title=new TextView(this);title.setText("销售任务仿真\n仅演示数据，不拨打电话。支持人工或30秒后单次模拟；定时需要闹钟和提醒权限，超30秒跳过。\n工作日北京时间09:00–18:00可模拟提交。");layout.addView(title);
        status=new TextView(this);layout.addView(status);
        button(layout,"打开合成任务工作区",()->startActivity(new android.content.Intent(this,com.mantou.salesdialer.contacts.SyntheticWorkspaceActivity.class)));
        button(layout,"打开本机号码暂存",()->startActivity(new android.content.Intent(this,com.mantou.salesdialer.contacts.PhoneIntakeActivity.class)));
        try{engine=AppRuntime.open(this,true);}catch(Exception e){status.setText("本地状态读取失败，已停止。保留数据，不能重置后继续。");return;}
        button(layout,"追加3条演示任务",()->engine.appendDemo());button(layout,"30秒后模拟下一条",()->AppRuntime.arm(this));
        button(layout,"导入合成名单",()->importDemoList());
        button(layout,"检查联系人模型",()->startActivity(new android.content.Intent(this,ContactModelCheckActivity.class)));
        button(layout,"检查联系人存储",()->startActivity(new android.content.Intent(this,com.mantou.salesdialer.contacts.ContactStoreCheckActivity.class)));
        button(layout,"检查草稿刷新",()->startActivity(new android.content.Intent(this,com.mantou.salesdialer.contacts.ContactStoreCheckActivity.class).putExtra("phase","draft-all")));
        button(layout,"检查任务计划",()->startActivity(new android.content.Intent(this,com.mantou.salesdialer.contacts.ContactStoreCheckActivity.class).putExtra("phase","plan-all")));
        button(layout,"检查合成提交闭环",()->startActivity(new android.content.Intent(this,com.mantou.salesdialer.contacts.SyntheticLoopCheckActivity.class)));
        button(layout,"检查真实拨号状态",()->{TaskSubmissionBridge.Receipt r=AppRuntime.bridge(this).inspectReal();new android.app.AlertDialog.Builder(this).setTitle("真实拨号未启用").setMessage("当前使用演示名单，尚未连接真实联系人与拨号服务。\n检查结果："+r.status).setPositiveButton("关闭",null).show();});
        button(layout,"选择目标再次尝试",()->chooseRetry());button(layout,"查看尝试历史",()->showHistory());
        button(layout,"允许精确定时",()->startActivity(new android.content.Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,android.net.Uri.parse("package:"+getPackageName()))));
        button(layout,"创建3条演示任务",()->engine.seed(3));button(layout,"创建200条演示任务",()->engine.seed(200));
        button(layout,"重新安排剩余任务",()->engine.plan());button(layout,"暂停并作废旧计划",()->{engine.pause();AppRuntime.cancel(this);});
        button(layout,"模拟下一条",()->{TaskEngine.Snapshot s=engine.snapshot();TaskEngine.Task next=s.tasks.stream().filter(t->t.state==TaskEngine.PLANNED&&!t.refused).findFirst().orElseThrow(()->new IllegalStateException("没有可执行计划"));message=AppRuntime.bridge(this).submit(TaskSubmissionBridge.Source.SIMULATION,next.id,s.version).status;});
        button(layout,"模拟结果：已接通",()->finish("COMPLETED"));button(layout,"模拟结果：未接",()->finish("NO_ANSWER"));button(layout,"核对为未知结果",()->finish("UNKNOWN"));
        button(layout,"下一条拒绝联系",()->{TaskEngine.Task t=engine.snapshot().tasks.stream().filter(x->x.state!=TaskEngine.FINISHED&&!x.refused).findFirst().orElseThrow(()->new IllegalStateException("无可标记任务"));engine.refuse(t.id);});render();
    }
    @Override protected void onResume(){super.onResume();AppRuntime.visible=true;if(engine!=null)render();}
    @Override protected void onStop(){AppRuntime.visible=false;super.onStop();}
    private void finish(String result)throws Exception{TaskEngine.Task t=engine.snapshot().tasks.stream().filter(x->x.state==TaskEngine.UNKNOWN).findFirst().orElseThrow(()->new IllegalStateException("无待核对任务"));engine.reconcile(t.id,result);}
    private void chooseRetry()throws Exception{
        TaskEngine.Snapshot s=engine.snapshot();java.util.List<TaskEngine.Task> candidates=new java.util.ArrayList<>();
        for(TaskEngine.Task t:s.tasks)if(t.state==TaskEngine.FINISHED)candidates.add(t);
        if(candidates.isEmpty())throw new IllegalStateException("没有已核对的任务");
        String[] labels=candidates.stream().map(t->t.id+" / "+t.result+(t.refused?" / 拒绝联系":"")).toArray(String[]::new);
        new android.app.AlertDialog.Builder(this).setTitle("选择再次尝试目标（准备后需重排）").setItems(labels,(dialog,index)->{
            try{message=engine.retry(candidates.get(index).id,s.version);if(message.equals("RETRY_PREPARED")){AppRuntime.cancel(this);message="已准备再次尝试，历史已保留；请明确重新安排。";}}
            catch(Exception e){message="操作停止："+e.getMessage();}render();
        }).setNegativeButton("取消",null).show();
    }
    private void showHistory()throws Exception{
        StringBuilder text=new StringBuilder();for(TaskEngine.Task t:engine.snapshot().tasks){
            for(TaskEngine.Attempt a:t.history)text.append(a.id).append(" / 模拟回执 ").append(a.api).append(" / ").append(a.result).append('\n');
            if(t.state>=TaskEngine.UNKNOWN)text.append(t.attemptId()).append(" / 模拟回执 ").append(t.api).append(" / ").append(t.result.isEmpty()?"待核对":t.result).append('\n');
        }
        new android.app.AlertDialog.Builder(this).setTitle("尝试历史（均为仿真）").setMessage(text.length()==0?"尚无尝试":text.toString()).setPositiveButton("关闭",null).show();
    }
    private void importDemoList(){
        EditText input=new EditText(this);input.setGravity(android.view.Gravity.TOP|android.view.Gravity.START);input.setMinLines(5);input.setMaxLines(10);input.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_MULTI_LINE|InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS);
        new android.app.AlertDialog.Builder(this).setTitle("导入演示目标")
            .setMessage("每行一个合成ID，例如 DEMO-101。空行忽略，重复ID跳过。仅接受DEMO-三位数字，不接受电话号码。单次最多200行。")
            .setView(input).setNegativeButton("取消",null).setPositiveButton("导入",(dialog,which)->{
                try{TaskEngine.ImportResult r=engine.importDemoLines(input.getText().toString());message="导入完成：新增"+r.added+"，重复跳过"+r.duplicates+"，空行"+r.blankLines;}
                catch(Exception e){message="未导入："+e.getMessage();}render();
            }).show();
    }
    private void button(LinearLayout layout,String label,Action action){Button b=new Button(this);b.setText(label);b.setOnClickListener(v->{message="";try{action.run();}catch(Exception e){message="操作停止："+e.getMessage();}render();});layout.addView(b);}
    private void render(){try{TaskEngine.Snapshot s=engine.snapshot();long attempted=TaskEngine.attemptCount(s),pending=s.tasks.stream().filter(t->t.state==TaskEngine.UNKNOWN).count(),finished=s.tasks.stream().mapToLong(t->t.history.size()+(t.state==TaskEngine.FINISHED?1:0)).sum();StringBuilder text=new StringBuilder("\n计划版本 "+s.version+"；"+(s.paused?"已暂停":"可人工模拟")+"\n演示目标 "+s.tasks.size()+" / 尝试 "+attempted+" / 待核对 "+pending+" / 完成 "+finished+"\n真实呼出 0\n定时："+s.timerResult+(s.timerTarget.isEmpty()?"":" / "+s.timerTarget)+"\n"+message+"\n");for(TaskEngine.Task t:s.tasks){if(t.state==TaskEngine.UNKNOWN)text.append("待核对：").append(t.attemptId()).append(t.api?"（模拟提交有回执）":"（提交结果未知）").append('\n');}status.setText(text);}catch(Exception e){status.setText("状态不可用，请停止操作并保留数据。");}}
}
