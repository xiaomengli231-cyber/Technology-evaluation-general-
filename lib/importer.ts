import * as XLSX from "xlsx";
import { EVIDENCE_WEIGHTS, calculateRate, calculateTransparencyRate } from "./calculations";
import { INDICATORS, TECHNOLOGIES, type EvidenceLevel } from "./catalog";
import { ensureDatabase, updateBatchStatus, writeAudit } from "./database";

export const SHEET_FIELDS = {
  Literature:["文献ID","题名","年份","DOI","链接","全文状态"],
  Site:["地点ID","湖泊","湖区","纬度","经度","面积_hm2","平均水深_m","背景条件"],
  Case:["案例ID","文献ID","地点ID","研究尺度","实施年份","协同措施"],
  TreatmentArm:["方案ID","案例ID","一级技术编码","二级技术编码","工艺参数","处理规模","规模单位","对照组"],
  Observation:["方案ID","指标代码","变量","污染物","观测角色","原始值","原始单位","观测窗口","来源位置"],
  EvidenceQuality:["方案ID","证据等级","是否有对照","是否有重复","是否有统计检验","跟踪天数","风险监测","C7评分","C8评分","C9评分"],
  Cost:["方案ID","成本类型","数值","单位","价格年份","成本边界"],
} as const;

export type SheetName = keyof typeof SHEET_FIELDS;
export type ParsedPayload = Partial<Record<SheetName, Record<string,unknown>[]>>;
export type ImportIssue = { level:"error"|"warning"; sheet:string; row:number; field?:string; message:string };
type DerivedResult = { id:string;tech:string;sub:string;caseId:string;armId:string;lake:string;scale:string;code:string;pollutant:string|null;value:number|null;unit:string;basis:string;formula:string;level:EvidenceLevel;weight:number;window:string;followup:number;source:string;status:string };

const required:Record<SheetName,string[]> = {
  Literature:["文献ID","题名"], Site:["地点ID","湖泊"], Case:["案例ID","文献ID","地点ID","研究尺度"],
  TreatmentArm:["方案ID","案例ID","一级技术编码","二级技术编码"], Observation:["方案ID","指标代码","观测角色","原始值","原始单位","观测窗口","来源位置"],
  EvidenceQuality:["方案ID","证据等级"], Cost:["方案ID","成本类型","数值","单位"],
};

export async function parseImport(file:File, entityType:string|null) {
  if (file.size === 0) throw new Error("文件为空");
  if (file.size > 8 * 1024 * 1024) throw new Error("文件超过 8 MB，请拆分后上传");
  const bytes = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(bytes), { type:"array", cellDates:false });
  const isCsv = file.name.toLowerCase().endsWith(".csv");
  const payload:ParsedPayload = {};
  if (isCsv) {
    if (!entityType || !(entityType in SHEET_FIELDS)) throw new Error("CSV 导入必须选择数据实体");
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    payload[entityType as SheetName] = XLSX.utils.sheet_to_json(sheet,{defval:"",raw:true});
  } else {
    for (const sheetName of Object.keys(SHEET_FIELDS) as SheetName[]) {
      const sheet = workbook.Sheets[sheetName];
      if (sheet) payload[sheetName] = XLSX.utils.sheet_to_json(sheet,{defval:"",raw:true});
    }
  }
  const rowCount = Object.values(payload).reduce((sum,rows)=>sum+(rows?.length ?? 0),0);
  if (rowCount === 0) throw new Error("没有读取到数据行");
  if (rowCount > 5000) throw new Error("单批次最多 5,000 行，请拆分后上传");
  const { issues, mapping } = validatePayload(payload,isCsv);
  return { bytes, payload, rowCount, issues, mapping };
}

function validatePayload(payload:ParsedPayload,isCsv:boolean) {
  const issues:ImportIssue[] = [];
  const mapping:Array<{sheet:string;field:string;source:string|null;status:"matched"|"missing"}> = [];
  const sheetNames = Object.keys(SHEET_FIELDS) as SheetName[];
  if (!isCsv) for (const name of sheetNames) if (!payload[name]) issues.push({level:"error",sheet:name,row:1,message:`缺少工作表 ${name}`});
  for (const name of sheetNames) {
    const rows = payload[name]; if (!rows) continue;
    const headers = new Set(rows.flatMap((row)=>Object.keys(row)));
    for (const field of SHEET_FIELDS[name]) mapping.push({sheet:name,field,source:headers.has(field)?field:null,status:headers.has(field)?"matched":"missing"});
    for (const field of required[name]) if (!headers.has(field)) issues.push({level:"error",sheet:name,row:1,field,message:`缺少必填列“${field}”`});
    const idField = ({Literature:"文献ID",Site:"地点ID",Case:"案例ID",TreatmentArm:"方案ID"} as Partial<Record<SheetName,string>>)[name];
    if (idField) {
      const seen = new Set<string>();
      rows.forEach((row,index)=>{ const id=text(row[idField]); if(!id) issues.push({level:"error",sheet:name,row:index+2,field:idField,message:"ID 不能为空"}); else if(seen.has(id)) issues.push({level:"error",sheet:name,row:index+2,field:idField,message:`重复 ID：${id}`}); else seen.add(id); });
    }
  }
  validateRelations(payload,issues);
  return { issues, mapping };
}

