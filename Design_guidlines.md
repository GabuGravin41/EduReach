# EduReach — Design Guidelines
**Derived from the live codebase | May 2026**

> These guidelines describe how EduReach looks and feels — not aspirationally, but as it actually exists today. When building new UI, match these patterns exactly so the product feels like one coherent thing.

---

## 1. Brand Identity

| Attribute | Value |
|---|---|
| **Theme colour** | `#2563eb` (blue-600) — used in PWA manifest, status bar, and tile |
| **Font** | **Inter** — loaded from Google Fonts (preconnect + `display=swap`), set as `font-family.sans` in Tailwind config |
| **Brand voice** | Confident, direct, encouraging. Never corporate. |
| **Audience** | Students and educators in Kenya / East Africa. Mobile-first. |
| **Personality** | Smart but approachable — like a knowledgeable study partner, not a textbook |

---

## 2. Colour Palette

### Four Primary Brand Colours

EduReach has **four primary colours** that work as a system. Each has a specific role.

| Colour | Scale | Shade | Hex | Role |
|---|---|---|---|---|
| **Indigo** | `indigo-*` | `indigo-600` | `#4F46E5` | Base primary — buttons, links, active nav, focus rings |
| **Violet** | `violet-*` | `violet-600` | `#7C3AED` | Co-primary — gradients, headings, active states |
| **Amber (Ember)** | `ember-*` | `ember-600` | `#D97706` | Warm accent — streaks, XP, highlights, energetic CTAs |
| **Emerald** | `emerald-*` | `emerald-600` | `#059669` | Success — correct answers, completions, positive feedback |

> The warm accent is called **`ember`** in the codebase (custom Tailwind scale, amber shades). Always use `ember-*` classes — not `amber-*` — so the intent is clear.

**Signature hero gradient** (hero sections, welcome banners, primary cards):
```
bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700
```

### When to Use Each Primary

| Situation | Colour |
|---|---|
| Primary button, CTA, active nav item, focus ring | **Indigo** |
| Section heading, active tab, highlighted card border | **Violet** |
| Streak count, XP badge, "Most Popular" label, warm highlight | **Amber / Ember** |
| Correct answer, course completed, active status dot | **Emerald** |

---

### Supporting Colours (functional only — not brand)

| Colour | Role |
|---|---|
| `rose` / `red` | Errors, destructive actions, failed states |
| `slate` | All neutrals — backgrounds, text, borders, dividers |
| `blue` | Occasional info states (use sparingly) |
| `purple` | Gradient end stop only (`to-purple-700`) |

---

### Background Scale (Light + Dark)

| Layer | Light | Dark |
|---|---|---|
| Page root | `bg-slate-50` / `bg-slate-100` | `bg-slate-900` |
| Cards / panels | `bg-white` | `bg-slate-800` |
| Elevated panels | `bg-white shadow-lg` | `bg-slate-800` |
| Sidebar | `bg-white` | `bg-slate-900` |
| Navbar (scrolled) | `bg-slate-950/90 backdrop-blur-xl` | same |
| Hero sections | `bg-slate-950` | same |
| Section alternates | `bg-white` / `bg-slate-50` | — |

### Dark Mode
Dark mode is class-based (`darkMode: 'class'` in tailwind config). The `dark` class is applied to `<html>` by a blocking script in `index.html` to prevent flash. Always pair every colour with its `dark:` counterpart when building new components.

---

## 3. Typography

**Font:** Inter (Google Fonts, loaded via `<link>` in `index.html` with `display=swap`). Set as `fontFamily.sans` in `tailwind.config.js` and as the base `font-family` in `index.css`. Inter renders crisply on all screen sizes, including low-DPI Android screens.

### Scale

| Role | Classes |
|---|---|
| **Page hero headline** | `text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight` |
| **Section headline** | `text-4xl sm:text-5xl font-extrabold tracking-tight` |
| **Card / panel title** | `text-lg font-bold` |
| **Sub-heading** | `text-base font-semibold` |
| **Body text** | `text-sm` (14px) — default for most UI |
| **Supporting / meta** | `text-xs` (12px) |
| **Micro / label** | `text-[10px]` or `text-[11px]` |

