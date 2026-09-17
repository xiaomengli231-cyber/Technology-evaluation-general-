import { requireAdminApi } from "@/lib/admin";
import { getImportBatch, setActiveImportBatchId } from "@/lib/database";

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
  const auth=await requireAdminApi();if("response" in auth)return auth.response;
  const {id}=await params;
  if(id==="all"){await setActiveImportBatchId(null,auth.user.email);return Response.json({ok:true,activeBatchId:null});}
  const batch=await getImportBatch(id);if(!batch)return Response.json({error:"导入批次不存在"},{status:404});
  if(batch.status!=="published")return Response.json({error:"只能切换到已发布批次"},{status:409});
  await setActiveImportBatchId(id,auth.user.email);return Response.json({ok:true,activeBatchId:id});
}
