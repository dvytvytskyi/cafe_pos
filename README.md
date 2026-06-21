# Corgi POS System

Welcome to the Corgi POS System repository! This is a modular, scalable POS application tailored for the modern restaurant industry, featuring seamless PWA experiences for staff, QR-code menus for clients, and strict integration readiness for Spanish tax authorities (VERI*FACTU).

## Project Structure

```text
/corgi_cafe
├── docs/                 # Project documentation (Scope, Architecture, etc.)
│   ├── Corgi_Project_Scope.md
│   ├── Corgi_Project_Scope.pdf
│   └── VERIFACTU_Architecturepdf.pdf
└── README.md             # This file
```

## Key Modules

1. **Admin Panel (Web)**
   - Dashboard & Analytics (Revenue, Table occupancy, Popular dishes)
   - Order & Table Management (Interactive restaurant map)
   - System Settings (Menus, Tables, Device & Staff management)

2. **Staff Interface (PWA)**
   - Tablet & Phone versions for waiters and managers.
   - Quick order taking and hall management.
   - Routing orders to kitchen printers (no KDS needed).

3. **Client Side (E-Menu)**
   - QR-code based menu access.
   - Multi-language support.
   - Real-time stock (stop-lists) and price updates.

4. **VERI*FACTU Compliance Engine (Spain - AEAT)**
   - **Append-only Ledger Database:** No hard deletes or updates; modifications are strictly compensatory.
   - **Audit Trail & Cryptographic Chaining:** Full tracing of cashier actions and cryptographic hashing of consecutive receipts.
   - **Background Synchronization (Message Queues):** Preparing for asynchronous XML dispatch to AEAT API, utilizing digital certificates and dynamic QR-codes on receipts.

5. **Additional Features**
   - **Loyalty Program:** Discounts, Promo Codes, Bonuses (Cashback), and Happy Hours.
   - **CRM:** Guest database and visit histories.
   - **Merch Inventory:** Non-food goods tracking and automatic checkout expensing.

## Getting Started

*(Future setup instructions, installation commands, and environment variables will go here).*

---

*This repository relies on structured documentation in `docs/` and Antigravity Knowledge Items to maintain cross-session context.*
