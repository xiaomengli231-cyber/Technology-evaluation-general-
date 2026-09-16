import { DataExplorer } from "@/components/DataExplorer";
import { Footer, SiteHeader } from "@/components/SiteHeader";
import { TECHNOLOGIES } from "@/lib/catalog";
import { getPublishedResults } from "@/lib/database";

export const dynamic="force-dynamic";
export const metadata={title:"证据数据｜湖泊内源治理技术评价系统",description:"筛选、追溯并下载二级技术逐案例指标结果。"};
export default async function DataPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const [results,initial]=await Promise.all([getPublishedResults(),searchParams]);return <main><SiteHeader active="data"/><section className="pageHero compact"><span className="eyebrow">EVIDENCE DATA</span><h1>二级技术数据明细</h1><p>一行代表一条单案例指标结果。筛选条件会同步应用到 CSV 和 Excel 下载。</p></section><section className="pageContent wide"><DataExplorer results={results} technologies={TECHNOLOGIES} initial={initial}/></section><Footer/></main>}
