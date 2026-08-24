# Corgi POS System Deployment Guide

This document describes how the Corgi POS system is deployed on the production server.

## Server & Domain Information

- **Server IP:** `89.167.91.113`
- **User:** `root`
- **Password:** `nrAhaTHcsC4U`
- **Domain Mappings (Nginx):**
  * **Guest App (Port 3003):** [https://app.corgicafe.es](https://app.corgicafe.es)
  * **POS Backend / Admin (Port 3004):** [https://testenv.corgicafe.es](https://testenv.corgicafe.es)

---

## Production Process Management (PM2)

Both applications run as PM2 processes under Node.js:
- **corgi-guest** (Guest App) - Executed in `/var/www/corgi_cafe/apps/guest` (Port `3003`)
- **corgi-web** (Staff POS & API Backend) - Executed in `/var/www/corgi_cafe/apps/web` (Port `3004`)

They are managed using the `/var/www/corgi_cafe/ecosystem.config.js` configuration file.

---

## How to Deploy Updates Correctly

Since the server does not pull from Git directly (there is no active `.git` repository in `/var/www/corgi_cafe` on the server), deployment is performed by synchronizing the local files and building them on the server.

### Step-by-Step Deployment Flow

#### Step 1: Synchronize local files to the server
Run the following `rsync` command from the root of your local workspace. This transfers all changed files while excluding dependencies, build caches, and environment files containing local credentials:

```bash
rsync -avz \
  --exclude 'node_modules/' \
  --exclude '.next/' \
  --exclude '.next-admin/' \
  --exclude '.next-pos/' \
  --exclude '.git/' \
  --exclude '.turbo/' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.DS_Store' \
  -e "sshpass -p 'nrAhaTHcsC4U' ssh -o StrictHostKeyChecking=no" \
  ./ root@89.167.91.113:/var/www/corgi_cafe/
```

#### Step 2: Build the applications on the server
Connect to the server via SSH and build the production bundles using Next.js / Turbo:

```bash
sshpass -p 'nrAhaTHcsC4U' ssh -o StrictHostKeyChecking=no root@89.167.91.113 \
  "cd /var/www/corgi_cafe && npm run build"
```

#### Step 3: Restart PM2 services
Reload the PM2 processes to apply the newly compiled code:

```bash
sshpass -p 'nrAhaTHcsC4U' ssh -o StrictHostKeyChecking=no root@89.167.91.113 \
  "pm2 reload corgi-web; pm2 reload corgi-guest"
```

---

## Guava Menu to Production

After syncing code, run the menu deploy script (starts Docker DB, migrates, imports 175 dishes):

```bash
export DEPLOY_SSH_PASS='your-password'
bash apps/web/scripts/deploy-guava-menu-prod.sh
```

Prod PostgreSQL runs in Docker on port **5436** (`corgi_admin` / `corgi_password`).  
Guest menu location: `loc-gotico`.

Verify:
```bash
curl "https://testenv.corgicafe.es/api/guest/menu?locationId=loc-gotico&locale=en"
```

---

## One-Line Deployment Script

You can run this combined command locally to deploy all your changes in one go:

```bash
rsync -avz --exclude 'node_modules/' --exclude '.next/' --exclude '.next-admin/' --exclude '.next-pos/' --exclude '.git/' --exclude '.turbo/' --exclude '.env' --exclude '.env.local' --exclude '.DS_Store' -e "sshpass -p 'nrAhaTHcsC4U' ssh -o StrictHostKeyChecking=no" ./ root@89.167.91.113:/var/www/corgi_cafe/ && sshpass -p 'nrAhaTHcsC4U' ssh -o StrictHostKeyChecking=no root@89.167.91.113 "cd /var/www/corgi_cafe && npm run build && pm2 reload corgi-web; pm2 reload corgi-guest"
```
