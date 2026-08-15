# Mobile POS Shell (Capacitor)

Native tablet app shell: **Orders** + **Tables** only. The full admin UI stays unchanged on web.

## Activation

| Environment | How |
|-------------|-----|
| Capacitor (iOS/Android) | Automatic via `Capacitor.isNativePlatform()` |
| Local web preview | `NEXT_PUBLIC_POS_SHELL=true npm run dev` |

Offline mode is separate: `NEXT_PUBLIC_POS_OFFLINE=true` (or native auto).

## What changes in shell mode

- `DashboardLayout` renders `PosShellLayout` instead of sidebar + header
- Routes outside `/orders` redirect to `/orders?tab=delivery`
- Bottom nav: **Orders** ↔ **Tables** (replaces inline header toggle)
- Compact header: logo, staff name, sync status, logout
- `PosShellBootstrap` warms offline cache on mount

## Modules

| File | Role |
|------|------|
| `lib/pos-shell.ts` | Mode detection + allowed paths |
| `lib/use-pos-shell-mode.ts` | React hook (SSR-safe) |
| `components/layout/PosShellLayout.tsx` | Shell chrome |
| `components/layout/PosShellGuard.tsx` | Route guard |
| `components/layout/PosBottomNav.tsx` | Tab navigation |
| `components/layout/PosSyncStatus.tsx` | Online/offline + outbox count |

## Build for device

```bash
cd apps/web
EXPORT_STATIC=true npm run build
npx cap sync ios
```

Capacitor config: `capacitor.config.ts` (`appId: com.corgicafe.pos`).

## Tests

```bash
npm run test:pos-shell
```