function validateRelations(payload:ParsedPayload,issues:ImportIssue[]) {
  const ids=(sheet:SheetName,field:string)=>new Set((payload[sheet]??[]).map((row)=>text(row[field])).filter(Boolean));
  const lit=ids("Literature","文献ID"), sites=ids("Site","地点ID"), cases=ids("Case","案例ID"), arms=ids("TreatmentArm","方案ID");
  (payload.Case??[]).forEach((row,i)=>{ if(payload.Literature&&!lit.has(text(row["文献ID"]))) issues.push({level:"error",sheet:"Case",row:i+2,field:"文献ID",message:"引用的文献ID不存在"}); if(payload.Site&&!sites.has(text(row["地点ID"]))) issues.push({level:"error",sheet:"Case",row:i+2,field:"地点ID",message:"引用的地点ID不存在"}); });
  const techCodes=new Set(TECHNOLOGIES.map((item)=>item.code)); const subCodes=new Set(TECHNOLOGIES.flatMap((item)=>item.subTechnologies.map((sub)=>sub.code)));
  (payload.TreatmentArm??[]).forEach((row,i)=>{ if(payload.Case&&!cases.has(text(row["案例ID"]))) issues.push({level:"error",sheet:"TreatmentArm",row:i+2,field:"案例ID",message:"引用的案例ID不存在"}); if(!techCodes.has(text(row["一级技术编码"]))) issues.push({level:"error",sheet:"TreatmentArm",row:i+2,field:"一级技术编码",message:"未知的一级技术编码"}); if(!subCodes.has(text(row["二级技术编码"]))) issues.push({level:"error",sheet:"TreatmentArm",row:i+2,field:"二级技术编码",message:"未知的二级技术编码"}); });
  const dependent:[SheetName,string][]=[["Observation","方案ID"],["EvidenceQuality","方案ID"],["Cost","方案ID"]];
  for(const [sheet,field] of dependent) (payload[sheet]??[]).forEach((row,i)=>{ if(payload.TreatmentArm&&!arms.has(text(row[field]))) issues.push({level:"error",sheet,row:i+2,field,message:"引用的方案ID不存在"}); });
  const indicatorCodes=new Set(INDICATORS.map((item)=>item.code));
  const validUnits=new Set(["%","mg/L","mg/kg","mg/(m²·d)","mg/(m2·d)","cm","m","g/m²","g/m2","分","元/m²","元/m2","元/(m²·a)","元/(m2·a)","元/m³","元/m3","元/(m³·a)","元/(m3·a)"]);
  (payload.Observation??[]).forEach((row,i)=>{ if(!indicatorCodes.has(text(row["指标代码"]))) issues.push({level:"error",sheet:"Observation",row:i+2,field:"指标代码",message:"指标代码必须为 C1—C11"}); if(!validUnits.has(text(row["原始单位"]))) issues.push({level:"error",sheet:"Observation",row:i+2,field:"原始单位",message:"单位不在可识别列表中"}); if(number(row["原始值"])===null) issues.push({level:"error",sheet:"Observation",row:i+2,field:"原始值",message:"原始值必须为数值，真实零值可以录入"}); });
  (payload.EvidenceQuality??[]).forEach((row,i)=>{ if(!/^E[1-5]$/.test(text(row["证据等级"]))) issues.push({level:"error",sheet:"EvidenceQuality",row:i+2,field:"证据等级",message:"证据等级必须为 E1—E5"}); for(const code of ["C7评分","C8评分","C9评分"]) { const value=number(row[code]); if(value!==null&&(value<1||value>5)) issues.push({level:"error",sheet:"EvidenceQuality",row:i+2,field:code,message:"评分必须在 1—5 之间"}); } });
  (payload.Cost??[]).forEach((row,i)=>{ if(number(row["数值"])===null) issues.push({level:"error",sheet:"Cost",row:i+2,field:"数值",message:"成本必须为数值"}); if(!text(row["价格年份"])) issues.push({level:"warning",sheet:"Cost",row:i+2,field:"价格年份",message:"缺少价格年份，成本将保留但不建议跨案例汇总"}); });
}

