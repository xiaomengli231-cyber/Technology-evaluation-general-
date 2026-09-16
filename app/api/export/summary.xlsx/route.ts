import { getPublishedResults } from "@/lib/database";
import { filterResults, summaryWorkbook } from "@/lib/export";
export async function GET(request:Request){const bytes=summaryWorkbook(filterResults(await getPublishedResults(),new URL(request.url)));return new Response(bytes,{headers:{"content-type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","content-disposition":"attachment; filename*=UTF-8''lake-technology-evaluation.xlsx"}})}