### Weight conventions
- `font-extrabold` → hero headings only
- `font-bold` → card titles, section headers, button labels
- `font-semibold` → nav items, badge labels, secondary actions
- `font-medium` → supporting text with slight emphasis
- (no explicit weight) → body text

### Gradient text
Used exclusively on hero headings to add visual punch:
```tsx
<span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
  Compete Better.
</span>
```

---

## 4. Spacing & Layout

### Page structure
- Max content width: `max-w-7xl mx-auto`
- Horizontal padding: `px-4 sm:px-6 lg:px-8`
- Section vertical padding: `py-24 sm:py-32`
- Dashboard content padding: `p-4 sm:p-6 lg:p-8`

### Grid system
| Layout | Classes |
|---|---|
| 2-column feature | `grid grid-cols-1 lg:grid-cols-2 gap-16 items-center` |
| 3-column features | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6` |
| 4-column stats | `grid grid-cols-2 sm:grid-cols-4 gap-4` |
| Card grid | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` |

### Gap scale
- Between card grids: `gap-4` to `gap-6`
- Within cards: `space-y-3` to `space-y-5`
- Between sections: `space-y-8`
- Tight label/value pairs: `gap-2` to `gap-3`

---

## 5. Border Radius

Custom scale defined in `tailwind.config.js`:

| Token | Size | Use |
|---|---|---|
| `rounded-sm` | 2px | Rarely used |
| `rounded` | 4px | Default (tags, micro elements) |
| `rounded-md` | 6px | Small badges |
| `rounded-lg` | 8px | Inputs, small buttons |
| `rounded-xl` | 12px | **Buttons** (standard) |
| `rounded-2xl` | 16px | **Cards** (standard) |
| `rounded-3xl` | 24px | Hero mockups, large panels |
| `rounded-full` | pill | Badges, avatars, toggle pills |

> **Rule:** Cards = `rounded-2xl`. Buttons = `rounded-xl`. Badges/pills = `rounded-full`.

---

## 6. Shadows & Elevation

| Level | Classes |
|---|---|
| Resting card | `shadow-sm` |
| Hover / active card | `shadow-lg` (applied on hover via `hover:shadow-lg`) |
| Modal / overlay | `shadow-2xl` |
| Button (primary) | `shadow-lg shadow-indigo-500/25` |
| Hero button | `shadow-xl shadow-indigo-600/40` |
| Decorative glow | `blur-3xl` on coloured `div` positioned absolutely |

---

## 7. Borders

| Use | Classes |
|---|---|
| Default card border | `border border-slate-100 dark:border-slate-700` |
| Emphasized card border | `border border-slate-200 dark:border-slate-600` |
| Featured/highlighted card | `border-2 border-indigo-500` |
| Dividers | `divide-y divide-slate-100 dark:divide-slate-700` |
| Glass / overlay border | `border border-white/10` or `border border-white/20` |
| Input border | `border border-slate-200 dark:border-slate-600` |

---

## 8. Component Patterns

### Cards
```tsx
<div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-200 p-5">
```

### Buttons

**Primary:**
```tsx
<button className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-lg shadow-indigo-500/25">
```

**Secondary / Ghost:**
```tsx
<button className="px-6 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 hover:bg-white/5 font-semibold transition-all">
```

**Destructive:**
```tsx
<button className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold">
```

**Icon button:**
```tsx
<button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors">
```

### Badges / Pills
```tsx
{/* Status badge */}
<span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
  Pro
</span>

{/* Tier highlight badge */}
<span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold shadow-lg">
  ⭐ Most Popular
</span>
```

### Stat cards
```tsx
<div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm flex items-start gap-4">
  <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex-shrink-0">
    <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
  </div>
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Label</p>
    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">Value</p>
  </div>
</div>
```

### Section badge (above headings)
```tsx
<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-semibold mb-5">
  <Icon className="w-4 h-4" />
  Section label
</div>
```

