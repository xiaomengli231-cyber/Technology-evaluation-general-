import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

function configuredEmails(): string[] {
  const runtime = env as unknown as { ADMIN_EMAILS?: string };
  return (runtime.ADMIN_EMAILS ?? process.env.ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
}

export function isAdminEmail(email: string) { return configuredEmails().includes(email.trim().toLowerCase()); }
export async function getAdmin() { const user = await getChatGPTUser(); return user && isAdminEmail(user.email) ? user : null; }
export async function requireAdminApi() {
  const user = await getChatGPTUser();
  if (!user) return { response:Response.json({error:"请先使用 ChatGPT 登录"},{status:401}) } as const;
  if (!isAdminEmail(user.email)) return { response:Response.json({error:"当前账户不在管理员邮箱白名单中"},{status:403}) } as const;
  return { user } as const;
}
