# Locations & Teams

Location-scoped access for staff admins and team organization (General vs per-locale).

## Access model

| User type | Locations API | Orders API | Teams UI |
|-----------|---------------|------------|----------|
| Super Admin | All | `all` allowed | General + all locale tabs, full CRUD |
| Location Admin | Assigned only | Scoped to assigned | General (read-only) + own locale tabs |
| Staff | Assigned only | Single/default location | No team settings |

## General vs locale teams

- **General team**: `locationIds = []` — HQ, accounting, regional managers. Treated as **all locations** in `getAccessibleLocationIds`.
- **Locale team**: `locationIds` includes one or more location ids.

Determined by Prisma `User ↔ Location` M2M — no `teamType` column in v1.

## Session

JWT payload includes `locationIds: string[]` via `sessionPayloadFromUser`.

## API rules

| Endpoint | Guard |
|----------|-------|
| `GET /api/orders` | `resolveScopedLocationId` — non-super cannot use `all` |
| `GET /api/locations` | Filter to accessible locations when session present |
| `GET/POST /api/staff` | Filter list; validate `locationIds` on create |
| `GET /api/locations/[id]/layout` | `assertLocationAccess` |

## Invite flow (Teams UI)

1. Choose **General** or **Specific location(s)**
2. Email + Role + Access Duration (UI; backend stub for expiry v1)
3. Permissions matrix (from role.permissions JSON)
4. Yellow **Send Invitation** CTA creates employee via `POST /api/staff`

## Tests

```bash
node --experimental-strip-types src/lib/test-unit-location-scope.ts
```
