# Action plan — pending cleanup and decisions

**Date:** 2026-04-10
**Author of this doc:** Claude (handoff from previous session)
**Purpose:** Pick up in a fresh context window without losing track of what was found, what was fixed, and what still needs a decision.

---

## 1. Where the code is right now

After the previous session, both `main` and `feat/field-guide` are pointing at the same commit:

```
d2ac7dc fix(weather): drop 'morning' from spring/clear mood copy
```

The last four commits on top of the Tea Guide feature work are:

```
d2ac7dc fix(weather): drop 'morning' from spring/clear mood copy
fe40dd4 Merge branch 'feat/field-guide' into main
24822f3 feat(header): center Gongfu Cha under 功夫茶
433f43b chore(deps): upgrade next to 16.2.3
```

Production build is clean on Next 16.2.3, all 59 tests pass, and the dev server (`npm run dev`) is working normally — the earlier Turbopack manifest bug is gone.

The `main` branch and `feat/field-guide` branch should be pushed to GitHub at the end of the follow-up work in this doc. Nothing is pushed yet when this doc is first committed; see section 8 for the push sequence.

---

## 2. Known bugs and dead code to address

Each item below is scoped small enough to be a single focused session or PR. Priority is suggested but not binding.

### 2.1 Dead code — `src/data/greetings.ts` — **decision needed**

The file defines a complete time-of-day-aware headline system:

- 20 greetings tagged `morning` / `afternoon` / `evening` / `anytime`
- `getTimeBand(hour)` with correct mapping: 5–11 morning, 12–16 afternoon, 17–4 evening
- `getHeadline(hour, seed)` that filters by current band and seeded-picks one
- Imports `seededPick` from `@/lib/pick`

**It is imported nowhere in the app.** `grep -r "getHeadline\|getTimeBand" src/` only matches its own file. This is dead code, almost certainly written with the intent of rendering an above-the-weather headline in the header that was never wired up.

**Decision required: wire it up or delete it.**

- **Option A — wire it up.** Add a headline line above the weather mood in `src/components/Header.tsx`. Expected placement: between the masthead block and the weather mood `<p>`. Hook would look like `const headline = useMemo(() => getHeadline(new Date().getHours(), getSessionSeed()), [])`. Styling: likely 13–14 px italic tertiary, similar weight to the weather mood, with a conscious spacing gap so it doesn't stack too tightly against either neighbor.
- **Option B — delete.** `rm src/data/greetings.ts`, no other changes needed since nothing imports it. Commit as `chore: remove unused greetings module`.

**Recommendation:** Option A if you still want the "app feels alive" personality the previous session kept returning to — but only as a focused follow-up, not mixed with other work. Option B if the app direction has shifted to "quieter" since then.

### 2.2 Untracked file — `src/components/SecondaryPaths.tsx` — **decision needed**

This file exists on disk as untracked. The prior commit history explicitly says it was removed:

```
0e2c3c1 docs: drop deleted SecondaryPaths.tsx from CLAUDE.md file map
```

So at some point it was deleted and the CLAUDE.md file map was updated to match. But the file is back on disk, uncommitted. Either:

- You recreated it intentionally for new work (commit it with a proper message explaining the new purpose, and update `CLAUDE.md` file map to re-add it)
- It was recreated accidentally — probably by an editor, a branch switch that restored a working tree, or a revert of a revert somewhere — and should be deleted again (`rm src/components/SecondaryPaths.tsx`)

**The previous session did not touch this file** and does not know which of the two it is. Look at what's inside the file first, compare to what it used to be when it was tracked (`git show 0e2c3c1^:src/components/SecondaryPaths.tsx` may show a prior version if it was in that commit's tree), and decide.

### 2.3 Pre-existing lint errors — **fix in a dedicated pass**

`npm run lint` currently reports **11 errors + 2 warnings**, all pre-session, none introduced by the work in this session. They are all React-19-stricter-rules issues:

| File | Lines | Error |
|---|---|---|
| `src/i18n/context.tsx` | 33, 40 | `Calling setState synchronously within an effect can trigger cascading renders` |
| `src/components/BrewingTimer.tsx` | 41, 73 | Same as above |
| `src/app/page.tsx` | 66, 110 | Same as above |
| `src/app/page.tsx` | 29, 30, 87, 88 | `Cannot access refs during render` |
| `src/components/BrewingTimer.tsx` | 45 | `'prevPhase' is assigned a value but never used` (warning) |
| `tests/pick.test.ts` | 1 | `'vi' is defined but never used` (warning) |

