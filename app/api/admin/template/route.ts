import { requireAdminApi } from "@/lib/admin";
import { createTemplateWorkbook } from "@/lib/importer";

export async function GET(){const auth=await requireAdminApi();if("response" in auth)return auth.response;const bytes=createTemplateWorkbook();return new Response(bytes,{headers:{"content-type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","content-disposition":"attachment; filename*=UTF-8''lake-evaluation-import-template.xlsx","cache-control":"no-store"}})}
