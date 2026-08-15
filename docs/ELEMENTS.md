# Corgi POS — UI Elements Map

> **Структура проєкту** — усі сторінки, підекрани, модалки та ключові компоненти.  
> Не normative spec → див. [`UI_STANDARDS.md`](./UI_STANDARDS.md).  
> Аудит відповідності → [`UI_CONFORMANCE_AUDIT.md`](./UI_CONFORMANCE_AUDIT.md).

**App:** `apps/web` (Next.js App Router)  
**Shell:** `DashboardLayout` → `AuthGate` → `Header` + `Sidebar` + `{page}`

---

## 1. Архітектура

```
app/layout.tsx                    # root html/body, globals.css
└── app/**/page.tsx               # routes (16)
    ├── DashboardLayout           # admin shell (більшість routes)
    │   ├── AuthGate              # session check → PinLoginScreen
    │   ├── Header                # search, notifications, CRM nav pills, profile
    │   ├── Sidebar               # main nav + locale switcher
    │   └── main {children}
    └── standalone pages          # emenu, dev-components, pos redirect
```

### Layout variants

| Variant | Routes | Shell file |
|---------|--------|------------|
| **Admin shell** | `/`, `/orders`, `/crm`, … (14 routes) | `components/layout/DashboardLayout.tsx` |
| **Guest** | `/emenu` | власний layout у `app/emenu/page.tsx` |
| **Dev playground** | `/dev-components` | копія shell без AuthGate |
| **Redirect** | `/pos` | → `/orders?tab=tables` |

---

## 2. Сторінки (routes)

### 2.1 Навігація Sidebar

| Route | Label | Page file | Root component |
|-------|-------|-----------|----------------|
| `/` | Dashboard | `app/page.tsx` | inline widgets |
| `/orders` | Orders | `app/orders/page.tsx` | tab switcher |
| `/crm` | CRM & Loyalty | `app/crm/page.tsx` | inline CRM UI |
| `/shift` | Cash Register | `app/shift/page.tsx` | inline shift UI |
| `/history` | Order History | `app/history/page.tsx` | inline history UI |
| `/reports` | Reports | `app/reports/page.tsx` | inline reports UI |
| `/menu` | Menu | `app/menu/page.tsx` | `MenusView` |
| `/inventory` | Inventory | `app/inventory/page.tsx` | `InventoryDashboard` |
| `/operations` | Operations | `app/operations/page.tsx` | `OperationsDashboard` |
| `/staff` | Staff & HR | `app/staff/page.tsx` | inline staff table |
| `/settings` | Settings | `app/settings/page.tsx` | `SettingsView` |

**Bottom sidebar (без route):** Help — кнопка без `href`.

**Staff sub-routes** (лінки з `/staff`, не в main sidebar):

| Route | Label | Page file |
|-------|-------|-----------|
| `/staff/schedule` | Schedules | `app/staff/schedule/page.tsx` |
| `/staff/time-tracking` | Time Tracking | `app/staff/time-tracking/page.tsx` |

**Інші routes:**

| Route | Призначення | Page file |
|-------|-------------|-----------|
| `/emenu` | Guest self-order (QR) | `app/emenu/page.tsx` |
| `/pos` | Redirect | `app/pos/page.tsx` |
| `/dev-components` | UI playground | `app/dev-components/page.tsx` |

---

## 3. Сторінки — детальна структура

### `/` Dashboard

**File:** `app/page.tsx`

| Блок | Component | Опис |
|------|-----------|------|
| Filters | `dashboard/GlobalFilters` | date, compare, payment method |
| Revenue widget | inline + `SalesCharts/RevenueLineChart` | KPI + chart, total/by location |
| Payment gauge | `SalesCharts/PaymentGaugeChart` | |
| Orders KPI | inline | count, growth |
| Avg ticket KPI | inline | |
| Signups KPI | inline | |
| Active tables | `dashboard/ActiveTablesCard` | |
| Hourly sales | `dashboard/HourlySalesWidget` | |
| Locations map/list | `dashboard/LocationsLeaderboard` | |
| Shift roster | `dashboard/DashboardWidgets/ShiftRoster` | |
| Recent reviews | `DashboardWidgets/RecentReviews` | |
| Category breakdown | `DashboardWidgets/CategoryBreakdown` | |

---

### `/menu` Menu

