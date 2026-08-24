# Guest PWA (клієнтське меню)

Окремий **PWA для гостей** ресторану: меню зі столу (QR), магазин мерчу, лояльність, замовлення.  
**Staff POS** (`apps/web`) і **Guest PWA** (`apps/guest`) — різні додатки; спільний бекенд на `apps/web`.

---

## Що зроблено

### ✅ Бекенд (повністю)

| Область | Статус | Де |
|---------|--------|-----|
| Guest REST API | ✅ 17 routes | `apps/web/src/app/api/guest/*` |
| Сервіси | ✅ | `guest-auth`, `guest-menu`, `guest-order`, `guest-merch`, `guest-otp` |
| Prisma / БД | ✅ | migration `20260810120000_guest_pwa` |
| Shared types | ✅ | `packages/contracts` (`@corgi/contracts`) |
| CORS + cookies | ✅ | `lib/guest-api.ts`, `GUEST_APP_ORIGINS` |
| Rate limit OTP | ✅ | `lib/guest-rate-limit.ts` |
| Тести | ✅ | `npm run test:guest`, `npm run test:guest:api` |
| Loyalty на staff pay | ✅ | `pointsToSpend` auto-deduct у `order.repository` |

> Див. також: [GUEST_PWA_SCREENS.md](./GUEST_PWA_SCREENS.md) — референс-скріни (auth1–auth8), модулі UI, gap-аналіз фронту.

### ⚠️ Фронт (wireframe, без дизайну)

| Область | Статус | Де |
|---------|--------|-----|
| Next.js app | ⚠️ pages є, без UI дизайну | `apps/guest/` |
| `layout.tsx`, `page.tsx`, 4 таби | ⚠️ wireframe | `apps/guest/src/app/` |

### ❌ Не робили / legacy

- Повний UI дизайн guest app
- SMS OTP у production (dev: код у відповіді / лог)
- Старий `/emenu` у `apps/web` — **окремий legacy flow**, не Guest API

---

## API endpoints

База: `http://localhost:3000` (або prod URL staff backend).

### Публічні (без логіну)

| Method | Path | Опис |
|--------|------|------|
| GET | `/api/guest/bootstrap?locationId=&table=&locale=` | Локація, стіл, фічі, брендинг |
| GET | `/api/guest/menu?locationId=&locale=` | Категорії + страви + модифікатори + алергени |
| GET | `/api/guest/menu/[id]?locationId=&locale=` | Одна страва |
| GET | `/api/guest/merch?locationId=` | Каталог мерчу (`guestVisible=true`) |
| GET | `/api/guest/table/resolve?code=` | QR → tableId + locationId |
| POST | `/api/guest/auth/otp/request` | `{ phone }` → SMS (dev: `devCode`) |
| POST | `/api/guest/auth/otp/verify` | `{ phone, code }` → session cookie |
| POST | `/api/guest/auth/register` | Реєстрація після OTP |
| POST | `/api/guest/orders` | Створити food order (guest / dine-in) |

### З сесією (cookie `guest_session`)

| Method | Path | Опис |
|--------|------|------|
| GET | `/api/guest/me` | Профіль |
| PUT | `/api/guest/me` | Оновити name / allergyNotes |
| GET | `/api/guest/me/loyalty` | Бали, tier, QR |
| GET | `/api/guest/me/loyalty/transactions` | Історія балів |
| GET | `/api/guest/me/qr` | QR для scan на касі |
| GET | `/api/guest/orders` | Мої замовлення |
| GET | `/api/guest/orders/[id]` | Деталі замовлення |
| POST | `/api/guest/merch/orders` | Замовлення мерчу |
| POST | `/api/guest/orders/[id]/confirm-merch` | Підтвердити pickup мерчу |
| POST | `/api/guest/auth/logout` | Вийти |

---

## База даних (migration `guest_pwa`)

- `MenuItem`: `tags`, `imageUrl`, `isVisible`, `locationIds`
- `MenuItemTranslation`: i18n (en, es, ca, uk)
- `OrderItem`: `itemType` (food|merch), `menuItemId`, `merchSkuId`, `modifierSnapshot`
- `MerchInventory`: `guestVisible`, `guestImageUrl`, `guestDescription`
- `Customer`: `phoneVerified`, `guestRegisteredAt`
- `GuestSession`, `GuestOtpChallenge`
- `Order.pointsToSpend` — списання балів при оплаті на staff POS

