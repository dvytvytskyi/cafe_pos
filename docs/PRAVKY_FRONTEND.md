# PRAVKY — Frontend integration guide

Бекенд реалізовано в `apps/web`. Цей документ описує **що зробити на фронті** і **як підключити** до нових API.

Пов’язані файли:
- Вимоги: [PRAVKY.md](./PRAVKY.md)
- API-клієнт: `apps/web/src/lib/orders.ts`
- Маппер: `apps/web/src/lib/mappers/order.mapper.ts`

---

## 0. Перед стартом

### Міграція БД

```bash
cd apps/web
npx prisma migrate deploy
npx prisma generate
```

### Env (опційно)

```env
# Відправка фактури на email (webhook — Resend/SendGrid/власний сервіс)
RECEIPT_EMAIL_WEBHOOK_URL=https://your-mailer.example/send
```

---

## 1. Нові API endpoints

| Метод | Endpoint | Призначення |
|-------|----------|-------------|
| `POST` | `/api/orders/[id]/print` | Друк kitchen / bar / all |
| `POST` | `/api/orders/[id]/items` | Додати позиції до замовлення |
| `PATCH` | `/api/orders/[id]/items/[itemId]` | Редагувати позицію (modifiers, qty) |
| `POST` | `/api/orders/[id]/split` | Split однакової позиції між гостями |
| `POST` | `/api/orders/[id]/send-receipt` | Email фактури |
| `GET` | `/api/orders/[id]/loyalty` | Баланс points |
| `POST` | `/api/orders/[id]/loyalty` | Зарезервувати points на замовленні |
| `GET` | `/api/analytics/kitchen-bar` | Аналітика кухні/бару |
| `GET` | `/api/reports/waiter-sales` | Звіт по офіціантах |

Існуючі (оновлені):
- `POST /api/orders` — `guestCount`, `takenByStaffId`, `discountType`, staff fields
- `PUT /api/orders/[id]` — ті самі поля + `pointsToSpend`
- `POST /api/orders/[id]/pay` — `discount.type`, `cashTendered`, `closedByStaffId`

---

## 2. Готові функції клієнта (`lib/orders.ts`)

```ts
import {
  printOrderAsync,
  addOrderItemsAsync,
  updateOrderItemAsync,
  splitOrderItemAsync,
  sendOrderReceiptAsync,
  getOrderLoyaltyBalanceAsync,
  applyOrderLoyaltyPointsAsync,
  completePaymentAsync,
  calculateCashChange,
  isPrepaidDeliveryOrder,
} from '@/lib/orders';
```

---

## 3. По пунктах PRAVKY

### 1.1 Print order (kitchen + bar)

**Файли:** `OrderDetailsModal.tsx`, `OrderTerminalModal.tsx`

```ts
// Одна кнопка "Print order" — друкує кухню + бар (тільки нові позиції)
await printOrderAsync(order.id, 'all', true);

// Окремо
await printOrderAsync(order.id, 'kitchen', true);
await printOrderAsync(order.id, 'bar', true);
```

**UI:**
- Кнопка **Print order** у header деталей замовлення
- Те саме в Create Order після submit (перед/після створення)

**Налаштування:** Admin → Printers — потрібні принтери `type: kitchen` і `type: bar` для локації.

---

### 1.2 Checkout — калькулятор здачі

**Файл:** `OrderDetailsModal.tsx` → checkout flow

**Проблема:** після Cash/Card нічого не відбувається — потрібен **окремий step**.

```ts
const remaining = order.total - (order.amountPaid ?? 0);

// Cash numpad modal
const [tendered, setTendered] = useState(remaining);
const { changeGiven } = calculateCashChange(remaining, tendered);

await completePaymentAsync(order.id, {
  payments: [{ method: 'cash', amount: remaining, cashTendered: tendered }],
  closedByStaffId: currentStaffId,
  total: order.total,
});
```