**File:** `app/menu/page.tsx` → `ui/MenusView.tsx`

| View (`mainView`) | Опис |
|-------------------|------|
| `dishes` | Список страв по категоріях + category sidebar |
| `modifiers` | Global modifiers CRUD |
| `allergens` | Global allergens |
| `archived` | Archived dishes |

**Modals:** `DishModal`, `ModifiersManagerModal`, confirm toggle (inline)

---

### `/orders` Orders

**File:** `app/orders/page.tsx`

| Tab (`?tab=`) | Component | Опис |
|---------------|-----------|------|
| `delivery` (default) | `operations/OrdersBoard` | Kanban active orders |
| `tables` | `ui/TablesView` (readonly) | Floor plan + table orders |

**Modals (shared):** `OrderTerminalModal`, `OrderDetailsModal`, `BoardSettingsModal`, cancel confirm

---

### `/operations` Operations

**File:** `app/operations/page.tsx` → `operations/OperationsDashboard.tsx`

| Tab | Component | Опис |
|-----|-----------|------|
| `tasks` (default) | `operations/TaskManager` | Kanban tasks |
| `checklists` (`?tab=checklists`) | `operations/DailyChecklists` | Daily SOP matrix |

**DailyChecklists modes:** normal shift view · **Setup mode** (purple admin matrix)

**Modals:** `NewTaskModal`, `BoardSettingsModal`, `PhotoProofUpload`

---

### `/history` Order History

**File:** `app/history/page.tsx`

| Блок | Опис |
|------|------|
| Header + analytics toggle | KPI: total sales, avg ticket, taxes, cancel rate |
| Channel / payment breakdown | bars |
| Filters | search, status, channel segmented |
| Orders table | expandable rows, items, payment info |
| Receipt preview | inline modal |
| Order inspect | `OrderDetailsModal` |

---

### `/reports` Reports

**File:** `app/reports/page.tsx`

| Блок | Component |
|------|-----------|
| Filters + export | `GlobalFilters`, CSV export, location dropdown |
| Revenue comparison | chart ↔ table toggle |
| Chart | `SalesCharts/RevenueLineChart` |
| Table | `reports/RevenueTable` |
| Dish performance | `reports/DishPerformanceTables` |
| Staff performance | `reports/StaffPerformanceTables` |
| Financial summaries | `reports/FinancialSummaries` |

---

### `/crm` Loyalty & CRM

**File:** `app/crm/page.tsx`  
**Tabs:** `?tab=` (Header pills на `/crm`)

| Tab | Реалізовано | Опис |
|-----|-------------|------|
| `overview` | ✅ | Guest list + detail panel |
| `activity` | ✅ | Activity log |
| `program` | ✅ | Loyalty tiers overview |
| `manage` | ❌ | pill в Header, контент не реалізовано |
| `account` | ❌ | pill в Header, контент не реалізовано |
| `reports` | ❌ | pill в Header, контент не реалізовано |

**Overview filters:** all · vip · inactive · allergies

**Inline modals:** Add guest · Edit guest · Adjust points · Delete confirm · Import guests

---

### `/shift` Cash Register

**File:** `app/shift/page.tsx`

| Tab | Опис |
|-----|------|
| `current` | Open shift · float · adjustments · close shift |
| `history` | Past shifts table + expandable adjustments |

---

### `/staff` Staff & HR

**File:** `app/staff/page.tsx`

| Filter tab | Опис |
|------------|------|
| All · Floor · Kitchen · Bar | Segmented filter |
| Search + archived toggle | |
| Employee table | export CSV |
| Links | → schedule, time-tracking |

**Modal:** `EmployeeModal` (create/edit)

---

### `/staff/schedule` Schedules

**File:** `app/staff/schedule/page.tsx`

| Блок | Опис |
|------|------|
| Week navigator | prev/next week |
| Employee cards | per-employee shift grid |
| Save | bulk schedule API |

---

### `/staff/time-tracking` Time Tracking

**File:** `app/staff/time-tracking/page.tsx`

| Блок | Опис |
|------|------|
| KPI row | active, on shift, pending, finished, hours today |
| Time entries table | clock in/out actions |

---

### `/inventory` Inventory

**File:** `app/inventory/page.tsx` → `inventory/InventoryDashboard.tsx`

| Tab | Component |
|-----|-----------|
| `stock` | `inventory/StockTable` |
| `logistics` | `inventory/LogisticsTransfers` |

