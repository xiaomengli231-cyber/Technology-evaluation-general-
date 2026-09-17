"use client";
import { useMemo, useState } from "react";
import type { IndicatorResult, Technology } from "@/lib/catalog";

export function DataExplorer({results,technologies,initial={}}:{results:IndicatorResult[];technologies:Technology[];initial?:Record<string,string|undefined>}){
  const hasOfficial=results.some((item)=>!item.isDemo);
  const [tech,setTech]=useState(initial.technology??""); const [indicator,setIndicator]=useState(initial.indicator??""); const [level,setLevel]=useState(initial.level??""); const [lake,setLake]=useState(initial.lake??""); const [showDemo,setShowDemo]=useState(initial.includeDemo==="true"||(!hasOfficial&&initial.includeDemo!=="false"));
  const lakes=[...new Set(results.map((item)=>item.lake))];
  const filtered=useMemo(()=>results.filter((item)=>(!tech||item.technologyCode===tech)&&(!indicator||item.indicatorCode===indicator)&&(!level||item.evidenceLevel===level)&&(!lake||item.lake===lake)&&(showDemo||!item.isDemo)),[results,tech,indicator,level,lake,showDemo]);
  const params=new URLSearchParams({technology:tech,indicator,level,lake,includeDemo:String(showDemo)}).toString();
  return <>
    <div className="filterBar">
      <label>一级技术<select value={tech} onChange={(e)=>setTech(e.target.value)}><option value="">全部技术</option>{technologies.map((item)=><option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
      <label>指标<select value={indicator} onChange={(e)=>setIndicator(e.target.value)}><option value="">C1—C11</option>{Array.from({length:11},(_,i)=>`C${i+1}`).map((code)=><option key={code}>{code}</option>)}</select></label>
      <label>证据等级<select value={level} onChange={(e)=>setLevel(e.target.value)}><option value="">E1—E5</option>{[1,2,3,4,5].map((n)=><option key={n}>{`E${n}`}</option>)}</select></label>
      <label>湖泊<select value={lake} onChange={(e)=>setLake(e.target.value)}><option value="">全部湖泊</option>{lakes.map((name)=><option key={name}>{name}</option>)}</select></label>
      <label className="checkLabel"><input type="checkbox" checked={showDemo} onChange={(e)=>setShowDemo(e.target.checked)}/> 显示示例数据</label>
    </div>
    <div className="dataActions"><span>共 <b>{filtered.length}</b> 条结果</span><div><a href={`/api/export/gaps.csv?${params}`}>下载缺口 CSV</a><a href={`/api/export/details.csv?${params}`}>下载明细 CSV</a><a className="solidSmall" href={`/api/export/summary.xlsx?${params}`}>下载评价 Excel</a></div></div>
    <div className="dataTableWrap"><table className="dataTable"><thead><tr><th>技术</th><th>案例 / 方案</th><th>指标</th><th>结果</th><th>计算口径</th><th>证据</th><th>湖泊与尺度</th><th>来源</th></tr></thead><tbody>
      {filtered.map((item)=>{const t=technologies.find((x)=>x.code===item.technologyCode);const sub=t?.subTechnologies.find((x)=>x.code===item.subTechnologyCode);return <tr key={item.id}><td><b>{t?.name}</b><small>{sub?.name}</small></td><td><code>{item.caseId}</code><small>{item.armId}</small></td><td><span className="code">{item.indicatorCode}</span>{item.pollutant&&<small>{item.pollutant}</small>}</td><td><strong>{item.value===null?"—":item.value.toFixed(1)}</strong> <small>{item.unit}</small></td><td>{item.basis}<small>{item.formula}</small></td><td><span className={`levelBadge level-${item.evidenceLevel}`}>{item.evidenceLevel}</span><small>权重 {item.evidenceWeight.toFixed(1)}</small></td><td>{item.lake}<small>{item.scale}</small></td><td>{item.isDemo&&<span className="demoBadge">示例</span>}<small>{item.source}</small></td></tr>})}
      {!filtered.length&&<tr><td colSpan={8} className="emptyCell">当前筛选条件下没有数据</td></tr>}
    </tbody></table></div>
  </>;
}
