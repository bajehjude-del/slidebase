import DashboardShell from "@/components/DashboardShell";
import RulesClient from "./RulesClient";
import { getSession } from "@/lib/session";
import { neon } from "@neondatabase/serverless";

interface DatabaseRule {
  id: string;
  trigger: string;
  action: string;
  amount?: string | number | null;
  isPercentage?: boolean | null;
  status?: string | null;
  description?: string | null;
  memo?: string | null;
  createdAt?: string | null;
}

export default async function RulesPage() {
  const session = await getSession();
  const sql = neon(process.env.DATABASE_URL!);

  const rules = await sql`
    SELECT r.* FROM "Rule" r
    JOIN "User" u ON r."userId" = u.id
    WHERE u."publicKey" = ${session.publicKey}
    ORDER BY r."createdAt" DESC
  `.catch(() => []);

  const normalizedRules = (rules as DatabaseRule[]).map((rule) => ({
    id: rule.id,
    trigger: rule.trigger ?? "",
    action: rule.action ?? "",
    amount: Number(rule.amount ?? 0),
    isPercentage: rule.isPercentage ?? false,
    status: rule.status ?? "active",
    description: rule.description ?? null,
    memo: rule.memo ?? null,
    createdAt: rule.createdAt ?? "",
  }));

  return (
    <DashboardShell publicKey={session.publicKey}>
      <RulesClient initialRules={normalizedRules} />
    </DashboardShell>
  );
}
