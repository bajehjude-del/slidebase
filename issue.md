# Slidebase — Issue Backlog

Five issues scoped to the slidebase frontend repo. Each entry can be pasted verbatim into a GitHub issue.

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