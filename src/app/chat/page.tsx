import DashboardShell from "@/components/DashboardShell";
import ChatClient from "./ChatClient";
import { getSession } from "@/lib/session";
import { neon } from "@neondatabase/serverless";

export default async function ChatPage() {
  const session = await getSession();
  const sql = neon(process.env.DATABASE_URL!);

  const rawRules = await sql`
    SELECT r.id,
           r.trigger,
           r.action,
           r.amount,
           r."isPercentage",
           r.status,
           r.description
    FROM   "Rule" r
    JOIN   "User" u ON r."userId" = u.id
    WHERE  u."publicKey" = ${session.publicKey}
    ORDER  BY r."createdAt" DESC
  `.catch(() => []);

  // Normalise to camelCase so ChatClient never receives undefined fields
  const rules = (Array.isArray(rawRules) ? rawRules : [])
    .filter((r) => r != null && (r as Record<string, unknown>).id != null)
    .map((r) => {
      const rule = r as Record<string, unknown>;
      return {
        id: String(rule.id ?? ""),
        trigger: typeof rule.trigger === "string" ? rule.trigger : "",
        action: typeof rule.action === "string" ? rule.action : "",
        amount: Number(rule.amount ?? 0),
        isPercentage: Boolean(rule.isPercentage ?? rule.is_percentage ?? false),
        status: typeof rule.status === "string" ? rule.status : "active",
        description: typeof rule.description === "string" ? rule.description : null,
      };
    });

  return (
    <DashboardShell publicKey={session.publicKey}>
      <ChatClient initialRules={rules} />
    </DashboardShell>
  );
}