export function createTemplateWorkbook() {
  const workbook = XLSX.utils.book_new();
  for(const [sheet,fields] of Object.entries(SHEET_FIELDS)) {
    const sample = sampleRow(sheet as SheetName);
    const worksheet = XLSX.utils.json_to_sheet([sample],{header:[...fields]});
    worksheet["!cols"] = fields.map((field)=>({wch:Math.max(12,field.length*2+2)}));
    XLSX.utils.book_append_sheet(workbook,worksheet,sheet);
  }
  return XLSX.write(workbook,{type:"array",bookType:"xlsx"}) as ArrayBuffer;
}

function sampleRow(sheet:SheetName):Record<string,unknown> {
  const samples:Record<SheetName,Record<string,unknown>> = {
    Literature:{文献ID:"LIT-0001",题名:"示例文献题名",年份:2025,DOI:"",链接:"https://example.org",全文状态:"已获取"},
    Site:{地点ID:"SITE-DEMO",湖泊:"示例湖",湖区:"北部湖区",纬度:24.1,经度:102.7,面积_hm2:100,平均水深_m:4.2,背景条件:"示例行，正式导入前请删除"},
    Case:{案例ID:"CASE-0001",文献ID:"LIT-0001",地点ID:"SITE-DEMO",研究尺度:"现场围隔/中试",实施年份:2025,协同措施:"无"},
    TreatmentArm:{方案ID:"ARM-0001",案例ID:"CASE-0001",一级技术编码:"TECH-IP",二级技术编码:"IP-AL",工艺参数:"PAC 试验剂量",处理规模:100,规模单位:"m²",对照组:"同期空白对照"},
    Observation:{方案ID:"ARM-0001",指标代码:"C3",变量:"TP释放通量",污染物:"TP",观测角色:"原文百分比",原始值:65,原始单位:"%",观测窗口:"第90天",来源位置:"表3，第6行"},
    EvidenceQuality:{方案ID:"ARM-0001",证据等级:"E3",是否有对照:"是",是否有重复:"是",是否有统计检验:"是",跟踪天数:90,风险监测:"pH、DO",C7评分:3,C8评分:3,C9评分:4},
    Cost:{方案ID:"ARM-0001",成本类型:"投资",数值:80,单位:"元/m²",价格年份:2025,成本边界:"材料与施工"},
  };
  return samples[sheet];
}

