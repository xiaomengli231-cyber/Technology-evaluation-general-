export type EvidenceLevel = "E1" | "E2" | "E3" | "E4" | "E5";
export type ResultStatus = "可用" | "未报告" | "不适用" | "不可换算" | "待核验";

export type SubTechnology = { code: string; name: string };
export type Technology = {
  code: string;
  sourceId: string;
  name: string;
  group: string;
  stage: string;
  summary: string;
  applicability: string;
  limitation: string;
  risk: string;
  subTechnologies: SubTechnology[];
};

export type IndicatorDefinition = {
  code: string;
  criterion: string;
  name: string;
  unit: string;
  principle: string;
};

export type IndicatorResult = {
  id: string;
  technologyCode: string;
  subTechnologyCode: string;
  caseId: string;
  armId: string;
  lake: string;
  scale: string;
  indicatorCode: string;
  pollutant?: string;
  value: number | null;
  unit: string;
  basis: string;
  formula: string;
  evidenceLevel: EvidenceLevel;
  evidenceWeight: number;
  observedAt: string;
  followupDays: number;
  source: string;
  status: ResultStatus;
  isPrimary: boolean;
  isDemo: boolean;
  publicationStatus: "published" | "draft";
};

const tech = (
  code: string, sourceId: string, name: string, group: string, stage: string,
  summary: string, applicability: string, limitation: string, risk: string,
  subs: Array<[string, string]>,
): Technology => ({ code, sourceId, name, group, stage, summary, applicability, limitation, risk, subTechnologies: subs.map(([subCode, subName]) => ({ code: subCode, name: subName })) });

