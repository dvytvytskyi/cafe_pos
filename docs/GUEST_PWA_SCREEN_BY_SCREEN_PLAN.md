# Guest PWA — план реалізації по кожному скріншоту

Це **окремий add-on шар** (onboarding / order hub), який йде **перед** основним додатком з 4 табами (Menu · Shop · Loyalty · Orders).

Референс-скріни: `screens_for_pwa/auth1.PNG` … `auth8.PNG`  
Ціль: повторити UX як на скрінах, адаптувавши під Corgi Cafe + існуючий Guest API.

---

## Як читати цей документ

Кожен розділ = **один скріншот**. У кожному:

1. **Призначення** — навіщо екран
2. **Коли показується** — звідки прийшов користувач
3. **UI по зонах** — що малюємо (зверху вниз)
4. **Стани** — варіанти одного екрану
5. **Дії користувача** — tap → що відбувається
6. **Дані** — що тримати в state / context
7. **API** — які endpoints викликати
8. **Компоненти** — що створити в коді
9. **План реалізації** — покроково (1, 2, 3…)
10. **Готово, коли** — acceptance criteria

---

## Загальна навігація (flow між скрінами)

```
auth1 (Welcome)
  ├─ hamburger → auth2 (Drawer)
  ├─ Log in / Sign up → /loyalty (OTP)
  └─ Order now ↓
auth3/4/5 (Order Hub — 3 режими)
  ├─ location row → auth7/8 (Map)
  ├─ delivery address → (address form) → auth6 (time)
  ├─ schedule btn → /orders або time sheet
  └─ Order now → /menu (основний додаток, 4 таби)
```

**QR зі столу** (`?locationId=X&table=Y`): можна **пропустити** auth1–auth5 і одразу йти на `/menu` (Store mode), або показати скорочений hub.

---

# SCREEN 01 — `auth1.PNG`

## Призначення
Перший екран PWA: брендинг + вхід в акаунт + головна CTA «замовити».

## Коли показується
- Відкрив PWA без deep link
- Після logout (опційно)
- Route: `/` (замість поточного redirect на `/menu`)

## UI по зонах

| # | Зона | Елементи | Стиль (референс) |
|---|------|----------|------------------|
| A | Status bar | System (не верстаємо) | — |
| B | Hero (≈55% висоти) | Фото на весь блок | `object-cover` |
| B1 | Hero overlay top | Hamburger ⬅, Help `?` ➡ | білі іконки, 44×44 tap |
| B2 | Hero overlay bottom | H1 + підзаголовок | білий, bold caps + regular |
| C | Auth block (білий фон) | 2 рядки | full width, divider між |
| C1 | Row «Log in» | icon person + label + chevron ↑ | padding 16px |
| C2 | Row «Sign up» | icon person+ + label + chevron ↑ | те саме |
| D | Footer CTA | Pill «Order now» + кругла стрілка → | чорний, full width minus margin |

**Тексти (замінити на Corgi):**
- H1: `LOVE AT FIRST BITE.` → напр. `CORGI CAFE.`
- Sub: `Introducing our new summer menu.` → сезонний / marketing copy з CMS або static

## Стани

| Стан | Що змінюється |
|------|----------------|
| Default | Як на скріні |
| Logged in | C1/C2 можна сховати або показати «Hi, {name}» |
| QR/table в URL | CTA «Order now» може одразу вести на menu |

## Дії користувача

| Дія | Результат |
|-----|-----------|
| Tap hamburger | Відкрити **auth2** drawer |
| Tap `?` | Help sheet / FAQ / `mailto:` |
| Tap «Log in» | `/loyalty?mode=login` або OTP sheet |
| Tap «Sign up» | `/loyalty?mode=register` |
| Tap «Order now» | Scroll/reveal **auth3** блок ORDER NOW або navigate `/home/order` |

## Дані (context)

```ts
// додати в GuestContext
orderMode: 'store' | 'pickup' | 'delivery'  // default 'store'
selectedLocationId: string
selectedLocationName: string
distanceKm?: number
isDrawerOpen: boolean
```

## API
- `GET /api/guest/bootstrap?locationId=&table=` — при mount (якщо є params)
- Auth — не на цьому екрані

## Компоненти

