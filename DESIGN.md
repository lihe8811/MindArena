---
name: MindArena
description: AI-powered rhetoric and debate training for students who practice to get better.
colors:
  scholars-amber: "oklch(52% 0.19 62)"
  scholars-amber-container: "oklch(94% 0.08 62)"
  emerald-signal: "oklch(52% 0.17 162)"
  emerald-container: "oklch(92% 0.06 162)"
  page-base: "oklch(99.5% 0.002 252)"
  surface-lowest: "oklch(99.5% 0.001 252)"
  surface-low: "oklch(97% 0.005 252)"
  surface-mid: "oklch(94% 0.009 252)"
  surface-high: "oklch(91% 0.012 252)"
  surface-peak: "oklch(88% 0.014 252)"
  ink-full: "oklch(13% 0.03 62)"
  ink-dim: "oklch(40% 0.04 252)"
  edge-soft: "oklch(72% 0.015 252)"
  edge-hard: "oklch(90% 0.008 252)"
  signal-error: "oklch(50% 0.22 25)"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 5vw, 4.5rem)"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 3rem)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
  mono:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "1.25rem"
    fontWeight: 400
rounded:
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  3xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.scholars-amber}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "0 24px"
    height: "48px"
  button-primary-hover:
    filter: "brightness(1.1)"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-full}"
    border: "1px solid {colors.edge-hard}"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-high}"
  card:
    backgroundColor: "{colors.surface-mid}"
    border: "1px solid {colors.edge-hard}"
    rounded: "{rounded.2xl}"
    padding: "{spacing.lg}"
  card-hero:
    backgroundColor: "{colors.surface-mid}"
    border: "1px solid {colors.edge-hard}"
    rounded: "{rounded.3xl}"
    padding: "{spacing.xl}"
  input:
    backgroundColor: "{colors.surface-low}"
    textColor: "{colors.ink-full}"
    border: "1px solid {colors.edge-hard}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "48px"
  chip:
    backgroundColor: "{colors.scholars-amber-container}"
    textColor: "{colors.scholars-amber}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
---

# Design System: MindArena

## 1. Overview

**Creative North Star: "The Debate Dojo"**

MindArena is a disciplined practice space. The interface is not a stage; it is a training room. A student arrives to repeat, refine, and leave slightly sharper than when they entered. Every surface communicates that: dark ground with room to breathe, a single accent that signals action without demanding attention, type that stays out of the way of the argument being made.

The system rejects four failure modes by name: cartoon gamification (mascots, overkill streaks, confetti floods that hollow out achievement), esports aggression (neon RGB, angular dark chrome, terminal-hacker theater), corporate SaaS coldness (zinc-on-white, productivity-tool blankness), and academic institution stiffness (beige, formal serif, university portal energy). None of these serve a student who wants to get better at thinking.

The "Dojo" metaphor earns its place in the behavior of the components, not just the copy. Progress feedback is honest and specific. Hierarchy is communicated through weight, not decoration. Motion confirms action rather than entertaining the eye. The primary accent color appears at most 10% of any screen surface; its scarcity is its signal value.

**Key Characteristics:**
- Near-white page base (cool-slate tinted) with a 5-step tonal surface ramp; amber warmth lives in the accent, not the page
- Geist variable (100-900) as the single typeface; weight contrast does all the hierarchy work
- Scholar's Amber as the single named accent; Emerald Signal reserved for correct/success only
- Warm/cool tension: amber primary against cool-slate secondary and surface tints
- Generous internal padding on all containers; components breathe rather than pack
- No box-shadows at rest; depth is tonal, not cast
- Dark mode available via `[data-theme='dark']`; light is the default
- Motion: responsive to interaction, never choreographed for spectacle
- Eyebrow labels and numbered section scaffolding are prohibited; hierarchy is structural

## 2. Colors

A crisp near-white base with one warm amber accent and one emerald signal. The warm/cool tension — amber primary against cool-slate surfaces — is what gives the palette its character. Three named accent roles is the ceiling.

**Default theme: light.** Dark mode available via `[data-theme='dark']` on the root element. Light surfaces tint toward H=252 (blue-slate); the body text and on-primary carry the amber warmth instead. This keeps surfaces clean and makes the amber pop.