export async function publishPayload(batchId:string,payload:ParsedPayload,actor:string) {
  const db=await ensureDatabase(); if(!db) throw new Error("数据库绑定不可用");
  const literatureRows=payload.Literature??[], siteRows=payload.Site??[], caseRows=payload.Case??[], armRows=payload.TreatmentArm??[], observationRows=payload.Observation??[], qualityRows=payload.EvidenceQuality??[], costRows=payload.Cost??[];
  const statements:D1PreparedStatement[]=[];
  for(const row of literatureRows) statements.push(db.prepare("INSERT OR REPLACE INTO literature (id,title,year,doi,url,fulltext_status,publication_status,import_batch_id) VALUES (?,?,?,?,?,?,'published',?)").bind(text(row["文献ID"]),text(row["题名"]),number(row["年份"]),text(row["DOI"]),text(row["链接"]),text(row["全文状态"]),batchId));
  for(const row of siteRows) statements.push(db.prepare("INSERT OR REPLACE INTO sites (id,lake,zone,latitude,longitude,area,depth,background,publication_status,import_batch_id) VALUES (?,?,?,?,?,?,?,?,'published',?)").bind(text(row["地点ID"]),text(row["湖泊"]),text(row["湖区"]),number(row["纬度"]),number(row["经度"]),number(row["面积_hm2"]),number(row["平均水深_m"]),text(row["背景条件"]),batchId));
  for(const row of caseRows) statements.push(db.prepare("INSERT OR REPLACE INTO cases (id,literature_id,site_id,scale,implementation_year,measures,publication_status,import_batch_id) VALUES (?,?,?,?,?,?,'published',?)").bind(text(row["案例ID"]),text(row["文献ID"]),text(row["地点ID"]),text(row["研究尺度"]),number(row["实施年份"]),text(row["协同措施"]),batchId));
  for(const row of armRows) statements.push(db.prepare("INSERT OR REPLACE INTO treatment_arms (id,case_id,technology_code,sub_technology_code,parameters,scale_value,scale_unit,control_arm,publication_status,import_batch_id) VALUES (?,?,?,?,?,?,?,?,'published',?)").bind(text(row["方案ID"]),text(row["案例ID"]),text(row["一级技术编码"]),text(row["二级技术编码"]),text(row["工艺参数"]),number(row["处理规模"]),text(row["规模单位"]),text(row["对照组"]),batchId));
  for(const row of observationRows) statements.push(db.prepare("INSERT INTO observations (arm_id,variable,pollutant,role,raw_value,raw_unit,observed_at,source_locator,publication_status,import_batch_id) VALUES (?,?,?,?,?,?,?,?,'published',?)").bind(text(row["方案ID"]),text(row["变量"]),text(row["污染物"]),text(row["观测角色"]),number(row["原始值"]),text(row["原始单位"]),text(row["观测窗口"]),text(row["来源位置"]),batchId));
  for(const row of qualityRows) statements.push(db.prepare("INSERT OR REPLACE INTO evidence_quality (arm_id,evidence_level,has_control,has_replicate,has_statistics,followup_days,risk_monitoring,publication_status,import_batch_id) VALUES (?,?,?,?,?,?,?,'published',?)").bind(text(row["方案ID"]),text(row["证据等级"]),yes(row["是否有对照"]),yes(row["是否有重复"]),yes(row["是否有统计检验"]),number(row["跟踪天数"]),text(row["风险监测"]),batchId));
  for(const row of costRows) statements.push(db.prepare("INSERT INTO costs (arm_id,cost_type,value,unit,price_year,boundary,publication_status,import_batch_id) VALUES (?,?,?,?,?,?,'published',?)").bind(text(row["方案ID"]),text(row["成本类型"]),number(row["数值"]),text(row["单位"]),number(row["价格年份"]),text(row["成本边界"]),batchId));
  const results=deriveResults(payload,batchId);
  for(const row of results) statements.push(db.prepare("INSERT OR REPLACE INTO indicator_results (id,technology_code,sub_technology_code,case_id,arm_id,lake,scale,indicator_code,pollutant,value,unit,basis,formula,evidence_level,evidence_weight,observed_at,followup_days,source,status,is_primary,publication_status,import_batch_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,'published',?)").bind(row.id,row.tech,row.sub,row.caseId,row.armId,row.lake,row.scale,row.code,row.pollutant,row.value,row.unit,row.basis,row.formula,row.level,row.weight,row.window,row.followup,row.source,row.status,batchId));
  if(statements.length) await db.batch(statements);
  await updateBatchStatus(batchId,"published",actor);
  await writeAudit(actor,"publish","import_batch",batchId,null,{records:statements.length,results:results.length});
  return {records:statements.length,results:results.length};
}