```
app/page.tsx                    → Screen01Welcome
components/home/HeroHeader.tsx  → зони B, B1, B2
components/home/AuthRows.tsx    → зона C
components/home/OrderNowCta.tsx → зона D
```

## План реалізації

1. Замінити `page.tsx` redirect на рендер `Screen01Welcome`.
2. Зробити `HeroHeader` з props: `imageUrl`, `title`, `subtitle`, `onMenu`, `onHelp`.
3. Зробити `AuthRows` з двома `PressableRow`.
4. Зробити `OrderNowCta` — reusable на auth3–5.
5. Підключити hamburger → `setDrawerOpen(true)`.
6. «Order now» → `router.push('/home/order')` або expand секції на тому ж scroll.
7. **Приховати `BottomNav`** на `/` (умова в `layout.tsx`).

## Готово, коли
- [ ] Виглядає як auth1 (hero + 2 auth rows + CTA)
- [ ] Hamburger відкриває drawer (auth2)
- [ ] Log in / Sign up ведуть на loyalty OTP
- [ ] Order now веде на order hub (auth3)
- [ ] Bottom nav не видно на цьому екрані

---

# SCREEN 02 — `auth2.PNG`

## Призначення
Бокове меню: профіль, навігація, налаштування, соцмережі.

## Коли показується
- Tap hamburger на auth1, auth3–5, або (опційно) menu/shop

## UI по зонах

| # | Зона | Елементи |
|---|------|----------|
| A | Drawer panel (~85% width) | slide from left, white bg |
| B | Header (black) | avatar 48px, «NOT LOGGED IN» / ім'я, «Log in» link |
| C | Primary list | 6 rows з іконкою + label + divider |
| C1 | My orders | → `/orders` |
| C2 | Loyalty program | → `/loyalty` (rename з «Honest People») |
| C3 | Invite a friend | v2 — disabled або hide |
| C4 | Playlist | v2 — hide |
| C5 | Catering | badge «New» — v2 hide |
| C6 | Chat & support | v2 — link на WhatsApp/email |
| D | Secondary list | Region, Privacy, Join team |
| E | Social row | IG, TikTok, Spotify icons |

| # | Overlay (решта екрану) | |
|---|------------------------|---|
| F | Dimmed backdrop | tap → close |
| G | Close X | top-right на dimmed area |

## Стани

| Стан | Header B |
|------|----------|
| Guest | NOT LOGGED IN + Log in |
| Logged in | Avatar + `{name}` + tier badge |

## Дії користувача

| Дія | Результат |
|-----|-----------|
| Tap backdrop / X | `setDrawerOpen(false)` |
| My orders | close drawer → `/orders` |
| Loyalty | close drawer → `/loyalty` |
| Region | locale picker sheet (en/es/ca/uk) |
| Log in | close → `/loyalty` |

## Дані
- `isLoggedIn`, `profileName`, `profileAvatar?` з `getProfile()`
- `locale` з context

## API
- `GET /api/guest/me` — якщо logged in

## Компоненти

```
components/drawer/SideDrawer.tsx
components/drawer/DrawerHeader.tsx
components/drawer/DrawerNavItem.tsx
components/drawer/LocalePickerSheet.tsx
```

## План реалізації

1. `SideDrawer` — portal, `translateX`, backdrop, focus trap.
2. `DrawerHeader` — два варіанти guest / logged in.
3. Список items з config array (label, icon, href, enabled).
4. v2 items — `enabled: false` в config, не показувати в v1.
5. Region → `LocalePickerSheet` → `setLocale()`.
6. Mount drawer в `layout.tsx`, керувати `isDrawerOpen` з context.
7. Body scroll lock коли drawer open.

## Готово, коли
- [ ] Відкривається/закривається як auth2
- [ ] My orders + Loyalty працюють
- [ ] Region змінює locale
- [ ] Logged-in state показує ім'я

---

# SCREEN 03 — `auth3.PNG`

## Призначення
Вибір **як** замовляти: Store (in-store / dine-in) + локація + CTA в меню.

## Коли показується
- Після «Order now» з auth1
- Route: `/home/order` або секція на `/` нижче hero

## UI по зонах

