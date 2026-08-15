# POS Offline (Orders + Tables)

Staff POS offline-first layer for native Capacitor builds and dev (`NEXT_PUBLIC_POS_OFFLINE=true`).

## Architecture

| Layer | Module | Purpose |
|-------|--------|---------|
| IndexedDB v3 | `pos-offline-db.ts` | Snapshots + outbox + session |
| Orders facade | `orders-offline.ts` | Optimistic order CRUD + pay queue |
| Tables facade | `tables-offline.ts` | Layout cache + table status queue |
| Sync | `pos-offline-sync.ts` | Bootstrap, flush outbox, network listener |

`orders.ts` and `tables.ts` delegate to offline facades when offline mode is active — **no UI component changes required**.

## IndexedDB stores

- `active_orders` — last known active orders per location (+ `syncPending`)
- `outbox` — mutations: create, update, status, pay, table_status
- `table_layouts` — room/table layout per location
- `menu_snapshot` — menu categories for POS modal
- `staff_session` — cached session for offline resume (AuthGate)
- `sync_meta` — bootstrap/flush timestamps

## Payment offline

Cash/card payments are queued as `order_pay` outbox entries. Locally the order is marked `paid: true` with `syncPending`. Flush calls `POST /api/orders/[id]/pay`.

## Session resume

`AuthGate` caches session to IDB on successful `/api/auth/session`. When offline and cookie expired, cached session allows read-only POS resume.

## QA checklist (iPad)

1. Login online → open Orders → verify bootstrap
2. Enable airplane mode → create order → appears locally
3. Pay order offline → shows paid + pending sync
4. Restore network → outbox flushes, server reconciles
5. Kill app → reopen offline → session banner + cached orders/layout

## Tests

```bash
npm run test:pos-offline
```
