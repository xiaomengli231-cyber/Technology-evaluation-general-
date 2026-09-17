import { completeness, technologyRollups } from "@/lib/calculations";
import type { IndicatorResult, Technology } from "@/lib/catalog";

export function TechnologyCard({ technology, results }:{ technology:Technology; results:IndicatorResult[] }) {
  // Once any formal data has been published, cards must never fall back to
  // demo values on a technology-by-technology basis.
  const official=results.filter((item)=>!item.isDemo);
  const source=(official.length?official:results).filter((item)=>item.technologyCode===technology.code);
  const coverage=completeness(source);
  const rollups=technologyRollups(source).filter((item)=>item.value!==null).slice(0,3);
  const levelCounts=["E1","E2","E3","E4","E5"].map((level)=>source.filter((item)=>item.evidenceLevel===level).length);
  return <article className="techCard">
    <div className="techCardTop"><span className={`groupTag group-${technology.group[0]}`}>{technology.group}</span><span className="techCode">{technology.code}</span></div>
    <h3><a href={`/technologies/${technology.code}`}>{technology.name}</a></h3>
    <p>{technology.summary}</p>
    <div className="coverage"><div><span>指标覆盖</span><b>{coverage.available}<small> / {coverage.applicable}</small></b></div><div className="coverageBar"><i style={{width:`${coverage.rate*100}%`}} /></div></div>
    <div className="miniResults">
      {rollups.length ? rollups.map((item)=><div key={`${item.indicatorCode}-${item.pollutant??""}`}><span>{item.indicatorCode}{item.pollutant?` · ${item.pollutant}`:""}</span><b>{item.value?.toFixed(1)}<small>{item.unit}</small></b></div>) : <div className="noData">尚无可汇总数据</div>}
    </div>
    <div className="evidenceStrip" title="E1 至 E5 证据记录数">{levelCounts.map((count,index)=><span key={index} className={count?"hasEvidence":""}>{`E${index+1}`}<b>{count}</b></span>)}</div>
    <a className="cardLink" href={`/technologies/${technology.code}`}>查看评价卡 <span>→</span></a>
  </article>;
}
