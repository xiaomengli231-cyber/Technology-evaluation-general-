import { Footer, SiteHeader } from "@/components/SiteHeader";
import { TechnologyCard } from "@/components/TechnologyCard";
import { TECHNOLOGIES } from "@/lib/catalog";
import { getPublishedResults } from "@/lib/database";

export const dynamic="force-dynamic";
export const metadata={title:"技术库｜湖泊内源治理技术评价系统",description:"浏览 12 项一级技术的 C1—C11 证据评价卡。"};

export default async function TechnologiesPage(){const results=await getPublishedResults();const official=results.filter((item)=>!item.isDemo);const visible=official.length?official:results;return <main><SiteHeader active="technologies"/><section className="pageHero"><span className="eyebrow">TECHNOLOGY LIBRARY</span><h1>技术评价卡</h1><p>每个一级技术仅生成一张卡片。二级技术保留逐案例结果，不做脱离证据的二次汇总。</p><div className="taxonomy"><span><b>I</b>底泥削减</span><span><b>P</b>释放阻控</span><span><b>R</b>藻类与生态</span><span><b>X</b>专项污染</span></div></section><section className="pageContent"><div className="sectionHeading"><div><span className="kicker">12 项一级技术</span><h2>按治理环节浏览</h2></div><span className="mutedText">30 项二级技术 · 11 个评价指标</span></div><div className="techGrid">{TECHNOLOGIES.map((technology)=><TechnologyCard key={technology.code} technology={technology} results={visible}/>)}</div></section><Footer/></main>}
