import { randomUUID } from "node:crypto";
import { requireAdminApi } from "@/lib/admin";
import { createImportBatch, saveUpload } from "@/lib/database";
import { parseImport } from "@/lib/importer";

export async function POST(request:Request){
  const auth=await requireAdminApi();if("response" in auth)return auth.response;
  try{const form=await request.formData();const file=form.get("file");if(!(file instanceof File))return Response.json({error:"请选择要上传的文件"},{status:400});if(!/\.(xlsx|xls|csv)$/i.test(file.name))return Response.json({error:"仅支持 .xlsx、.xls 或 .csv"},{status:400});const entityType=String(form.get("entityType")||"")||null;const parsed=await parseImport(file,entityType);const id=`IMP-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${randomUUID().slice(0,8).toUpperCase()}`;const objectKey=`imports/${id}/${file.name.replace(/[^\p{L}\p{N}._-]/gu,"_")}`;await saveUpload(parsed.bytes,objectKey,file.type||"application/octet-stream");const errorCount=parsed.issues.filter((item)=>item.level==="error").length;const warningCount=parsed.issues.filter((item)=>item.level==="warning").length;const status="ready_for_review";await createImportBatch({id,fileName:file.name,fileType:file.name.split(".").pop()?.toLowerCase()||"unknown",entityType,objectKey,status,rowCount:parsed.rowCount,errorCount,warningCount,mapping:parsed.mapping,payload:parsed.payload,issues:parsed.issues,createdBy:auth.user.email});return Response.json({id,fileName:file.name,status,rowCount:parsed.rowCount,errorCount,warningCount,mapping:parsed.mapping,issues:parsed.issues});}catch(error){return Response.json({error:error instanceof Error?error.message:"文件解析失败"},{status:400});}
}