### Primary
- **Scholar's Amber** (`oklch(52% 0.19 62)`): A deep warm honey-amber. Primary buttons, focused input borders, active navigation state, progress fill bars, accent icons. Used on ≤10% of any screen surface. Dark mode adaptation: `oklch(72% 0.20 62)` — warm amber glow against dark zinc. White `on-primary` text.
- **Scholar's Amber Container** (`oklch(94% 0.08 62)`): Very light amber wash for active card tints, chip backgrounds, nav active state. Supporting role — not an action color.

### Secondary
- **Deep Slate** (`oklch(40% 0.04 252)`): The structural counterpoint. Used for secondary/metadata text and surface-variant tints. Its cool blue-slate direction creates the warm/cool interplay that makes Scholar's Amber feel intentional rather than decorative.

### Tertiary
- **Emerald Signal** (`oklch(52% 0.17 162)`): Correct answers, logic-pass scores, win outcomes, "Recommendation" coach note label. Reserved exclusively for "you got it right / well done" contexts. Using it on neutral elements wastes the signal.
- **Emerald Container** (`oklch(92% 0.06 162)`): Background tint behind Emerald Signal text.

### Data Visualization
Three distinct colors for the skill balance chart — none should overlap with primary or tertiary in perceived hue:
- **Sunflower Gold** (`oklch(68% 0.18 85)`): Evidence Integration skill bar. Clearly more yellow and lighter than Scholar's Amber (H=62→85, L=52→68%).
- **Cobalt** (`oklch(52% 0.18 265)`): Response Countering skill bar. Deep blue-indigo.
- **Rose** (`oklch(55% 0.20 15)`): Emotional Intelligence skill bar.

### Neutral (light default)
- **Page Base** (`oklch(99.5% 0.002 252)`): Body background. Barely-there cool tint — invisible alone, cohesive with the surface ramp.
- **Surface Lowest** → **Surface Peak** (5-step ramp, `oklch(99.5%→88%, C=0.001→0.014, H=252)`): Tonal depth without shadows. Each step is a card layer above the previous.
- **Ink Full** (`oklch(13% 0.03 62)`): All primary text. Near-black with a trace of amber warmth. Do not substitute Ink Dim for headings.
- **Ink Dim** (`oklch(40% 0.04 252)`): Secondary text — inherits the cool-slate secondary direction. Contrast verified at 4.5:1 against Surface Mid.
- **Edge Soft** (`oklch(72% 0.015 252)`): Default border on most surfaces.
- **Edge Hard** (`oklch(90% 0.008 252)`): Light dividers, card borders on the lightest surfaces.
- **Signal Error** (`oklch(50% 0.22 25)`): Error borders and message tints. Not used for decoration.

**The One Voice Rule.** Scholar's Amber is one voice, and it speaks once per task. If four icons on a screen are amber, the amber means nothing. Protect its rarity.

**The Signal Color Fence.** Emerald Signal is reserved for correct / success / affirmative states only. Using it on neutral actions or decorative surfaces breaks its meaning.

## 3. Typography

**Single Font:** Geist variable (100-900, with OpenType features ss01, ss02, cv01, cv02)
**Mono:** Geist Mono (timers, code, score readouts)

**Character:** One family at nine weights. Hierarchy needs no second typeface. Geist's geometric construction reads precisely at small sizes (labels, meta) and holds authority at display scale. The variable axis lets the system do all its hierarchy work through weight contrast alone, which is cleaner and more coherent than mixing families.

### Hierarchy

- **Display** (weight 900, `clamp(2.5rem, 5vw, 4.5rem)`, line-height 1.1, tracking -0.02em): Landing hero headline, dashboard hero title. One per page maximum. `text-wrap: balance` required.
- **Headline** (weight 800, `clamp(1.75rem, 3vw, 3rem)`, line-height 1.15, tracking -0.015em): Major section titles, dialog titles, page-level feature names.
- **Title** (weight 700, `1.125rem`, line-height 1.4): Card headings, panel labels, sidebar section names, coach note headers.
- **Body** (weight 400, `1rem`, line-height 1.6, max 70ch): Debate transcript text, explanation copy, description paragraphs. Cap line length at 70ch.
- **Label** (weight 600, `0.875rem`, line-height 1.4): Button text, input labels, navigation items, form field names. Sentence case only.
- **Meta** (weight 600, `0.625rem`, letter-spacing +0.05em, all-caps): Absolute ceiling of 4 words; reserved for system-status badges only (e.g., "LIVE ARENA", "ELITE RIGOR"). Not used as a section eyebrow.
- **Mono** (Geist Mono 400, `1.25rem`): Live debate timer display, Elo score readouts. Tabular numerals.