| # | Зона | Елементи |
|---|------|----------|
| A | Hero | Той самий що auth1 (reuse `HeroHeader`) |
| B | Section title | `ORDER NOW` — bold caps |
| C | Location row | 📍 + `{name} · ({distance} km)` + chevron |
| D | Mode cards (3) | Store / Pick up / Delivery — квадрати rounded |
| D1 | Selected card | beige bg + green ✓ badge top-right |
| E | Hint text | 1–2 рядки під картками (залежить від mode) |
| F | CTA | `OrderNowCta` |
| G | Voice ordering | текст + icon — **v2 skip** |

**Hint для Store (auth3):**
> Order and pay with the app in-store. Collect your tracker at the till. Easy.

## Стани

| orderMode | Selected card | Hint text |
|-----------|---------------|-----------|
| `store` | Store | in-store copy |
| `pickup` | Pick up | pickup copy (auth4) |
| `delivery` | Delivery | delivery copy (auth5) |

## Дії користувача

| Дія | Результат |
|-----|-----------|
| Tap location row | Відкрити **auth7/8** map |
| Tap Store / Pick up / Delivery | `setOrderMode(...)` + оновити hint |
| Tap Order now | `router.push('/menu')` + зберегти mode в context |

## Дані

```ts
orderMode: 'store'  // для auth3
selectedLocationId, selectedLocationName, distanceKm
```

## API
- `GET /api/guest/bootstrap?locationId=` — name локації
- Для distance: geolocation browser + haversine (клієнт)
- Список локацій для map: потрібен **новий** `GET /api/guest/locations` або public staff endpoint

## Компоненти

```
app/home/order/page.tsx       → Screen03OrderHub
components/home/LocationRow.tsx
components/home/OrderModeCards.tsx
components/home/ModeHint.tsx
```

## План реалізації

1. Сторінка `/home/order` з hero + ORDER NOW block.
2. `OrderModeCards` — 3 cards, controlled `value={orderMode}`.
3. `LocationRow` — показує bootstrap location або placeholder.
4. `ModeHint` — map `orderMode → string` з i18n.
5. On mount: якщо `table` в URL → force `orderMode='store'`, location з bootstrap.
6. CTA → `/menu` з query `?mode=store`.
7. Reuse `HeroHeader`, hide BottomNav.

## Готово, коли
- [ ] Store selected з зеленою галочкою як auth3
- [ ] Location row tap → map screen
- [ ] Order now → menu з правильним locationId
- [ ] Hint text змінюється при switch mode

---

# SCREEN 04 — `auth4.PNG`

## Призначення
Той самий Order Hub, але обрано **Pick up**.

## Відмінності від auth3

| Елемент | auth3 (Store) | auth4 (Pick up) |
|---------|---------------|-----------------|
| Selected card | Store | **Pick up** |
| Hint | in-store / tracker | *Order now or schedule a pickup…* |
| Extra button | — | **Schedule** (годинник) зліва від CTA |
| Location row | є | є (те саме) |

## Дії

| Дія | Результат |
|-----|-----------|
| Schedule (clock) | auth6 time sheet **або** `/orders` — уточнити product; референс = schedule pickup |
| Order now | `/menu?mode=pickup` → checkout `source: takeaway` |

## Дані
```ts
orderMode: 'pickup'
scheduledAt?: string  // якщо обрав час
```

## API
- `POST /api/guest/orders` з `source: 'takeaway'` (перевірити mapper)
- Schedule: **немає API** — потрібен `scheduledAt` на Order (бекенд v2)

## Компоненти
- Reuse `Screen03OrderHub` з `orderMode='pickup'`
- `components/home/ScheduleButton.tsx` — кругла кнопка з clock icon

## План реалізації

1. Не окремий файл — **той самий компонент**, prop/state `orderMode`.
2. Додати `ScheduleButton` поруч з CTA (flex row).
3. Schedule tap → bottom sheet auth6 (якщо робимо schedule) або toast «coming soon».
4. CTA → menu, при checkout передати `takeaway`.
5. Hint string для pickup в `i18n.ts`.

## Готово, коли
- [ ] Pick up card selected як auth4
- [ ] Schedule button видимий
- [ ] Order створюється як takeaway

---

# SCREEN 05 — `auth5.PNG`

