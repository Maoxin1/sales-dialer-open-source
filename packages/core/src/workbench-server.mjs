import {ContactScheduleWeb} from './contact-schedule-web.mjs';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { MemoryStore } from './memory-store.mjs';
import { TrialWorkspace } from './trial-workspace.mjs';
import { SimulationSession } from './simulation-session.mjs';

/** Loopback-only synthetic workbench. Token isolates browser requests, not enterprise authentication. */
export async function createWorkbench({store,port=0,android=null,observed=null,controlled=null,contacts=null,contactRuntime=null,trial=new TrialWorkspace(new MemoryStore())}) {
  const scheduleWeb=new ContactScheduleWeb({contacts,runtime:contactRuntime});
  const session=new SimulationSession(store,{profile:'self-service'}),token=randomBytes(32).toString('hex');
  const assets=new Map([
    ['/contact-schedule-page.mjs',{type:'text/javascript; charset=utf-8',body:readFileSync(new URL('../web/contact-schedule-page.mjs',import.meta.url),'utf8')}],
    ['/contacts',{type:'text/html; charset=utf-8',body:readFileSync(new URL('../web/contacts.html',import.meta.url),'utf8').replace('__TOKEN__',token)}],
    ['/contacts.mjs',{type:'text/javascript; charset=utf-8',body:readFileSync(new URL('../web/contacts.mjs',import.meta.url),'utf8')}],
    ['/controlled',{type:'text/html; charset=utf-8',body:readFileSync(new URL('../web/controlled.html',import.meta.url),'utf8').replace('__TOKEN__',token)}],
    ['/controlled.mjs',{type:'text/javascript; charset=utf-8',body:readFileSync(new URL('../web/controlled.mjs',import.meta.url),'utf8')}],
    ['/observed',{type:'text/html; charset=utf-8',body:readFileSync(new URL('../web/observed.html',import.meta.url),'utf8').replace('__TOKEN__',token)}],
    ['/observed.mjs',{type:'text/javascript; charset=utf-8',body:readFileSync(new URL('../web/observed.mjs',import.meta.url),'utf8')}],
    ['/trial',{type:'text/html; charset=utf-8',body:readFileSync(new URL('../web/trial.html',import.meta.url),'utf8').replace('__TOKEN__',token)}],
    ['/trial.mjs',{type:'text/javascript; charset=utf-8',body:readFileSync(new URL('../web/trial.mjs',import.meta.url),'utf8')}],
    ['/',{type:'text/html; charset=utf-8',body:readFileSync(new URL('../web/index.html',import.meta.url),'utf8').replace('__TOKEN__',token)}],
    ['/app.mjs',{type:'text/javascript; charset=utf-8',body:readFileSync(new URL('../web/app.mjs',import.meta.url),'utf8')}],
    ['/android.mjs',{type:'text/javascript; charset=utf-8',body:readFileSync(new URL('../web/android.mjs',import.meta.url),'utf8')}],
    ['/style.css',{type:'text/css; charset=utf-8',body:readFileSync(new URL('../web/style.css',import.meta.url),'utf8')}],
  ]);
  let origin,tail=Promise.resolve();
  const server=createServer(async(req,res)=>{
    const send=(status,body,type='application/json; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
      'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",'Referrer-Policy':'no-referrer'});res.end(type.startsWith('application/json')?JSON.stringify(body):body);};
    if(req.headers.host!==new URL(origin).host||req.headers.origin&&req.headers.origin!==origin)return send(403,{reason:'FORBIDDEN_ORIGIN'});
    const path=new URL(req.url,origin).pathname;
    if(req.method==='GET'&&assets.has(path)){const a=assets.get(path);return send(200,a.body,a.type);}
    if(!['/api/contact-schedule/status','/api/contact-schedule/command','/api/contacts/status','/api/contacts/command','/api/status','/api/command','/api/android/status','/api/android/command','/api/trial/status','/api/trial/command','/api/observed/status','/api/observed/command','/api/controlled/status','/api/controlled/command'].includes(path))return send(404,{reason:'NOT_FOUND'});
    if(req.headers.authorization!=='Bearer '+token)return send(403,{reason:'FORBIDDEN_SESSION'});
    const isSchedule=path.startsWith('/api/contact-schedule/');
    if(req.method==='GET'&&path==='/api/contact-schedule/status')return send(200,scheduleWeb.status());
    const isContacts=path.startsWith('/api/contacts/');
    if(isContacts&&!contacts)return send(200,{decision:'DENY',reason:'CONTACTS_NOT_CONFIGURED'});
    if(req.method==='GET'&&path==='/api/contacts/status')return send(200,await tail.then(()=>contacts.status()));
    const isControlled=path.startsWith('/api/controlled/');
    if(isControlled&&!controlled)return send(200,{decision:'DENY',reason:'CONTROLLED_NOT_CONFIGURED'});
    if(req.method==='GET'&&path==='/api/controlled/status')return send(200,await tail.then(()=>controlled.status()));
    const phone=path.startsWith('/api/android/'),isTrial=path.startsWith('/api/trial/'),isObserved=path.startsWith('/api/observed/');
    if(isObserved&&!observed)return send(200,{decision:'DENY',reason:'OBSERVED_NOT_CONFIGURED'});
    if(req.method==='GET'&&path==='/api/observed/status')return send(200,await tail.then(()=>observed.status()));
    if(req.method==='GET'&&path==='/api/trial/status')return send(200,await tail.then(()=>trial.status()));
    if(phone&&!android)return send(200,{decision:'DENY',reason:'ANDROID_NOT_CONFIGURED'});
    if(req.method==='GET'&&path==='/api/android/status')return send(200,await tail.then(()=>android.status()));
    if(req.method==='GET'&&path==='/api/status')return send(200,await tail.then(()=>session.status()));
    if(req.method!=='POST'||!['/api/contact-schedule/command','/api/contacts/command','/api/command','/api/android/command','/api/trial/command','/api/observed/command','/api/controlled/command'].includes(path))return send(405,{reason:'METHOD_NOT_ALLOWED'});
    if(req.headers['content-type']?.split(';')[0]!=='application/json')return send(415,{reason:'JSON_REQUIRED'});
    const chunks=[];let size=0,tooLarge=false;
    try {
      for await(const chunk of req){size+=chunk.length;if(size>65536)tooLarge=true;if(!tooLarge)chunks.push(chunk);}
      if(tooLarge)return send(413,{reason:'BODY_TOO_LARGE'});
      let command;try{command=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(400,{reason:'INVALID_JSON'});}
      if(command?.op==='quit')return send(400,{decision:'DENY',reason:'UNSUPPORTED_WEB_COMMAND'});
      if(isSchedule)return send(200,scheduleWeb.execute(command));
      const pending=tail.then(()=>(isContacts?contacts:isControlled?controlled:isObserved?observed:isTrial?trial:phone?android:session).execute(command));tail=pending.catch(()=>{});
      send(200,await pending);
    }catch{if(!res.headersSent)send(500,{decision:'DENY',reason:'COMMAND_FAILED_CHECK_STATE'});}
  });
  server.requestTimeout=10000;server.headersTimeout=10000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  origin='http://127.0.0.1:'+server.address().port;
  android?.startScheduler();
  return {url:origin,token,session,close:async()=>{android?.stopScheduler();await scheduleWeb.close();await tail;await new Promise(resolve=>server.close(resolve));store.close();await android?.close();trial.close();await observed?.close();await controlled?.close();contacts?.close();}};
}