**The No Eyebrow Rule.** The `text-[10px] uppercase tracking-widest` pattern appears on every page in the current codebase. It is an absolute ban going forward. Section identity is communicated by Title weight contrast and layout hierarchy, not by tracked all-caps kicker lines. Every instance must be removed before a feature ships. The one exception is a Meta badge (≤4 words) on a live-state indicator that genuinely needs a system-status signal.

**The Weight Ladder Rule.** Hierarchy runs: 900 → 800 → 700 → 600 → 400. Adjacent elements in a visual hierarchy must differ by at least two steps on this ladder. Two 700-weight elements side by side with different sizes reads as miscalibrated, not layered.

## 4. Elevation

Depth is tonal, not cast. This system has no box-shadows at rest. Every surface layer is one step up the zinc ramp: Void Base → Surface Low → Surface Mid → Surface High → Surface Peak. A card sitting on a page body is Surface Mid. A dropdown triggered from within that card is Surface Peak. Depth is legible from the ramp alone.

The single exception: Primary buttons receive a diffuse warm amber glow on hover only (`box-shadow: 0 4px 24px oklch(52% 0.19 62 / 0.30)`). This is intentional — it signals interactivity at the only elevation moment that needs it. It does not appear at rest.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. The ambient glow on button hover is the only shadow in the system. If you find yourself adding `box-shadow` to a card, a panel, or a modal, use a tonal surface step instead.

**The Ramp Reads Depth Rule.** Do not skip steps. A Surface Peak element on a Void Base background without the intermediate Surface Mid card below it looks floating and unmoored, not elevated. The ramp only reads as depth if steps are used in sequence.

## 5. Components

All components default to **open and breathing**: generous internal padding, soft single-pixel borders (Edge Hard), and large corner radii that welcome rather than contain. Fills are Surface Mid, not opaque saturated colors. Interactive elements confirm their state through color shift and motion feedback, not aggression.

### Buttons

Character: confident at rest, generous in hit area, clear on hover without shouting.

- **Shape:** Rounded — `8px` (lg) for primary, `12px` (xl) for ghost/secondary
- **Primary:** `bg Scholar's Amber`, text white, weight 700, height 48px, `px-6`, `font-size 0.875rem`. Hover: `brightness(1.1)` + warm amber glow. Active: `scale(0.98)`. Disabled: `opacity-60`.
- **Ghost:** Transparent background, 1px border Edge Hard, text Ink Full. Hover: bg Surface High. Same size as primary.
- **Danger:** bg Signal Error at 10% opacity, border Signal Error, text Signal Error. For destructive confirmation actions only.

### Chips / Badges

- **Style:** Scholar's Amber Container bg, text Scholar's Amber, 1px border amber-container, pill radius (9999px), `px-3 py-1`, label-weight text at `0.75rem`.
- **Live status badge:** animated pulse dot + "LIVE ARENA" (Meta weight, all-caps, ≤4 words). The only sanctioned use of the Meta type style.

### Cards / Containers

Character: containers recede to let content surface.

- **Corner style:** `24px` (`rounded-3xl`) for major page sections and hero panels; `16px` (`rounded-2xl`) for nested cards, data panels, stat cells
- **Background:** Surface Mid (`oklch(93.5% 0.011 265)`)
- **Border:** 1px Edge Hard (`oklch(88% 0.012 265)`)
- **Shadow:** None at rest; none on hover (tonal layering handles depth)
- **Padding:** `24px` (p-6) standard; `32px` (p-8) for hero sections; `16px` (p-4) for dense data cells
- **Nested cards:** use Surface Low background to step down inside a Surface Mid parent. Never use Surface Peak inside a Surface Mid card — steps must stay in ramp order.

### Inputs / Fields

- **Style:** `bg Surface Low`, 1px border Edge Hard, `rounded-lg` (8px), `h-12` (48px), `px-4`
- **Placeholder text:** Ink Dim at 50% opacity. Meets 4.5:1 contrast against Surface Low.
- **Focus:** border shifts to Academy Blue, `ring-2 ring-primary/20`
- **Disabled:** `opacity-50`, no focus ring
- **Error:** border Signal Error, `ring-2 ring-[rgba(239,68,68,0.2)]`

### Navigation (Sidebar)