---

## Архітектура

```
┌─────────────────────┐         CORS + cookies          ┌──────────────────────┐
│  apps/guest (PWA)   │  ─────────────────────────────► │  apps/web (backend)  │
│  :3003 (рекоменд.)  │         /api/guest/*            │  :3000               │
└─────────────────────┘                                 └──────────────────────┘
        │                                                          │
        │  @corgi/contracts (shared TS types)                      │
        └──────────────────────────────────────────────────────────┘
```

**Важливо:** Guest app і Staff POS — різні порти. Не плутати з `NEXT_PUBLIC_POS_SHELL` (staff tablet).

---

## Як має бути на фронті

### 1. Запуск dev

```bash
# Terminal 1 — backend (якщо ще не працює)
cd apps/web && npm run dev

# Terminal 2 — guest PWA (інший порт!)
cd apps/guest
NEXT_PUBLIC_API_URL=http://localhost:3000 npm run dev -- -p 3003
```

У `apps/web/.env`:
```env
GUEST_APP_ORIGINS=http://localhost:3003,http://127.0.0.1:3003
```

### 2. Entry point (QR зі столу)

URL гостя:
```
https://guest.corgicafe.com/?locationId=default&table=T-12
```
або resolve через QR:
```
GET /api/guest/table/resolve?code=<qr-payload>
```

### 3. Сторінки (4 таби — BottomNav вже є)

| Route | Tab | Що робить |
|-------|-----|-----------|
| `/menu` | Menu | `getMenu()` → категорії, картки страв, модифікатори → `foodCart` |
| `/shop` | Shop | `getMerch()` → каталог → `merchCart` |
| `/loyalty` | Loyalty | OTP login → `getLoyalty()`, QR, tier progress |
| `/orders` | Orders | `getOrders()`, статус, confirm merch pickup |

### 4. Підключення (вже готово в scaffold)

```tsx
// app/layout.tsx (треба створити)
import { GuestProvider } from '@/lib/guest-context';
import { BottomNav } from '@/components/BottomNav';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <GuestProvider initialLocation="default" initialTable={tableFromSearchParams}>
          {children}
          <BottomNav />
        </GuestProvider>
      </body>
    </html>
  );
}
```

API виклики — через `apps/guest/src/lib/api-client.ts`:
- `credentials: 'include'` для session cookie
- `NEXT_PUBLIC_API_URL` → staff backend

### 5. Checkout flow (food)

1. Кошик з `GuestContext.foodCart`
2. (опційно) логін → `pointsToSpend` у `createOrder`
3. `POST /api/guest/orders` → order з `source: guest_emenu`
4. Staff бачить на Orders board; оплата на POS → бали нараховуються / списуються

### 6. Merch flow

1. `merchCart` → `POST /api/guest/merch/orders`
2. Pickup confirm → `POST /api/guest/orders/[id]/confirm-merch`

### 7. PWA

- `public/manifest.webmanifest` — installable
- `public/sw.js` — offline shell (базовий)
- `GuestContext` — `deferredInstall` для «Add to Home Screen»

---

## Тести

```bash
cd apps/web
npm run test:guest          # unit + integration
npm run test:guest:api      # HTTP smoke (потрібен running server + DB)
```

---

## Що робити далі (frontend)

1. Створити `apps/guest/src/app/layout.tsx` + `page.tsx` (redirect → `/menu`)
2. Сторінки: `menu/`, `shop/`, `loyalty/`, `orders/`
3. Компоненти: `MenuCard`, `ItemModal` (modifiers), `CartSheet`, `OtpLogin`, `LoyaltyCard`
4. Підключити `GuestProvider` + search params `locationId`, `table`
5. Стилі з `globals.css` + brand tokens (corgi green / beige — як у BottomNav)
6. Production: `./deploy.sh` з кореня репо (Guest + API на Hetzner, `GUEST_APP_ORIGINS` = `https://app.corgicafe.es`)

---

## Пов’язані файли

| Файл | Роль |
|------|------|
| `packages/contracts/src/index.ts` | TS контракти guest ↔ backend |
| `apps/web/src/lib/guest-validation.ts` | Валідація payload |
| `apps/web/src/lib/guest-session.ts` | Cookie session |
| `apps/web/src/services/guest-*.service.ts` | Бізнес-логіка |
| `apps/guest/src/lib/api-client.ts` | HTTP клієнт для фронту |