export const TECHNOLOGIES: Technology[] = [
  tech("TECH-DR","I-01","污染底泥环保疏浚及处置","I 底泥库","内源端—底泥污染削减","通过环保疏浚或底泥洗脱移除历史污染存量。","污染层厚度与污染库存明确、污染物可移动的区域。","水质与生态效益易受同期措施影响，需区分规划方量与实测移除量。","再悬浮、余水污染、底栖破坏与处置场风险。",[["DR-ENV","环保疏浚"],["DR-SW","底泥洗脱"]]),
  tech("TECH-IC","P-01","原位覆盖","P 过程库","过程端—内源释放阻控","通过惰性、活性或复合矿物覆盖隔离并固定底泥污染物。","局部高释放、低流速且覆盖层可保持稳定的水域。","规模化营养盐工程证据不足，厚度和效率不能直接跨湖迁移。","覆盖破坏、埋藏、生物扰动与材料生态风险。",[["IC-IN","惰性覆盖"],["IC-RE","活性覆盖"],["IC-CM","复合矿物覆盖"]]),
  tech("TECH-AE","P-02","曝气增氧","P 过程库","过程端—内源释放阻控","提高泥水界面溶解氧，抑制还原条件下的营养盐释放。","底层持续缺氧且耗氧负荷可控的湖区。","设备规模需按海拔、水深和沉积物耗氧重新设计。","再悬浮、温跃层破坏、能耗与氮形态转化风险。",[["AE-MP","微孔曝气"],["AE-HY","底层增氧"],["AE-WL","扬水曝气"]]),
  tech("TECH-IP","P-03","原位钝化","P 过程库","过程端—内源释放阻控","利用镧、铝、铁或钙基材料固定活性磷并降低释放。","外源基本受控、活性磷库存高且不宜大规模疏浚的水域。","剂量必须依据活性磷库存与有效结合容量核定。","La、Al、Fe 释放、pH 变化、缺氧二次释放与生态毒性。",[["IP-LB","镧改性膨润土"],["IP-AL","铝盐/PAC"],["IP-FC","铁基及钙基材料"]]),
  tech("TECH-AH","R-01","藻水分离及藻泥资源化","R 藻类与生态库","结果端—藻类与生态调控","分离富集藻体并对藻泥脱水或资源化利用。","蓝藻高密度富集且具备藻泥处置链的富营养湖泊。","湖体响应需要控制同期措施，不能仅由处理水量推断。","藻泥处置、藻毒素、低浓度效率与能耗风险。",[["AH-HC","旋流分离"],["AH-AF","气浮/过滤"],["AH-DV","藻泥脱水利用"]]),
  tech("TECH-MA","R-02","机械打捞与移动除藻","R 藻类与生态库","结果端—藻类与生态调控","快速清除表层富集藻体，降低局部生态与景观风险。","水华富集区的应急处置场景。","适合评价作业量与污染物出湖量，不宜外推长期水质效益。","治标性、二次释放以及藻泥运输处置风险。",[["MA-BC","围隔集藻"],["MA-HV","打捞船"],["MA-MT","移动式处置"]]),
  tech("TECH-PA","R-03","高压/加压原位控藻","R 藻类与生态库","结果端—藻类与生态调控","通过深井加压、压力失活或原位循环抑制蓝藻上浮和繁殖。","蓝藻繁殖基数高但藻体外运能力受限的区域。","独立长期效果与真实能耗资料不足。","藻细胞破裂、藻毒素、能耗与效果衰减。",[["PA-DW","深井加压"],["PA-PI","压力失活"],["PA-IC","原位循环"]]),
  tech("TECH-EW","R-04","生态补水","R 藻类与生态库","结果端—藻类与生态调控","恢复生态水位、改善水量平衡并支持生态系统恢复。","水资源亏缺、停留时间长或局部滞流的湖泊。","水质归因受同期措施影响，必须核算补水带入与排出负荷。","引入污染、能耗、水资源竞争与稀释效应误判。",[["EW-IB","跨流域补水"],["EW-CW","湖外清水补给"],["EW-EL","生态水位保障"]]),
  tech("TECH-AV","R-05","水生植被恢复","R 藻类与生态库","结果端—藻类与生态调控","恢复湖内植物群落、改善栖息地并稳定底质。","透明度、水位和生境能够支持植物群落恢复的水域。","TN、TP 仅作为同期水体响应，不直接等同于底泥削减。","水位波动、风浪、草食压力、外来物种和管护不足。",[["AV-MR","湖内沉水/挺水植物恢复"],["AV-EP","围隔保育"],["AV-VM","植被管护"]]),
  tech("TECH-FB","R-06","以渔控藻/生物防治","R 藻类与生态库","结果端—藻类与生态调控","利用食物网关系控制藻类并调节生态系统结构。","具备明确食物网基础和长期监测条件的湖区。","效果高度依赖物种、密度和湖泊生态结构。","群落失衡、非目标效应和长期管理风险。",[["FB-EF","投放经济鱼类"]]),
  tech("TECH-IF","X-01","铁盐絮凝吸附降砷","X 专项库","特殊污染控制","通过铁盐絮凝和共沉淀降低水体溶解态砷。","特征污染物风险高且污染源已切断的水体。","应独立评价砷削减，不与氮磷治理技术直接排名。","底栖影响、沉淀物再释放与铁盐副作用。",[["IF-FC","FeCl3雾化喷洒"],["IF-AC","吸附共沉淀"]]),
  tech("TECH-AS","X-02","砷污染沉积物活性覆盖与稳定化","X 专项库","特殊污染控制","使用氧化—吸附材料覆盖并稳定砷污染沉积物。","历史砷沉积构成持续二次释放源的局部高风险区。","目前以材料实验为主，工程参数仍需围隔和多季节验证。","材料成本、覆盖稳定性以及 Mn/Zr 生态风险。",[["AS-ZM","锆锰氧化物等氧化-吸附覆盖"]]),
];

export const INDICATORS: IndicatorDefinition[] = [
  { code:"C1", criterion:"B1 内源负荷削减", name:"底泥总氮去除率", unit:"%", principle:"仅采用底泥总氮的可核验前后或对照数据" },
  { code:"C2", criterion:"B1 内源负荷削减", name:"底泥总磷去除率", unit:"%", principle:"活性磷与形态转化仅作为补充证据" },
  { code:"C3", criterion:"B1 内源负荷削减", name:"营养盐释放通量削减率", unit:"%", principle:"按 TN、TP、PO₄-P 等污染物分别汇总" },
  { code:"C4", criterion:"B2 水质改善", name:"透明度提升率", unit:"%", principle:"记录观测期、天气、藻类与对照条件" },
  { code:"C5", criterion:"B2 水质改善", name:"上覆水总氮去除率", unit:"%", principle:"优先使用同期对照校正结果" },
  { code:"C6", criterion:"B2 水质改善", name:"上覆水总磷去除率", unit:"%", principle:"优先使用同期对照校正结果" },
  { code:"C7", criterion:"B3 适用性", name:"技术成熟度", unit:"分", principle:"按成熟度量表审核，评分范围为 1—7" },
  { code:"C8", criterion:"B3 适用性", name:"技术稳定性", unit:"分", principle:"根据效果保持、持续时间与扰动稳定性审核" },
  { code:"C9", criterion:"B3 适用性", name:"环境影响", unit:"分", principle:"综合材料、水化学、施工、生态和长期失效风险" },
  { code:"C10", criterion:"B4 经济性", name:"单位治理规模投资成本", unit:"元/m²", principle:"仅合并价格年份与成本边界兼容的数据" },
  { code:"C11", criterion:"B4 经济性", name:"单位治理规模运维成本", unit:"元/(m²·a)", principle:"记录补投、能耗、维护与监测费用" },
];

