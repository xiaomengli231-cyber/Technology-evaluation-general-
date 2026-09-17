import { TECHNOLOGIES } from "@/lib/catalog";
import { completeness, technologyRollups } from "@/lib/calculations";
import { getPublishedResults } from "@/lib/database";

export async function GET(){const all=await getPublishedResults();const official=all.filter((item)=>!item.isDemo);const results=official.length?official:all;return Response.json({data:TECHNOLOGIES.map((technology)=>{const own=results.filter((item)=>item.technologyCode===technology.code);return{...technology,completeness:completeness(own),rollups:technologyRollups(own)}}),meta:{count:TECHNOLOGIES.length,source:official.length?"official":"demo"}})}
