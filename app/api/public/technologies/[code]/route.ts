import { completeness, technologyRollups } from "@/lib/calculations";
import { findTechnology } from "@/lib/catalog";
import { getPublishedResults } from "@/lib/database";

export async function GET(_:Request,{params}:{params:Promise<{code:string}>}){const {code}=await params;const technology=findTechnology(code);if(!technology)return Response.json({error:"技术不存在"},{status:404});const all=await getPublishedResults();const official=all.filter((item)=>!item.isDemo);const results=(official.length?official:all).filter((item)=>item.technologyCode===code);return Response.json({data:{technology,completeness:completeness(results),rollups:technologyRollups(results),results}})}
