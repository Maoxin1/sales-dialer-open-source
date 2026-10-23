import {DatabaseSync} from 'node:sqlite';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
const names=['workbench.db','workbench.db.android.db','workbench.db.observed.db','workbench.db.trial.db','workbench.db.controlled-demo.db'];
const summaries=[];
for(const name of names){const path=resolve('.local',name);if(!existsSync(path))continue;const db=new DatabaseSync(path,{readOnly:true});try{const s=JSON.parse(db.prepare('SELECT data FROM simulation_state WHERE id=1').get().data);summaries.push({name,mode:s.controlledWorkspace?.mode??'EXISTING_WORKSPACE',active:Object.values(s.attempts??{}).filter(a=>a.status!=='FINISHED'&&['AUTHORIZED','HANDOFF_UNKNOWN','SUBMITTED','RECONCILE_REQUIRED'].includes(a.status)).length,schedules:Object.values(s.androidSchedules??{}).filter(x=>x.status==='SCHEDULED').length,controlledPermits:Object.keys(s.localControlledPermits??{}).length});}finally{db.close();}}
console.log(JSON.stringify({readOnly:true,stores:summaries,configuredRecordFileExists:existsSync(resolve('.local/controlled-records.json')),actualPhoneCalls:0}));
