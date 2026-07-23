# Loop Plan: Gas Calculator V3 - Revenue & Sharing Features

## Loop Pattern: `sequential` | Mode: `safe`

### Objective
1. **Bottle-linked Dashboard** — Filter Dashboard revenue/expenses by current bottle
2. **End-of-Bottle Summary** — Generate summary when bottle closes (new bottle starts)
3. **Non-editable Daily Share** — Convert daily summary share into image/receipt snapshot

### Checkpoints
- [x] **CP-0**: Repository clean, all 43 tests passing, 98.26% coverage
- [ ] **CP-1**: Types/storage extended for bottle summaries
- [ ] **CP-2**: Dashboard accepts bottle filter — shows bottle-specific KPIs
- [ ] **CP-3**: End-of-bottle summary generated on close
- [ ] **CP-4**: Daily share outputs non-editable receipt image
- [ ] **CP-5**: All tests pass, build succeeds, push to GitHub

### Quality Gates
- Tests must pass before each commit
- Build must succeed (next build)
- No console.log in production code
- Coverage ≥ 80%

### Rollback
- `git checkout -- .` to revert uncommitted changes
- `git reset --hard HEAD~1` to revert last commit

### Branch Strategy
- Work on `main` (linear progression, each checkpoint committed)
- Push to `origin/main` at CP-5

### Model Tier Strategy
- Use current model for all implementation and testing
- Run verification loop after each checkpoint