### Glassmorphism panels (dark hero sections)
```tsx
<div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl p-5">
```

### Progress bars
```tsx
<div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
       style={{ width: `${pct}%` }} />
</div>
```

### Skeleton loaders
```tsx
<div className="animate-pulse">
  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
</div>
```

### Empty states
```tsx
<div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-slate-700 text-center px-6">
  <div className="p-4 rounded-full bg-indigo-50 dark:bg-indigo-900/30 mb-4">
    <Icon className="w-8 h-8 text-indigo-500" />
  </div>
  <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">Title</h3>
  <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-xs">Supporting text.</p>
  <button className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">CTA</button>
</div>
```

---

## 9. Animation System

All animations are defined in **`tailwind.config.js`** (`animation` + `keyframes` blocks) and are available as `animate-*` Tailwind classes everywhere in the app. Animation delays are utility classes in **`index.css`**. There are no more inline `<style>` tags in components.

### Available animations

| Class | Duration | When to use |
|---|---|---|
| `animate-fade-up` | 700ms spring | Page-load hero content, section reveals |
| `animate-fade-in` | 600ms ease | Secondary content, overlays |
| `animate-float-a` | 6s loop | Hero mockup illustrations |
| `animate-float-b` | 8s loop | Secondary floating panels |
| `animate-pulse-ring` | 2.5s loop | Live/active status dots |
| `animate-auth-in` | 250ms spring | Modal entrance |
| `animate-slide-up` | 300ms spring | Drawers, dropdowns, toasts |
| `animate-scale-in` | 200ms spring | Cards appearing, dropdown menus |
| `animate-shimmer` | 1.6s loop | Premium skeleton loaders (use `shimmer` utility class instead) |
| `animate-bounce-once` | 500ms | Success confirmations, XP gain feedback |
| `animate-toast-in` | 250ms spring | Toast notifications |

### Delay utilities (`index.css`)
```tsx
className="animate-fade-up delay-100"  // 100ms delay
className="animate-fade-up delay-200"  // 200ms delay
// Available: delay-75, delay-100, delay-150, delay-200, delay-300, delay-400, delay-500, delay-600, delay-700
```

### Shimmer skeleton (premium skeleton loader)
Use the `shimmer` utility class from `index.css` instead of plain `animate-pulse` for a more polished look:
```tsx
{/* Instead of: */}
<div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />

{/* Use: */}
<div className="h-4 w-32 rounded shimmer" />
```

### Scroll-triggered reveals
Use the `useInView` hook pattern (from `LandingPage.tsx`) with transition classes:
```tsx
className={`transition-all duration-700 ${
  inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
}`}
style={{ transitionDelay: inView ? `${i * 60}ms` : '0ms' }}
```

### Hover interactions
Every interactive element must have a hover state:

| Element | Hover |
|---|---|
| Cards | `hover:shadow-lg hover:-translate-y-0.5` |
| Primary buttons | `hover:bg-indigo-500 hover:-translate-y-0.5` |
| Icon buttons | `hover:bg-slate-100 dark:hover:bg-slate-700` |
| Links / nav | `hover:text-white hover:bg-white/8` |
| List items | `hover:bg-slate-50 dark:hover:bg-slate-700/50` |

### Transition defaults
```tsx
transition-all duration-200   // fast interactions (buttons, hovers)
transition-all duration-300   // card and list animations
transition-all duration-700   // scroll-triggered section reveals
```

### Accessibility
`index.css` includes a `prefers-reduced-motion` media query that collapses all animation durations to ~0ms. No additional work needed in components — it's handled globally.

---

## 10. Icon System

Icons are custom inline SVGs throughout the codebase — no icon library is installed. They live in `components/icons/` as individual `React.FC` components. Standard sizes:

| Context | Class |
|---|---|
| Nav / button icons | `w-4 h-4` |
| Stat card icons | `w-5 h-5` |
| Empty state icons | `w-8 h-8` |
| Hero/feature icons | `w-7 h-7` |
| Tiny indicators | `w-3 h-3` |