**Modals:** `AddItemModal`, `NewTransferModal`, `TransferDetailsModal`

---

### `/settings` Settings

**File:** `app/settings/page.tsx` → `ui/SettingsView.tsx`

Див. **§4 Settings tree**.

---

### `/emenu` Guest eMenu

**File:** `app/emenu/page.tsx` (no DashboardLayout)

| Блок | Опис |
|------|------|
| Welcome overlay | first visit modal |
| Category nav + search | |
| Allergen filter panel | |
| Dish list | |
| Dish options modal | milk, extra shot, comment |
| Cart bar + cart sheet | tip, guest link, checkout |
| Success state | order confirmed |

**Query:** `?table=` table id from QR

---

### `/pos` · `/dev-components`

| Route | Структура |
|-------|-----------|
| `/pos` | Redirect only |
| `/dev-components` | Header + Sidebar + playground panel |

---

## 4. Settings — повне дерево

**Shell:** `ui/SettingsView.tsx` (left nav + content area)

### ACCOUNT

| Menu id | Label | Component / content |
|---------|-------|---------------------|
| `profile` | My Profile | `settings/ProfileSettingsPanel` |
| `general` | General | `settings/GeneralNotificationsPanel` + `settings/PosSettingsPanel` |
| `audit` | Audit Trail | `settings/AuditPanel` |
| `backups` | Backups | `settings/BackupsPanel` |

### WORKSPACE / TEAM

| Menu id | Label | Component |
|---------|-------|-----------|
| `team` | Team & Roles | `settings/TeamSettingsPanel` |

### CAFE / POS

| Menu id | Label | Component / content |
|---------|-------|---------------------|
| `tables` | Tables & QR Codes | `ui/TablesView` (edit mode) |
| `devices` | Devices & Printers | `settings/PrintersPanel` |
| `receipts` | Receipts & Taxes | inline receipt layout + `settings/TaxesPanel` |
| `discounts` | Discounts & Promos | sub-tabs (inline у SettingsView) |

**Discounts sub-tabs (`discountsSubTab`):**

| Sub-tab | Content |
|---------|---------|
| `presets` | Global discount presets CRUD |
| `promotions` | Happy hour promos CRUD |
| `giftcards` | Gift cards issue + table |
| `loyalty` | Tier cashback rates + thresholds |

### INTEGRATIONS

| Menu id | Label | Component |
|---------|-------|-----------|
| `reputation` | Reputation & Reviews | `ui/ReputationView` |

**Settings modals:** unsaved tables confirm (SettingsView) · reset password (TeamSettingsPanel) · printer form (PrintersPanel)

---

## 5. Модалки — повний каталог

### 5.1 Типи (з UI_STANDARDS §9)

| Type | Size pattern | Приклади |
|------|--------------|----------|
| **A** Confirm | `max-w-sm` | cancel order, delete room, unsaved changes |
| **B** Form | `max-w-md` … `max-w-2xl` | BoardSettings, AddItem, Employee |
| **C** Editor | `max-w-5xl/6xl h-[85vh]` | DishModal, ModifiersManager |
| **D** POS | `max-w-6xl h-[90vh]` | OrderTerminalModal |
| **E** Drawer | right panel `max-w-[500–600px]` | OrderDetailsModal, NewTaskModal |

### 5.2 Modal components (файли)

| ID | File | Type | Відкривається з |
|----|------|------|-----------------|
| M01 | `ui/Modal.tsx` | B base | *(не використовується в коді)* |
| M02 | `ui/DishModal.tsx` | C | Menu → MenusView |
| M03 | `ui/ModifiersManagerModal.tsx` | C | Menu → MenusView |
| M04 | `pos/OrderTerminalModal.tsx` | D | OrdersBoard, TablesView |
| M05 | `operations/OrderDetailsModal.tsx` | E | OrdersBoard, TablesView, History |
| M06 | `operations/NewTaskModal.tsx` | E | TaskManager |
| M07 | `operations/BoardSettingsModal.tsx` | B | OrdersBoard, TaskManager |
| M08 | `operations/EmployeeModal.tsx` | B | Staff page |
| M09 | `inventory/AddItemModal.tsx` | B | Inventory → StockTable |
| M10 | `inventory/NewTransferModal.tsx` | B | Inventory → Logistics |
| M11 | `inventory/TransferDetailsModal.tsx` | B | Inventory → Logistics |
| M12 | `ui/SearchModal.tsx` | — | Header search |
| M13 | `operations/PhotoProofUpload.tsx` | B | DailyChecklists |