## Призначення
Order Hub з режимом **Delivery**.

## Відмінності від auth3/4

| Елемент | Значення |
|---------|----------|
| Selected card | **Delivery** |
| Замість location row | **«Add a delivery address»** (bike icon + chevron) |
| Hint | *From our kitchen to your door…* |
| Schedule btn | є (як auth4) |

## Дії

| Дія | Результат |
|-----|-----------|
| Add delivery address | Address form sheet (autocomplete) → зберегти в context |
| Schedule | auth6 time picker |
| Order now | Блокувати якщо немає address; інакше → `/menu?mode=delivery` |

## Дані

```ts
orderMode: 'delivery'
deliveryAddress?: { line1, city, lat, lng }
scheduledAt?: string
```

## API
- **Delivery не в guest API v1** — потрібно:
  - `POST /api/guest/delivery/quote`
  - зона доставки per location
  - або інтеграція Glovo/Uber (staff вже має aggregators)

## Компоненти

```
components/delivery/AddressSheet.tsx
```

## План реалізації

1. У `OrderHub`: якщо `orderMode==='delivery'` → показати `AddressRow` замість `LocationRow`.
2. Address sheet — форма (v1: manual text, v2: Google Places).
3. Order now disabled поки `!deliveryAddress`.
4. **Фаза 1:** UI як auth5, але CTA показує «Delivery coming soon».
5. **Фаза 2:** бекенд + реальний delivery flow.

## Готово, коли (фаза 1 UI)
- [ ] Delivery card selected
- [ ] Address row замість location
- [ ] Hint text delivery
- [ ] Schedule + CTA layout як на скріні

---

# SCREEN 06 — `auth6.PNG`

## Призначення
Bottom sheet вибору **часового слоту** (delivery або scheduled pickup).

## Коли показується
- Tap Schedule на auth4/5
- Або tap «Add address» flow перед confirm

## UI по зонах

| # | Зона | Елементи |
|---|------|----------|
| A | Backdrop | dim hero + order section |
| B | Sheet | rounded top, white bg |
| C | Time list | vertical scroll, slots `18:45 – 19:15 h` |
| C1 | Selected slot | grey pill highlight |
| C2 | Other slots | faded grey text |
| D | Actions | X (close) + black pill «Confirm time» |

## Дії

| Дія | Результат |
|-----|-----------|
| Scroll list | select slot (tap on row) |
| X | close sheet, `scheduledAt` unchanged |
| Confirm time | `setScheduledAt(slot)`, close, back to auth4/5 |

## Дані
```ts
scheduledAt: string  // ISO
availableSlots: { start, end }[]
```

## API
- **Немає** — потрібен endpoint slots per location/mode/day

## Компоненти

```
components/sheets/TimeSlotSheet.tsx
```

## План реалізації

1. `TimeSlotSheet` — generic bottom sheet (reuse для address later).
2. Mock slots: generate 30-min windows 11:00–22:00 (dev).
3. Wire to Schedule button on auth4/5.
4. Зберігати `scheduledAt` в context + localStorage.
5. Показувати обраний час під hint text (optional).
6. Бекенд slots — окремий таск.

## Готово, коли
- [ ] Sheet виглядає як auth6
- [ ] Можна вибрати slot і confirm
- [ ] Значення зберігається в context

---

# SCREEN 07 — `auth7.PNG`

## Призначення
Карта з вибором закладу — деталі **Westfield Glòries**.

## Коли показується
- Tap location row на auth3/4

## UI по зонах

| # | Зона | Елементи |
|---|------|----------|
| A | Full map | Mapbox, pins, user location blue dot |
| A1 | Close X | top-right |
| A2 | My location | arrow button |
| B | Bottom card | white, rounded top 24px |
| B1 | Distance pill | `Far · 2564 km` |
| B2 | Title + arrows | `WESTFIELD GLÒRIES.` + `<` `>` swipe |
| B3 | Status line | green dot Open · hours |
| B4 | City | pin + Barcelona |
| B5 | Rows | Speed Lane (optional), How to get there, Details |
| B6 | CTA | black circle → |

## Дії