function deriveResults(payload:ParsedPayload,batchId:string) {
  const cases=new Map((payload.Case??[]).map((row)=>[text(row["案例ID"]),row]));
  const sites=new Map((payload.Site??[]).map((row)=>[text(row["地点ID"]),row]));
  const literature=new Map((payload.Literature??[]).map((row)=>[text(row["文献ID"]),row]));
  const arms=new Map((payload.TreatmentArm??[]).map((row)=>[text(row["方案ID"]),row]));
  const qualities=new Map((payload.EvidenceQuality??[]).map((row)=>[text(row["方案ID"]),row]));
  const groups=new Map<string,Record<string,unknown>[]>();
  for(const row of payload.Observation??[]) { const key=[text(row["方案ID"]),text(row["指标代码"]),text(row["污染物"]),text(row["观测窗口"])].join("|"); groups.set(key,[...(groups.get(key)??[]),row]); }
  const output:DerivedResult[]=[];
  for(const [key,rows] of groups) {
    const [armId,code,pollutant,window]=key.split("|"); const arm=arms.get(armId); if(!arm) continue;
    const caseRow=cases.get(text(arm["案例ID"])); const site=caseRow?sites.get(text(caseRow["地点ID"])):undefined; const lit=caseRow?literature.get(text(caseRow["文献ID"])):undefined; const quality=qualities.get(armId);
    const roles=new Map(rows.map((row)=>[text(row["观测角色"]),number(row["原始值"])])); let value:number|null=null,basis="",formula="";
    if(roles.has("处理")&&roles.has("对照")){ value=code==="C4"?calculateTransparencyRate(roles.get("对照")!,roles.get("处理")!):calculateRate(roles.get("对照")!,roles.get("处理")!); basis="同时间点对照"; formula=code==="C4"?"(SDt-SD0)/SD0×100%":"(C0-Ct)/C0×100%"; }
    else if(roles.has("治理前")&&roles.has("治理后")){ value=code==="C4"?calculateTransparencyRate(roles.get("治理前")!,roles.get("治理后")!):calculateRate(roles.get("治理前")!,roles.get("治理后")!); basis="处理前后比较"; formula=code==="C4"?"(SDt-SD0)/SD0×100%":"(C0-Ct)/C0×100%"; }
    else { const direct=rows.find((row)=>["原文百分比","图表估算"].includes(text(row["观测角色"]))); if(direct){value=number(direct["原始值"]);basis=text(direct["观测角色"]);formula="原文直接报告/人工复核";} }
    const level=(text(quality?.["证据等级"])||"E5") as EvidenceLevel;
    output.push({id:safeId(`${batchId}-${armId}-${code}-${pollutant}-${window}`),tech:text(arm["一级技术编码"]),sub:text(arm["二级技术编码"]),caseId:text(arm["案例ID"]),armId,lake:text(site?.["湖泊"])||"未填写",scale:text(caseRow?.["研究尺度"])||"未填写",code,pollutant:pollutant||null,value,unit:"%",basis:basis||"待核验",formula:formula||"缺少可计算的观测角色组合",level,weight:EVIDENCE_WEIGHTS[level],window,followup:number(quality?.["跟踪天数"])??0,source:`${text(lit?.["题名"])||"未命名文献"} · ${text(rows[0]["来源位置"])}`,status:value===null?"待核验":"可用"});
  }
  for(const quality of payload.EvidenceQuality??[]) for(const code of ["C7","C8","C9"]) { const score=number(quality[`${code}评分`]); if(score===null) continue; const armId=text(quality["方案ID"]),arm=arms.get(armId); if(!arm) continue; const caseRow=cases.get(text(arm["案例ID"])),site=caseRow?sites.get(text(caseRow["地点ID"])):undefined,lit=caseRow?literature.get(text(caseRow["文献ID"])):undefined,level=text(quality["证据等级"]) as EvidenceLevel; output.push({id:safeId(`${batchId}-${armId}-${code}`),tech:text(arm["一级技术编码"]),sub:text(arm["二级技术编码"]),caseId:text(arm["案例ID"]),armId,lake:text(site?.["湖泊"])||"未填写",scale:text(caseRow?.["研究尺度"])||"未填写",code,pollutant:null,value:score,unit:"分",basis:"人工审核",formula:`${code} 评分量表`,level,weight:EVIDENCE_WEIGHTS[level],window:"审核结论",followup:number(quality["跟踪天数"])??0,source:text(lit?.["题名"])||"审核记录",status:"可用"}); }
  for(const cost of payload.Cost??[]) { const armId=text(cost["方案ID"]),arm=arms.get(armId); if(!arm) continue; const caseRow=cases.get(text(arm["案例ID"])),site=caseRow?sites.get(text(caseRow["地点ID"])):undefined,quality=qualities.get(armId),level=(text(quality?.["证据等级"])||"E5") as EvidenceLevel,code=text(cost["成本类型"]).includes("运维")?"C11":"C10"; output.push({id:safeId(`${batchId}-${armId}-${code}-${text(cost["单位"])}`),tech:text(arm["一级技术编码"]),sub:text(arm["二级技术编码"]),caseId:text(arm["案例ID"]),armId,lake:text(site?.["湖泊"])||"未填写",scale:text(caseRow?.["研究尺度"])||"未填写",code,pollutant:null,value:number(cost["数值"]),unit:text(cost["单位"]),basis:`${text(cost["价格年份"])} 年价格 · ${text(cost["成本边界"])}`,formula:"原始成本按治理规模标准化",level,weight:EVIDENCE_WEIGHTS[level],window:"成本记录",followup:number(quality?.["跟踪天数"])??0,source:"成本表",status:"可用"}); }
  return output;
}

const text=(value:unknown)=>value===null||value===undefined?"":String(value).trim();
const number=(value:unknown)=>{ if(value===""||value===null||value===undefined)return null; const parsed=Number(value); return Number.isFinite(parsed)?parsed:null; };
const yes=(value:unknown)=>["是","true","1","yes"].includes(text(value).toLowerCase())?1:0;
const safeId=(value:string)=>value.replace(/[^a-zA-Z0-9_-]/g,"-").slice(0,180);