const demo = (partial: Omit<IndicatorResult,"id"|"isDemo"|"publicationStatus"|"isPrimary"> & { id?:string }): IndicatorResult => ({
  id: partial.id ?? `${partial.armId}-${partial.indicatorCode}-${partial.pollutant ?? "all"}`,
  isDemo:true, publicationStatus:"published", isPrimary:true, ...partial,
});

export const DEMO_RESULTS: IndicatorResult[] = [
  demo({technologyCode:"TECH-IP",subTechnologyCode:"IP-AL",caseId:"CASE-DEMO-001",armId:"ARM-DEMO-001",lake:"星云湖",scale:"全尺度工程",indicatorCode:"C2",value:31.2,unit:"%",basis:"处理前后比较",formula:"(C₀-Cₜ)/C₀×100%",evidenceLevel:"E2",evidenceWeight:.8,observedAt:"示例：运行第 180 天",followupDays:365,source:"示例数据（不代表真实结论）",status:"可用"}),
  demo({technologyCode:"TECH-IP",subTechnologyCode:"IP-AL",caseId:"CASE-DEMO-001",armId:"ARM-DEMO-001",lake:"星云湖",scale:"全尺度工程",indicatorCode:"C3",pollutant:"TP",value:72,unit:"%",basis:"同期对照校正",formula:"(F₀-Fₜ)/F₀×100%",evidenceLevel:"E2",evidenceWeight:.8,observedAt:"示例：运行第 180 天",followupDays:365,source:"示例数据（不代表真实结论）",status:"可用"}),
  demo({technologyCode:"TECH-IP",subTechnologyCode:"IP-AL",caseId:"CASE-DEMO-001",armId:"ARM-DEMO-001",lake:"星云湖",scale:"全尺度工程",indicatorCode:"C6",value:24.8,unit:"%",basis:"同期对照校正",formula:"(C₀-Cₜ)/C₀×100%",evidenceLevel:"E2",evidenceWeight:.8,observedAt:"示例：运行第 180 天",followupDays:365,source:"示例数据（不代表真实结论）",status:"可用"}),
  demo({technologyCode:"TECH-IP",subTechnologyCode:"IP-AL",caseId:"CASE-DEMO-001",armId:"ARM-DEMO-001",lake:"星云湖",scale:"全尺度工程",indicatorCode:"C7",value:4,unit:"分",basis:"人工审核",formula:"成熟度量表",evidenceLevel:"E2",evidenceWeight:.8,observedAt:"示例审核",followupDays:365,source:"示例数据（不代表真实结论）",status:"可用"}),
  demo({technologyCode:"TECH-IP",subTechnologyCode:"IP-AL",caseId:"CASE-DEMO-001",armId:"ARM-DEMO-001",lake:"星云湖",scale:"全尺度工程",indicatorCode:"C8",value:4,unit:"分",basis:"人工审核",formula:"稳定性量表",evidenceLevel:"E2",evidenceWeight:.8,observedAt:"示例审核",followupDays:365,source:"示例数据（不代表真实结论）",status:"可用"}),
  demo({technologyCode:"TECH-IP",subTechnologyCode:"IP-AL",caseId:"CASE-DEMO-001",armId:"ARM-DEMO-001",lake:"星云湖",scale:"全尺度工程",indicatorCode:"C9",value:3,unit:"分",basis:"人工审核",formula:"P×S×D 风险矩阵复核",evidenceLevel:"E2",evidenceWeight:.8,observedAt:"示例审核",followupDays:365,source:"示例数据（不代表真实结论）",status:"可用"}),
  demo({technologyCode:"TECH-DR",subTechnologyCode:"DR-ENV",caseId:"CASE-DEMO-002",armId:"ARM-DEMO-002",lake:"滇池草海",scale:"全尺度工程",indicatorCode:"C1",value:28.6,unit:"%",basis:"处理前后比较",formula:"(C₀-Cₜ)/C₀×100%",evidenceLevel:"E2",evidenceWeight:.8,observedAt:"示例：竣工后",followupDays:540,source:"示例数据（不代表真实结论）",status:"可用"}),
  demo({technologyCode:"TECH-DR",subTechnologyCode:"DR-ENV",caseId:"CASE-DEMO-002",armId:"ARM-DEMO-002",lake:"滇池草海",scale:"全尺度工程",indicatorCode:"C2",value:34.1,unit:"%",basis:"处理前后比较",formula:"(C₀-Cₜ)/C₀×100%",evidenceLevel:"E2",evidenceWeight:.8,observedAt:"示例：竣工后",followupDays:540,source:"示例数据（不代表真实结论）",status:"可用"}),
  demo({technologyCode:"TECH-DR",subTechnologyCode:"DR-ENV",caseId:"CASE-DEMO-002",armId:"ARM-DEMO-002",lake:"滇池草海",scale:"全尺度工程",indicatorCode:"C4",value:52,unit:"%",basis:"同期对照校正",formula:"(SDₜ-SD₀)/SD₀×100%",evidenceLevel:"E2",evidenceWeight:.8,observedAt:"示例：竣工后第 1 年",followupDays:540,source:"示例数据（不代表真实结论）",status:"可用"}),
  demo({technologyCode:"TECH-DR",subTechnologyCode:"DR-ENV",caseId:"CASE-DEMO-002",armId:"ARM-DEMO-002",lake:"滇池草海",scale:"全尺度工程",indicatorCode:"C7",value:5,unit:"分",basis:"人工审核",formula:"成熟度量表",evidenceLevel:"E2",evidenceWeight:.8,observedAt:"示例审核",followupDays:540,source:"示例数据（不代表真实结论）",status:"可用"}),
  demo({technologyCode:"TECH-AE",subTechnologyCode:"AE-HY",caseId:"CASE-DEMO-003",armId:"ARM-DEMO-003",lake:"抚仙湖",scale:"现场围隔/中试",indicatorCode:"C3",pollutant:"TP",value:61.4,unit:"%",basis:"同期对照校正",formula:"(F₀-Fₜ)/F₀×100%",evidenceLevel:"E3",evidenceWeight:.6,observedAt:"示例：运行第 90 天",followupDays:180,source:"示例数据（不代表真实结论）",status:"可用"}),
  demo({technologyCode:"TECH-AE",subTechnologyCode:"AE-HY",caseId:"CASE-DEMO-003",armId:"ARM-DEMO-003",lake:"抚仙湖",scale:"现场围隔/中试",indicatorCode:"C4",value:36.5,unit:"%",basis:"同期对照校正",formula:"(SDₜ-SD₀)/SD₀×100%",evidenceLevel:"E3",evidenceWeight:.6,observedAt:"示例：运行第 90 天",followupDays:180,source:"示例数据（不代表真实结论）",status:"可用"}),
  demo({technologyCode:"TECH-AE",subTechnologyCode:"AE-HY",caseId:"CASE-DEMO-003",armId:"ARM-DEMO-003",lake:"抚仙湖",scale:"现场围隔/中试",indicatorCode:"C5",value:12,unit:"%",basis:"同期对照校正",formula:"(C₀-Cₜ)/C₀×100%",evidenceLevel:"E3",evidenceWeight:.6,observedAt:"示例：运行第 90 天",followupDays:180,source:"示例数据（不代表真实结论）",status:"可用"}),
  demo({technologyCode:"TECH-AE",subTechnologyCode:"AE-HY",caseId:"CASE-DEMO-003",armId:"ARM-DEMO-003",lake:"抚仙湖",scale:"现场围隔/中试",indicatorCode:"C8",value:3,unit:"分",basis:"人工审核",formula:"稳定性量表",evidenceLevel:"E3",evidenceWeight:.6,observedAt:"示例审核",followupDays:180,source:"示例数据（不代表真实结论）",status:"可用"}),
];

export const findTechnology = (code: string) => TECHNOLOGIES.find((item) => item.code === code);
export const findSubTechnology = (code: string) => TECHNOLOGIES.flatMap((item) => item.subTechnologies).find((item) => item.code === code);
export const findIndicator = (code: string) => INDICATORS.find((item) => item.code === code);