| Дія | Результат |
|-----|-----------|
| X | `router.back()` |
| My location | center map on GPS |
| `<` `>` | prev/next location in list |
| How to get there | `maps://` or Google Maps URL |
| Details | store detail page (hours, photo, phone) |
| → CTA | `setSelectedLocation(id)`, back to order hub |

## Дані

```ts
locations: Array<{
  id, name, lat, lng, address, city,
  openNow, hoursLabel,
  features: { speedLane?: boolean }
}>
activeLocationIndex: number
```

## API
- **Потрібно:** `GET /api/guest/locations` → id, name, lat, lng, hours
- Або розширити Prisma `Location` + guest route

## Компоненти

```
app/locations/page.tsx
components/locations/LocationMap.tsx      (react-map-gl)
components/locations/LocationDetailCard.tsx
```

## План реалізації

1. Додати guest API locations list (read-only).
2. Seed lat/lng для demo locations у Barcelona.
3. `LocationMap` — Mapbox token з `NEXT_PUBLIC_MAPBOX_TOKEN`.
4. Pins + selected halo (green circle CSS).
5. `LocationDetailCard` — props from selected location.
6. Swipe arrows — cycle `activeLocationIndex`.
7. CTA → update context + `router.back()`.
8. Distance — `navigator.geolocation` + haversine formula.

## Готово, коли
- [ ] Map + card як auth7
- [ ] Можна вибрати локацію і повернутись на hub
- [ ] Distance показується

---

# SCREEN 08 — `auth8.PNG`

## Призначення
Той самий map screen, інша локація — **Pedralbes Centre** + **Speed Lane**.

## Відмінності від auth7

| Елемент | auth7 | auth8 |
|---------|-------|-------|
| Location name | WESTFIELD GLÒRIES | PEDRALBES CENTRE |
| Card tint | white/grey | light cyan gradient |
| Speed Lane row | може бути hidden | **видимий**: Open + опис |
| Map area | Barcelona east | Barcelona west |

## Реалізація
**Не окремий екран** — той самий `app/locations/page.tsx`, інший `activeLocationIndex`.

## Дані
```ts
location.features.speedLane: boolean
location.features.speedLaneOpen: boolean
```

## План реалізації

1. У `LocationDetailCard`: якщо `speedLane` → показати row як auth8.
2. Card background: `gradient` variant per location theme (optional).
3. Переконатись swipe між локаціями працює.
4. Speed Lane — display only v1 (no API).

## Готово, коли
- [ ] Speed Lane row видно для locations з flag
- [ ] Swipe між локаціями як на auth8

---

# Зв'язок з основним додатком (4 таби)

Після проходження add-on flow:

| orderMode | Куди йде «Order now» | Що в API |
|-----------|----------------------|----------|
| store | `/menu` | `tableId`, `source: dine_in` |
| pickup | `/menu` | `source: takeaway` |
| delivery | `/menu` (v2) | `source: delivery` + address |

**BottomNav** з'являється на `/menu`, `/shop`, `/loyalty`, `/orders` — **не** на `/`, `/home/order`, `/locations`.

---

# Порядок розробки (рекомендований)

| Крок | Скрін(и) | Що робимо |
|------|----------|-----------|
| 1 | — | Context: `orderMode`, `drawer`, `location` |
| 2 | auth1 | Welcome page |
| 3 | auth2 | Side drawer |
| 4 | auth3–5 | Order hub (один компонент, 3 states) |
| 5 | auth7–8 | Location map |
| 6 | auth6 | Time slot sheet |
| 7 | auth5 | Address sheet (UI only) |
| 8 | — | Wire CTA → існуючий `/menu` |

---

# Що вже є в коді (не з референсу)

Це **інший шар** — вже зроблений wireframe:

- `/menu`, `/shop`, `/loyalty`, `/orders` — функціональні, без дизайну
- `BottomNav`, `api-client`, `GuestProvider`

Add-on (auth1–8) **не реалізований** — поточний `/` робить `redirect('/menu')`.

---

# Файли документації

| Файл | Зміст |
|------|-------|
| **GUEST_PWA_SCREEN_BY_SCREEN_PLAN.md** | цей документ — план по кожному скріну |
| GUEST_PWA_SCREENS.md | модулі + gap-аналіз (технічний) |
| GUEST_PWA.md | бекенд API |