### 5.3 OrderDetailsModal — внутрішні views

Multi-step drawer (`view` state):

`default` · `checkout` · `split_bill` · `split_amount` · `split_ways_list` · `split_dishes` · `checkout_split_dishes` · `discount` · `tip` · `send_receipt` · `cancel_order_confirm` · `free_table_confirm` · `refund_select` · `refund_confirm` · `factura_form` · `factura_a4`

### 5.4 Inline modals (без окремого файлу)

| File | Modal | Type |
|------|-------|------|
| `MenusView.tsx` | Dish active/inactive confirm | A |
| `OrdersBoard.tsx` | Cancel order | A |
| `OrdersBoard.tsx` | POS preload overlay | — |
| `TablesView.tsx` | Table QR eMenu | B |
| `TablesView.tsx` | Delete room | A |
| `history/page.tsx` | Receipt preview | B |
| `crm/page.tsx` | Add guest | B |
| `crm/page.tsx` | Edit guest | B |
| `crm/page.tsx` | Adjust loyalty points | B |
| `crm/page.tsx` | Delete guest confirm | A |
| `crm/page.tsx` | Import guests | B |
| `emenu/page.tsx` | Welcome | A |
| `emenu/page.tsx` | Dish options | B |
| `emenu/page.tsx` | Cart summary | B |
| `SettingsView.tsx` | Unsaved table layout | A |
| `TeamSettingsPanel.tsx` | Reset password | A |
| `PrintersPanel.tsx` | Add/edit printer | B |

### 5.5 Overlays (не modals)

| Component | File | Trigger |
|-----------|------|---------|
| Pin login | `auth/PinLoginScreen.tsx` | AuthGate (no session) |
| Auth loading | `auth/AuthGate.tsx` | session check |
| Notifications | `ui/NotificationsPopover.tsx` | Header bell |
| Search | `ui/SearchModal.tsx` | Header search |
| Dropdown dismiss | various | `fixed inset-0 z-10` click-away |

---

## 6. UI primitives & utilities

### 6.1 Base components (`components/ui/`)

| Component | File | Статус |
|-----------|------|--------|
| Button | `ui/Button.tsx` | primitive (variants: primary, secondary, danger, ghost) |
| Input | `ui/Input.tsx` | primitive |
| Label | `ui/Label.tsx` | primitive |
| Modal | `ui/Modal.tsx` | base modal (unused) |
| DatePicker | `ui/DatePicker.tsx` | |
| DateTimePicker | `ui/DateTimePicker.tsx` | |
| DateRangePicker | `ui/DateRangePicker.tsx` | |
| ClientDateTime | `ui/ClientDateTime.tsx` | SSR-safe date display |

### 6.2 CSS utilities (`app/globals.css`)

| Utility | Purpose |
|---------|---------|
| `input-corgi` | canonical text input |
| `label-corgi` | form label |
| `label-hint` | hint text |
| `btn-primary-corgi` | primary button |
| `btn-secondary-corgi` | secondary button |

### 6.3 Theme tokens (`globals.css` `@theme`)

`corgi` · `ui-beige` · `beige` · `brown` · standard gray scale

---

## 7. Components by domain

### Layout & chrome

| Component | Path |
|-----------|------|
| DashboardLayout | `layout/DashboardLayout.tsx` |
| Sidebar | `ui/Sidebar.tsx` |
| Header | `ui/Header.tsx` |
| AuthGate | `auth/AuthGate.tsx` |
| PinLoginScreen | `auth/PinLoginScreen.tsx` |

### Dashboard

| Component | Path |
|-----------|------|
| GlobalFilters | `dashboard/GlobalFilters.tsx` |
| AnchoredDropdown | `dashboard/AnchoredDropdown.tsx` |
| SalesCharts | `dashboard/SalesCharts.tsx` |
| HourlySalesWidget | `dashboard/HourlySalesWidget.tsx` |
| ActiveTablesCard | `dashboard/ActiveTablesCard.tsx` |
| LocationsLeaderboard | `dashboard/LocationsLeaderboard.tsx` |
| DashboardWidgets | `dashboard/DashboardWidgets.tsx` |

