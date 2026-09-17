import { env } from "cloudflare:workers";
import { DEMO_RESULTS, INDICATORS, TECHNOLOGIES, type IndicatorResult } from "./catalog";

type RuntimeEnv = { DB?: D1Database; FILES?: R2Bucket; ADMIN_EMAILS?: string };
type ImportBatchInput = { id:string; fileName:string; fileType:string; entityType:string|null; objectKey:string|null; status:string; rowCount:number; errorCount:number; warningCount:number; mapping:unknown; payload:unknown; issues:unknown; createdBy:string };

const runtime = () => env as unknown as RuntimeEnv;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS technologies (code TEXT PRIMARY KEY, source_id TEXT, name TEXT NOT NULL, group_name TEXT NOT NULL, stage TEXT NOT NULL, summary TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sub_technologies (code TEXT PRIMARY KEY, technology_code TEXT NOT NULL, name TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS indicator_definitions (code TEXT PRIMARY KEY, criterion TEXT NOT NULL, name TEXT NOT NULL, unit TEXT NOT NULL, principle TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS literature (id TEXT PRIMARY KEY, title TEXT NOT NULL, year INTEGER, doi TEXT, url TEXT, fulltext_status TEXT, publication_status TEXT NOT NULL DEFAULT 'draft', import_batch_id TEXT)`,
  `CREATE TABLE IF NOT EXISTS sites (id TEXT PRIMARY KEY, lake TEXT NOT NULL, zone TEXT, latitude REAL, longitude REAL, area REAL, depth REAL, background TEXT, publication_status TEXT NOT NULL DEFAULT 'draft', import_batch_id TEXT)`,
  `CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, literature_id TEXT NOT NULL, site_id TEXT NOT NULL, scale TEXT NOT NULL, implementation_year INTEGER, measures TEXT, publication_status TEXT NOT NULL DEFAULT 'draft', import_batch_id TEXT)`,
  `CREATE TABLE IF NOT EXISTS treatment_arms (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, technology_code TEXT NOT NULL, sub_technology_code TEXT NOT NULL, parameters TEXT, scale_value REAL, scale_unit TEXT, control_arm TEXT, publication_status TEXT NOT NULL DEFAULT 'draft', import_batch_id TEXT)`,
  `CREATE TABLE IF NOT EXISTS observations (id INTEGER PRIMARY KEY AUTOINCREMENT, arm_id TEXT NOT NULL, variable TEXT NOT NULL, pollutant TEXT, role TEXT NOT NULL, raw_value REAL, raw_unit TEXT, observed_at TEXT, source_locator TEXT, publication_status TEXT NOT NULL DEFAULT 'draft', import_batch_id TEXT)`,
  `CREATE TABLE IF NOT EXISTS evidence_quality (arm_id TEXT PRIMARY KEY, evidence_level TEXT NOT NULL, has_control INTEGER, has_replicate INTEGER, has_statistics INTEGER, followup_days INTEGER, risk_monitoring TEXT, publication_status TEXT NOT NULL DEFAULT 'draft', import_batch_id TEXT)`,
  `CREATE TABLE IF NOT EXISTS costs (id INTEGER PRIMARY KEY AUTOINCREMENT, arm_id TEXT NOT NULL, cost_type TEXT NOT NULL, value REAL, unit TEXT, price_year INTEGER, boundary TEXT, publication_status TEXT NOT NULL DEFAULT 'draft', import_batch_id TEXT)`,
  `CREATE TABLE IF NOT EXISTS indicator_results (id TEXT PRIMARY KEY, technology_code TEXT NOT NULL, sub_technology_code TEXT NOT NULL, case_id TEXT NOT NULL, arm_id TEXT NOT NULL, lake TEXT NOT NULL, scale TEXT NOT NULL, indicator_code TEXT NOT NULL, pollutant TEXT, value REAL, unit TEXT NOT NULL, basis TEXT NOT NULL, formula TEXT NOT NULL, evidence_level TEXT NOT NULL, evidence_weight REAL NOT NULL, observed_at TEXT NOT NULL, followup_days INTEGER NOT NULL DEFAULT 0, source TEXT NOT NULL, status TEXT NOT NULL, is_primary INTEGER NOT NULL DEFAULT 1, publication_status TEXT NOT NULL DEFAULT 'draft', import_batch_id TEXT)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_result_primary_window ON indicator_results (arm_id, indicator_code, pollutant, observed_at)`,
  `CREATE INDEX IF NOT EXISTS idx_result_public_tech ON indicator_results (publication_status, technology_code, indicator_code)`,
  `CREATE TABLE IF NOT EXISTS import_batches (id TEXT PRIMARY KEY, file_name TEXT NOT NULL, file_type TEXT NOT NULL, entity_type TEXT, object_key TEXT, status TEXT NOT NULL, row_count INTEGER NOT NULL DEFAULT 0, error_count INTEGER NOT NULL DEFAULT 0, warning_count INTEGER NOT NULL DEFAULT 0, mapping_json TEXT NOT NULL, payload_json TEXT NOT NULL, issues_json TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL, published_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT, updated_by TEXT, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, before_json TEXT, after_json TEXT, created_at TEXT NOT NULL)`,
];

export async function ensureDatabase() {
  const db = runtime().DB;
  if (!db) return null;
  await db.batch(schemaStatements.map((sql) => db.prepare(sql)));
  const count = await db.prepare("SELECT COUNT(*) AS count FROM technologies").first<{count:number}>();
  if ((count?.count ?? 0) === 0) {
    await db.batch(TECHNOLOGIES.map((item) => db.prepare("INSERT OR IGNORE INTO technologies (code, source_id, name, group_name, stage, summary) VALUES (?, ?, ?, ?, ?, ?)").bind(item.code,item.sourceId,item.name,item.group,item.stage,item.summary)));
    await db.batch(TECHNOLOGIES.flatMap((item) => item.subTechnologies.map((sub) => db.prepare("INSERT OR IGNORE INTO sub_technologies (code, technology_code, name) VALUES (?, ?, ?)").bind(sub.code,item.code,sub.name))));
    await db.batch(INDICATORS.map((item) => db.prepare("INSERT OR IGNORE INTO indicator_definitions (code, criterion, name, unit, principle) VALUES (?, ?, ?, ?, ?)").bind(item.code,item.criterion,item.name,item.unit,item.principle)));
  }
  return db;
}

export async function getPublishedResults(): Promise<IndicatorResult[]> {
  const db = await ensureDatabase();
  if (!db) return DEMO_RESULTS;
  const activeBatchId=await getActiveImportBatchId(db);
  const query = activeBatchId
    ? await db.prepare("SELECT * FROM indicator_results WHERE publication_status = 'published' AND import_batch_id = ? ORDER BY technology_code, indicator_code, observed_at").bind(activeBatchId).all<Record<string,unknown>>()
    : await db.prepare("SELECT * FROM indicator_results WHERE publication_status = 'published' ORDER BY technology_code, indicator_code, observed_at").all<Record<string,unknown>>();
  const imported = query.results.map((row:Record<string,unknown>)=>rowToResult(row));
  const recovered=await recoverDirectObservationResults(db,imported,activeBatchId);
  const byId=new Map(imported.map((item)=>[item.id,item]));
  for(const item of recovered) byId.set(item.id,item);
  return [...DEMO_RESULTS, ...byId.values()];
}

async function getActiveImportBatchId(db:D1Database) {
  const row=await db.prepare("SELECT value FROM system_settings WHERE key = 'active_import_batch_id'").first<{value:string|null}>();
  return row?.value||null;
}

export async function setActiveImportBatchId(batchId:string|null,actor:string) {
  const db=await ensureDatabase();if(!db)throw new Error("数据库绑定不可用");
  const before=await getActiveImportBatchId(db);
  await db.prepare("INSERT OR REPLACE INTO system_settings (key,value,updated_by,updated_at) VALUES ('active_import_batch_id',?,?,?)").bind(batchId,actor,new Date().toISOString()).run();
  await writeAudit(actor,"activate","import_batch",batchId??"all",{activeBatchId:before},{activeBatchId:batchId});
}

async function recoverDirectObservationResults(db:D1Database,existing:IndicatorResult[],activeBatchId:string|null) {
  const sql=`SELECT o.id AS observation_id,o.arm_id,o.variable,o.pollutant,o.role,o.raw_value,o.raw_unit,o.observed_at,o.source_locator,o.import_batch_id,
    a.technology_code,a.sub_technology_code,a.case_id,c.scale,s.lake,e.evidence_level,e.followup_days,l.title
    FROM observations o
    JOIN treatment_arms a ON a.id=o.arm_id
    LEFT JOIN cases c ON c.id=a.case_id
    LEFT JOIN sites s ON s.id=c.site_id
    LEFT JOIN evidence_quality e ON e.arm_id=o.arm_id
    LEFT JOIN literature l ON l.id=c.literature_id
    WHERE o.publication_status='published' AND o.raw_value IS NOT NULL ${activeBatchId?"AND o.import_batch_id = ?":""}`;
  const query=activeBatchId?await db.prepare(sql).bind(activeBatchId).all<Record<string,unknown>>():await db.prepare(sql).all<Record<string,unknown>>();
  const signatures=new Map(existing.map((item)=>[[item.armId,item.indicatorCode,item.pollutant??"",item.observedAt].join("|"),item]));
  const output:IndicatorResult[]=[];
  for(const row of query.results){
    const role=String(row.role??"");const unit=String(row.raw_unit??"");const variable=String(row.variable??"");
    if(!isUsableDirectPercent(role,unit))continue;
    const code=inferIndicatorCode(variable);if(!code)continue;
    const value=Number(row.raw_value);if(!Number.isFinite(value))continue;
    const pollutant=row.pollutant?String(row.pollutant):undefined;const observedAt=String(row.observed_at??"未填写");const armId=String(row.arm_id);
    const signature=[armId,code,pollutant??"",observedAt].join("|");const matched=signatures.get(signature);
    const level=/^E[1-5]$/.test(String(row.evidence_level))?String(row.evidence_level) as IndicatorResult["evidenceLevel"]:"E5";
    const recovered:IndicatorResult={
      id:matched?.id??`OBS-${row.observation_id}-${code}`,technologyCode:String(row.technology_code),subTechnologyCode:String(row.sub_technology_code),caseId:String(row.case_id),armId,lake:String(row.lake??"未填写"),scale:String(row.scale??"未填写"),indicatorCode:code,pollutant,value,unit:"%",basis:role,formula:"上传文件已提供百分比结果，宽松核验纳入",evidenceLevel:level,evidenceWeight:({E1:1,E2:.8,E3:.6,E4:.4,E5:.2} as const)[level],observedAt,followupDays:Number(row.followup_days??0),source:`${String(row.title??"未命名文献")} · ${String(row.source_locator??"上传记录")}`,status:"可用",isPrimary:true,isDemo:false,publicationStatus:"published",
    };
    if(matched&&matched.value!==null)continue;
    output.push(recovered);signatures.set(signature,recovered);
  }
  return output;
}

function isUsableDirectPercent(role:string,unit:string){return ["%","％","percent"].includes(unit.trim().toLowerCase())&&!/(未报告|不适用|不可换算|待核验)/.test(role)&&/(直接报告|原文|百分比|估算|比较|去除|削减|抑制|提升)/.test(role);}
function inferIndicatorCode(variable:string){if(/(释放|通量).*(削减|抑制|降低|率)|(削减|抑制).*(释放|通量)/.test(variable))return"C3";if(/(底泥|沉积物).*(TN|总氮).*(去除|削减)/i.test(variable))return"C1";if(/(底泥|沉积物).*(TP|总磷).*(去除|削减)/i.test(variable))return"C2";if(/(透明度|塞氏盘|SD).*(提升|改善|率)/i.test(variable))return"C4";if(/(上覆水|水体).*(TN|总氮).*(去除|削减)/i.test(variable))return"C5";if(/(上覆水|水体).*(TP|总磷).*(去除|削减)/i.test(variable))return"C6";return null;}

function rowToResult(row: Record<string,unknown>): IndicatorResult {
  return {
    id:String(row.id), technologyCode:String(row.technology_code), subTechnologyCode:String(row.sub_technology_code), caseId:String(row.case_id), armId:String(row.arm_id), lake:String(row.lake), scale:String(row.scale), indicatorCode:String(row.indicator_code),
    pollutant:row.pollutant ? String(row.pollutant) : undefined, value:row.value === null ? null : Number(row.value), unit:String(row.unit), basis:String(row.basis), formula:String(row.formula), evidenceLevel:String(row.evidence_level) as IndicatorResult["evidenceLevel"], evidenceWeight:Number(row.evidence_weight), observedAt:String(row.observed_at), followupDays:Number(row.followup_days), source:String(row.source), status:String(row.status) as IndicatorResult["status"], isPrimary:Boolean(row.is_primary), isDemo:false, publicationStatus:String(row.publication_status) as "published"|"draft",
  };
}

export async function saveUpload(bytes:ArrayBuffer, objectKey:string, contentType:string) {
  const bucket = runtime().FILES;
  if (!bucket) return null;
  await bucket.put(objectKey, bytes, { httpMetadata:{ contentType } });
  return objectKey;
}

export async function createImportBatch(input:ImportBatchInput) {
  const db = await ensureDatabase();
  if (!db) throw new Error("数据库绑定不可用");
  await db.prepare(`INSERT INTO import_batches (id,file_name,file_type,entity_type,object_key,status,row_count,error_count,warning_count,mapping_json,payload_json,issues_json,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    input.id,input.fileName,input.fileType,input.entityType,input.objectKey,input.status,input.rowCount,input.errorCount,input.warningCount,JSON.stringify(input.mapping),JSON.stringify(input.payload),JSON.stringify(input.issues),input.createdBy,new Date().toISOString(),
  ).run();
  await writeAudit(input.createdBy,"create","import_batch",input.id,null,{status:input.status,rowCount:input.rowCount});
}

export async function listImportBatches() {
  const db = await ensureDatabase();
  if (!db) return [];
  const [query,activeBatchId] = await Promise.all([db.prepare("SELECT b.id,b.file_name,b.status,b.row_count,b.error_count,b.warning_count,b.created_by,b.created_at,b.published_at,b.mapping_json,b.issues_json,(SELECT COUNT(*) FROM indicator_results r WHERE r.import_batch_id=b.id AND r.publication_status='published') AS result_count FROM import_batches b ORDER BY b.created_at DESC LIMIT 30").all<Record<string,unknown>>(),getActiveImportBatchId(db)]);
  return query.results.map((row)=>({ ...row, active:activeBatchId===row.id, mapping:JSON.parse(String(row.mapping_json)), issues:JSON.parse(String(row.issues_json)) }));
}

export async function getImportBatch(id:string):Promise<(Record<string,unknown>&{payload:unknown;issues:unknown;mapping:unknown})|null> {
  const db = await ensureDatabase();
  if (!db) return null;
  const row = await db.prepare("SELECT * FROM import_batches WHERE id = ?").bind(id).first<Record<string,unknown>>();
  return row ? { ...row, payload:JSON.parse(String(row.payload_json)), issues:JSON.parse(String(row.issues_json)), mapping:JSON.parse(String(row.mapping_json)) } : null;
}

export async function updateBatchStatus(id:string,status:string,actor:string) {
  const db = await ensureDatabase(); if (!db) throw new Error("数据库绑定不可用");
  const before = await db.prepare("SELECT status FROM import_batches WHERE id = ?").bind(id).first();
  await db.prepare("UPDATE import_batches SET status = ?, published_at = CASE WHEN ? = 'published' THEN ? ELSE published_at END WHERE id = ?").bind(status,status,new Date().toISOString(),id).run();
  await writeAudit(actor,status,"import_batch",id,before,{status});
}

export async function writeAudit(actor:string,action:string,entityType:string,entityId:string,before:unknown,after:unknown) {
  const db = await ensureDatabase(); if (!db) return;
  await db.prepare("INSERT INTO audit_logs (actor,action,entity_type,entity_id,before_json,after_json,created_at) VALUES (?,?,?,?,?,?,?)").bind(actor,action,entityType,entityId,before ? JSON.stringify(before) : null,after ? JSON.stringify(after) : null,new Date().toISOString()).run();
}

export async function getStats() {
  const results = await getPublishedResults();
  const official = results.filter((item)=>!item.isDemo);
  return { technologies:TECHNOLOGIES.length, subTechnologies:TECHNOLOGIES.reduce((sum,item)=>sum+item.subTechnologies.length,0), cases:new Set(official.map((item)=>item.caseId)).size, lakes:new Set(official.map((item)=>item.lake)).size, pending:results.filter((item)=>item.status==="待核验").length, demoCases:new Set(results.filter((item)=>item.isDemo).map((item)=>item.caseId)).size };
}
