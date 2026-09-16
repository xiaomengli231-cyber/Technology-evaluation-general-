import { requireAdminApi } from "@/lib/admin";
import { getImportBatch } from "@/lib/database";
import { publishPayload, type ParsedPayload } from "@/lib/importer";

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){const auth=await requireAdminApi();if("response" in auth)return auth.response;const {id}=await params;const batch=await getImportBatch(id);if(!batch)return Response.json({error:"导入批次不存在"},{status:404});if(batch.status==="published")return Response.json({error:"该批次已经发布"},{status:409});try{const result=await publishPayload(id,batch.payload as ParsedPayload,auth.user.email);return Response.json({...result,precheckIssues:Number(batch.error_count)+Number(batch.warning_count)});}catch(error){return Response.json({error:error instanceof Error?error.message:"发布失败"},{status:500});}}
