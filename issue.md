# Slidebase — Issue Backlog

Issues scoped to the slidebase frontend repo. Each entry can be pasted verbatim into a GitHub issue.

---

## Issue 1 — [bug] Engine status panel 404s: `/api/slidebase/*` doesn't match backend routes

**Priority:** High · **Labels:** `bug`, `integration`

### Summary

After the project rename, `EngineStatusPanel` calls `/api/slidebase/status` and `/api/slidebase/monitor`, but the Slidebase backend (Fastify, still deployed under the `autopilot` name) registers these routes under `/api/autopilot/*`. The Next.js proxy in `next.config.ts` forwards `/api/*` as-is, so both calls return `404` and the panel never renders engine data.

### Files

- `src/components/EngineStatusPanel.tsx:72` — `fetch("/api/slidebase/status")`
- `src/components/EngineStatusPanel.tsx:94` — `fetch("/api/slidebase/monitor")`
- `next.config.ts` — proxies `/api/:path*` unchanged

### Expected behavior

The engine status panel loads engine balance, active rules, and recent transactions against the live backend.

### Suggested fix

Pick one and apply to both sides:
1. Update the backend route prefix from `/api/autopilot/status` → `/api/slidebase/status` so the frontend call succeeds, or
2. Keep the backend prefix and revert the frontend to `/api/autopilot/*`.

---

## Issue 2 — [bug] `npm run worker` fails: script references a nonexistent `worker.ts`

**Priority:** Medium · **Labels:** `bug`, `maintenance`

### Summary

`package.json` defines a `worker` script that runs `npx tsx worker.ts`, but no `worker.ts` exists in the repo (confirmed via search). Running `npm run worker` exits with `ERR_MODULE_NOT_FOUND`/`Cannot find module`.

### Files

- `package.json:7` — `"worker": "npx tsx worker.ts"`

### Expected behavior

Either the script runs successfully, or it is removed/renamed so `npm run <script>` never points at a missing file.

### Suggested fix

- If the background worker was intentionally dropped during the monorepo split, delete the `worker` script from `package.json`.
- If it should exist, add `worker.ts` at the repo root and document what it's for.

---

## Issue 3 — [bug] EngineStatusPanel silently swallows fetch errors (stuck on "Loading…")

**Priority:** Medium · **Labels:** `bug`, `ux`

### Summary

Both `fetchStatus` and `triggerNow` in `EngineStatusPanel` use empty `catch {}` blocks. When the backend is unreachable or returns a non-OK response, the error is discarded: `fetchStatus` leaves the UI on an eternal "Loading…" state and `triggerNow` pretends success. There is no error message, retry affordance, or offline indicator for the user.

### Files

- `src/components/EngineStatusPanel.tsx:70-83` — `fetchStatus` with empty `catch {}` and no error state
- `src/components/EngineStatusPanel.tsx:91-103` — `triggerNow` with empty `catch {}`

### Expected behavior

- Surface a visible "Engine offline / can't reach backend" state with a retry button.
- Reset `loading` to `false` and stop polling (or back off) when calls fail.
- Never show "Rule(s) executed" when a request actually failed.

### Suggested fix

Add an `error` state, set it in `catch`, render an error card, and only update `lastTrigger` on a successful `res.ok`.

---

## Issue 4 — [chore] Eliminate the 32 ESLint warnings

**Priority:** Low · **Labels:** `cleanup`, `tech-debt`

### Summary

`npm run lint` passes with **0 errors but 32 warnings**. Warnings include unused imports, `no-explicit-any`, an unused catch binding, and `react-hooks/set-state-in-effect`. Fixing these clears the noise and tightens CI.

### Known warnings (sample, not exhaustive)

| File | Warning |
| :--- | :--- |
| `src/app/account/AccountClient.tsx:9-10` | Unused imports `DollarSign`, `ArrowUpRight` |
| `src/app/rules/RulesClient.tsx:5-6` | Unused imports `Pause`, `Play`, `DollarSign`, `Calendar`, `CheckCircle2` |
| `src/components/EngineStatusPanel.tsx:6-7` | Unused imports `XCircle`, `ArrowUpRight` |
| `src/lib/auth.ts:35` | Unused `error` binding in `catch` |
| `src/app/page.tsx`, `src/app/goals/*`, `src/app/chat/*`, `src/app/vault/*`, `src/app/onboarding/*`, `src/lib/stellar.ts:19` | `@typescript-eslint/no-explicit-any` (~a dozen) |
| `src/app/account/AccountClient.tsx:584`, `src/app/vault/page.tsx:242,460`, `src/components/EngineStatusPanel.tsx:86` | `react-hooks/set-state-in-effect` |

