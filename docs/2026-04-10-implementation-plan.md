## Implementation plan — 2026-04-10 action-plan execution

Source: `docs/2026-04-10-action-plan.md`. Branch: `feat/field-guide` (= `main`, both at `d2ac7dc`).

### Phase 1 — Fast cleanup (parallel-safe, ~5 min)

Dispatch as one swarm message. No file overlap, all independent.

**A. Git hygiene**
- `/opt/homebrew/bin/git gc --aggressive` — pack 955 loose objects, fixes Apple git SIGBUS.
- Verify: `git fsck` clean, `ls .git/objects/pack/` shows a packfile.

**B. Delete `SecondaryPaths.tsx`**
- File is orphaned: zero imports in `src/` (grep confirmed), was deleted in `0e2c3c1`, reappeared untracked. Component is a standalone "Custom brew" entry button — functionality already lives in `page.tsx` view switching.
- `rm src/components/SecondaryPaths.tsx`
- Commit: `chore: remove resurrected unused SecondaryPaths component`

**C. Delete `greetings.ts`**
- Decision: **delete**. Dead code, and the header is now in its final committed state (`24822f3`). Wiring it up is a scoped feature session, not cleanup. If personality is wanted later, reintroduce from git history.
- `rm src/data/greetings.ts tests/greetings.test.ts`
- Remove `greetings.ts` / `greetings.test.ts` lines from `CLAUDE.md` file map.
- Verify: `npx vitest run` → 59 → ~56 passed, build clean.
- Commit: `chore: remove unused greetings module`

**D. Worktree cleanup**
- `git worktree remove ../gongfucha-main` (frees ~973 MB).
- Verify: `git worktree list` shows only main.

Phase 1 gates Phase 2: all four must commit cleanly before lint work touches the tree.

---

### Phase 2 — Lint pass (sequential single agent, ~1 h)

**Must be one agent, file-by-file.** React 19 setState-in-effect + refs-during-render are behavior-sensitive; parallel edits risk silent regressions.

Order (smallest blast radius → largest):

**2.1 `src/i18n/context.tsx` (lines 33, 40)**
- 2× `setState synchronously within effect`
- Fix: derive during render or move to event handler. Likely a locale-sync effect that can become a `useMemo` or lift to the provider's render body.
- Gate: `npm run lint && npm run build && npx vitest run` before commit.
- Commit: `fix(i18n): derive locale state during render, not in effect`

**2.2 `src/components/BrewingTimer.tsx` (lines 41, 45, 73)**
- 2× setState-in-effect + 1 unused `prevPhase` warning.
- Fix: delete `prevPhase` if truly unused; for the setState calls, check whether they're phase transitions that belong in the `useTimer` hook callback instead of an effect watching phase.
- Gate: run full timer flow mentally + tests. Timer is the app's core — regressions here are the highest-cost failure mode.
- Commit: `fix(timer): move phase transitions out of render effects`

**2.3 `src/app/page.tsx` (lines 29, 30, 66, 87, 88, 110)**
- 2× setState-in-effect + 4× refs-during-render. Biggest file, most state machines (`list | ai | custom` + brewing 4-state).
- Fix: refs-during-render usually means reading `ref.current` in the JSX body — move to effect or store value in state. setState-in-effect likely relates to view transitions; candidate for `useSyncExternalStore` or derived state.
- Gate: full build + test + manual smoke in dev (list → detail → brewing → summary).
- Commit: `fix(page): read refs in effects, derive view state during render`

**2.4 Warning cleanup**
- `tests/pick.test.ts` line 1: drop unused `vi` import.
- Commit: `chore: drop unused vi import in pick test`

Final gate: `npm run lint` → 0 errors, 0 warnings. `npm run build` clean. `npx vitest run` all pass.

---

### Phase 3 — Push (explicit user confirmation required)

Per system guidance, push is a shared-state action. After Phase 2 green:

```bash
git push origin main
git push origin feat/field-guide
```

No `--force`. Local main is a clean superset.

---

### Risks & mitigations

| Risk | Mitigation |
|---|---|
| Phase 2.3 page.tsx refactor breaks view state machine | Manual dev smoke test after fix, before commit. Revert if uncertain. |
| Deleting `greetings.ts` loses work you wanted | It's in git history (`git show HEAD:src/data/greetings.ts`). Reversible. |
| `git gc --aggressive` on a repo with active worktree | Run Phase 1-D (worktree remove) before Phase 1-A, or run gc from main repo dir only. |
| Lint fix changes runtime behavior silently | Per-file verify gate. If tests drop, stop and investigate. |

**Order correction:** Phase 1-D (worktree remove) should run **before** 1-A (gc), to avoid gc racing against the worktree's object refs. Adjusted execution order: D → A → B → C.

---

### Out of scope (do not touch)

- Weather mood time-of-day (action plan §2.4 — "do nothing").
- Header redesign (§5 — final state, locked).
- Any feat/field-guide work beyond what's in the action plan.

---

### Execution summary

- **Phase 1:** 1 parallel swarm, 4 independent tasks, ~5 min, 3 commits.
- **Phase 2:** 1 sequential agent, 4 sub-tasks with gates, ~1 h, 4 commits.
- **Phase 3:** 2 pushes after your OK.

Total: 7 commits, ~1 h 10 min, one decision point (push confirmation).
