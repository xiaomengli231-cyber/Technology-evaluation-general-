"use client";
import { useState } from "react";

type Mapping={sheet:string;field:string;source:string|null;status:string};
type Issue={level:string;sheet:string;row:number;field?:string;message:string};
type Batch={id:string;fileName:string;status:string;rowCount:number;errorCount:number;warningCount:number;resultCount?:number;mapping:Mapping[];issues:Issue[]};
type HistoryBatch={id:string;file_name:string;status:string;row_count:number;error_count:number;warning_count:number;result_count?:number;created_at:string;active?:boolean;mapping?:Mapping[];issues?:Issue[]};

export function ImportWizard({initialBatches}:{initialBatches:Array<Record<string,unknown>>}){
  const [file,setFile]=useState<File|null>(null); const [entity,setEntity]=useState("Observation"); const [busy,setBusy]=useState(false); const [batch,setBatch]=useState<Batch|null>(null); const [message,setMessage]=useState("");const [history,setHistory]=useState(initialBatches as unknown as HistoryBatch[]);
  async function upload(){ if(!file)return; setBusy(true);setMessage(""); const body=new FormData();body.append("file",file);body.append("entityType",entity); try{const response=await fetch("/api/admin/imports",{method:"POST",body});const data=await response.json() as Batch&{error?:string};if(!response.ok)throw new Error(data.error||"上传失败");setBatch(data);}catch(error){setMessage(error instanceof Error?error.message:"上传失败");}finally{setBusy(false);} }
  async function publish(){if(!batch)return;setBusy(true);try{const response=await fetch(`/api/admin/imports/${batch.id}/publish`,{method:"POST"});const data=await response.json() as {results?:number;error?:string};if(!response.ok)throw new Error(data.error||"发布失败");setBatch({...batch,status:"published",resultCount:data.results});setHistory((items)=>items.map((item)=>({...item,active:item.id===batch.id})));setMessage(`已发布 ${data.results??0} 条指标结果，并切换为当前统计数据`);}catch(error){setMessage(error instanceof Error?error.message:"发布失败");}finally{setBusy(false);} }
  function viewBatch(item:HistoryBatch){setBatch({id:item.id,fileName:item.file_name,status:item.status,rowCount:Number(item.row_count),errorCount:Number(item.error_count),warningCount:Number(item.warning_count),resultCount:Number(item.result_count??0),mapping:item.mapping??[],issues:item.issues??[]});setMessage("");}
  async function activate(id:string){setBusy(true);try{const response=await fetch(`/api/admin/imports/${id}/activate`,{method:"POST"});const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error||"切换失败");setHistory((items)=>items.map((item)=>({...item,active:id!=="all"&&item.id===id})));setMessage(id==="all"?"已切换为全部已发布批次":"已切换当前统计批次，总览和技术卡已更新");}catch(error){setMessage(error instanceof Error?error.message:"切换失败");}finally{setBusy(false);}}
  const step=batch?.status==="published"?4:batch?3:file?1:0;
  return <div className="adminGrid">
    <section className="wizardCard">
      <div className="steps">{["上传文件","字段映射","数据预检","审核发布"].map((label,index)=><div key={label} className={step>=index?"done":""}><i>{step>index?"✓":index+1}</i><span>{label}</span></div>)}</div>
      {!batch&&<div className="uploadZone">
        <div className="uploadIcon">↑</div><h2>导入文献证据数据</h2><p>支持标准模板 .xlsx，或单实体 .csv。单批次上限 8 MB、5,000 行。</p>
        <input id="file-upload" type="file" accept=".xlsx,.xls,.csv" onChange={(e)=>setFile(e.target.files?.[0]??null)}/><label className="fileButton" htmlFor="file-upload">选择文件</label>
        {file&&<div className="selectedFile"><b>{file.name}</b><span>{(file.size/1024).toFixed(1)} KB</span></div>}
        {file?.name.toLowerCase().endsWith(".csv")&&<label className="entitySelect">CSV 数据类型<select value={entity} onChange={(e)=>setEntity(e.target.value)}>{["Literature","Site","Case","TreatmentArm","Observation","EvidenceQuality","Cost"].map((name)=><option key={name}>{name}</option>)}</select></label>}
        <div className="uploadActions"><a href="/api/admin/template">下载标准 Excel 模板</a><button disabled={!file||busy} onClick={upload}>{busy?"正在预检…":"上传并预检"}</button></div>
      </div>}
      {batch&&<div className="reviewPanel">
        <div className="reviewTitle"><div><span className="kicker">批次 {batch.id}</span><h2>{batch.fileName}</h2></div><span className={`statusPill status-${batch.status}`}>{batch.status==="published"?"已发布":"预检完成"}</span></div>
        <div className="reviewStats"><div><strong>{batch.rowCount}</strong><span>数据行</span></div><div><strong>{batch.status==="published"?(batch.resultCount??0):batch.mapping.filter((x)=>x.status==="matched").length}</strong><span>{batch.status==="published"?"指标结果":"已映射字段"}</span></div><div className={batch.errorCount?"dangerText":""}><strong>{batch.errorCount}</strong><span>错误</span></div><div><strong>{batch.warningCount}</strong><span>警告</span></div></div>
        <h3>字段映射</h3><div className="mappingGrid">{batch.mapping.map((item)=><div key={`${item.sheet}-${item.field}`} className={item.status}><span>{item.sheet}</span><b>{item.field}</b><i>→</i><em>{item.source??"未识别"}</em></div>)}</div>
        <h3>预检结果</h3><p className="precheckNote">预检结果仅供审核参考，不会阻断发布。无法形成有效指标的记录将保留为待核验或仅保存在原始批次中。</p>{batch.issues.length?<div className="issueList">{batch.issues.slice(0,20).map((item,index)=><div key={index} className={item.level}><b>{item.level==="error"?"错误":"警告"}</b><span>{item.sheet} · 第 {item.row} 行{item.field?` · ${item.field}`:""}</span><p>{item.message}</p></div>)}</div>:<div className="successBox">未发现错误或警告，可以发布。</div>}
        <div className="publishBar"><button className="secondaryButton" onClick={()=>{setBatch(null);setFile(null);setMessage("")}}>返回上传</button>{batch.status==="published"&&<a className="secondaryButton" href="/data?includeDemo=false">查看结果</a>}<button disabled={batch.status==="published"||busy} onClick={publish}>{batch.status==="published"?"本批次已发布":busy?"正在发布…":"继续发布"}</button></div>
      </div>}
      {message&&<p className={message.includes("失败")||message.includes("不")?"formError":"formMessage"}>{message}</p>}
    </section>
    <aside className="historyCard"><div className="historyHead"><div><h3>已上传记录</h3><span>{history.length} 个批次</span></div><button disabled={busy||!history.some((item)=>item.active)} onClick={()=>activate("all")}>汇总全部</button></div>{history.length?history.map((raw)=><div className={`historyItem ${raw.active?"active":""}`} key={raw.id}><span className={`historyDot ${raw.status}`}/><div><b>{raw.file_name}</b><small>{raw.row_count} 行 · {raw.result_count??0} 条结果 · {new Date(raw.created_at).toLocaleDateString("zh-CN")}</small><div className="historyActions"><button onClick={()=>viewBatch(raw)}>查看</button>{raw.status==="published"&&<button disabled={busy||raw.active} onClick={()=>activate(raw.id)}>{raw.active?"当前结果":"切换结果"}</button>}</div></div><em>{raw.active?"使用中":raw.status==="published"?"已发布":"待审核"}</em></div>):<div className="emptyHistory">还没有导入记录</div>}</aside>
  </div>;
}
