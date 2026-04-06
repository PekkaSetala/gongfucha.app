# Web Design Audit Report

**Project:** Gongfu Cha  
**Date:** 2026-04-06  
**Mode:** Full Audit  
**Stack:** Next.js 16.2.2 + React 19.2.4 + Tailwind CSS 4 + TypeScript  

---

## Executive Summary

Gongfu Cha is a well-crafted single-page PWA with a cohesive warm palette, purposeful motion, and strong accessibility foundations. The design feels handmade — not generated — which suits the tea ceremony aesthetic. The three biggest opportunities are: (1) **PWA readiness** — no service worker, no raster icons, no social preview images make it uninstallable and invisible when shared; (2) **contrast failures** — tertiary text and CTA buttons narrowly fail WCAG AA at the small sizes used; (3) **font weight bug** — Noto Serif SC doesn't ship weight 500, but `font-medium` is used throughout, causing browser synthesis. Total estimated effort for all improvements: ~16–20 hours.

---

## Critical Issues — Fix Immediately

| # | Finding | Agent | Effort | Fix |
|---|---------|-------|--------|-----|
| 1 | **No service worker / offline support.** Manifest declares `standalone` but the app is a white screen offline. A brewing timer *must* work without network. | Performance, Page States | Moderate (2–4h) | Add `next-pwa` or manual SW with app-shell caching |
| 2 | **No raster icons.** Only SVG icon in manifest. Chrome won't show install prompt. iOS ignores SVG for home screen. | Social/Meta, Performance | Quick (<1h) | Generate 192px, 512px PNG + 180px apple-touch-icon from existing SVG |
| 3 | **No Open Graph / social preview.** Sharing the URL on Slack, iMessage, social media produces a text-only card with no image. | Social/Meta | Moderate (1–2h) | Add OG meta tags + create `opengraph-image.tsx` or static 1200×630 PNG |
| 4 | **Tertiary text (#73624F) fails WCAG AA** at 10–13px on both bg (#F4EFE6, ~3.9:1) and surface (#FAF7F2, ~3.5:1). Used for labels, "End session", and small captions. | Color, Accessibility | Quick (<30m) | Darken to `#5F5242` (~5.0:1 on bg, ~4.5:1 on surface) |
| 5 | **CTA button contrast borderline.** Surface text on clay bg is ~4.3:1 — fails AA for normal text. | Color | Quick (<30m) | Darken resting clay to `#7A4A35` (current hover value) or use white text |
| 6 | **Font weight mismatch.** `font-medium` (500) used on `font-serif-cn` elements but Noto Serif SC only ships 400/700. Browser synthesizes weight. | Typography | Quick (<30m) | Change to `font-normal` on all serif elements, or load weight 700 and use `font-bold` where emphasis needed |
| 7 | **10px labels below readable threshold.** `text-[10px]` used for field labels, badges, and schedule headers. Too small for wet-handed mobile use. | Typography | Quick (<30m) | Bump to `text-[11px]` minimum |

---

## High-Impact Improvements

| # | Finding | Agent | Effort | Fix |
|---|---------|-------|--------|-----|
| 8 | **Gold badge text fails AA.** `#96793A` on composited gold-soft bg is ~3.4:1. | Color | Quick | Darken gold to `#7D6530` for badge text |
| 9 | **Low-contrast tea color dots.** Fresh White, Light Oolong, Aged White dots are below 3:1 on bg — fail WCAG 1.4.11 for non-text elements. | Color | Quick | Darken to at least 3:1 (specific values in Color agent report) |
| 10 | **No semantic error color.** `text-clay` used for errors, same as CTAs and links. No success/warning/info colors defined. | Color | Quick | Add `--color-error: #9E3B2E`, `--color-success: #5A7A4A` to theme |
| 11 | **`<header>` inside `<main>`.** Screen readers don't announce it as banner landmark. | Accessibility | Quick | Move `<header>` outside `<main>` in page.tsx |
| 12 | **Spacebar handler blocks assistive tech.** Global `preventDefault` on Space in BrewingTimer interferes with screen reader scroll. | Accessibility | Quick | Scope to timer container or dedicated button `onKeyDown` |
| 13 | **Focus not returned on view change.** Navigating back from AI/Custom doesn't restore focus to the trigger button. | Accessibility | Quick | Call `.focus()` on trigger after `setView("list")` |
| 14 | **Stepper UI duplicated 3×.** Identical vessel/leaf markup in TeaDetail, AIAdvisor, BrewingTimer with inconsistent naming (`stepperBtn` vs `stepperBtnClass`). | Component Arch | Moderate (1–2h) | Extract `<StepperControl>` component |
| 15 | **"End session" has no confirmation.** Accidental tap destroys brew state with no undo. Wet hands increase misfire risk. | UX Flow | Quick | Add confirmation tap or hold-to-end pattern |
| 16 | **Custom Mode uses number inputs.** `<input type="number">` requires precise targeting on mobile. Steppers proven wet-hand friendly elsewhere. | UX Flow | Moderate (1–2h) | Replace with stepper pattern matching TeaDetail |
| 17 | **Custom Mode accepts out-of-range values.** No client-side clamping on submit. vessel=0 → division by zero. | Page States | Quick | Clamp values in `handleStart` |
| 18 | **Missing hover states.** Stepper buttons, Play/Pause, End session, time adjusters, Rinse toggle have no hover feedback on desktop. | Interactive States | Quick | Add `hover:border-border-hover` or `hover:bg-surface-hover` |
| 19 | **Unused font weights loaded.** DM Sans 600 never used. Noto Serif SC 700 never used. Wasted bytes, especially CJK font. | Typography, Performance | Quick | Remove from `layout.tsx` font config |
| 20 | **Apple touch icon is SVG.** iOS Safari ignores SVG icons — users get blank/screenshot on home screen. | Social/Meta, Performance | Quick | Generate 180×180 PNG |

---

## Quality Improvements

| # | Finding | Agent | Effort |
|---|---------|-------|--------|
| 21 | No explicit line-heights on most text (headings, labels, timer) — rhythm is unpredictable | Typography | Quick |
| 22 | 9 distinct font sizes — collapse to 6 by merging 12/13→13 and 14/15→15 | Typography | Moderate |
| 23 | TimerRing SVG lacks `aria-hidden="true"` — SR traverses meaningless nodes | Accessibility | Quick |
| 24 | Tea color dots have no `aria-hidden` — empty elements for SR | Accessibility | Quick |
| 25 | `<label>` used for stepper button groups but not linked to inputs — semantically incorrect | Accessibility | Quick |
| 26 | Schedule pills lack infusion number context for screen readers | Accessibility | Quick |
| 27 | CustomMode CTA uses Tailwind `transition-colors` — overrides global transform transition, breaking press animation | Motion | Quick |
| 28 | Input focus transitions use Tailwind default easing, not `--ease-out` — breaks single-curve principle | Motion | Quick |
| 29 | Transition styling inconsistent: inline `style` objects vs Tailwind classes for same patterns | Component Arch | Moderate |
| 30 | AI error "Custom Mode" is plain text, not a link — tells user what to do but doesn't let them | Page States | Quick |
| 31 | Desktop AI/Custom views lose side panel — layout lopsided on wide screens | UX Flow | Moderate |
| 32 | Schedule pills not shown in mobile inline detail — only panel variant | UX Flow | Quick |
| 33 | Time format mismatch: ring shows `2:00`, pills show `120s` for times >60s | Page States | Quick |
| 34 | Off-grid spacing: `gap-3.5`/`py-3.5` (14px) breaks 4px rhythm | Spatial | Quick |
| 35 | Green Tea and Sheng dots nearly identical under deuteranopia | Color | Quick |
| 36 | Manifest missing `id`, `scope` fields | Social/Meta | Quick |
| 37 | No `<nav>` landmark wrapping tea list or view navigation | Accessibility | Quick |
| 38 | 503 API error produces same generic message as network failure | Page States | Quick |
| 39 | Audio file is 27KB WAV — convert to MP3/OGG (~3–5KB) | Performance | Quick |
| 40 | `surface-glow` CSS class defined but unused | Component Arch | Quick |

---

## Polish

| # | Finding | Agent |
|---|---------|-------|
| 41 | Pixel-based tracking — standardize to two `em`-based values | Typography |
| 42 | Timer digits need explicit `leading-none` at 56–64px | Typography |
| 43 | Add `max-w-[55ch]` to serif italic running text | Typography |
| 44 | InlineViewHeader back-button circle has no bg/border — breaks icon-circle pattern | Visual Consistency |
| 45 | AIAdvisor uses `border-b` separator; TeaDetail uses `border-t` for same pattern | Visual Consistency |
| 46 | InlineViewHeader has no top padding vs Header's `pt-14` — visual jump on view switch | Visual Consistency |
| 47 | Stepper value not announced on change — add `aria-live="polite"` | Accessibility |
| 48 | `type="number"` inputs inconsistent across screen readers — consider `inputmode="numeric"` | Accessibility |
| 49 | No haptic feedback on timer completion — `navigator.vibrate(200)` alongside audio | UX Flow |
| 50 | "Tap to start" hint for first-time users on play button | UX Flow |
| 51 | Disabled opacity inconsistent: 0.30 (steppers) vs 0.40 (AI button) | Interactive States |
| 52 | No `cursor: not-allowed` on disabled buttons | Interactive States |
| 53 | `--ease-in-out` and `--ease-drawer` defined but unused — document intended use | Motion |
| 54 | Timer ring 1s linear lag visible on 5s rinse — consider 800ms | Motion |
| 55 | No JSON-LD structured data (WebApplication schema) | Social/Meta |
| 56 | No Twitter Card tags | Social/Meta |
| 57 | Manifest missing `screenshots` for richer Android install UI | Social/Meta |
| 58 | `mb-7` (28px) in Header — not on dominant 8px scale | Spatial |
| 59 | `BrewingTimer` at 303 lines — consider extracting BetweenPhase sub-component | Component Arch |
| 60 | Long infusion sessions: pill row grows tall — consider capping visible pills | Page States |

---

## Implementation Plan

| Priority | Finding(s) | Effort | Impact |
|----------|-----------|--------|--------|
| 1 | #4, #5, #6, #7, #8 — Contrast + font fixes | 1–2h | Critical a11y + visual bug |
| 2 | #1, #2, #20 — Service worker + raster icons | 3–4h | PWA installable + offline |
| 3 | #3, #56 — OG image + social tags | 1–2h | Shareability |
| 4 | #10, #11, #12, #13 — Semantic colors + landmarks + focus | 1–2h | A11y compliance |
| 5 | #14, #29 — Extract StepperControl + unify transitions | 2–3h | Code quality + consistency |
| 6 | #15, #17 — End session confirm + input validation | 1h | UX safety |
| 7 | #16 — Custom Mode steppers | 1–2h | Wet-hand usability |
| 8 | #18, #19, #27, #28 — Hover states + unused weights + motion fixes | 1h | Desktop polish + perf |
| 9 | #21–26, #30, #32–40 — Remaining improvements | 2–3h | Cumulative quality |
| 10 | #41–60 — Polish items | 2–3h | "Make it feel magical" |

---

## Agent Reports

### Typography
- 9 ad-hoc font sizes (no mathematical scale)
- Noto Serif SC weight 500 doesn't exist — browser synthesizes
- 10px labels below readable threshold
- DM Sans 600 and Noto Serif SC 700 loaded but never used
- Missing explicit line-heights on most elements

### Color Systems
- Cohesive warm palette, well-chosen for tea aesthetic
- Tertiary text fails WCAG AA on both bg and surface
- CTA button contrast borderline at 4.3:1
- No semantic error/success colors — clay used for everything
- Several tea dot colors invisible or indistinguishable for color-blind users

### Spatial Composition
- Loose 4px base grid, mostly coherent
- Consistent `px-5` horizontal padding throughout
- Clean 3-tier radius system (6px, 12px, 14px + full)
- All touch targets pass 44px minimum
- Minor off-grid values: 14px gaps, 28px margin

### Motion & Feel
- All animations purposeful (entrance, feedback, progress)
- Single `--ease-out` curve used consistently — strong motion language
- Hover states correctly gated behind `pointer: fine`
- `prefers-reduced-motion` implemented correctly
- CustomMode CTA uses different transition pattern from siblings

### Component Architecture
- Well-scoped components with correct state boundaries
- Stepper UI duplicated across 3 files — extract shared component
- Mixed transition styling (inline objects vs Tailwind classes)
- Redundant `"use client"` on leaf components
- `surface-glow` CSS class defined but unused

### Accessibility
- Strong foundation: skip link, landmarks, aria-live, focus-visible rings
- `<header>` inside `<main>` — not announced as banner
- Spacebar handler blocks screen reader scroll
- Focus not returned on view navigation
- Stepper `<label>` elements semantically incorrect for button groups

### Performance
- Lean bundle: zero images, 3 deps, inline SVGs
- Entire UI is `"use client"` — blank screen until JS loads
- No service worker — PWA is non-functional offline
- Audio file is uncompressed WAV (27KB → 3–5KB as MP3)
- Animations are GPU-compositable (transform + opacity only)

### Interactive States
- Global press feedback (scale 0.97) on all buttons — consistent
- Focus-visible rings uniform across app
- Missing hover states on steppers, play/pause, end session
- Disabled opacity inconsistent (0.30 vs 0.40)
- CTA inline transitions partially override global transform

### Visual Consistency
- 92% visual consistency score
- Border radius tiers applied correctly throughout
- Shadow system minimal and purposeful (2 values)
- Icons consistently stroked (1.8px, round caps)
- Minor inconsistencies: separator direction, back-button circle styling

### Page States
- Core states well-covered: list, selection, AI flow, custom, all brewing phases
- Custom Mode accepts out-of-range input without validation
- AI error message not actionable (plain text, not linked)
- Time format mismatch (ring vs pills) above 60 seconds
- Long sessions: schedule pill row grows indefinitely

### UX Flow
- Three flows (Preset, AI, Custom) all converge at same timer — good muscle memory
- Navigation linear with no dead ends
- "End session" has no confirmation — risky with wet hands
- Custom Mode form inputs less usable than stepper pattern
- Mobile inline detail omits schedule pills (desktop-only)

### Social & Meta Surface
- Basic meta tags solid (title, description, viewport, theme-color)
- No Open Graph tags — text-only share cards
- No Twitter Card tags
- No social preview image
- No favicon.ico, no raster icons, no structured data
- Manifest incomplete — missing `id`, `scope`, raster icons