### Expected behavior

`npm run lint` reports **0 warnings and 0 errors**.

### Suggested fix

- Delete unused icon imports.
- Replace `any` with `unknown` + narrowing, or proper types from the backend response shapes.
- Use `catch {` (no binding) where the error is unused.
- Move synchronous state updates out of `useEffect` (see Issue 5 for follow-up).

---

## Issue 5 — [ops] Fix synchronous `setState` inside `useEffect` (cascading renders)

**Priority:** Low · **Labels:** `performance`, `tech-debt`

### Summary

React 19 lint rules flag `setState` calls made synchronously inside `useEffect` bodies in the data-fetching components. Called synchronously in the effect body (instead of inside an async callback), these can schedule redundant re-renders and interfere with concurrent rendering.

### Files

- `src/app/account/AccountClient.tsx:584` — `useEffect(() => { fetchData(); }, [fetchData])`
- `src/app/vault/page.tsx:242, 460` — `fetchBalance()` / `fetchUser()` + `fetchVaults()` called in effects
- `src/components/EngineStatusPanel.tsx:86` — `fetchStatus()` invoked directly in the effect body

### Expected behavior

`React Compiler`/lint guidance satisfied: no synchronous `setState` in effect bodies; data loads resolve from async callbacks so the component renders idle/skeleton first.

### Suggested fix

- Convert effect bodies to start an async operation (the `setState` happens inside the promise callback), e.g.:
  ```ts
  useEffect(() => {
    void fetchData();
  }, [fetchData]);
  ```
- Consider using a `useCallback`-wrapped loader + `useEffect`, or server components/server actions where the data is read-only.
---

## Issue 6 — [security] Fail-open JWT verification: production falls back to a hardcoded secret committed to the repo

**Priority:** High · **Labels:** `security`, `bug`, `auth`

### Summary

`verifyToken` authenticates every protected page using `process.env.JWT_SECRET || "super-secret-key-for-dev"` evaluated at module load, with no production guard. `JWT_SECRET` appears in no env file or doc (`.env.example` lists only `NEXT_PUBLIC_API_URL`; the README and CONTRIBUTING env tables omit it), so a production deploy that hasn't set it verifies session cookies against a secret that is public in git history. Because server components query Postgres directly using the JWT's `publicKey`, anyone who can mint an HS256 token with the dev secret can read any user's rules, goals, and chat-derived data.

### Files

- `src/lib/auth.ts:17` — `const secretKey = process.env.JWT_SECRET || "super-secret-key-for-dev";`
- `src/lib/auth.ts:34` — `payload as { publicKey: ... }` cast without validating `publicKey` exists
- `src/lib/session.ts:7-11` — every protected route gates on `verifyToken`
- `.env.example:1-10` — documents only `NEXT_PUBLIC_API_URL`
- `README.md:149-152`, `CONTRIBUTING.md:82-85` — env var tables missing `JWT_SECRET`

### Expected behavior

The server refuses to start (or refuses to verify) in production when `JWT_SECRET` is absent or equals the known dev fallback; the variable is documented everywhere other env vars are listed.

### Suggested fix

```ts
const secretKey = process.env.JWT_SECRET;
if (!secretKey || secretKey === "super-secret-key-for-dev") {
  if (process.env.NODE_ENV === "production") throw new Error("JWT_SECRET must be set in production");
}
```

Add `JWT_SECRET` to `.env.example`, README, and CONTRIBUTING, and validate `payload.publicKey` is a non-empty string before returning it.

---

## Issue 7 — [bug] Mutations commit to the UI before the server confirms; spending-limit input is unvalidated

**Priority:** High · **Labels:** `bug`, `ux`, `data-integrity`

### Summary

