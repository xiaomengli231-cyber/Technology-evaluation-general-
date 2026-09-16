export function SiteHeader({ active }: { active?:"home"|"technologies"|"data"|"admin" }) {
  return <header className="topbar">
    <a className="brand" href="/" aria-label="回到首页"><span className="brandMark">澄</span><span><b>湖泊内源治理</b><small>技术评价系统</small></span></a>
    <nav aria-label="主导航">
      <a className={active==="home"?"active":""} href="/">总览</a>
      <a className={active==="technologies"?"active":""} href="/technologies">技术库</a>
      <a className={active==="data"?"active":""} href="/data">数据明细</a>
      <a className={active==="admin"?"active":""} href="/admin/imports">数据管理</a>
    </nav>
  </header>;
}

export function Footer() {
  return <footer><div><b>湖泊内源治理技术评价系统</b><p>以可追溯证据支持技术比较与专家审阅。</p></div><div><span>评价框架</span><a href="/technologies">C1—C11 指标</a><a href="/data">E1—E5 证据等级</a></div><div><span>数据原则</span><small>不以未报告替代零值</small><small>不跨不兼容口径强行合并</small></div></footer>;
}
