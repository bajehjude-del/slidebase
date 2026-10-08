import DashboardShell from "@/components/DashboardShell";
import ChatClient from "./ChatClient";
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
}

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
  const rules = (rawRules as DatabaseRule[])
    .filter((r) => r != null && r.id != null)
    .map((r) => ({
      id:          r.id,
      trigger:     r.trigger ?? "",
      action:      r.action ?? "",
      amount:      Number(r.amount ?? 0),
      isPercentage: r.isPercentage ?? false,
      status:      r.status ?? "active",
      description: r.description ?? null,
    }));

  return (
    <DashboardShell publicKey={session.publicKey}>
      <ChatClient initialRules={rules} />
    </DashboardShell>
  );
}