Four mutations ignore the HTTP result and update local state unconditionally: spending-limit saves, rule deletes, goal deletes/links, and chat rule activation. The spending-limit case is worst — the UI advertises "Caps enforced by the automation engine," yet a rejected `PATCH` still renders as saved. The correct pattern already exists in the same codebase (`RulesClient.handleToggle` reverts on `!res.ok`), so this is an inconsistency, not a design choice. A network failure during a limit save also leaves the spinner stuck forever, and `parseFloat("-50")` passes straight to the API because validation relies on a `min="0"` attribute that an `onClick` handler never enforces.

### Files

- `src/app/account/AccountClient.tsx:301-308` — `save()` never checks `res.ok`, then calls `onUpdate(key, val)` unconditionally
- `src/app/account/AccountClient.tsx:222-228` — `handleSave` has no `try/finally`: rejection skips `setSaving(false)`/`setEditing(false)`
- `src/app/rules/RulesClient.tsx:55-60` — `handleDelete` calls `onDelete(rule.id)` regardless of response status
- `src/app/goals/GoalsClient.tsx:95-113` — goal delete and rule-link PATCH ignore `res.ok`
- `src/app/chat/ChatClient.tsx:387-393` — `setActivated(true)` runs unconditionally, so the green "Rule activated" banner renders even when `handleActivate` (`:523-542`) has just shown "Failed to activate rule."

### Expected behavior

Local state changes only after `res.ok`; failures roll back and surface an error; saving flags are always cleared in `finally`; limit inputs reject non-finite or negative values before the request.

### Suggested fix

Extract a `patch(url, body)` helper that throws on `!r.ok`, wrap handlers in try/catch with rollback (copy the revert logic from `RulesClient.handleToggle:222-225`), and in `LimitRow.handleSave` validate `Number.isFinite(parsed) && parsed >= 0` inside a `try/finally`.

---

## Issue 8 — [a11y] No dialog semantics, no keyboard access to row actions, no label associations (one `aria-label` repo-wide)

**Priority:** Medium · **Labels:** `accessibility`, `bug`, `ux`

### Summary

A repo-wide grep shows `src/` contains one `aria-label`, zero `role="dialog"`, zero `aria-modal`, zero `aria-current`, and zero `htmlFor`. Rule rows are `<div onClick>` and cannot be opened by keyboard; all four overlays (upgrade modal, rule sheet, new-goal sheet, withdraw modal) trap neither focus nor Escape and expose icon-only close buttons with no accessible name; the goal form's `<label>`s aren't associated with their inputs; the chat textarea and send button have no labels. This fails WCAG 2.1 AA (2.1.1, 4.1.2, 1.3.1, 2.4.7).

### Files

- `src/app/rules/RulesClient.tsx:159-163` — `motion.div ... onClick={onClick}` with no `role`/`tabIndex`/`onKeyDown`
- `src/app/rules/RulesClient.tsx:83-89, 103-105` — bottom sheet with no dialog role/Escape; icon-only close button
- `src/app/account/AccountClient.tsx:431-499` — `UpgradeModal`: no `role="dialog"`, `aria-modal`, focus trap, or Escape; close button at `:451-453` has no accessible name
- `src/app/goals/GoalsClient.tsx:287-304` — `<label>` with no `htmlFor`, `<input>` with no `id`
- `src/app/vault/page.tsx:184-190` — withdraw input labeled by placeholder only; close button at `:144-146`
- `src/app/chat/ChatClient.tsx:687-711` — `id="chat-input"` with no matching label; icon-only send button
- `src/components/Sidebar.tsx:76-104, 149-164` — active nav conveyed only by color; no `aria-current="page"`

### Expected behavior

Every overlay is announced as a dialog, traps focus, closes on Escape, and restores focus; every action is keyboard-reachable; every input is programmatically labeled; icon-only buttons have accessible names; active nav carries `aria-current`.

### Suggested fix

Convert `RuleRow` to a `<button>`; add a small `useDialog(ref)` hook (Escape + focus trap + restore) used by all four overlays; add `aria-label="Close"`/`"Send"` to icon buttons; add `htmlFor`/`id` pairs in `NewGoalSheet` and the chat input; add `aria-current={isActive ? "page" : undefined}` in `Sidebar`.

---

## Issue 9 — [chore] Dead modules, unused dependencies, and an undeclared import in `check-db.ts`

