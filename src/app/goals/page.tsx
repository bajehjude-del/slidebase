import DashboardShell from "@/components/DashboardShell";
import GoalsClient from "./GoalsClient";
import { getSession } from "@/lib/session";
import { neon } from "@neondatabase/serverless";

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
  const goals = (Array.isArray(rawGoals) ? rawGoals : []).map((g) => {
    const goal = g as Record<string, unknown>;
    return {
      id: String(goal.id ?? ""),
      name: String(goal.name ?? "Untitled goal"),
      targetAmount: Number(goal.targetAmount ?? goal.target_amount ?? 0),
      currentAmount: Number(goal.currentAmount ?? goal.current_amount ?? 0),
      emoji: typeof goal.emoji === "string" ? goal.emoji : "🎯",
      linkedRuleId: typeof goal.linkedRuleId === "string" ? goal.linkedRuleId : typeof goal.linked_rule_id === "string" ? goal.linked_rule_id : null,
      createdAt: String(goal.createdAt ?? goal.created_at ?? new Date().toISOString()),
    };
  });

  const rules = (Array.isArray(rawRules) ? rawRules : []).map((r) => {
    const rule = r as Record<string, unknown>;
    return {
      id: String(rule.id ?? ""),
      description: typeof rule.description === "string" ? rule.description : null,
      action: String(rule.action ?? ""),
      amount: Number(rule.amount ?? 0),
      isPercentage: Boolean(rule.isPercentage ?? rule.is_percentage ?? false),
      status: String(rule.status ?? "active"),
    };
  });

  return (
    <DashboardShell publicKey={session.publicKey}>
      <GoalsClient initialGoals={goals} rules={rules} />
    </DashboardShell>
  );
}
