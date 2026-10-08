import DashboardShell from "@/components/DashboardShell";
import GoalsClient from "./GoalsClient";
import { getSession } from "@/lib/session";
import { neon } from "@neondatabase/serverless";

interface DatabaseGoal {
  id: string;
  name: string;
  targetAmount?: string | number | null;
  currentAmount?: string | number | null;
  emoji?: string | null;
  linkedRuleId?: string | null;
  createdAt?: string | null;
}

interface DatabaseRule {
  id: string;
  description?: string | null;
  action: string;
  amount?: string | number | null;
  isPercentage?: boolean | null;
  status?: string | null;
}

export default async function GoalsPage() {
  const session = await getSession();
  const sql = neon(process.env.DATABASE_URL!);

  const [rawGoals, rawRules] = await Promise.all([
    sql`
      SELECT g.id, g.name,
             g."targetAmount",
             g."currentAmount",
             g.emoji,
             g."linkedRuleId",
             g."createdAt"
      FROM   "Goal" g
      JOIN   "User" u ON g."userId" = u.id
      WHERE  u."publicKey" = ${session.publicKey}
      ORDER  BY g."createdAt" DESC
    `.catch(() => []),
    sql`
      SELECT r.id, r.description, r.action,
             r.amount, r."isPercentage", r.status
      FROM   "Rule" r
      JOIN   "User" u ON r."userId" = u.id
      WHERE  u."publicKey" = ${session.publicKey}
      ORDER  BY r."createdAt" DESC
    `.catch(() => []),
  ]);

  // Explicitly normalise to camelCase so GoalsClient never sees undefined fields
  const goals = (rawGoals as DatabaseGoal[]).map((g) => ({
    id:           g.id,
    name:         g.name,
    targetAmount: Number(g.targetAmount ?? 0),
    currentAmount: Number(g.currentAmount ?? 0),
    emoji:        g.emoji ?? "🎯",
    linkedRuleId: g.linkedRuleId ?? null,
    createdAt:    g.createdAt ?? "",
  }));

  const rules = (rawRules as DatabaseRule[]).map((r) => ({
    id:          r.id,
    description: r.description ?? null,
    action:      r.action,
    amount:      Number(r.amount ?? 0),
    isPercentage: r.isPercentage ?? false,
    status:      r.status ?? "active",
  }));

  return (
    <DashboardShell publicKey={session.publicKey}>
      <GoalsClient initialGoals={goals} rules={rules} />
    </DashboardShell>
  );
}
