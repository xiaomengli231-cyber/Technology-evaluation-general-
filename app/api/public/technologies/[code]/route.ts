import { completeness, technologyRollups } from "@/lib/calculations";
import { findTechnology } from "@/lib/catalog";
import { getPublishedResults } from "@/lib/database";

export async function GET(_:Request,{params}:{params:Promise<{code:string}>}){const {code}=await params;const technology=findTechnology(code);if(!technology)return Response.json({error:"技术不存在"},{status:404});const results=(await getPublishedResults()).filter((item)=>item.technologyCode===code);return Response.json({data:{technology,completeness:completeness(results.filter((item)=>!item.isDemo)),rollups:technologyRollups(results),results}})}