When building new SVG icons, use `stroke="currentColor"`, `strokeWidth={1.75}`, `strokeLinecap="round"`, `strokeLinejoin="round"`.

---

## 11. Dark Mode Patterns

Dark mode is toggled via the `dark` class on `<html>`, persisted to `localStorage` under the key `edureach:theme`. A blocking script in `index.html` prevents flash on load.

**Always write both light and dark variants:**
```tsx
// ✅ Correct
className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700"

// ❌ Wrong — will break in dark mode
className="bg-white text-slate-900"
```

Common dark-mode pairs:

| Light | Dark equivalent |
|---|---|
| `bg-white` | `dark:bg-slate-800` |
| `bg-slate-50` | `dark:bg-slate-900` |
| `bg-slate-100` | `dark:bg-slate-700` |
| `text-slate-900` | `dark:text-slate-100` |
| `text-slate-700` | `dark:text-slate-200` |
| `text-slate-500` | `dark:text-slate-400` |
| `border-slate-200` | `dark:border-slate-700` |
| `bg-indigo-50` | `dark:bg-indigo-900/30` |
| `bg-emerald-50` | `dark:bg-emerald-900/20` |

---

## 12. Responsive Design

The platform is **mobile-first**. The primary target device is a mid-range Android phone on a 4G connection.

| Breakpoint | Prefix | Meaning |
|---|---|---|
| < 640px | (none) | Mobile — primary target |
| ≥ 640px | `sm:` | Large phone / small tablet |
| ≥ 768px | `md:` | Tablet |
| ≥ 1024px | `lg:` | Laptop / desktop |

Common mobile-first patterns:
```tsx
// Stack on mobile, side-by-side on desktop
className="flex flex-col sm:flex-row"

// Hidden on mobile, visible on desktop
className="hidden lg:block"

// Smaller text on mobile, larger on desktop
className="text-4xl sm:text-5xl lg:text-7xl"

// Full-width on mobile, auto on desktop
className="w-full sm:w-auto"
```

The mobile header is a separate component — desktop sidebar is `hidden` on mobile. Never assume sidebar navigation is visible.

---

## 13. Math & Code Rendering

The platform renders **LaTeX math** via KaTeX (loaded from CDN). The CSS is imported globally. Display-mode equations scroll horizontally on mobile:

```css
.katex-display {
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 4px;
}
```

Any component that renders assessment content or AI responses must handle KaTeX rendering — use the `MathMarkdown` component.

---

## 14. Writing Style (UI Copy)

| Rule | Example |
|---|---|
| **Short, action-first CTAs** | "Start Free Trial" not "Click here to begin your free trial" |
| **Sentence case everywhere** | "Get started free" not "Get Started Free" |
| **Numbers, not words** | "14-day trial" not "fourteen-day" |
| **Kenyan context where relevant** | "Pay via M-Pesa" not just "Pay via mobile money" |
| **Encouraging, not pressuring** | "Your learning journey starts today" not "Don't miss out" |
| **No jargon in user-facing copy** | "AI tutor" not "LLM-powered pedagogical assistant" |

---

## 15. What to Avoid

| ❌ Don't | ✅ Do instead |
|---|---|
| Tailwind utilities without dark variants | Always pair `bg-white dark:bg-slate-800` |
| Hardcoded pixel values | Use Tailwind scale |
| External icon libraries | Use existing `components/icons/` SVGs |
| Rounded corners below `rounded-lg` (8px) on interactive elements | `rounded-xl` minimum for buttons, `rounded-2xl` for cards |
| Generic placeholder colors (plain red, plain blue) | Use curated palette above |
| Animated content with no `prefers-reduced-motion` consideration | Add `transition-none` fallback for critical accessibility |
| Fixed heights on text containers | Let text wrap naturally |
| Page-level horizontal scroll | `overflow-x-hidden` is set on `html, body` — don't break it |

---

*Document compiled from: `tailwind.config.js`, `index.css`, `index.html`, `LandingPage.tsx`, `Dashboard.tsx`, `BillingPage.tsx`, `StudyGroupsPage.tsx`, and the `components/icons/` directory.*
