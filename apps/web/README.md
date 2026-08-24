# Corgi Web (API + Staff POS)

Next.js app: Guest API, admin, POS shell.

## Local dev

```bash
cd apps/web
npm run dev          # API + admin (port 3000)
npm run dev:pos      # POS shell (port 3001)
```

## Production

Deploy from monorepo root — see `../../deploy.sh`.

- API / POS: https://testenv.corgicafe.es
- Guest PWA: https://app.corgicafe.es (separate `apps/guest` process on server)