**UI компонент:** `CashPaymentSheet`
- Поле «Отримано» (numpad)
- «Здача» = `changeGiven` (read-only)
- Кнопка Confirm

**Card:** окремий step без здачі, але з `closedByStaffId`.

---

### 1.3 Refund Items — stepper

**Файл:** `OrderDetailsModal.tsx` → `renderRefundSelectView`

**Бекенд вже підтримує** `{ items: [{ itemIndex, quantity }] }`.

**UI:** для кожної позиції:
```tsx
<QuantityStepper
  value={refundQty[idx]}
  min={0}
  max={item.quantity - (item.refundedQuantity ?? 0)}
  onChange={(q) => setRefundQty({ ...refundQty, [idx]: q })}
/>
```

---

### 1.4 Invoice email

**Файл:** `OrderDetailsModal.tsx` → `renderSendReceiptView`

Замінити локальний state на API:

```ts
await sendOrderReceiptAsync(order.id, email, true);
// order.receiptsSentTo оновиться на бекенді — перезавантажити order
```

---

### 1.5 Додати позицію з меню

**Файл:** `OrderDetailsModal.tsx`

```ts
await addOrderItemsAsync(order.id, [{
  menuItemId: item.id,
  name: item.name,
  price: item.price,
  quantity: 1,
  modifierSnapshot: selectedModifiers,
  soldByStaffId: currentStaffId,
}]);
await printOrderAsync(order.id, 'all', true); // тільки нові
```

**UI:** кнопка «Add item» → reuse menu picker з `OrderTerminalModal`.

---

### 1.6 Split amount / позиції

**Файл:** `OrderDetailsModal.tsx` → split flow

**Split по позиціях (вже є):** `paidItemIndexes` у `completePaymentAsync`.

**Split однакової позиції (2× однакове блюдо):**

```ts
await splitOrderItemAsync(order.id, item.id, [
  { guestIndex: 0, quantity: 1 },
  { guestIndex: 1, quantity: 1 },
]);
```

Потім checkout з `paidItemIndexes` для кожного гостя окремо.

**UI:** у split view — кнопка «Split qty» на line item з qty > 1.

---

### 1.7 Discount — сума, не тільки %

```ts
await completePaymentAsync(order.id, {
  payments: [...],
  discount: { name: 'Manager', value: 5, type: 'fixed' }, // €5
  // або { name: '10%', value: 10, type: 'percent' }
});
```

**UI:** toggle % / € (як у tips) у discount sheet.

---

### 1.8 Редагування модифікаторів

```ts
await updateOrderItemAsync(order.id, item.id, {
  modifierSnapshot: { extras: [{ id: 'sauce-b', name: 'Sauce B', price: 1.5 }] },
  price: newLinePrice,
});
```

**UI:** tap на line item → edit sheet з modifier picker (reuse POS terminal).

---

### 1.9 Dine-In — прибрати «Ready for Pick Up»

**Файл:** `lib/board-settings.ts`, `OrdersBoard.tsx`

```ts
// При sourceFilter === 'dine_in' не показувати колонку 'ready'
const columns = sourceFilter === 'dine_in'
  ? stages.filter((s) => s.id !== 'ready')
  : stages;
```

Бекенд не змінював board columns — **тільки фронт**.

---

### 1.10 Delivery — auto-paid

Бекенд: `glovo` / `ubereats` створюються з `paid: true`, `isPrepaid: true`.

**Фронт:**

```ts
if (isPrepaidDeliveryOrder(order)) {
  // Приховати: Checkout, Split, Discount, Refund
  // Показати badge "Prepaid"
}
```

---

### 1.11 Loyalty points

```ts
const { points, pointsToSpend } = await getOrderLoyaltyBalanceAsync(order.id, customerId);

await applyOrderLoyaltyPointsAsync(order.id, customerId, 500); // reserve

// При checkout points йдуть автоматично якщо pointsToSpend > 0
await completePaymentAsync(order.id, {
  payments: [{ method: 'points', amount: Math.min(500, remaining) }],
  customerId,
});
```

