import DashboardShell from "@/components/DashboardShell";
import RulesClient from "./RulesClient";
import { getSession } from "@/lib/session";
import { neon } from "@neondatabase/serverless";

export default async function RulesPage() {
  const session = await getSession();
  const sql = neon(process.env.DATABASE_URL!);

  const rows = await sql`
    SELECT r.* FROM "Rule" r
    JOIN "User" u ON r."userId" = u.id
    WHERE u."publicKey" = ${session.publicKey}
    ORDER BY r."createdAt" DESC
  `.catch(() => []);

  const rules = (Array.isArray(rows) ? rows : []).map((row) => {
    const rule = row as Record<string, unknown>;
    return {
      id: String(rule.id ?? ""),
      trigger: typeof rule.trigger === "string" ? rule.trigger : "",
      action: typeof rule.action === "string" ? rule.action : "",
      amount: Number(rule.amount ?? 0),
      isPercentage: Boolean(rule.isPercentage ?? rule.is_percentage ?? false),
      status: typeof rule.status === "string" ? rule.status : "active",
      description: typeof rule.description === "string" ? rule.description : null,
      memo: typeof rule.memo === "string" ? rule.memo : null,
      createdAt: String(rule.createdAt ?? rule.created_at ?? new Date().toISOString()),
    };
  });

  return (
    <DashboardShell publicKey={session.publicKey}>
      <RulesClient initialRules={rules} />
    </DashboardShell>
  );
}