These are all symptoms of code patterns that were valid under React 18 and got tightened in React 19. The typical fixes:

- **setState in effect** → move the state derivation out of the effect entirely (derive during render), or move it into an event handler, or use `useSyncExternalStore` for external-source state
- **Refs during render** → read refs only inside effects or event handlers; if a value is needed during render, put it in state or a memoized computation
- **Unused vars** → delete if truly unused, prefix with `_` if intentionally discarded

**Recommendation:** tackle this as one dedicated session focused only on lint. Go file by file: `i18n/context.tsx` first (smallest), then `BrewingTimer.tsx`, then `page.tsx` (biggest, highest chance of regressing behavior). Run `npm run lint`, `npm run build`, and `npx vitest run` after each file to catch regressions early. Not safe to just "fix all and commit" in one go — each of these files has behavior that depends on the exact timing of the setState/ref access.

### 2.4 Weather mood — time-of-day awareness — **scope question, not a bug**

The weather mood system in `src/lib/weather.ts` branches on `condition` × `season` but has no concept of time of day. The previous session fixed the immediate bug by dropping the word "morning" from the only mood copy string that referenced a time, but the larger design question is whether the mood should know about time at all.

Arguments for adding time-of-day: evenings and mornings really do feel different; a dedicated "evening" mood could say something like "slowing down, a long steep might suit". Arguments against: moods already pull double duty with seasons, adding a third dimension turns the mood array into a combinatorial explosion, and the weather mood is supposed to be quiet and backgrounded, not constantly chattering about the time.

**Recommendation:** do nothing. Leave as-is. If you later add the greetings headline from 2.1, the headline system already handles time of day correctly and would cover that angle of "app feels alive" — no need to duplicate it in the weather moods.

---

## 3. Tooling issues found during the previous session

### 3.1 Apple git 2.39.5 SIGBUS on worktree / clone

`git worktree add` and `git clone` on this repo were crashing with `error: reset died of signal 10` and `pack-objects died of signal 10` under Apple's bundled `/usr/bin/git 2.39.5`. Not actual repo corruption — `git fsck` ran cleanly under Homebrew git 2.53.0 and only reported harmless dangling commits.

The repo has **955 loose objects and zero packfiles**, which is the condition that tickles the Apple-git-2.39 bug. Possible fixes, pick whichever is easiest:

- **Run `git gc`** (from Homebrew git, not Apple git) to pack the loose objects into a pack file. This may permanently fix the Apple git crash because the loose-object code path is no longer hot. `/opt/homebrew/bin/git gc --aggressive` — takes a minute or two.
- **Prepend `/opt/homebrew/bin` to PATH** in `~/.zshrc` so the default `git` is Homebrew's. Cleanest long-term fix, makes future worktree / clone / rebase operations safe without remembering which binary to use.
- **Leave as-is.** Normal day-to-day git (status, commit, log, diff, push) worked fine on Apple git — the crashes only hit worktree/clone/fsck. If you don't use worktrees often, this is livable.