### Operations

| Component | Path |
|-----------|------|
| OperationsDashboard | `operations/OperationsDashboard.tsx` |
| OrdersBoard | `operations/OrdersBoard.tsx` |
| TaskManager | `operations/TaskManager.tsx` |
| DailyChecklists | `operations/DailyChecklists.tsx` |
| OperationsKpiBar | `operations/OperationsKpiBar.tsx` *(orphan — не підключений)* |

### Menu & floor

| Component | Path |
|-----------|------|
| MenusView | `ui/MenusView.tsx` |
| TablesView | `ui/TablesView.tsx` |
| DishModal | `ui/DishModal.tsx` |
| ModifiersManagerModal | `ui/ModifiersManagerModal.tsx` |
| ReputationView | `ui/ReputationView.tsx` |

### POS

| Component | Path |
|-----------|------|
| OrderTerminalModal | `pos/OrderTerminalModal.tsx` |
| OrderDetailsModal | `operations/OrderDetailsModal.tsx` |

### Inventory

| Component | Path |
|-----------|------|
| InventoryDashboard | `inventory/InventoryDashboard.tsx` |
| StockTable | `inventory/StockTable.tsx` |
| LogisticsTransfers | `inventory/LogisticsTransfers.tsx` |

### Reports

| Component | Path |
|-----------|------|
| RevenueTable | `reports/RevenueTable.tsx` |
| DishPerformanceTables | `reports/DishPerformanceTables.tsx` |
| StaffPerformanceTables | `reports/StaffPerformanceTables.tsx` |
| FinancialSummaries | `reports/FinancialSummaries.tsx` |

### Settings panels

| Component | Path |
|-----------|------|
| ProfileSettingsPanel | `settings/ProfileSettingsPanel.tsx` |
| GeneralNotificationsPanel | `settings/GeneralNotificationsPanel.tsx` |
| PosSettingsPanel | `settings/PosSettingsPanel.tsx` |
| TeamSettingsPanel | `settings/TeamSettingsPanel.tsx` |
| PrintersPanel | `settings/PrintersPanel.tsx` |
| TaxesPanel | `settings/TaxesPanel.tsx` |
| AuditPanel | `settings/AuditPanel.tsx` |
| BackupsPanel | `settings/BackupsPanel.tsx` |

---

## 8. File tree (UI only)

```
apps/web/src/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx                          # /
│   ├── menu/page.tsx
│   ├── orders/page.tsx
│   ├── operations/page.tsx
│   ├── history/page.tsx
│   ├── reports/page.tsx
│   ├── crm/page.tsx
│   ├── shift/page.tsx
│   ├── settings/page.tsx
│   ├── inventory/page.tsx
│   ├── staff/
│   │   ├── page.tsx
│   │   ├── schedule/page.tsx
│   │   └── time-tracking/page.tsx
│   ├── emenu/page.tsx
│   ├── pos/page.tsx
│   └── dev-components/page.tsx
│
└── components/
    ├── layout/DashboardLayout.tsx
    ├── auth/AuthGate.tsx, PinLoginScreen.tsx
    ├── ui/          # shell, menu, tables, modals, primitives
    ├── dashboard/   # charts, filters, widgets
    ├── operations/  # orders board, tasks, checklists, modals
    ├── pos/         # OrderTerminalModal
    ├── inventory/   # stock, logistics, modals
    ├── reports/     # report tables
    └── settings/    # settings panels
```

---

## 9. Швидкий підрахунок

| Категорія | Кількість |
|-----------|-----------|
| Routes (`page.tsx`) | **16** |
| Sidebar nav items | **10** + Settings |
| Settings menu items | **10** |
| Settings discount sub-tabs | **4** |
| Menu views | **4** |
| Orders tabs | **2** |
| Operations tabs | **2** |
| Inventory tabs | **2** |
| CRM tabs (implemented) | **3** (+3 placeholder in Header) |
| Modal component files | **13** |
| Inline modals | **~17** |
| Settings panels | **8** |
| UI component files | **57** |

---

## 10. Related docs

| Doc | Purpose |
|-----|---------|
| [`UI_STANDARDS.md`](./UI_STANDARDS.md) | Як **має** виглядати UI |
| [`UI_CONFORMANCE_AUDIT.md`](./UI_CONFORMANCE_AUDIT.md) | Що **не відповідає** spec |
