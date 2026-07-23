# Gas Refill — Push & Build Instructions Loop Plan

## Metadata

```
Pattern:    sequential
Mode:       safe
Project:    /root/gas-calculator
Branch:     main
Started:    2026-07-23
Stop:       Repo pushed to GitHub + BUILD_INSTRUCTIONS.md created for Google Jules
```

## Pre-Execution Validation

| Check | Status | Notes |
|-------|--------|-------|
| Quality gates active | ✅ | Build passes, 43 tests pass, 80%+ branch coverage, tsc clean |
| Eval baseline exists | ✅ | 43 unit tests across precision.ts, storage.ts, types.ts |
| Rollback path exists | ✅ | Git on main, checkpoints available |
| Branch/worktree isolation | ✅ | Isolated project in `/root/gas-calculator` |

## Loop Pattern: Sequential

```
Phase 1: Create BUILD_INSTRUCTIONS.md  ──→  Phase 2: Push to GitHub  ──→  STOP
        │                                       │
        └── Checkpoint 1                        └── Checkpoint 2 (STOP)
```

## Phase Details

### Phase 1: Create BUILD_INSTRUCTIONS.md
**Goal**: Write comprehensive build instructions for Google Jules to build the APK from the native Android project.

| Step | Task | Verification |
|------|------|-------------|
| 1.1 | Determine project structure and Android project layout | Confirmed all files present |
| 1.2 | Write BUILD_INSTRUCTIONS.md with full instructions | File created at repo root |
| 1.3 | Run quality gate (build + types + tests) | All passing |

**Checkpoint 1** ✅ → Commit BUILD_INSTRUCTIONS.md

### Phase 2: Push to GitHub
**Goal**: Push the repo to GitHub so user can deploy to Vercel.

| Step | Task | Verification |
|------|------|-------------|
| 2.1 | `git push origin main` | Push successful |
| 2.2 | Confirm remote is up to date | `git log --oneline origin/main` matches local |

**Checkpoint 2 (STOP)** ✅ → Repo pushed, ready for Vercel import

## Stop Conditions

| # | Condition | Action |
|---|-----------|--------|
| 1 | **Natural stop**: Repo pushed to GitHub | ✅ Loop complete |
| 2 | **Error stop**: Build fails | Fix and retry |
| 3 | **Push failure**: Auth/network error | Check credentials, retry |

## Recovery Actions

| Scenario | Action |
|----------|--------|
| Build error | Fix build before continuing |
| Git push failure | Check gh auth, retry with token |
| Rollback | `git reset --hard HEAD~1` |

## Run Commands

### Start
```bash
cd /root/gas-calculator
```

### Quality Gate
```bash
npx tsc --noEmit && npm test -- --coverage
```

### Save Checkpoint
```bash
git add -A && git commit -m "checkpoint: <description>"
```

### Push
```bash
git push origin main
```

---

*Plan generated 2026-07-23 for Gas Refill push & build instructions delivery.*