- **Background:** Surface Lowest, 1px right border Edge Hard
- **Item default:** text Ink Dim, no background, `rounded-lg` corner, `px-3 py-2`
- **Item hover:** bg Surface High, text Ink Full
- **Item active:** bg Scholar's Amber Container (`primary/10`), text Scholar's Amber — background tint, no border stripe
- **Logo:** Terminal icon in Scholar's Amber Container, wordmark in weight 900 tracking-tight
- **Mobile:** drawer overlay with Surface Low background, closes on outside-click

### Debate Stage Panel (Signature Component)

The live arena layout is the product's most distinctive surface. Document it explicitly.

- **Layout:** 2-column on xl: left panel (320px) for metadata + controls; right panel for live transcript + input
- **Stage label:** Title weight text, not an eyebrow badge. "Opening Statement" not "OPENING · ROUND 1"
- **Timer:** Geist Mono, `2rem`, Ink Full. Counts down with 1-second `setInterval`. Below 60s, text shifts to Signal Error.
- **Transcript:** Body text at `1rem`; speaker names in Label weight (600). User turns right-aligned; AI/opponent turns left-aligned.
- **Input bar:** fixed to bottom of the transcript column; `h-14`, Surface High background, `rounded-2xl`, sends on Enter

### Stat Cell (Signature Component)

The 4-stat grid on Dashboard and Performance uses this pattern consistently.

- **Structure:** Card container (`rounded-2xl`, Surface Mid, p-5). Label in Label weight sentence case (not eyebrow). Number in Display or Headline weight. Trend below in body-sm, colored Signal Error (down) or Emerald Signal (up).
- **Ban:** The `text-[10px] uppercase tracking-[0.2em]` label above the number in every existing stat cell violates the No Eyebrow Rule. Replace with Label weight in sentence case.

## 6. Do's and Don'ts

### Do

- **Do** use the 5-step surface ramp (Void Base → Surface Low → Surface Mid → Surface High → Surface Peak) for every depth relationship. Never skip steps or go out of order.
- **Do** reserve Violet Flow for primary buttons, active states, focused inputs, and progress indicators. Check that no more than 10% of any screen surface carries the violet.
- **Do** use Emerald Signal exclusively for correct / success / affirmative states. It must not appear on neutral actions or decorative surfaces.
- **Do** use Geist weight contrast (400 body / 700 title / 800-900 headline+display) as the sole hierarchy tool. No second typeface, no tracked uppercase eyebrows.
- **Do** give cards `≥24px` internal padding and soft 1px borders (Edge Hard). Let them breathe.
- **Do** caption the Debate Stage timer in Geist Mono. Monospace numerals prevent layout shift on countdown.
- **Do** add `text-wrap: balance` to all Display and Headline elements to prevent ragged line breaks at responsive sizes.
- **Do** honor `prefers-reduced-motion` on all animations. Every transition needs a `no-animation` or `instant` fallback.
- **Do** meet WCAG AA: 4.5:1 for body text, 3:1 for large text (≥18px regular or ≥14px bold).

### Don't

- **Don't** use the eyebrow pattern — `text-[10px] uppercase tracking-widest` — as a section label on any page. It appears throughout the current codebase and must be removed before each feature ships.
- **Don't** add numbered section markers (01/02/03) as structural scaffolding. They appear on the Landing feature cards and must be replaced. Numbers earn their place only when the sequence itself carries information the reader needs.
- **Don't** use `border-left` greater than 2px as a colored accent stripe. The sidebar active indicator is exactly 2px; that is the ceiling.
- **Don't** use gradient text (`background-clip: text` + a gradient). Violet Flow is a solid color.
- **Don't** use `box-shadow` on cards, panels, or page surfaces. The tonal ramp handles depth. Shadows at rest add visual weight without adding hierarchy.
- **Don't** use "leverage", "seamless", "next-generation", "supercharge", or any member of the banned buzzword family in copy. Name the specific thing the product does: "see which claims failed the logic check" not "leverage our intelligence engine".
- **Don't** add cartoon mascots, confetti explosions, or dopamine-loop animations. Progress feedback is specific and honest, not theatrical.
- **Don't** use esports aesthetics: no neon RGB, no aggressive angular shapes, no glow-on-everything dark chrome. Geist Mono is technical; it does not need chrome around it.
- **Don't** default to corporate SaaS coldness (gray-on-white, productivity-tool blankness). The palette is dark; the components breathe; the copy is direct and specific.
- **Don't** use a second typeface alongside Geist. One family at multiple weights is more coherent than two families at any weights.
- **Don't** display stats with an all-caps eyebrow label above the number. The Stat Cell pattern must use sentence-case Label-weight text.
