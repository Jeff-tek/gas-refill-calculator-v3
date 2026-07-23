# Fix Dashboard Period Calculation — Autonomous Loop Plan

## Metadata

```
Pattern:    sequential
Mode:       safe
Project:    /root/gas-calculator
Branch:     main
Started:    2026-07-23
Stop:       Dashboard period fix applied + daily chart removed + tests pass + pushed
```

## Pre-Execution Validation

| Check | Status | Notes |
|-------|--------|-------|
| Quality gates active | ✅ | Build passes, 43 tests pass, 80% branch coverage |
| Eval baseline exists | ✅ | 43 unit tests across precision, storage |
| Rollback path exists | ✅ | Git on main, all commits reachable |
| Branch/worktree isolation | ✅ | Isolated project in `/root/gas-calculator` |

---

## Problem Analysis

### Bug 1: Period cutoff reference unstable
`const now = Date.now()` is called at render body level, not inside a hook. Every state change in Dashboard re-evaluates `now`, causing `periodCutoff` to recompute on every render (wasteful). More critically, the period doesn't align to clean day boundaries — it uses a rolling millisecond window from "right now."

### Bug 2: Daily bar chart not useful + actually wrong
The daily kg chart uses `.slice(-14)` on sorted entries, which takes the last 14 **days with data**, not the last 14 calendar days. Gaps in fills shift the window. User explicitly says it's unnecessary.

### Bug 3: Unused `weeklyData`
Computed but never rendered — dead code bloating the component.

---

## Fix Plan

### Phase 1: Stabilize period cutoff
- Replace `const now = Date.now()` with `useState` lazy initializer aligned to midnight
- This gives clean day-boundary periods and stable reference

### Phase 2: Remove daily kg bar chart (unnecessary)
- Remove `dailyData` useMemo
- Remove `maxDailyKg`
- Remove entire `<div className="dash-chart">` section

### Phase 3: Clean up dead code
- Remove `weeklyData` useMemo (unused)
- Remove unused imports (`TrendingUp`, `TrendingDown`, `DollarSign`)

### Phase 4: Verify quality gates
- `npm test` — all 43 tests must still pass
- `npx next build` — must compile cleanly

### Phase 5: Push to GitHub
- `git add -A && git commit -m "fix: dashboard period calculation and remove daily kg chart"`
- `git push origin main`

---

## Stop Conditions
1. **Success**: All 5 phases complete, pushed to GitHub
2. **Error**: Build or tests fail 3 consecutive times — pause and fix
3. **Scope creep**: If additional changes requested beyond original scope, stop and re-plan

---

## Recovery Actions
- **Test failure**: Fix failing tests immediately
- **Build error**: Run `npx tsc --noEmit` to find type errors
- **Rollback**: `git checkout -- .` to discard changes

---

*Plan generated 2026-07-23 for dashboard period calculation fix.*
