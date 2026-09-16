import { getPublishedResults } from "@/lib/database";
import { csvBytes, detailsRows, filterResults } from "@/lib/export";
export async function GET(request:Request){const rows=detailsRows(filterResults(await getPublishedResults(),new URL(request.url)));return new Response(csvBytes(rows),{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":"attachment; filename*=UTF-8''technology-evidence-details.csv"}})}
