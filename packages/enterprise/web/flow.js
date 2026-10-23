'use strict';
// Presentation decisions only. The server and native adapter remain authoritative.
globalThis.SalesFlow=Object.freeze({
  parseImport(input){
    if(typeof input!=='string'||input.length>300000)throw Error('导入内容过大，请每批最多200条。');
    const source=input.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();if(!source)throw Error('请先粘贴名单或选择CSV文件。');
    const delimiter=source.split('\n')[0].includes('\t')?'\t':',';
    let rows=[],row=[],field='',quoted=false,closed=false;
    for(let i=0;i<source.length;i++){const ch=source[i];if(quoted){if(ch==='"'){if(source[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=ch;}else if(ch===delimiter||ch==='\n'){row.push(field.trim());field='';closed=false;if(ch==='\n'){if(row.some(x=>x))rows.push(row);row=[];}}else if(ch==='"'){if(field||closed)throw Error('CSV引号格式不正确。');quoted=true;}else{if(closed)throw Error('CSV引号后只能是分隔符或换行。');field+=ch;}}
    if(quoted)throw Error('CSV存在未闭合的引号。');row.push(field.trim());if(row.some(x=>x))rows.push(row);
    const aliases={电话:'number',手机号:'number',手机号码:'number',公司:'company',公司名称:'company',姓氏:'surname'},head=rows[0].map(x=>aliases[x]);
    let output;if(head.some(Boolean)){
      if(head.length!==3||new Set(head).size!==3||head.some(x=>!x))throw Error('表头须为电话、公司、姓氏三列（顺序可调整）。');
      rows.shift();output=rows.map((cells,i)=>{if(cells.length!==3||cells.some(x=>!x))throw Error('第'+(i+2)+'行须填完整的电话、公司、姓氏。');const r=Object.fromEntries(head.map((key,j)=>[key,cells[j]]));if(r.company.length>200||r.surname.length>20||/[\u0000-\u001f\u007f]/.test(r.company+r.surname))throw Error('第'+(i+2)+'行公司或姓氏格式不正确。');return r;});
    }else{if(rows.some(cells=>cells.length!==1))throw Error('三列名单请加表头：电话、公司、姓氏。');output=rows.map(cells=>cells[0]);}
    if(!output.length||output.length>200)throw Error('每批请导入1至200条；200不是每日拨号上限。');return output;
  },
  window(at){const d=new Date(at+28800000),day=d.getUTCDay(),hour=d.getUTCHours();return day>=1&&day<=5&&hour>=9&&hour<18;},
  view({status,selectedCount=0,diagnostic=null,connected=true}){
    if(!connected)return {state:'DISCONNECTED',title:'连接中断',detail:'检查电脑服务和同一Wi-Fi，再刷新核对。不会自动补拨。',action:'refresh',label:'重新检查连接'};
    if(!status)return {state:'LOADING',title:'正在读取',detail:'尚未启动任何电话。',action:'none',label:'正在读取'};
    const q=status.queue,pending=status.metrics.pending;
    if(pending)return {state:'PENDING',title:'请填写上一通结果',detail:'先挂断并确认手机空闲；结果未知时停止，不重拨。',action:'result',label:'填写本通结果'};
    if(q?.state==='RUNNING'&&diagnostic?.state==='READY'&&(status.mode==='REHEARSAL'||status.operatorBatch))return {state:'WAITING',title:'手机已设置定时',detail:'到点检查后提交；挂断并填写结果后再处理下一条。',action:'none',label:'等待到点',pause:true};
    if(q?.state==='RUNNING'&&diagnostic?.state==='CONSUMING')return {state:'SUBMITTING',title:'正在核对提交状态',detail:'请勿重复启动，等待记录后核对本通结果。',action:'refresh',label:'核对状态',pause:true};
    const title=q?.state==='FINISHED'?'上一批已完成':q?.state==='STOPPED'?'队列已暂停':q?.state==='RUNNING'?'计划尚未启动':'开始新一批';
    return {state:'PREPARE',title,detail:selectedCount?'已选 '+selectedCount+' 条，核对时间与销售SIM后明确确认。':'先到名单中勾选资格已确认的联系人。',action:selectedCount?'review':'select',label:selectedCount?'核对本批 '+selectedCount+' 条':'选择联系人',pause:q?.state==='RUNNING'};
  },
  sameSelection(ids,revisions,status,selected,selectedRevisions){return ids.length>0&&ids.length===selected.size&&ids.every(id=>selected.has(id)&&selectedRevisions.get(id)===revisions[id]&&(!status.contacts.some(c=>c.id===id)||status.contacts.some(c=>c.id===id&&!c.erased&&!c.refused&&c.qualification==='CONFIRMED'&&c.revision===revisions[id])));}
});