**UI:** секція Loyalty у checkout — slider/input points + preview discount.

---

## 4. Staff / guests (§2 PRAVKY)

### Create order — guest count + staff

```ts
await createOrderAsync({
  ...
  guestCount: 4,
  takenByStaffId: staffId,
  assignedStaffId: staffId,
});
```

### Close check — хто прийняв оплату

```ts
await completePaymentAsync(order.id, {
  ...
  closedByStaffId: staffId,
});
```

### Table assignment

```ts
// PUT /api/tables/[id] — додати assignedStaffId на фронті (існуючий PATCH tables)
```

**UI:** показувати в деталях замовлення:
- Taken by / Served by / Closed by (імена з `/api/staff`)

---

## 5. Mark item served (§2.1)

```ts
await updateOrderItemAsync(order.id, item.id, { served: true });
```

**UI:** swipe або checkbox на кожній позиції в деталях.

---

## 6. Gift Cards (§4)

**Вже є:** `/api/giftcards`, redeem у `completePaymentAsync`.

```ts
await completePaymentAsync(order.id, {
  payments: [{ method: 'giftcard', amount: 20, code: 'GC-XXXX' }],
});
```

**UI:** поле коду gift card у checkout (перевірити що вже є в modal).

---

## 7. Analytics (§5)

### Kitchen / Bar

```ts
const res = await fetch(
  `/api/analytics/kitchen-bar?locationId=default&startDate=2026-08-01&endDate=2026-08-16`
);
const data = await res.json();
// data.kitchen.slowest, data.bar.avgPrepMs, ...
```

**UI:** нова сторінка CRM `app/analytics/kitchen-bar/page.tsx` (charts).

> Timestamps `acceptedAt` / `readyAt` на items встановлюються при друку та при зміні статусу — додати на фронті виклик `updateOrderItem` з `readyAt` коли KDS позначає «Hecho».

### Waiter sales

```ts
const res = await fetch(
  `/api/reports/waiter-sales?locationId=default&startDate=...&endDate=...`
);
```

---

## 8. Рекомендований порядок імплементації на фронті

| Крок | Пункт | Складність |
|------|-------|------------|
| 1 | 1.2 Cash calculator | P0 |
| 2 | 1.10 Hide checkout for delivery | P0 |
| 3 | 1.9 Dine-in columns | P0 |
| 4 | 1.1 Print order button | P1 |
| 5 | 1.3 Refund stepper | P1 |
| 6 | 1.7 Discount € / % | P1 |
| 7 | 1.5 Add item + 1.8 Edit item | P1 |
| 8 | 1.6 Split portions | P1 |
| 9 | 1.11 Loyalty UI | P2 |
| 10 | 1.4 Send receipt | P2 |
| 11 | Staff fields UI | P2 |
| 12 | Analytics pages | P3 |

---

## 9. Типи для розширення Order (UI)

Додати в `UiOrder` / `Order`:

```ts
guestCount?: number;
takenByStaffId?: string;
servedByStaffId?: string;
closedByStaffId?: string;
assignedStaffId?: string;
isPrepaid?: boolean;
pointsToSpend?: number;
discount?: { name: string; value: number; type?: 'percent' | 'fixed'; amountDeducted: number };
items: Array<{
  id?: string;
  modifierSnapshot?: unknown;
  guestIndex?: number;
  sentToKitchen?: boolean;
  sentToBar?: boolean;
  served?: boolean;
  ...
}>;
```

Оновити `mapApiOrderToUi` коли бекенд повертає ці поля в GET orders.

---

## 10. Тести

```bash
cd apps/web
npm run test:pos   # включає test-unit-order-pravky
```

---

*Останнє оновлення: 2026-08-16*