**Priority:** Medium · **Labels:** `cleanup`, `tech-debt`, `dependencies`

### Summary

Repo-wide import greps show `src/lib/stellar.ts`, `src/lib/getUser.ts`, `src/lib/prisma.ts`, and `auth.ts`'s `signToken` have no importers anywhere — the entire Prisma layer is dead while the app uses raw `neon()` SQL. Four declared dependencies are never imported (`@google/generative-ai`, `@prisma/adapter-neon`, `ws`, `@types/ws` — the last also sits in `dependencies` instead of `devDependencies`). Meanwhile `check-db.ts:2` imports `dotenv`, which is not in `package.json` at all (it resolves only because a transitive dependency pulls it in), and neither root script has an npm script. The dashboard also duplicates `stellar.ts`'s balance logic inline.

### Files

- `src/lib/stellar.ts:7, 39` — `fetchStellarBalance`/`formatXLM` never imported; duplicated inline at `src/app/page.tsx:163-183`
- `src/lib/getUser.ts:9` — `getUserFromRequest` never imported
- `src/lib/prisma.ts:5-16` — default export never imported; `@prisma/adapter-neon` unused
- `src/lib/auth.ts:20` — `signToken` never called (issuance lives on the backend)
- `package.json:13, 15, 19, 28` — `@google/generative-ai`, `@prisma/adapter-neon`, `@types/ws`, `ws` never imported
- `check-db.ts:2` — `import * as dotenv from "dotenv"` with no declared dependency
- `package.json:5-11` — no script for `check-db.ts` or `gen-keypair.ts`
- `README.md:87` — still advertises `@google/generative-ai` while the badge at `:17` says "Groq AI"

### Expected behavior

Every declared dependency is imported somewhere; every import is declared; unused files are removed or wired up; type-only packages live in `devDependencies`; helper scripts are reachable via `npm run`.

### Suggested fix

`npm uninstall @google/generative-ai ws @types/ws @prisma/adapter-neon`; delete (or use — replace the inline Horizon fetch at `page.tsx:163-183` with `fetchStellarBalance`) `stellar.ts`/`getUser.ts`/`prisma.ts`/`signToken`; drop `@prisma/client`+`prisma` too if raw SQL stays; add `"check-db": "tsx check-db.ts"` plus `dotenv`/`tsx` devDeps, or delete the script.

---

## Issue 10 — [ci] No tests exist and CI silently skips every change outside `src/**`

**Priority:** Medium · **Labels:** `testing`, `ci`, `chore`

### Summary

There is no test script, no test runner, no test config, and no `*.test.*`/`*.spec.*` file anywhere — the only "tests" artifact is a screenshot. README's Testing section presents `npm run lint` and `npm run build` as the testing story, and CONTRIBUTING tells contributors to "test your changes" with no mechanism. Worse, CI's `paths` filters restrict runs to `src/**`, so PRs that change `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, or `prisma/` never run lint or build at all.

### Files

- `package.json:5-11` — scripts are `dev|worker|build|start|lint`; no `test`
- repo-wide — zero test files/configs
- `.github/workflows/ci.yml:6-8` — `push.paths: ['src/**', '!assets/**']` (the `!assets/**` negation is inert — it can never match `src/**`)
- `.github/workflows/ci.yml:9-12` — `pull_request.paths: ['src/**']` → dependency-only or config-only PRs get no CI
- `.github/workflows/ci.yml:34-41` — steps are lint + build only; no `tsc --noEmit`, no test step
- `README.md:138-143` — "Testing" section = lint + build only
- `CONTRIBUTING.md:148, 158` — reference `.github/ISSUE_TEMPLATE/*.md`, which does not exist

### Expected behavior

`npm test` exists and runs at least a meaningful smoke/unit suite; CI runs for changes to manifests, configs, and workflow files; CI performs (or documents) the checks the contributing guide claims.

### Suggested fix

Add `"test": "vitest run"` (start with pure functions: `auth.ts` verify/sign, `stellar.ts` formatting, ETA calc, limit parsing) and `"typecheck": "tsc --noEmit"`; drop the `paths` filters or add `package*.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `prisma/**`; add `npm test` and `npm run typecheck` steps; fix the README Testing section and the missing ISSUE_TEMPLATE references.
