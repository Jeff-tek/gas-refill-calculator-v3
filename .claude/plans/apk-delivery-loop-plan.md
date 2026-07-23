# Gas Refill — APK Delivery Loop Plan

## Metadata

```
Pattern:    sequential
Mode:       safe
Project:    /root/gas-calculator
Branch:     main
Started:    2026-07-23
Stop:       Signed APK delivered to /dist/app-release.apk + all quality gates passing
```

## Pre-Execution Validation

| Check | Status | Notes |
|-------|--------|-------|
| Quality gates active | ✅ | Build passes, 43 tests pass, 80%+ branch coverage, tsc clean |
| Eval baseline exists | ✅ | 43 unit tests across precision.ts, storage.ts, types.ts |
| Rollback path exists | ✅ | Git on main, 6 checkpoints available (`git log --oneline`) |
| Branch/worktree isolation | ✅ | Isolated project in `/root/gas-calculator` |

## Loop Pattern: Sequential

```
Phase 1: Verify PWA readiness  ──→  Phase 2: Build APK via CloudAPK  ──→  Phase 3: Sign & Verify  ──→  STOP
        │                              │                                    │
        └── Checkpoint 1               └── Checkpoint 2                    └── Checkpoint 3 (STOP)
```

## Phase Details

### Phase 1: Verify PWA Readiness
**Goal**: Confirm the PWA is buildable, deployable, and meets PWA criteria for APK generation.

| Step | Task | Verification |
|------|------|-------------|
| 1.1 | `npm run build` passes | Exit code 0, no errors |
| 1.2 | `npx tsc --noEmit` passes | No TypeScript errors |
| 1.3 | `npm test -- --coverage` passes | 43/43 tests pass, 80%+ branch coverage |
| 1.4 | Confirm manifest.json is valid PWA | has `start_url`, `display`, `icons` with 192+512 |
| 1.5 | Confirm service worker registers | sw.js has install/activate/fetch handlers |
| 1.6 | Confirm icons exist | icon-192.png, icon-512.png in /public/icons/ |

**Checkpoint 1** ✅ → `git add -A && git commit -m "checkpoint: PWA readiness verified"`

---

### Phase 2: Build APK via PWABuilder CloudAPK
**Goal**: Generate unsigned APK using PWABuilder's free cloud API.

| Step | Task | Verification |
|------|------|-------------|
| 2.1 | Serve PWA locally on port 8765 | `npm run build && npx serve out -p 8765` |
| 2.2 | Create public HTTPS tunnel | `ssh -R 80:localhost:8765 serveo.net` (or localhost.run) |
| 2.3 | Call CloudAPK API | `POST https://pwabuilder-cloudapk.azurewebsites.net/generateAppPackage` |
| 2.4 | Download ZIP response | Contains .apk + .aab files |
| 2.5 | Extract APK from ZIP | File exists: `app-release-unsigned.apk` |

**Checkpoint 2** ✅ → APK ZIP downloaded, unsigned APK extracted

---

### Phase 3: Sign & Verify APK
**Goal**: Sign APK with local JDK keystore and verify it's side-loadable.

| Step | Task | Verification |
|------|------|-------------|
| 3.1 | Create signing keystore (if missing) | `keytool -genkey -keystore release.keystore` |
| 3.2 | Sign APK with jarsigner | `jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256` |
| 3.3 | Verify APK signature | `jarsigner -verify -verbose app-release.apk` |
| 3.4 | Align APK with zipalign (if available) | zipalign check or skip |
| 3.5 | Copy to /dist/app-release.apk | File exists at destination |

**Checkpoint 3 (STOP)** ✅ → `/dist/app-release.apk` exists and is verified

---

## Stop Conditions

| # | Condition | Action |
|---|-----------|--------|
| 1 | **Natural stop**: Signed APK delivered to `/dist/app-release.apk` | ✅ Loop complete |
| 2 | **Error stop**: Same failure 3 consecutive iterations | Pause, investigate, fix root cause |
| 3 | **Tunnel failure**: serveo.net unreachable | Switch to localhost.run or ngrok alternative |
| 4 | **API failure**: CloudAPK returns 4xx/5xx 3 times | Check URL, fall back to native build path |
| 5 | **Scope creep**: Phase grows >50% beyond planned steps | Pause and re-scope |

## Recovery Actions

| Scenario | Action |
|----------|--------|
| Build error | `npm run build` — fix build before continuing |
| Test failure | Fix failing tests, never lower coverage threshold |
| Keystore missing | Generate with `keytool -genkey` |
| Signing failure | Check keystore password, alias, and APK path |
| Rollback | `git checkout . && git clean -fd` or `git reset --hard HEAD` |

## Escalation Conditions

| Condition | Action |
|-----------|--------|
| No progress across 2 consecutive checkpoints | Pause, review plan, reduce scope |
| Repeated identical stack traces | Investigate root cause, fix or work around |
| Cost drift outside budget window | Compress context, reduce scope |
| Tunnel/API consistently failing | Switch fallback strategy (native Android build) |

## Run Commands

### Start Loop
```bash
cd /root/gas-calculator
```

### Monitor
```bash
# Check build
npm run build

# Check types
npx tsc --noEmit

# Run tests
npm test -- --coverage
```

### Quality Gate (run after each phase)
```bash
npm run build && npx tsc --noEmit && npm test -- --coverage
```

### Save Checkpoint
```bash
git add -A && git commit -m "checkpoint: <description>"
```

### Rollback
```bash
git checkout . && git clean -fd
```

## Model Tier Strategy

| Tier | Use Case | Model |
|------|----------|-------|
| Primary | All loop work | deepseek-v4-flash-free |
| Fallback | Tunnel/API issues | Resolver agents |

## APK Build Strategy

| Path | Method | SDK Required | Pros |
|------|--------|-------------|------|
| **Primary** | PWABuilder CloudAPK | ❌ No | No SDK, preserves all PWA features |
| **Fallback** | Native Android Gradle build | ✅ Yes | Full native control, Play Store ready |

**Primary path selected** — no Android SDK available in this environment.

## Post Loop

After APK delivery:
1. Commit all changes
2. Push to origin
3. Output final verification report

---

*Plan generated 2026-07-23 for Gas Refill APK delivery loop.*
