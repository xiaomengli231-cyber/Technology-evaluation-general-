import { TECHNOLOGIES } from "@/lib/catalog";
import { completeness, technologyRollups } from "@/lib/calculations";
import { getPublishedResults } from "@/lib/database";

export async function GET(){const results=await getPublishedResults();return Response.json({data:TECHNOLOGIES.map((technology)=>{const own=results.filter((item)=>item.technologyCode===technology.code&&!item.isDemo);return{...technology,completeness:completeness(own),rollups:technologyRollups(own)}}),meta:{count:TECHNOLOGIES.length}})}
