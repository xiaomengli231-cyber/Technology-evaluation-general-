import { Footer, SiteHeader } from "@/components/SiteHeader";
import { TechnologyCard } from "@/components/TechnologyCard";
import { INDICATORS, TECHNOLOGIES } from "@/lib/catalog";
import { getPublishedResults } from "@/lib/database";
import { technologyRollups } from "@/lib/calculations";

export const dynamic = "force-dynamic";

export default async function Home() {
  const results=await getPublishedResults();
  const official=results.filter((item)=>!item.isDemo); const visible=official.length?official:results;
  const stats={technologies:TECHNOLOGIES.length,subTechnologies:TECHNOLOGIES.reduce((sum,item)=>sum+item.subTechnologies.length,0),cases:new Set(official.map((item)=>item.caseId)).size,lakes:new Set(official.map((item)=>item.lake)).size,usable:official.filter((item)=>item.status==="可用"&&item.isPrimary&&item.value!==null).length,pending:official.filter((item)=>item.status==="待核验").length,demoCases:new Set(results.filter((item)=>item.isDemo).map((item)=>item.caseId)).size};
  const rollups=technologyRollups(visible);
  const indicatorRows=INDICATORS.map((indicator)=>({indicator,rollup:rollups.find((item)=>item.indicatorCode===indicator.code&&item.value!==null)}));
  const evidence=["E1","E2","E3","E4","E5"].map((level)=>({level,count:visible.filter((item)=>item.evidenceLevel===level).length}));
  return <main><SiteHeader active="home"/>
    <section className="hero"><div><span className="eyebrow">EVIDENCE-BASED EVALUATION</span><h1>把文献证据，转化为<br/>可审核的技术结论</h1><p>从案例、处理方案和观测数据出发，统一映射 C1—C11 指标。每个结论都能回到原始数值、计算口径与来源位置。</p><div className="heroActions"><a className="primaryButton" href="/technologies">浏览技术评价</a><a className="textButton" href="/data">查看证据数据 <span>→</span></a></div></div>
      <aside className="evidencePanel" aria-label="证据链示意"><div className="panelLabel">证据链</div>{[["01","文献与案例","保留 DOI、页码与图表位置"],["02","指标归一化","原值、单位与换算过程并存"],["03","证据加权","E1—E5 分级，拒绝缺失补零"],["04","技术评价卡","汇总结果可逐条复算"]].map(([n,title,text])=><div className="chainItem" key={n}><span>{n}</span><div><b>{title}</b><small>{text}</small></div></div>)}</aside>
    </section>
    <section className="metricGrid" aria-label="系统概览">{[
      [stats.technologies,"一级技术",`${stats.subTechnologies} 项二级技术`],[stats.cases,"正式案例",official.length?`${stats.lakes} 个独立湖泊`:"等待真实数据"],[official.length?stats.usable:stats.demoCases,official.length?"有效结果":"示例案例",official.length?"已进入证据加权":"不计入正式统计"],[stats.pending,"待核验项","不会进入自动汇总"]
    ].map(([value,label,note])=><article key={label}><strong>{value}</strong><div><b>{label}</b><span>{note}</span></div></article>)}</section>
    <section className="workspace"><div className="sectionHeading"><div><span className="kicker">评价概览</span><h2>指标数据覆盖情况</h2></div><a href="/data">查看全部证据 →</a></div>
      {!official.length&&<div className="demoNotice"><b>当前展示示例数据</b><span>用于演示计算与下钻流程，不代表任何真实技术结论。</span></div>}
      <div className="dashboardGrid"><div className="indicatorTable"><div className="tableHead"><span>指标</span><span>名称</span><span>加权结果</span><span>数据状态</span></div>{indicatorRows.map(({indicator,rollup})=><a className="tableRow" href={`/data?indicator=${indicator.code}`} key={indicator.code}><span className="code">{indicator.code}</span><b>{indicator.name}</b><strong>{rollup?.value===null||rollup?.value===undefined?"—":rollup.value.toFixed(1)}<small>{rollup?.unit}</small></strong><span className={rollup?.count?"demoBadge":"emptyBadge"}>{rollup?.count?`${official.length?"正式":"示例"} · ${rollup.count} 条证据`:"暂无数据"}</span></a>)}</div>
        <aside className="evidenceSummary"><span className="kicker">证据构成</span><h3>E1—E5 数据分布</h3><p>等级反映研究尺度与可复核条件，低等级证据不会被“修正”为高等级证据。</p><div className="evidenceBars">{evidence.map((item,index)=>{const max=Math.max(...evidence.map((x)=>x.count),1);return <div key={item.level}><span>{item.level}<small>{["多湖长期工程","全尺度/多现场","现场中试","原泥原水试验","机理与材料实验"][index]}</small></span><i><b style={{width:`${item.count/max*100}%`}}/></i><strong>{item.count}</strong></div>})}</div></aside>
      </div>
    </section>
    <section className="featuredSection"><div className="sectionHeading"><div><span className="kicker">代表技术</span><h2>从汇总值下钻到每条证据</h2></div><a href="/technologies">查看 12 项技术 →</a></div><div className="techGrid threeCols">{["TECH-IP","TECH-DR","TECH-AE"].map((code)=><TechnologyCard key={code} technology={TECHNOLOGIES.find((item)=>item.code===code)!} results={visible}/>)}</div></section>
    <Footer/></main>;
}
