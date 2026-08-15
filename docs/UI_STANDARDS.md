# Corgi POS — UI Standards

> **Normative document** — єдиний source of truth для UI в Corgi POS.  
> Описує, **як має бути**, а не як зараз є.  
> Class strings — copy-paste ready. Опис і use cases — українською.

**Як користуватись:**
1. Нова фіча → [§0 Quick Reference](#0-quick-reference) + [§10 Use-Case Matrix](#10-use-case-matrix)
2. Рефактор сторінки → [§11 Page Checklists](#11-page-conformance-checklists)
3. Code review → [§0 Do / Don't](#do--dont) + [§4 Buttons](#4-buttons)
4. Міграція legacy → [Appendix A](#appendix-a--migration-guide)

**Theme source:** [`apps/web/src/app/globals.css`](../apps/web/src/app/globals.css)  
**Layout shell:** [`apps/web/src/components/layout/DashboardLayout.tsx`](../apps/web/src/components/layout/DashboardLayout.tsx)

---

## 0. Quick Reference

### Typography tokens → Tailwind

| Token | Tailwind classes | Use case |
|-------|------------------|----------|
| `micro` | `text-[10px] font-black uppercase tracking-wider text-gray-400` | Table headers, KPI labels |
| `ui-sm` | `text-[12px] font-semibold` | Compact toggles, calendar cells |
| `ui-md` | `text-[13px] font-semibold` or `font-bold` | **Default UI**: buttons, tabs, filters |
| `body` | `text-[14px] font-medium text-gray-800` | Inputs, form values |
| `section` | `text-lg font-bold text-gray-900` | Widget H3 |
| `page-title` | `text-2xl font-black text-gray-900 tracking-tight` | H1 on every page |
| `hero` | `text-3xl font-black text-gray-900` | KPI totals, POS total |
| `subtitle` | `text-sm font-medium text-gray-500 mt-1` | Under page title |

### Component → canonical classes

| Component | Canonical classes |
|-----------|-------------------|
| **PagePanel** | `bg-white rounded-3xl shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden p-5 md:p-8` |
| **WidgetCard** | `bg-white border border-gray-100 rounded-3xl p-6 hover:border-gray-200 transition-colors` |
| **ListCard** | `bg-white border border-gray-100 rounded-2xl p-4 hover:border-gray-200 hover:shadow-sm transition-all` |
| **SegmentedControl** | Container: `flex gap-0.5 h-10 p-1 bg-gray-50/80 rounded-xl border border-gray-200/60` · Active: `h-full px-4 text-[13px] font-semibold rounded-lg bg-white text-gray-900 shadow-sm` · Inactive: `text-gray-500 hover:text-gray-900 hover:bg-gray-200/50` |
| **Input** | `input-corgi` utility або inline: `w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-medium text-gray-800 outline-none hover:border-gray-300 focus:border-corgi focus:ring-4 focus:ring-corgi/10 transition-all placeholder:text-gray-400` |
| **Btn Primary** | `h-10 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-[13px] shadow-sm cursor-pointer active:scale-95 transition-all` |
| **Btn Brand** | `h-10 px-4 bg-corgi hover:brightness-110 text-white rounded-xl font-bold text-[13px] shadow-sm cursor-pointer active:scale-95 transition-all` |
| **Btn Secondary** | `h-10 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-[13px] hover:bg-gray-50 cursor-pointer transition-all` |
| **StatusBadge** | `px-2.5 py-1 rounded-full text-xs font-bold` + semantic colors (§3) |
| **AlertError** | `bg-red-50 border border-red-100 text-red-700 text-[13px] font-medium rounded-xl px-3 py-2` |
| **EmptyState** | `border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm font-medium py-12 flex flex-col items-center justify-center` |
| **ModalBackdrop** | `fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4` |

### Existing `@utility` classes (preferred over inline duplication)

| Utility | File | Maps to |
|---------|------|---------|
| `input-corgi` | `globals.css` | Canonical input (§5) — **use this** |
| `label-corgi` | `globals.css` | `text-[14px] font-bold text-gray-900 mb-2` |
| `label-hint` | `globals.css` | `text-[11px] text-gray-400 font-medium ml-1` |
| `btn-primary-corgi` | `globals.css` | Primary workflow button (misnamed — actually `bg-black`; migrate to §4 Primary) |

**Planned utilities** (document now, implement in follow-up PR):
`btn-primary`, `btn-brand`, `btn-secondary`, `panel-shell`, `card-widget`, `alert-error`, `segmented-control`

### Do / Don't

| Do | Don't |
|----|-------|
| Use theme tokens: `corgi`, `ui-beige`, `beige`, `brown` | Hardcode `#f59e0b`, `#1a2333`, `#111827`, `#f9fafc` |
| Page shell: `rounded-3xl` | `rounded-[32px]` on page panels |
| H1: `text-2xl font-black tracking-tight` | `font-bold` on page titles |
| Primary workflow: `bg-gray-900` | `bg-black` for new code |
| Brand CTA: `bg-corgi` only for create/checkout/promo | `bg-corgi` for every button |
| Focus ring: `focus:ring-corgi/10` | Mix `/10` and `/20` |
| Toolbar controls: `h-10 rounded-xl` | Mix `h-[38px]`, `h-9`, `rounded-[10px]` |
| Kanban canvas: `bg-ui-beige/30` | `#f9fafc` or arbitrary hex |
| Charts: `corgi`, `gray-900`, `gray-300`, `gray-200` palette | Amber `#f59e0b` in charts |
| Semantic badges from §3 table | Random green/red class combos |
| `cursor-pointer` + `active:scale-95` on buttons | Missing interaction feedback |
| Lucide icons: 14 inline, 16 buttons, 18 nav | Inconsistent icon sizes |
| Scrollable kanban: `custom-scrollbar` | Visible scrollbars in horizontal boards |
| Channel colors Glovo/Uber **only** on order source UI | Channel hex elsewhere |

---

## 1. Layout & Shell

### 1.1 App architecture

```
┌─────────────────────────────────────────────────────────┐
│  DashboardLayout: h-screen bg-ui-beige overflow-hidden  │
│  ┌──────────┬──────────────────────────────────────────┐│
│  │ Sidebar  │  Header                                  ││
│  │          │  ┌────────────────────────────────────┐  ││
│  │          │  │ PagePanel (white card)             │  ││
│  │          │  │ rounded-3xl shadow-sm p-5 md:p-8   │  ││
│  │          │  └────────────────────────────────────┘  ││
│  └──────────┴──────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 1.2 Canonical values

| Element | Canonical classes | Notes |
|---------|-------------------|-------|
| App canvas | `h-screen bg-ui-beige flex flex-col overflow-hidden` | `DashboardLayout.tsx` |
| Content row padding | `px-4 md:px-6 pb-4 md:pb-6 gap-4 md:gap-6` | Between sidebar and main |
| **PagePanel** | `bg-white rounded-3xl shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden p-5 md:p-8` | **Every page** inside layout |
| Scroll area inside panel | `flex-1 overflow-y-auto overflow-x-hidden min-h-0 pb-10` | Long content |
| Section grid | `grid gap-6 mb-8` | Widget rows |
| Kanban / work canvas | `flex-1 overflow-x-auto custom-scrollbar bg-ui-beige/30 p-6 gap-6` | Orders, Tasks |
| Toolbar row | `flex flex-wrap items-center gap-3 shrink-0` | Filters above content |
| Toolbar control height | `h-10` (40px) | Unified — no 38px mix |

### 1.3 PagePanel recipe

```html
<div class="bg-white rounded-3xl shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden p-5 md:p-8">
  <!-- optional: page header -->
  <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 shrink-0">
    <div>
      <h1 class="text-2xl font-black text-gray-900 tracking-tight">Page Title</h1>
      <p class="text-sm font-medium text-gray-500 mt-1">Optional subtitle</p>
    </div>
    <!-- actions slot -->
  </div>
  <!-- scrollable content -->
  <div class="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
    ...
  </div>
</div>
```

**Use case:** будь-яка сторінка всередині `DashboardLayout` — Dashboard, Menu, Orders, Operations, Settings, Staff, CRM, Inventory.

---

## 2. Typography

### 2.1 Font family

- **UI:** Nunito — `font-family: var(--font-nunito)` on `body`
- **Charts only:** Inter for axis labels (optional, not UI chrome)
- **Do not use** Geist for app UI components

> **Dependency:** для коректного `font-black` (900) потрібно розширити Google Fonts import у `globals.css`:
> `family=Nunito:wght@400;500;700;800;900`
> До цього `font-black` може синтетично bold-итись браузером.

### 2.2 Type scale (mandatory — no ad-hoc sizes)

| Level | Classes | Element | Example |
|-------|---------|---------|---------|
| Hero number | `text-3xl font-black text-gray-900` | KPI value, POS total | `€1,234.50` |
| Page title (H1) | `text-2xl font-black text-gray-900 tracking-tight` | Page header | «Active Orders» |
| Section title (H3) | `text-lg font-bold text-gray-900` | Widget/card header | «Shift Roster» |
| Subtitle | `text-sm font-medium text-gray-500 mt-1` | Under H1 | «Manage SOPs and tasks» |
| Body / input | `text-[14px] font-medium text-gray-800` | Form fields | Input value |
| UI default | `text-[13px] font-semibold text-gray-800` | Buttons, tabs, filters | «Apply», «Today» |
| UI compact | `text-[12px] font-semibold` | Mini toggles, calendar | Day cell |
| Micro label | `text-[10px] font-black uppercase tracking-wider text-gray-400` | Table header, field label | «ORDER ID» |
| Muted meta | `text-[13px] font-medium text-gray-500` | Timestamps, secondary | «2 min ago» |

### 2.3 Weight rules

| Weight | When |
|--------|------|
| `font-medium` | Body text, subtitles, input values |
| `font-semibold` | Tabs, filter labels, inactive→active transitions |
| `font-bold` | Section H3, button labels, card titles |
| `font-black` | Page H1, hero numbers, micro uppercase labels |

### 2.4 Modifiers (allowed)

- `tracking-tight` — page titles, hero numbers
- `tracking-wider` + `uppercase` — micro labels, table headers
- `leading-snug` — multi-line card titles
- `line-clamp-2` — review text, descriptions
- `font-mono` — receipt preview, codes only

---

## 3. Color System

### 3.1 Brand tokens (only source — no hardcoded hex)

Defined in [`globals.css`](../apps/web/src/app/globals.css):

| Token | Hex | Use case |
|-------|-----|----------|
| `corgi` | `#FDBD38` | Brand accent: focus, toggles ON, checkout, charts primary, selected states |
| `corgi-hover` | `#e5a420` | Hover on brand elements |
| `ui-beige` | `#FAF7F3` | App background, kanban canvas |
| `beige` | `#FFF2E2` | Payment method chips, warm surfaces |
| `darker-beige` | `#FFEBD2` | Chip borders |
| `brown` | `#CB5900` | Text on beige chips |
| `saturated-green` | `#87B031` | Success accents, loyalty (sparingly) |
| Green/pink extended | `#F3FEDD`…`#EE635E` | Allergen tags, illustrations only |

### 3.2 Neutrals

| Role | Classes |
|------|---------|
| Card surface | `bg-white` |
| Subtle surface | `bg-gray-50`, `bg-gray-50/30`, `bg-gray-50/50`, `bg-gray-50/80` |
| Card border | `border-gray-100`, hover `border-gray-200` |
| Input/control border | `border-gray-200`, hover `border-gray-300` |
| Segmented track border | `border-gray-200/60` |
| Text primary | `text-gray-900` |
| Text secondary | `text-gray-600`, `text-gray-700` |
| Text muted | `text-gray-400`, `text-gray-500` |

### 3.3 Semantic colors (mandatory mapping)

| State | Classes | Use case |
|-------|---------|----------|
| **Success** | `bg-green-50 text-green-700 border border-green-200/50` | Paid, active, live, completed |
| **Error** | `bg-red-50 text-red-700 border border-red-100` | Unpaid, failed, validation error |
| **Warning** | `bg-amber-50 text-amber-700 border border-amber-100` | Pending, attention needed |
| **Info** | `bg-blue-50 text-blue-700 border border-blue-100` | Informational badge |
| **Kitchen** | `text-orange-600`, `bg-orange-50` | Kitchen section labels |
| **Bar** | `text-blue-600`, `bg-blue-50` | Bar section labels |

### 3.4 Chart palette (mandatory)

Use theme tokens only — **no `#f59e0b`**:

| Series | Color |
|--------|-------|
| Primary | `corgi` (`#FDBD38`) |
| Secondary | `gray-900` |
| Tertiary | `gray-300` |
| Quaternary | `gray-200` |
| Previous period pattern | `gray-300` diagonal stripes on `gray-100` background |

Grid lines: `gray-100`. Tooltip text: `gray-700`.

### 3.5 Documented exceptions

| Exception | Allowed where | Values |
|-----------|---------------|--------|
| Channel source borders | Orders board cards only | Glovo `#FFC244`, Uber Eats `#06C167` |
| SOP setup admin UI | DailyChecklists setup mode only | `purple-50`, `purple-600`, `purple-700` |
| Accent highlight card | Dashboard live widgets (migrate to `corgi`) | Was `#f59e0b` — **must use `bg-corgi`** |

### 3.6 Forbidden in new code

- `#f59e0b`, `#1a2333`, `#111827`, `#f9fafc`
- `gray-150`, `gray-55` (non-standard Tailwind)
- Inline `style={{ backgroundColor: '...' }}` for brand colors — use theme classes
- `text-gray-950` unless migrating existing Orders code (prefer `gray-900`)

---

## 4. Buttons

### 4.1 Semantic roles (decision table)

| Role | When to use | Examples |
|------|-------------|----------|
| **Primary (workflow)** | Confirm workflow step, save, complete | Complete Order, Save, New Task, Apply filters |
| **Brand (create/checkout)** | Create new entity, money/checkout action | Create Order, Checkout, Board Settings Save |
| **Secondary** | Cancel adjacent to primary, neutral alternative | Cancel, Back |
| **Ghost** | Tertiary, low emphasis | Clear, Reset filters |
| **Destructive** | Irreversible delete | Delete confirm, Deactivate |

### 4.2 Recipes

**Primary (workflow):**
```html
<button class="inline-flex items-center justify-center gap-2 h-10 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-[13px] shadow-sm cursor-pointer active:scale-95 transition-all">
  Save
</button>
```

**Brand (create/checkout):**
```html
<button class="inline-flex items-center justify-center gap-2 h-10 px-4 bg-corgi hover:brightness-110 text-white rounded-xl font-bold text-[13px] shadow-sm cursor-pointer active:scale-95 transition-all">
  Create Order
</button>
```

**Secondary:**
```html
<button class="inline-flex items-center justify-center gap-2 h-10 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-[13px] hover:bg-gray-50 cursor-pointer transition-all">
  Cancel
</button>
```

**Ghost:**
```html
<button class="inline-flex items-center justify-center gap-2 h-10 px-4 text-gray-600 hover:bg-gray-100 rounded-xl font-bold text-[13px] cursor-pointer transition-all">
  Clear
</button>
```

**Destructive (filled):**
```html
<button class="inline-flex items-center justify-center gap-2 h-10 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-[13px] cursor-pointer active:scale-95 transition-all">
  Delete
</button>
```

**Destructive (ghost/icon):**
```html
<button class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer">
  <!-- Trash2 icon -->
</button>
```

**Icon circle (add/action):**
```html
<button class="w-9 h-9 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200 text-gray-500 hover:bg-corgi hover:text-white hover:border-corgi transition-all cursor-pointer active:scale-95">
  <!-- Plus icon size={16} -->
</button>
```

**Dashed add row:**
```html
<button class="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-[13px] font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300 transition-all flex items-center justify-center gap-2 cursor-pointer">
  Add item
</button>
```

### 4.3 Sizes

| Size | Classes |
|------|---------|
| Default | `h-10 px-4 text-[13px]` |
| Compact | `h-9 px-3 text-[12px]` |
| Full-width (modal footer) | `w-full py-3 text-[14px] font-bold` |
| Icon-only | `w-9 h-9` or `w-10 h-10` |

### 4.4 Deprecated patterns (migrate away)

| Legacy | Replace with |
|--------|--------------|
| `bg-black text-white` (Menu CTAs) | Primary workflow `bg-gray-900` |
| `btn-primary-corgi` utility name | Rename to `btn-primary` (same styles, update to gray-900) |
| `hover:-translate-y-0.5` on primary buttons | `active:scale-95` only (no lift) |
| Mixed `rounded-[10px]` on buttons | `rounded-xl` |

---

## 5. Forms & Inputs

### 5.1 Text input (canonical)

Prefer `className="input-corgi"` from globals.css.

Inline equivalent:
```html
<input class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-medium text-gray-800 outline-none hover:border-gray-300 focus:border-corgi focus:ring-4 focus:ring-corgi/10 transition-all placeholder:text-gray-400" />
```

**Focus ring:** always `focus:ring-corgi/10` — never `/20`.

### 5.2 Labels

| Type | Classes |
|------|---------|
| Field label | `label-corgi` or `text-[14px] font-bold text-gray-900 mb-2` |
| Micro label (above field) | `text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5` |
| Hint | `label-hint` or `text-[11px] text-gray-400 font-medium` |

### 5.3 Search input

```html
<div class="relative">
  <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
  <input class="input-corgi pl-10" placeholder="Search..." />
</div>
```

### 5.4 Select

```html
<div class="relative">
  <select class="w-full bg-white border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 text-[13px] font-semibold text-gray-700 outline-none hover:border-gray-300 focus:border-corgi focus:ring-4 focus:ring-corgi/10 transition-all appearance-none cursor-pointer">
    ...
  </select>
  <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
</div>
```

### 5.5 Toggle switch

```html
<!-- ON -->
<button class="relative w-10 h-5 rounded-full bg-corgi transition-colors cursor-pointer">
  <span class="absolute top-[2px] left-[2px] bg-white w-4 h-4 rounded-full shadow-sm translate-x-5 transition-transform" />
</button>
<!-- OFF: bg-gray-200, translate-x-0 -->
```

**Use case:** settings toggles, feature flags, boolean preferences.  
**Do not use** `#1a2333` for toggle track — use `bg-corgi` or `bg-gray-900` for special dashboard compare only.

### 5.6 Checkbox (custom)

```html
<div class="w-5 h-5 rounded-md flex items-center justify-center border transition-colors bg-corgi border-corgi text-white">
  <!-- Check icon size={12} when checked -->
</div>
<!-- Unchecked: border-gray-300 bg-white group-hover:border-corgi -->
```

### 5.7 Filter buttons (dropdown triggers)

Dashboard-style filters that open pickers — not native inputs:

```html
<button class="inline-flex items-center gap-2 h-10 px-4 bg-white border border-gray-200 rounded-xl text-[13px] font-semibold text-gray-900 hover:bg-gray-50 transition-all cursor-pointer">
  <!-- icon + label + chevron -->
</button>
<!-- Active/open state: border-gray-900 shadow-sm -->
```

---

## 6. Cards & Panels

| Type | Recipe | Use case |
|------|--------|----------|
| **WidgetCard** | `bg-white border border-gray-100 rounded-3xl p-6 hover:border-gray-200 transition-colors` | Dashboard widgets, settings sections |
| **ListCard** | `bg-white border border-gray-100 rounded-2xl p-4 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer` | Order cards, dish rows, task cards |
| **NestedMiniStat** | `bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm` | Location stats inside widget |
| **EmptyState** | `border-2 border-dashed border-gray-200 rounded-2xl py-12 text-gray-400 text-sm font-medium flex flex-col items-center justify-center` | No data |
| **SelectableRow** | Default: `border-gray-100 hover:border-gray-200 hover:bg-gray-50 rounded-2xl p-4` · Selected: `border-corgi bg-corgi/5` | Location picker, list selection |
| **KanbanColumn** | `flex-shrink-0 w-[264px] flex flex-col h-full bg-ui-beige/30 rounded-2xl p-1.5 border border-gray-100/50` | Task columns |
| **InfoPanel** | `bg-gray-50/50 border border-gray-100 rounded-2xl p-6` | Pricing rules, help text |

### Section header block (repeat everywhere)

```html
<div class="mb-6">
  <h3 class="text-lg font-bold text-gray-900">Section Title</h3>
  <p class="text-sm font-medium text-gray-500 mt-1">Optional description</p>
</div>
```

### Border radius hierarchy

| Level | Radius | Examples |
|-------|--------|----------|
| Page / major modal | `rounded-3xl` (24px) | PagePanel, modals |
| Card / column | `rounded-2xl` (16px) | Order card, checklist column |
| Control / nested | `rounded-xl` (12px) | Inputs, buttons, mini cards |
| Pill inside segment | `rounded-lg` (8px) | Active tab |
| Circular | `rounded-full` | Avatars, status pills, close buttons |

**Forbidden:** `rounded-[32px]` on page shells (use `rounded-3xl`). Full-screen modals also use `rounded-3xl`.

---

## 7. Segmented Control

**Single canonical spec** — replaces all variants (`h-9`, `h-[38px]`, `rounded-[10px]`, etc.).

### Container + pills

```html
<div class="flex items-center gap-0.5 h-10 p-1 bg-gray-50/80 rounded-xl border border-gray-200/60 shrink-0">
  <button class="h-full px-4 text-[13px] font-semibold rounded-lg bg-white text-gray-900 shadow-sm cursor-pointer transition-all">
    Active
  </button>
  <button class="h-full px-4 text-[13px] font-semibold rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 cursor-pointer transition-all">
    Inactive
  </button>
</div>
```

### Icon-only variant (Orders Delivery/Tables tab)

Same container; buttons are `w-9 h-full rounded-lg` with icon centered.

### Compact variant (KPI mini-toggles inside cards)

Container: `h-8 p-0.5 rounded-lg` · Pills: `px-2 text-[10px] font-semibold rounded-md`

**Use cases:** page tabs, filter presets, revenue view toggle, source filter, shift Morning/Evening, grid/list view.

---

## 8. Badges, Alerts & Tables

### 8.1 Status badge

Base: `inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold`

| Status | Classes |
|--------|---------|
| Paid / Active | `bg-green-50 text-green-700 border border-green-200/50` |
| Unpaid / Error | `bg-red-50 text-red-600 border border-red-100` |
| Pending | `bg-amber-50 text-amber-600 border border-amber-100` |
| Inactive | `bg-gray-100 text-gray-500 border border-gray-200` |

### 8.2 Source badge (Orders)

```html
<!-- Dine-in -->
<span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 font-bold text-[11px] rounded-lg">DINE-IN</span>
<!-- Takeaway -->
<span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-100 text-orange-700 font-bold text-[11px] rounded-lg">TAKEAWAY</span>
```

### 8.3 Count badge (kanban)

```html
<span class="bg-gray-200 text-gray-600 font-bold text-[11px] px-2 py-0.5 rounded-full">3</span>
```

### 8.4 Alert banner

**Error (mandatory pattern):**
```html
<div class="bg-red-50 border border-red-100 text-red-700 text-[13px] font-medium rounded-xl px-3 py-2" role="alert">
  Error message here
</div>
```

**Warning:**
```html
<div class="bg-amber-50 border border-amber-100 text-amber-800 text-[13px] font-medium rounded-xl px-3 py-2" role="alert">
```

### 8.5 Data table (reference: History)

```html
<div class="flex-1 border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/20 flex flex-col min-h-0">
  <table class="w-full text-left border-collapse">
    <thead>
      <tr class="border-b border-gray-100 bg-white sticky top-0 z-10">
        <th class="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Column</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-50 bg-white">
      <tr class="hover:bg-gray-50 transition-colors cursor-pointer group">
        <td class="px-6 py-4 text-[13px] font-semibold text-gray-900">Cell</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## 9. Modals

### 9.1 Decision tree

```
Need overlay?
├─ Simple confirm/delete     → Type A (centered, max-w-sm)
├─ Settings / short form     → Type B (centered, max-w-md)
├─ Full editor (Dish, etc.)  → Type C (centered, max-w-5xl, h-[85vh])
├─ POS terminal              → Type D (centered, max-w-6xl, h-[90vh])
└─ Detail / edit side panel  → Type E (right drawer, md:w-[500px])
```

### 9.2 Shared tokens

| Part | Classes |
|------|---------|
| Backdrop | `fixed inset-0 z-50 bg-black/40 backdrop-blur-sm` |
| Panel base | `bg-white rounded-3xl shadow-xl` or `shadow-2xl` |
| Header | `flex justify-between items-center px-6 py-5 border-b border-gray-100 shrink-0` |
| Body | `flex-1 overflow-y-auto px-6 py-4` |
| Footer | `px-6 py-5 border-t border-gray-100 bg-gray-50/50 shrink-0` |
| Close button | `p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors cursor-pointer` |
| Enter animation | `animate-in fade-in zoom-in-95 duration-200` |

### 9.3 Type specs

| Type | Size | Example |
|------|------|---------|
| **A — Confirm** | `max-w-sm p-6` | Cancel order, discard changes |
| **B — Form** | `max-w-md p-6` | BoardSettingsModal |
| **C — Editor** | `max-w-5xl h-[85vh] flex flex-col overflow-hidden` | DishModal |
| **D — POS** | `max-w-6xl h-[90vh] bg-gray-50 flex flex-row overflow-hidden` | OrderTerminalModal |
| **E — Drawer** | `fixed right-0 top-0 bottom-0 w-full md:w-[500px] flex flex-col` | OrderDetailsModal, NewTaskModal (`max-w-[600px]`) |

Drawer overlay: same `bg-black/40 backdrop-blur-sm`. Drawer enter: Framer `x: 100% → 0` spring or `slide-in-from-right`.

### 9.4 Nested dialog (inside Type C)

```html
<div class="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/20 backdrop-blur-sm rounded-3xl">
  <div class="bg-white p-6 rounded-3xl shadow-xl w-80 max-w-full animate-in fade-in zoom-in-95 duration-200">
```

---

## 10. Use-Case Matrix

| Scenario | Component / pattern | Section |
|----------|---------------------|---------|
| Page inside DashboardLayout | PagePanel | §1 |
| Page title + subtitle | page-title + subtitle tokens | §2 |
| Dashboard widget block | WidgetCard + section H3 | §6 |
| Date/location/source filter bar | SegmentedControl + filter button h-10 | §7, §5.7 |
| KPI big number | hero typography inside WidgetCard | §2, §6 |
| Create order / checkout | Btn Brand | §4 |
| Save / complete / confirm step | Btn Primary | §4 |
| Cancel modal action | Btn Secondary | §4 |
| Delete with confirmation | Type A modal + Btn Destructive | §9, §4 |
| Text field in form | input-corgi | §5 |
| Search bar | Search input with pl-10 | §5.3 |
| Boolean preference | Toggle §5.5 | §5 |
| API/load error at top of section | AlertError | §8.4 |
| Paid/unpaid in list | StatusBadge success/error | §8.1 |
| Order source label | Source badge §8.2 | §8 |
| Kanban board area | ui-beige/30 canvas + KanbanColumn | §1, §6 |
| Draggable task/order card | ListCard + cursor-grab | §6 |
| Empty list | EmptyState | §6 |
| Data grid with sort/filter | Data table §8.5 | §8 |
| Chart primary series | corgi from theme | §3.4 |
| Glovo/Uber order card border | Channel exception §3.5 | §3 |
| SOP admin setup matrix | Purple theme (DailyChecklists only) | §3.5 |
| Horizontal scroll board | custom-scrollbar | §12 |
| Settings form section | WidgetCard + input-corgi | §6, §5 |
| Receipt/code display | font-mono text-xs | §2 |

---

## 11. Page Conformance Checklists

Use when refactoring a route to match this spec. Check off items as fixed.

### Dashboard — `apps/web/src/app/page.tsx`, `components/dashboard/*`

- [ ] Replace `#f59e0b` in charts and ActiveTablesCard → `corgi` / `bg-corgi`
- [ ] Replace `#1a2333` on Apply button, calendar selected, compare toggle → `bg-gray-900`
- [ ] Replace `#111827` chart bars → `gray-900` token
- [ ] Unify all filter controls to `h-10 rounded-xl` (not `rounded-[10px]`)
- [ ] PagePanel padding → `p-5 md:p-8`
- [ ] Widget cards → WidgetCard spec (§6)
- [ ] Segmented controls → §7 canonical
- [ ] Location selected state → `border-corgi bg-corgi/5` (not `#f59e0b`)

### Menu — `apps/web/src/app/menu/page.tsx`, `components/ui/MenusView.tsx`, `DishModal.tsx`

- [ ] Page shell `rounded-[32px]` → `rounded-3xl`, padding → `p-5 md:p-8`
- [ ] Primary CTAs `bg-black` → Btn Primary `bg-gray-900` (§4)
- [ ] Brand actions (save dish with emphasis) — evaluate: Primary vs Brand per §4.1
- [ ] All inputs → `input-corgi` or §5 inline with `ring-corgi/10`
- [ ] Segmented tabs → §7 canonical `h-10`
- [ ] DishModal outer radius → `rounded-3xl` (not `rounded-[32px]`)
- [ ] Remove `hover:-translate-y-0.5` from buttons → `active:scale-95` only

### Orders — `apps/web/src/app/orders/page.tsx`, `components/operations/OrdersBoard.tsx`, `app/history/page.tsx`

- [ ] Tab toggle → §7 SegmentedControl (icon variant)
- [ ] Create Order button → Btn Brand (already close)
- [ ] Complete/Serve → Btn Primary `gray-900` (already close)
- [ ] Kanban canvas → `bg-ui-beige/30` (already close)
- [ ] Page title → `font-black` (reference implementation — keep)
- [ ] History table → §8.5 (reference — keep)
- [ ] Filter bar heights → unified `h-10`

### Operations — `apps/web/src/app/operations/page.tsx`, `components/operations/*`

- [ ] H1 `font-bold` → `font-black tracking-tight`
- [ ] PagePanel padding → `p-5 md:p-8` (normalize from mixed values)
- [ ] TaskManager kanban columns `#f9fafc` → `bg-ui-beige/30`
- [ ] Task card radius `rounded-[12px]` → `rounded-xl` or ListCard `rounded-2xl`
- [ ] New Task button → Btn Primary (gray-900) — **intentional**, keep
- [ ] BoardSettings Save → Btn Brand with `shadow-corgi/20` — **intentional**
- [ ] Segmented tabs → §7 canonical
- [ ] DailyChecklists purple setup — **exception**, document only in that component

### Cross-cutting (Settings, Staff, CRM, Inventory, Reports, Shift)

- [ ] All pages use PagePanel §1 (not custom shells)
- [ ] H1 follows page-title token §2
- [ ] Buttons follow §4 roles
- [ ] Forms use `input-corgi` §5
- [ ] Modals follow §9 types
- [ ] Error states use AlertError §8.4

---

## 12. Motion, Icons & Scrollbars

### Motion

| Context | Pattern |
|---------|---------|
| Buttons | `transition-all duration-200`, `active:scale-95` |
| Cards | `transition-colors` on border, optional `hover:shadow-sm` |
| Page enter (optional, once per route) | `animate-in fade-in slide-in-from-right-4 duration-500` |
| Modal enter | `animate-in fade-in zoom-in-95 duration-200` |
| Kanban / lists (Framer allowed) | `opacity 0→1`, subtle `y` or `scale` — keep under 300ms |
| Drag | `cursor-grab active:cursor-grabbing`, dragging: `opacity-50` |
| Loading skeleton | `animate-pulse bg-gray-100 rounded-2xl` |
| Live indicator | `animate-pulse` on dot |

**Avoid:** `hover:-translate-y-0.5` on primary buttons (legacy Menu pattern).

### Icons (Lucide)

| Context | Size | Color |
|---------|------|-------|
| Inline badge/action | 12–14 | `text-gray-400` |
| Button icon | 16 | `text-gray-500` → hover `text-gray-900` |
| Nav / section | 18 | active `text-gray-900`, inactive `text-gray-400` |
| Empty state / modal hero | 24–32 | semantic (red-500, corgi, etc.) |
| Selected / focus | — | `text-corgi` |

### Scrollbars

- Horizontal boards: `overflow-x-auto custom-scrollbar`
- Hidden scroll utility: `scrollbar-hide`
- Do not show native scrollbars on kanban columns

### Shadows (when to use)

| Level | Class | When |
|-------|-------|------|
| Default | `shadow-sm` | PagePanel, cards, active pill, buttons |
| Hover | `hover:shadow-md` | ListCard hover |
| Dropdown | `shadow-xl` | Filter dropdowns, popovers |
| Modal | `shadow-2xl` | Full modals |
| Brand CTA emphasis | `shadow-lg shadow-corgi/20` | Board Settings save only |

---

## Appendix A — Migration Guide

### Legacy → canonical

| Search / legacy pattern | Replace with | Section |
|------------------------|--------------|---------|
| `#f59e0b`, `#fef3c7` | `corgi`, `corgi/10` | §3 |
| `#1a2333` | `gray-900` | §3, §4 |
| `#111827` | `gray-900` | §3 |
| `#f9fafc` | `ui-beige/30` or `gray-50` | §1 |
| `rounded-[32px]` on page shell | `rounded-3xl` | §1 |
| `rounded-[10px]` on toolbar buttons | `rounded-xl` | §4, §7 |
| `rounded-[12px]` on cards | `rounded-xl` or `rounded-2xl` | §6 |
| `h-[38px]` on toolbar | `h-10` | §1 |
| `font-bold text-2xl` page title | `font-black tracking-tight` | §2 |
| `bg-black text-white` button | `bg-gray-900` | §4 |
| `focus:ring-corgi/20` | `focus:ring-corgi/10` | §5 |
| `gray-150`, `gray-55` | `gray-100`, `gray-50` | §3 |
| `style={{ backgroundColor: '#f59e0b' }}` | `bg-corgi` class | §3 |
| Inline 20-line input classes | `input-corgi` utility | §5 |
| Inline primary button classes | `btn-primary-corgi` → future `btn-primary` | §4 |

### Grep commands for bulk audit

```bash
# From apps/web/
rg '#f59e0b|#1a2333|#111827|#f9fafc' src/
rg 'rounded-\[32px\]|rounded-\[10px\]|rounded-\[12px\]' src/
rg 'h-\[38px\]' src/
rg 'bg-black' src/components/
rg 'ring-corgi/20' src/
rg 'font-bold text-2xl' src/
rg 'gray-150|gray-55' src/
```

### Migration priority

1. **High impact / visible:** chart colors, page shells, H1 weights, primary button colors
2. **Medium:** segmented controls, filter heights, focus rings
3. **Low / localized:** task card custom shadow, purple SOP setup (keep as exception)

---

## Appendix B — As-Built Snapshot (Aug 2026)

> **Not normative.** Короткий знімок того, що було в коді на момент створення UI Standards.  
> Використовуй для порівняння прогресу міграції. Деталі — grep + §11 checklists.

### Що вже близько до spec

- **Orders / History:** H1 `font-black`, kanban `ui-beige/30`, dual button roles, table pattern
- **DashboardLayout:** двошаровий shell з `ui-beige` + white panel
- **Segmented control pattern:** концепт є на всіх 4 сторінках (потрібна уніфікація розмірів)
- **globals.css:** brand tokens і `input-corgi` / `btn-primary-corgi` utilities вже defined

### Основні розбіжності (було в коді)

| # | Topic | As-built variants | Spec decision |
|---|-------|-------------------|---------------|
| 1 | Chart accent | `#f59e0b` vs `corgi` | **`corgi` only** |
| 2 | Page H1 weight | `font-bold` vs `font-black` | **`font-black`** |
| 3 | Page shell radius | `rounded-3xl` vs `rounded-[32px]` | **`rounded-3xl`** |
| 4 | Primary CTA | `gray-900`, `black`, `corgi` | **3 roles: Primary / Brand / Secondary** |
| 5 | Toolbar radius/height | `xl` vs `[10px]`, 38 vs 40px | **`h-10 rounded-xl`** |
| 6 | Focus ring | `/10` vs `/20` | **`/10`** |
| 7 | Utilities usage | inline duplication | **Prefer `input-corgi`, plan `btn-*`** |
| 8 | Hardcoded grays | `gray-150`, `#f9fafc` | **theme tokens** |
| 9 | Confirm dark | `#1a2333` vs `gray-900` | **`gray-900`** |
| 10 | Kanban canvas | `ui-beige/30` vs `#f9fafc` | **`ui-beige/30`** |

### Page-specific as-built notes

| Page | Notable legacy |
|------|----------------|
| Dashboard | Charts `#f59e0b`, compare toggle `#1a2333`, filters `rounded-[10px]` |
| Menu | Shell `rounded-[32px]`, CTAs `bg-black`, heavy arbitrary typography |
| Orders | Closest to spec; channel hex on source cards (kept as exception) |
| Operations | H1 `font-bold`, kanban `#f9fafc`, purple SOP setup (kept as exception) |

### File index

| Area | Key files |
|------|-----------|
| Theme | `apps/web/src/app/globals.css` |
| Layout | `apps/web/src/components/layout/DashboardLayout.tsx` |
| Dashboard | `apps/web/src/app/page.tsx`, `components/dashboard/*` |
| Menu | `apps/web/src/app/menu/page.tsx`, `components/ui/MenusView.tsx`, `DishModal.tsx` |
| Orders | `apps/web/src/app/orders/page.tsx`, `components/operations/OrdersBoard.tsx`, `components/pos/OrderTerminalModal.tsx` |
| History | `apps/web/src/app/history/page.tsx` |
| Operations | `apps/web/src/app/operations/page.tsx`, `components/operations/*` |

---

*UI Standards v1.0 — Corgi POS. Questions or exceptions: document in PR description and link to relevant § section.*
