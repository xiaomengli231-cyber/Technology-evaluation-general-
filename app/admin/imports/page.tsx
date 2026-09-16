import { ImportWizard } from "@/components/ImportWizard";
import { Footer, SiteHeader } from "@/components/SiteHeader";
import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from "@/app/chatgpt-auth";
import { isAdminEmail } from "@/lib/admin";
import { listImportBatches } from "@/lib/database";

export const dynamic="force-dynamic";
export const metadata={title:"数据管理｜湖泊内源治理技术评价系统",description:"导入、预检、审核并发布文献证据数据。"};
export default async function ImportsPage(){
  const user=await getChatGPTUser(); const admin=user?isAdminEmail(user.email):false; const batches=admin?await listImportBatches():[];
  return <main><SiteHeader active="admin"/><section className="pageHero compact"><span className="eyebrow">DATA WORKFLOW</span><h1>数据导入与审核</h1><p>上传文件进入暂存区。错误会阻止发布，警告需要人工确认，正式数据按批次原子写入。</p></section><section className="pageContent wide">
    {!user&&<div className="accessCard"><span className="accessIcon">锁</span><h2>登录后进入数据管理</h2><p>公开技术卡片无需登录。导入、审核和发布需要使用 ChatGPT 登录。</p><a className="primaryButton" href={chatGPTSignInPath("/admin/imports")}>使用 ChatGPT 登录</a></div>}
    {user&&!admin&&<div className="accessCard"><span className="accessIcon">!</span><h2>当前账户没有管理员权限</h2><p><b>{user.email}</b> 已登录，但不在部署环境的管理员邮箱白名单中。</p><a className="textButton" href={chatGPTSignOutPath("/admin/imports")}>退出并更换账户 →</a></div>}
    {user&&admin&&<><div className="accountBar"><span>管理员</span><b>{user.displayName}</b><a href={chatGPTSignOutPath("/")}>退出</a></div><ImportWizard initialBatches={batches}/></>}
  </section><Footer/></main>}