**Recommendation:** run `git gc` first (it's reversible, just repacks existing objects), then decide whether to also update PATH. A packed repo is also faster for everything else.

### 3.2 Turbopack dev server — already fixed

`npm run dev` was broken on Next 16.2.2 — every file edit corrupted `.next/dev/server/` manifests and returned HTTP 500. Fixed by upgrading to Next 16.2.3 (`chore(deps): upgrade next to 16.2.3` commit `433f43b`). Verified post-upgrade with three consecutive HMR edits, all returning 200. **No further action needed.**

---

## 4. Parallel worktree for branch comparison

A temporary worktree was created at `../gongfucha-main` (checked out to `main`) so both branches could be served on different ports simultaneously. When you're done comparing:

```bash
git worktree remove ../gongfucha-main
```

**Do not** just `rm -rf ../gongfucha-main` — git's internal bookkeeping at `.git/worktrees/gongfucha-main` will be left stale. If you already accidentally rm'd it, run `git worktree prune` to clean up.

As of this doc, the worktree is still there with its own `.next` build dir and a copied `node_modules` (~973 MB). Removing the worktree cleanly frees all of that.

---

## 5. Header redesign context — for reference

The previous session went through several header iterations before landing on the final version. For any future header work, here's the short version of what was learned, so the same ground isn't re-covered:

- **42 px serif-cn 功夫茶 is the hero and stays.** Multiple attempts to shrink or horizontalize the masthead surfaced the same problem: the masthead's optical weight doesn't harmonize gracefully with the rest of the app's type scale (which tops out at 22 px), and trying to force harmony either shrinks the masthead below its "wow" threshold or inflates the rest of the page to match.
- **Latin "Gongfu Cha" works best as a small centered tracked-uppercase subtitle beneath the Chinese mark.** 12 px, 3.5 px tracking, `text-tertiary/50`, uppercase, centered via `inline-flex flex-col items-center` on the h1 wrapper. This is the final-committed state as of `24822f3`.
- **Horizontal "storefront" composition (功夫茶 + Gongfu Cha on same line) does not work** with a 42 px Chinese hero. The optical size mismatch between 42 px CJK and any Latin size that fits alongside it creates a fight the eye can't resolve. The session tried and rejected it.
- **Weather mood should stay at 13 px DM Sans italic tertiary, no font-light, no decorative quotation marks, just plain italic.** Multiple copy iterations landed here.
- **No images / icons / seals in the header.** The previous session spent significant time trying to source a public-domain gaiwan or Yixing teapot silhouette and was blocked by: (a) museum photos don't have enough contrast for clean silhouette tracing, (b) Chinese tea ware in line-art form is rare in public-domain corpora, (c) generic icon libraries look too "app-ish" for this design language. If you revisit imagery later, the most promising unexplored path is commissioning a minimalist line illustration from a freelance illustrator (~$15–30 on Fiverr or similar) rather than trying to trace an existing photo.

---

## 6. Session summary — what got shipped to the local branches

For the record, the previous session's committed changes were:

1. `chore(deps): upgrade next to 16.2.3` — fixes Turbopack HMR manifest bug
2. `feat(header): center Gongfu Cha under 功夫茶` — centers the Latin subtitle under the Chinese mark via `inline-flex flex-col items-center`
3. `Merge branch 'feat/field-guide' into main` — non-ff merge commit, brings in the Tea Guide feature + the two above
4. `fix(weather): drop 'morning' from spring/clear mood copy` — neutralizes the one mood string that referenced time of day

A separate "Path 2 vertical stack" header treatment was built, tested, and rejected mid-session. It was cleaned out of branch history via reset + cherry-pick before the merge, so it does not appear in the committed history at all.

---

## 7. Verification checklist before you continue

Before starting any new work in a fresh context:

```bash
# Confirm you're on the right branch and at the expected commit
git log --oneline -5
# Expected top: d2ac7dc (or this commit + "docs: action plan" if this doc was committed)

# Confirm build and tests still pass
rm -rf .next && npm run build     # should compile cleanly
npx vitest run                     # should show 59 passed / 4 skipped / 0 failed

# Confirm dev server works
npm run dev                        # should start on :3000 and survive HMR edits
```

If any of these fail, something drifted between sessions — investigate before starting new work.

---

## 8. Push sequence

When you've finished reviewing this doc and are ready to push:

```bash
# Push main — primary branch, what actually ships
git push origin main

# Optional: also update origin/feat/field-guide so the remote feature branch
# catches up to main. Since they're at the same commit, this is a clean push.
git push origin feat/field-guide

# If you want to delete the feature branch on GitHub after merging:
git push origin :feat/field-guide     # delete remote branch
git branch -d feat/field-guide        # delete local branch (if no more work)
```

**Do not use `--force` on main.** There is no valid reason to force-push main in this situation — the local main is a clean superset of `origin/main`, a straight push will succeed.

After pushing, you may also want to `git worktree remove ../gongfucha-main` to clean up the parallel worktree described in section 4.

---

## 9. Suggested priority order for the backlog

1. **Push main to GitHub** — blocks nothing, unblocks everything, ~5 seconds
2. **`git gc`** — safe, fast, probably fixes the Apple git crash permanently
3. **Decide on `SecondaryPaths.tsx`** — look at the file, commit or delete, ~2 min
4. **Decide on `greetings.ts`** — wire up (1–2 hour focused session) or delete (~1 min)
5. **Pre-existing lint errors** — dedicated session, one file at a time, ~1 hour
6. **Worktree cleanup** — when you're done comparing, ~5 seconds

Items 2, 3, and 6 are fast and can be batched into a single ~15 minute cleanup session. Items 4 and 5 deserve their own sessions with focused scope.
