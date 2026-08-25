/**
 * Capabilities Catalog (Single Source of Truth)
 * Derived from docs/info/pages.md & full system module specifications.
 */

export interface CapabilityDefinition {
  key: string;
  label: string;
  module: string;
  group: string;
  description: string;
  implies?: string[]; // Capabilities implied by having this capability
}

export interface PermissionGroup {
  id: string;
  title: string;
  capabilities: CapabilityDefinition[];
}

export const PERMISSIONS_CATALOG: PermissionGroup[] = [
  {
    id: 'orders',
    title: 'POS & Orders',
    capabilities: [
      {
        key: 'orders.view',
        label: 'View Live Orders & Order Board',
        module: 'orders',
        group: 'POS & Orders',
        description: 'Access live order board, delivery, pickup, and order statuses.',
      },
      {
        key: 'orders.tables',
        label: 'View Floor Plan & Tables',
        module: 'orders',
        group: 'POS & Orders',
        description: 'Access interactive floor plan and live table availability.',
        implies: ['orders.view'],
      },
      {
        key: 'orders.create',
        label: 'Take New Orders & Build Items',
        module: 'orders',
        group: 'POS & Orders',
        description: 'Create walk-in, table, or takeaway orders in terminal.',
        implies: ['orders.view'],
      },
      {
        key: 'orders.pay',
        label: 'Accept Payments & Checkout',
        module: 'orders',
        group: 'POS & Orders',
        description: 'Process cash, card, and gift card payment checkout.',
        implies: ['orders.view'],
      },
      {
        key: 'orders.split',
        label: 'Split Check & Bill Separation',
        module: 'orders',
        group: 'POS & Orders',
        description: 'Split checks by individual items or seat count.',
        implies: ['orders.view'],
      },
      {
        key: 'orders.refund',
        label: 'Process Voids & Refunds',
        module: 'orders',
        group: 'POS & Orders',
        description: 'Cancel ordered items or issue refunds to customers.',
        implies: ['orders.view'],
      },
      {
        key: 'orders.discounts',
        label: 'Apply Discounts & Promos',
        module: 'orders',
        group: 'POS & Orders',
        description: 'Apply manual or promo code discounts on orders.',
        implies: ['orders.view'],
      },
    ],
  },
  {
    id: 'crm',
    title: 'CRM & Guest Loyalty',
    capabilities: [
      {
        key: 'crm.view',
        label: 'View Customer Directory & Profiles',
        module: 'crm',
        group: 'CRM & Loyalty',
        description: 'Access guest directory, allergen notes, and order history.',
      },
      {
        key: 'crm.edit',
        label: 'Create & Edit Guest Profiles',
        module: 'crm',
        group: 'CRM & Loyalty',
        description: 'Register walk-in guests and edit contact details.',
        implies: ['crm.view'],
      },
      {
        key: 'crm.points_adjust',
        label: 'Adjust Loyalty Points',
        module: 'crm',
        group: 'CRM & Loyalty',
        description: 'Manually add or subtract points with mandatory audit reason.',
        implies: ['crm.view'],
      },
      {
        key: 'crm.activity',
        label: 'View Customer Activity Feed',
        module: 'crm',
        group: 'CRM & Loyalty',
        description: 'Review guest checkouts and point redemptions timeline.',
        implies: ['crm.view'],
      },
      {
        key: 'crm.program',
        label: 'View Loyalty Tiers & Cashback',
        module: 'crm',
        group: 'CRM & Loyalty',
        description: 'Inspect spend thresholds and cashback conversion rules.',
        implies: ['crm.view'],
      },
    ],
  },
  {
    id: 'shift',
    title: 'Cash Register & Shift Management',
    capabilities: [
      {
        key: 'shift.view',
        label: 'View Register & Drawer Balances',
        module: 'shift',
        group: 'Cash Register',
        description: 'Check active drawer float balance and current shift summary.',
      },
      {
        key: 'shift.open_close',
        label: 'Open & Close Shifts (Z-Reports)',
        module: 'shift',
        group: 'Cash Register',
        description: 'Perform opening float declarations and Z-report closing.',
        implies: ['shift.view'],
      },
      {
        key: 'shift.cash_in_out',
        label: 'Log Cash In & Cash Out',
        module: 'shift',
        group: 'Cash Register',
        description: 'Log petty cash drops or additions with audit notes.',
        implies: ['shift.view'],
      },
      {
        key: 'shift.history',
        label: 'View Shift History & Audits',
        module: 'shift',
        group: 'Cash Register',
        description: 'Review historical Z-reports and cash variance logs.',
        implies: ['shift.view'],
      },
    ],
  },
  {
    id: 'history',
    title: 'Order History & Fiscal Ledger',
    capabilities: [
      {
        key: 'history.view',
        label: 'View Order Ledger & Search Archive',
        module: 'history',
        group: 'Order History',
        description: 'Search past order records by receipt number or customer name.',
      },
      {
        key: 'history.reprint',
        label: 'Reprint Receipts & Resend Invoices',
        module: 'history',
        group: 'Order History',
        description: 'Reprint 80mm thermal receipts or resend email invoices.',
        implies: ['history.view'],
      },
      {
        key: 'history.refund',
        label: 'Process Past Order Refunds',
        module: 'history',
        group: 'Order History',
        description: 'Execute full or partial refunds from historical ledger.',
        implies: ['history.view'],
      },
      {
        key: 'history.fiscal',
        label: 'Access VERI*FACTU Fiscal Archive',
        module: 'history',
        group: 'Order History',
        description: 'Inspect tax chain hash signatures and fiscal audit logs.',
        implies: ['history.view'],
      },
    ],
  },
  {
    id: 'reports',
    title: 'Reports & Financial Analytics',
    capabilities: [
      {
        key: 'reports.financial',
        label: 'View Financial Breakdown (Gross, Net, IVA)',
        module: 'reports',
        group: 'Reports',
        description: 'Access total revenue, VAT breakdown, and period sales.',
      },
      {
        key: 'reports.dishes',
        label: 'View Dish Performance Ranking',
        module: 'reports',
        group: 'Reports',
        description: 'Analyze top-selling menu items and category revenue.',
        implies: ['reports.financial'],
      },
      {
        key: 'reports.waiters',
        label: 'View Staff Sales Leaderboards',
        module: 'reports',
        group: 'Reports',
        description: 'Track employee sales volume and average check size.',
        implies: ['reports.financial'],
      },
      {
        key: 'reports.export',
        label: 'Export Financial CSV Reports',
        module: 'reports',
        group: 'Reports',
        description: 'Download raw CSV ledger data for accounting and tax filing.',
        implies: ['reports.financial'],
      },
    ],
  },
  {
    id: 'kitchen_bar',
    title: 'Kitchen & Bar KDS System',
    capabilities: [
      {
        key: 'kitchen_bar.view',
        label: 'View Station Displays (Kitchen & Bar)',
        module: 'kitchen_bar',
        group: 'Kitchen & Bar',
        description: 'Access live order prep queues for Kitchen and Bar stations.',
      },
      {
        key: 'kitchen_bar.bump',
        label: 'Bump & Update Order Status',
        module: 'kitchen_bar',
        group: 'Kitchen & Bar',
        description: 'Mark tickets or items as In-Prep, Ready, or Served.',
        implies: ['kitchen_bar.view'],
      },
      {
        key: 'kitchen_bar.analytics',
        label: 'View Prep-Time Speed Analytics',
        module: 'kitchen_bar',
        group: 'Kitchen & Bar',
        description: 'Inspect preparation speeds and station bottlenecks.',
        implies: ['kitchen_bar.view'],
      },
    ],
  },
  {
    id: 'menu',
    title: 'Menu & Dish Catalog',
    capabilities: [
      {
        key: 'menu.view',
        label: 'View Products & Categories',
        module: 'menu',
        group: 'Menu Catalog',
        description: 'Inspect dish catalog, prices, and allergen tags.',
      },
      {
        key: 'menu.edit',
        label: 'Create & Edit Dishes & Prices',
        module: 'menu',
        group: 'Menu Catalog',
        description: 'Add new dishes, edit pricing and 4-language translations.',
        implies: ['menu.view'],
      },
      {
        key: 'menu.categories',
        label: 'Reorder & Manage Categories',
        module: 'menu',
        group: 'Menu Catalog',
        description: 'Organize category order and menu section visibility.',
        implies: ['menu.view'],
      },
      {
        key: 'menu.modifiers',
        label: 'Manage Modifier Groups & Options',
        module: 'menu',
        group: 'Menu Catalog',
        description: 'Configure milk options, syrups, and dish add-ons.',
        implies: ['menu.view'],
      },
      {
        key: 'menu.archive',
        label: 'Archive & Restore Dishes',
        module: 'menu',
        group: 'Menu Catalog',
        description: 'Archive seasonal dishes or restore items from archive.',
        implies: ['menu.view'],
      },
    ],
  },
  {
    id: 'inventory',
    title: 'Stock Control & Inventory',
    capabilities: [
      {
        key: 'inventory.view',
        label: 'View Stock Levels & Low-Stock Alerts',
        module: 'inventory',
        group: 'Inventory',
        description: 'Inspect ingredient stock levels across store locations.',
      },
      {
        key: 'inventory.adjust',
        label: 'Perform Stock Adjustments & Waste Logs',
        module: 'inventory',
        group: 'Inventory',
        description: 'Log ingredient spoilage, waste, or manual count fixes.',
        implies: ['inventory.view'],
      },
      {
        key: 'inventory.transfers',
        label: 'Manage Inter-Location Stock Transfers',
        module: 'inventory',
        group: 'Inventory',
        description: 'Create and dispatch stock transfers between branches.',
        implies: ['inventory.view'],
      },
    ],
  },
  {
    id: 'operations',
    title: 'Daily Operations & Checklists',
    capabilities: [
      {
        key: 'operations.checklists',
        label: 'Complete SOP Checklists',
        module: 'operations',
        group: 'Operations',
        description: 'Fill out opening, mid, and closing checklists with photos.',
      },
      {
        key: 'operations.templates',
        label: 'Edit SOP Templates (Setup Mode)',
        module: 'operations',
        group: 'Operations',
        description: 'Create or update master checklist templates and tasks.',
        implies: ['operations.checklists'],
      },
      {
        key: 'operations.tasks',
        label: 'Manage Operational Tasks Board',
        module: 'operations',
        group: 'Operations',
        description: 'Create, assign, and track store task board cards.',
        implies: ['operations.checklists'],
      },
      {
        key: 'operations.reviews',
        label: 'Sync & Reply to Google Reviews',
        module: 'operations',
        group: 'Operations',
        description: 'Monitor store ratings and post review responses.',
      },
    ],
  },
  {
    id: 'staff',
    title: 'Staff & Team Management',
    capabilities: [
      {
        key: 'staff.view',
        label: 'View Employee Directory',
        module: 'staff',
        group: 'Staff & HR',
        description: 'View employee roster, status, and contact info.',
      },
      {
        key: 'staff.edit',
        label: 'Create & Edit Staff & PINs',
        module: 'staff',
        group: 'Staff & HR',
        description: 'Invite members, update PINs, and edit staff profiles.',
        implies: ['staff.view'],
      },
      {
        key: 'staff.schedule',
        label: 'Manage Shift Schedules Planner',
        module: 'staff',
        group: 'Staff & HR',
        description: 'Assign shift schedules and weekly roster slots.',
        implies: ['staff.view'],
      },
      {
        key: 'staff.time_tracking',
        label: 'Time Clock & Hourly Logs',
        module: 'staff',
        group: 'Staff & HR',
        description: 'Access clock-in/clock-out tracking and hourly shift logs.',
        implies: ['staff.view'],
      },
      {
        key: 'staff.permissions',
        label: 'Manage Roles & Custom Overrides',
        module: 'staff',
        group: 'Staff & HR',
        description: 'Edit master role templates and individual user overrides.',
        implies: ['staff.edit'],
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings & Administration',
    capabilities: [
      {
        key: 'settings.profile',
        label: 'Edit My Profile & Security',
        module: 'settings',
        group: 'Settings',
        description: 'Update user name, email, phone, and login password.',
      },
      {
        key: 'settings.general',
        label: 'Manage Store Configuration',
        module: 'settings',
        group: 'Settings',
        description: 'Configure store info, operating hours, and currency.',
      },
      {
        key: 'settings.audit',
        label: 'View System Audit Trail Logs',
        module: 'settings',
        group: 'Settings',
        description: 'Inspect chronological system events and staff audit logs.',
      },
      {
        key: 'settings.backups',
        label: 'Manage Database Backups',
        module: 'settings',
        group: 'Settings',
        description: 'Create PostgreSQL backups or execute database restores.',
      },
      {
        key: 'settings.tables',
        label: 'Manage Floor Plan & Tables Layout',
        module: 'settings',
        group: 'Settings',
        description: 'Edit room zones, SVG table shapes, and QR passes.',
      },
      {
        key: 'settings.printers',
        label: 'Configure ESC/POS Printers & Routing',
        module: 'settings',
        group: 'Settings',
        description: 'Add receipt/kitchen printers and set IP routes.',
      },
      {
        key: 'settings.taxes',
        label: 'Configure Taxes & VERI*FACTU Compliance',
        module: 'settings',
        group: 'Settings',
        description: 'Set tax brackets (10%/21%) and fiscal submission rules.',
      },
      {
        key: 'settings.promotions',
        label: 'Manage Discounts & Gift Cards',
        module: 'settings',
        group: 'Settings',
        description: 'Configure preset discounts, happy hour rules, and gift cards.',
      },
    ],
  },
  {
    id: 'info',
    title: 'Information & System Docs',
    capabilities: [
      {
        key: 'info.view',
        label: 'View Technical Documentation',
        module: 'info',
        group: 'Information',
        description: 'Access complete in-app technical documentation and guides.',
      },
    ],
  },
];

// Flat map of all capability keys
export const ALL_CAPABILITY_KEYS: string[] = PERMISSIONS_CATALOG.flatMap((g) =>
  g.capabilities.map((c) => c.key)
);
