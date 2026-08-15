/**
 * Seeds 2 months of realistic Corgi Cafe demo data (5 Barcelona locations).
 * Run: npm run seed:demo
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createHash } from 'crypto';

for (const envPath of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]) {
  try {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && !process.env[m[1].trim()]) {
        process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    }
    break;
  } catch {
    /* try next path */
  }
}
import { prisma, disconnectDb } from '../src/lib/db.ts';
import { calculateHuellaHash } from '../src/services/fiscal.service.ts';
import { DEFAULT_ORDER_STAGES, DEFAULT_TASK_STAGES } from '../src/lib/board-settings.ts';

const GENESIS = '0000000000000000000000000000000000000000000000000000000000000000';
const NIF = 'B12345678';
const TAX = 0.1;

const LOCATIONS = [
  { id: 'loc-main-wh', name: 'Main WH', address: 'Polígon Industrial Zona Franca, Barcelona' },
  { id: 'default', name: 'Eixample', address: 'Carrer de Pau Claris 90, 08010 Barcelona' },
  { id: 'loc-gotico', name: 'Gótico', address: 'Carrer de Ferran 28, 08002 Barcelona' },
  { id: 'loc-arc', name: 'Arc de Triomf', address: 'Passeig de Lluís Companys 2, 08018 Barcelona' },
  { id: 'loc-sagrada', name: 'Sagrada Família', address: 'Carrer de Mallorca 401, 08013 Barcelona' },
  { id: 'loc-gracia', name: 'Gràcia', address: 'Carrer de Verdi 12, 08012 Barcelona' },
] as const;

const LOC_CODES: Record<(typeof LOCATIONS)[number]['id'], string> = {
  'loc-main-wh': 'WH',
  default: 'EIX',
  'loc-gotico': 'GOT',
  'loc-arc': 'ARC',
  'loc-sagrada': 'SAG',
  'loc-gracia': 'GRA',
};

const MENU = {
  categories: [
    { id: 'cat-coffee', name: 'Coffee', sortOrder: 0 },
    { id: 'cat-brunch', name: 'Brunch', sortOrder: 1 },
    { id: 'cat-pastry', name: 'Pastry', sortOrder: 2 },
    { id: 'cat-drinks', name: 'Drinks', sortOrder: 3 },
  ],
  items: [
    { id: 'mi-latte', name: 'Corgi Signature Latte', price: 4.5, categoryId: 'cat-coffee', allergens: ['Milk'], description: 'House blend with corgi art' },
    { id: 'mi-espresso', name: 'Double Espresso', price: 2.8, categoryId: 'cat-coffee', allergens: [], description: 'Single origin Colombia' },
    { id: 'mi-matcha', name: 'Matcha Latte', price: 4.2, categoryId: 'cat-coffee', allergens: ['Milk'], description: 'Ceremonial grade matcha' },
    { id: 'mi-brunch', name: 'Avocado Toast', price: 12.5, categoryId: 'cat-brunch', allergens: ['Gluten'], description: 'Sourdough, poached egg, feta' },
    { id: 'mi-plate', name: 'Brunch Plate', price: 14.0, categoryId: 'cat-brunch', allergens: ['Eggs', 'Milk'], description: 'Eggs, bacon, roasted tomato' },
    { id: 'mi-croissant', name: 'Matcha Croissant', price: 3.9, categoryId: 'cat-pastry', allergens: ['Gluten', 'Milk'], description: 'Baked fresh daily' },
    { id: 'mi-cheesecake', name: 'Basque Cheesecake', price: 5.5, categoryId: 'cat-pastry', allergens: ['Milk', 'Eggs'], description: 'Burnt top, creamy center' },
    { id: 'mi-tea', name: 'Loose Leaf Tea', price: 3.5, categoryId: 'cat-drinks', allergens: [], description: 'Earl Grey or chamomile' },
    { id: 'mi-juice', name: 'Fresh Orange Juice', price: 4.0, categoryId: 'cat-drinks', allergens: [], description: 'Pressed to order' },
    { id: 'mi-smoothie', name: 'Berry Smoothie', price: 5.5, categoryId: 'cat-drinks', allergens: [], description: 'Mixed berries, oat milk' },
  ],
};

const STAFF = [
  { id: 'staff-001', name: 'Anna Muñoz Hidalgo', pin: '1234', role: 'Manager', position: 'Manager', section: 'Floor', email: 'anna@corgicafe.com', nie: 'X1234567A', phone: '+34600111222', initials: 'AM' },
  { id: 'staff-002', name: 'Denis Donets', pin: '5678', role: 'Barista', position: 'Barista', section: 'Floor', email: 'denis@corgicafe.com', nie: 'Y2345678B', phone: '+34600222333', initials: 'DD' },
  { id: 'staff-003', name: 'Albert Mesropov', pin: '9012', role: 'Waiter', position: 'Waiter', section: 'Kitchen', email: 'albert@corgicafe.com', nie: 'Z3456789C', phone: '+34600333444', initials: 'AL' },
  { id: 'staff-004', name: 'Sofia García', pin: '2345', role: 'Barista', position: 'Barista', section: 'Floor', email: 'sofia@corgicafe.com', nie: 'X4567890D', phone: '+34600444555', initials: 'SG' },
  { id: 'staff-005', name: 'Marc Lloret', pin: '3456', role: 'Waiter', position: 'Waiter', section: 'Floor', email: 'marc@corgicafe.com', nie: 'Y5678901E', phone: '+34600555666', initials: 'ML' },
  { id: 'staff-006', name: 'Laura Fernández', pin: '4567', role: 'Chef', position: 'Head Chef', section: 'Kitchen', email: 'laura@corgicafe.com', nie: 'Z6789012F', phone: '+34600666777', initials: 'LF' },
  { id: 'staff-007', name: 'Pablo Ruiz', pin: '6789', role: 'Waiter', position: 'Waiter', section: 'Floor', email: 'pablo@corgicafe.com', nie: 'X7890123G', phone: '+34600777888', initials: 'PR' },
  { id: 'staff-008', name: 'Emma Wilson', pin: '7890', role: 'Barista', position: 'Barista', section: 'Floor', email: 'emma@corgicafe.com', nie: 'Y8901234H', phone: '+34600888999', initials: 'EW' },
];

const REVIEW_SAMPLES = [
  { source: 'GOOGLE', rating: 5, authorName: 'Elena Rodriguez', comment: 'Best corgi latte in Barcelona! Staff is lovely.' },
  { source: 'GOOGLE', rating: 4, authorName: 'Mark T.', comment: 'Great atmosphere. Avocado toast is a must.' },
  { source: 'TRIPADVISOR', rating: 5, authorName: 'Sophie L.', comment: 'Perfect matcha croissant and fast service.' },
  { source: 'YELP', rating: 4, authorName: 'Sarah K.', comment: 'Busy on weekends but worth the wait.' },
  { source: 'GOOGLE', rating: 3, authorName: 'David Chen', comment: 'Coffee was good, queue was long on Sunday.' },
  { source: 'GOOGLE', rating: 5, authorName: 'Alex M.', comment: 'The corgi latte art made my day!' },
  { source: 'TRIPADVISOR', rating: 4, authorName: 'Julia P.', comment: 'Cozy spot near Sagrada Família.' },
  { source: 'YELP', rating: 5, authorName: 'Tomás V.', comment: 'Brunch plate is huge and delicious.' },
];

function hashPin(pin: string) {
  return createHash('sha256').update(pin).digest('hex');
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function atTime(base: Date, hour: number, minute = randInt(0, 59)) {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function fmtFiscalDate(d: Date) {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${d.getFullYear()}`;
}

function fiscalHash(invoiceNumber: string, total: number, prevHash: string, date: Date) {
  const taxBase = total / (1 + TAX);
  const taxAmount = total - taxBase;
  return calculateHuellaHash({
    nifEmisor: NIF,
    numSerieFactura: invoiceNumber,
    fechaExpedicionFactura: fmtFiscalDate(date),
    tipoFactura: 'F2',
    baseImponible: taxBase.toFixed(2),
    cuotaImpositiva: taxAmount.toFixed(2),
    totalFactura: total.toFixed(2),
    huellaPrevio: prevHash,
  });
}

async function wipeDatabase() {
  console.log('🧹 Clearing existing data…');
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "FiscalRecord", "Transaction", "OrderItem", "Order",
      "InventoryTransfer", "StockTransfer", "LoyaltyTransaction",
      "GiftCard", "CustomerReview", "DailyChecklist", "ChecklistTemplate",
      "TimeCard", "ShiftSchedule", "CashShift", "Task", "AuditLog",
      "Customer", "Table", "MerchInventory", "DiscountPreset", "Promotion",
      "BoardSettings", "Printer", "TaxRate", "SystemSetting",
      "_CategoryModifierGroups", "ModifierOption", "ModifierGroup",
      "MenuItem", "MenuCategory", "LoyaltyConfig"
    RESTART IDENTITY CASCADE;
  `);
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.location.deleteMany({});
}

async function seedCore() {
  const roles = [
    { id: 'role-manager', name: 'Manager', permissions: { all: true } },
    { id: 'role-barista', name: 'Barista', permissions: { orders: ['view', 'create'], menu: ['view'] } },
    { id: 'role-waiter', name: 'Waiter', permissions: { orders: ['view', 'create'], tasks: ['view'] } },
    { id: 'role-chef', name: 'Chef', permissions: { kitchen: ['view', 'update'], inventory: ['view'] } },
  ];
  for (const r of roles) {
    await prisma.role.create({ data: { id: r.id, name: r.name, permissions: r.permissions } });
  }

  for (const loc of LOCATIONS) {
    await prisma.location.create({
      data: {
        id: loc.id,
        name: loc.name,
        address: loc.address,
        layoutMetadata: {
          rooms: [{ id: 'main', name: 'Main Hall', defaultZoom: 1 }],
        },
      },
    });
  }

  const roleMap: Record<string, string> = {
    Manager: 'role-manager',
    Barista: 'role-barista',
    Waiter: 'role-waiter',
    Chef: 'role-chef',
  };

  const contractStart = '2024-03-01';
  for (const s of STAFF) {
    await prisma.user.create({
      data: {
        id: s.id,
        name: s.name,
        pinHash: hashPin(s.pin),
        roleId: roleMap[s.role],
        position: s.position,
        section: s.section,
        email: s.email,
        nie: s.nie,
        phone: s.phone,
        avatarInitials: s.initials,
        contractStart,
        scheduleStart: '08:00',
        scheduleEnd: '17:00',
        daysPerWeek: 5,
        status: 'active',
        locations: { connect: [{ id: pick(LOCATIONS).id }, { id: 'default' }] },
      },
    });
  }

  for (const c of MENU.categories) {
    await prisma.menuCategory.create({ data: c });
  }
  for (const item of MENU.items) {
    await prisma.menuItem.create({
      data: {
        ...item,
        priceHistory: [{ price: item.price, date: '2025-01-01' }],
      },
    });
  }

  const modGroup = await prisma.modifierGroup.create({
    data: {
      id: 'mod-milk',
      name: 'Milk Options',
      minQty: 0,
      maxQty: 1,
      sortOrder: 0,
      options: {
        create: [
          { name: 'Oat Milk', price: 0.5, sortOrder: 0 },
          { name: 'Almond Milk', price: 0.5, sortOrder: 1 },
          { name: 'Extra Shot', price: 0.8, sortOrder: 2 },
        ],
      },
      categories: { connect: [{ id: 'cat-coffee' }] },
    },
  });
  void modGroup;

  for (let li = 0; li < LOCATIONS.length; li++) {
    const loc = LOCATIONS[li];
    for (let i = 1; i <= 14; i++) {
      const statuses = ['available', 'occupied', 'billed', 'dirty'] as const;
      await prisma.table.create({
        data: {
          id: `tbl-${loc.id}-${i}`,
          number: String(i),
          locationId: loc.id,
          x: 1400 + (i % 5) * 120,
          y: 1450 + Math.floor(i / 5) * 100,
          width: i % 3 === 0 ? 80 : 60,
          height: i % 3 === 0 ? 80 : 60,
          shape: i % 3 === 0 ? 'round' : 'square',
          status: pick([...statuses]),
          roomId: 'main',
          roomName: 'Main Hall',
          seats: i % 3 === 0 ? 6 : 4,
          qrCodeUrl: `/uploads/qr/${loc.id}-table-${i}.png`,
        },
      });
    }

    await prisma.boardSettings.createMany({
      data: [
        { type: 'orders', locationId: loc.id, stages: DEFAULT_ORDER_STAGES },
        { type: 'tasks', locationId: loc.id, stages: DEFAULT_TASK_STAGES },
      ],
    });

    await prisma.taxRate.createMany({
      data: [
        { name: 'Standard IVA', slug: 'standard', ratePercent: 10, locationId: loc.id },
        { name: 'Alcohol', slug: 'alcohol', ratePercent: 21, locationId: loc.id },
      ],
    });

    await prisma.printer.create({
      data: {
        name: `${loc.name} Receipt`,
        ipAddress: `192.168.1.${10 + li}`,
        port: 9100,
        type: 'receipt',
        locationId: loc.id,
      },
    });
  }

  await prisma.loyaltyConfig.create({ data: { id: 'default' } });

  await prisma.discountPreset.createMany({
    data: [
      { name: 'Staff Meal', value: 50 },
      { name: 'Happy Hour', value: 15 },
      { name: 'Birthday', value: 20 },
    ],
  });

  await prisma.promotion.createMany({
    data: [
      { name: 'Friday Coffee', discountPercent: 10, activeDays: [5], startHour: 14, endHour: 17, targetItems: ['Corgi Signature Latte', 'Matcha Latte'] },
      { name: 'Weekend Brunch', discountPercent: 12, activeDays: [0, 6], startHour: 10, endHour: 14, targetItems: ['Avocado Toast', 'Brunch Plate'] },
    ],
  });

  await prisma.systemSetting.createMany({
    data: [
      { key: 'pos.receiptFooter', value: { text: 'Gràcies! Follow @corgicafe' } },
      { key: 'pos.autoPrint', value: { enabled: true } },
      { key: 'crm.signupBonus', value: { points: 25 } },
    ],
  });

  const templates = [
    { taskKey: 'open-cash', title: 'Count opening float', category: 'opening', requiresPhoto: false, sortOrder: 0 },
    { taskKey: 'open-espresso', title: 'Calibrate espresso machine', category: 'opening', requiresPhoto: false, sortOrder: 1 },
    { taskKey: 'open-pastry', title: 'Display fresh pastries', category: 'opening', requiresPhoto: true, sortOrder: 2 },
    { taskKey: 'close-clean', title: 'Deep clean counters', category: 'closing', requiresPhoto: true, sortOrder: 0 },
    { taskKey: 'close-cash', title: 'Close cash register', category: 'closing', requiresPhoto: false, sortOrder: 1 },
  ];
  for (const t of templates) {
    await prisma.checklistTemplate.create({
      data: {
        ...t,
        permissions: { eixample: true, gotico: true, sagrada: true, gracia: true, arc: true },
      },
    });
  }

  const skus = [
    { sku: 'BEAN-01', name: 'House Blend 1kg', price: 18, qty: 45, min: 10, category: 'bar' },
    { sku: 'MILK-OAT', name: 'Oat Milk 12L', price: 22, qty: 30, min: 8, category: 'bar' },
    { sku: 'CUP-8OZ', name: 'Paper Cups 8oz (500)', price: 35, qty: 12, min: 4, category: 'merch' },
    { sku: 'CROISSANT-FZ', name: 'Frozen Croissants', price: 28, qty: 20, min: 6, category: 'kitchen' },
    { sku: 'AVOCADO', name: 'Avocados box', price: 24, qty: 15, min: 5, category: 'kitchen' },
    { sku: 'SYRUP-VAN', name: 'Vanilla Syrup', price: 12, qty: 8, min: 3, category: 'bar' },
  ];
  const branchIds = LOCATIONS.filter((l) => l.id !== 'loc-main-wh').map((l) => l.id);
  for (const s of skus) {
    const item = await prisma.merchInventory.create({
      data: {
        sku: s.sku,
        name: s.name,
        price: s.price,
        quantity: s.qty,
        minStockLevel: s.min,
        category: s.category,
        unit: 'pcs',
      },
    });
    const branchQty = randInt(0, Math.min(4, s.qty));
    const mainQty = s.qty - branchQty;
    await prisma.inventoryLocationStock.create({
      data: { itemId: item.id, locationId: 'loc-main-wh', quantity: mainQty },
    });
    if (branchQty > 0) {
      await prisma.inventoryLocationStock.create({
        data: { itemId: item.id, locationId: pick(branchIds), quantity: branchQty },
      });
    }
    await prisma.inventoryTransfer.create({
      data: { itemId: item.id, type: 'check_in', quantity: s.qty, reason: 'Opening stock' },
    });
  }

  console.log('✅ Core entities seeded');
}

async function seedCustomers(start: Date) {
  const firstNames = ['Maria', 'Carlos', 'Lucia', 'Jordi', 'Aina', 'Oliver', 'Mia', 'Lucas', 'Emma', 'Noah'];
  const lastNames = ['García', 'Martínez', 'López', 'Sánchez', 'Fernández', 'Ruiz', 'Torres', 'Díaz'];
  const tiers = ['Bronze', 'Silver', 'Gold', 'VIP'] as const;
  const customers: string[] = [];

  for (let i = 0; i < 180; i++) {
    const name = `${pick(firstNames)} ${pick(lastNames)}`;
    const joined = addDays(start, randInt(0, 55));
    const c = await prisma.customer.create({
      data: {
        name,
        phone: `+346${String(10000000 + i).slice(0, 8)}`,
        email: `guest${i}@example.com`,
        birthday: `${randInt(1, 28).toString().padStart(2, '0')}/${randInt(1, 12).toString().padStart(2, '0')}`,
        tier: pick([...tiers]),
        points: randInt(0, 400),
        ltv: round2(randInt(20, 800)),
        visitCount: randInt(1, 45),
        lastVisitDate: addDays(new Date(), -randInt(0, 14)).toISOString().slice(0, 10),
        favoriteDishes: [pick(MENU.items).name, pick(MENU.items).name],
        allergyNotes: i % 7 === 0 ? 'Nuts' : i % 11 === 0 ? 'Lactose' : null,
        notes: i % 5 === 0 ? 'Prefers window seat' : null,
        joinedDate: joined.toISOString().slice(0, 10),
      },
    });
    customers.push(c.id);
    if (i % 3 === 0) {
      await prisma.loyaltyTransaction.create({
        data: {
          customerId: c.id,
          type: 'earn',
          points: randInt(5, 40),
          createdAt: addDays(joined, randInt(1, 20)),
        },
      });
    }
  }

  for (let i = 0; i < 12; i++) {
    await prisma.giftCard.create({
      data: {
        code: `CORGI-${1000 + i}`,
        initialBalance: 50,
        balance: randInt(0, 50),
        customerId: pick(customers),
        status: i % 4 === 0 ? 'redeemed' : 'active',
        expiryDate: addDays(new Date(), 365),
        createdAt: addDays(start, randInt(0, 40)),
      },
    });
  }

  console.log(`✅ ${customers.length} customers + gift cards`);
  return customers;
}

async function seedSchedulesAndTimecards(start: Date, end: Date) {
  const weekMs = 7 * 86400000;
  let weekStart = new Date(start);
  weekStart.setHours(0, 0, 0, 0);
  while (weekStart <= end) {
    const monday = new Date(weekStart);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    for (const s of STAFF) {
      for (let dow = 0; dow <= 5; dow++) {
        if (Math.random() > 0.85) continue;
        await prisma.shiftSchedule.create({
          data: {
            userId: s.id,
            weekStart: monday,
            dayOfWeek: dow,
            startTime: dow === 5 ? '09:00' : '08:00',
            endTime: dow === 5 ? '15:00' : '16:00',
          },
        });
      }
    }
    weekStart = new Date(weekStart.getTime() + weekMs);
  }

  for (let d = 0; d <= 60; d++) {
    const day = addDays(start, d);
    if (day > end) break;
    const dow = (day.getDay() + 6) % 7;
    if (dow > 5) continue;
    for (const s of STAFF.slice(0, 5)) {
      if (Math.random() > 0.7) continue;
      const clockIn = atTime(day, 8, randInt(0, 15));
      const clockOut = atTime(day, 16, randInt(0, 30));
      const mins = Math.ceil((clockOut.getTime() - clockIn.getTime()) / 60000);
      await prisma.timeCard.create({
        data: {
          userId: s.id,
          workDate: day,
          clockIn,
          clockOut: day < end ? clockOut : null,
          totalMinutes: day < end ? mins : 0,
        },
      });
    }
  }
  console.log('✅ Schedules + timecards');
}

async function seedOrders(start: Date, end: Date, customerIds: string[]) {
  const sources = ['dine_in', 'takeaway', 'glovo', 'ubereats'] as const;
  const methods = ['card', 'cash', 'points', 'giftcard'] as const;
  const weights = [0.55, 0.22, 0.15, 0.08];
  let orderSeq = 1;
  const paidOrders: Array<{ id: string; locationId: string; total: number; createdAt: Date }> = [];

  for (let d = 0; d <= 60; d++) {
    const day = addDays(start, d);
    if (day > end) break;
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    for (const loc of LOCATIONS) {
      const count = randInt(isWeekend ? 18 : 10, isWeekend ? 32 : 22);
      for (let o = 0; o < count; o++) {
        const hour = pick([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
        const createdAt = atTime(day, hour);
        const itemCount = randInt(1, 4);
        const items = Array.from({ length: itemCount }, () => {
          const mi = pick(MENU.items);
          const qty = randInt(1, 2);
          return { name: mi.name, price: mi.price, quantity: qty };
        });
        let subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
        const discount = Math.random() < 0.08 ? round2(subtotal * 0.1) : 0;
        const tip = Math.random() < 0.25 ? round2(subtotal * 0.08) : 0;
        const total = round2(subtotal - discount + tip);
        const status = Math.random() < 0.03 ? 'cancelled' : 'completed';
        const paid = status === 'completed';
        const tableNum = randInt(1, 14);
        const methodRoll = Math.random();
        let method: (typeof methods)[number] = 'card';
        if (methodRoll > weights[0]) method = 'cash';
        if (methodRoll > weights[0] + weights[1]) method = 'points';
        if (methodRoll > weights[0] + weights[1] + weights[2]) method = 'giftcard';

        const order = await prisma.order.create({
          data: {
            orderNumber: `ORD-${String(orderSeq++).padStart(6, '0')}`,
            source: pick([...sources]),
            customerName: Math.random() < 0.6 ? undefined : `Guest ${randInt(1, 999)}`,
            customerId: Math.random() < 0.35 ? pick(customerIds) : undefined,
            tableId: `tbl-${loc.id}-${tableNum}`,
            locationId: loc.id,
            status,
            total,
            discountName: discount > 0 ? 'Happy Hour' : undefined,
            discountValue: discount,
            tipType: tip > 0 ? 'percent' : undefined,
            tipValue: tip,
            paid,
            amountPaid: paid ? total : 0,
            createdAt,
            updatedAt: createdAt,
            items: { create: items.map((i) => ({ ...i, paid: true })) },
            transactions: paid
              ? {
                  create: [
                    {
                      method,
                      amount: total,
                      code: method === 'giftcard' ? `GC-${randInt(1000, 9999)}` : undefined,
                      createdAt,
                    },
                  ],
                }
              : undefined,
          },
        });

        if (paid) {
          paidOrders.push({ id: order.id, locationId: loc.id, total, createdAt });
        }
      }
    }
    if (d % 10 === 0) console.log(`  … orders through day ${d}`);
  }

  console.log(`✅ ${orderSeq - 1} orders (${paidOrders.length} paid)`);
  return paidOrders;
}

async function seedFiscalRecords(
  paidOrders: Array<{ id: string; locationId: string; total: number; createdAt: Date }>
) {
  const byLoc = new Map<string, typeof paidOrders>();
  for (const o of paidOrders) {
    const list = byLoc.get(o.locationId) ?? [];
    list.push(o);
    byLoc.set(o.locationId, list);
  }

  let count = 0;
  for (const [locId, orders] of byLoc) {
    orders.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    let prevHash = GENESIS;
    let seq = 1;
    const locCode = LOC_CODES[locId as keyof typeof LOC_CODES] ?? locId.slice(0, 6).toUpperCase();
    for (const o of orders) {
      if (Math.random() < 0.05) continue;
      const invoiceNumber = `INV-${locCode}-${String(seq++).padStart(6, '0')}`;
      const taxBase = round2(o.total / (1 + TAX));
      const taxAmount = round2(o.total - taxBase);
      const hash = fiscalHash(invoiceNumber, o.total, prevHash, o.createdAt);
      await prisma.fiscalRecord.create({
        data: {
          orderId: o.id,
          recordType: 'invoice',
          invoiceNumber,
          invoiceType: 'simplificada',
          taxBase,
          taxRate: TAX,
          taxAmount,
          total: o.total,
          prevHash,
          hash,
          qrCodeUrl: `https://www2.agenciatributaria.gob.es/verify?n=${invoiceNumber}`,
          isSyncAEAT: Math.random() < 0.92,
          syncError: Math.random() < 0.02 ? 'AEAT timeout' : null,
          createdAt: o.createdAt,
        },
      });
      prevHash = hash;
      count++;
    }
  }
  console.log(`✅ ${count} fiscal records`);
}

async function seedShifts(start: Date, end: Date) {
  for (let d = 0; d <= 60; d++) {
    const day = addDays(start, d);
    if (day > end) break;
    for (const loc of LOCATIONS) {
      const opener = pick(STAFF);
      const floatStart = 150;
      const cashSales = round2(randInt(80, 450));
      const cardSales = round2(randInt(400, 2200));
      const pointsSales = round2(randInt(20, 180));
      const openedAt = atTime(day, 7, 30);
      const isToday = day.toDateString() === end.toDateString();
      const expected = round2(floatStart + cashSales);
      await prisma.cashShift.create({
        data: {
          locationId: loc.id,
          userId: opener.id,
          floatStart,
          cashSales,
          cardSales,
          pointsSales,
          cashIn: randInt(0, 2) ? 50 : 0,
          cashOut: randInt(0, 3) ? 30 : 0,
          expected,
          actual: isToday ? undefined : round2(expected + randInt(-8, 8)),
          difference: isToday ? undefined : randInt(-8, 8),
          adjustments: [{ type: 'out', amount: 15, reason: 'Barista tips', time: atTime(day, 16, 0).toISOString() }],
          status: isToday ? 'open' : 'closed',
          openedAt,
          closedAt: isToday ? undefined : atTime(day, 17, 0),
        },
      });
    }
  }
  console.log('✅ Cash shifts');
}

async function seedReviews(start: Date) {
  for (let i = 0; i < 55; i++) {
    const sample = pick(REVIEW_SAMPLES);
    const loc = pick(LOCATIONS);
    const reviewDate = addDays(start, randInt(0, 58));
    await prisma.customerReview.create({
      data: {
        source: sample.source,
        rating: sample.rating,
        authorName: `${sample.authorName}${i > 7 ? ` ${i}` : ''}`,
        comment: sample.comment,
        locationId: loc.id,
        externalId: `seed-${sample.source}-${i}`,
        reviewDate,
        replyText: i % 4 === 0 ? 'Thank you for visiting Corgi Cafe!' : null,
        repliedAt: i % 4 === 0 ? addDays(reviewDate, 1) : null,
      },
    });
  }
  console.log('✅ Reviews');
}

async function seedTasks(start: Date) {
  const statuses = ['todo', 'in_progress', 'in_review', 'completed'] as const;
  for (let i = 0; i < 35; i++) {
    const loc = pick(LOCATIONS);
    await prisma.task.create({
      data: {
        title: pick(['Restock oat milk', 'Fix patio heater', 'Update menu board', 'Train new barista', 'Inventory count']),
        description: 'Operational task for the week',
        branch: loc.name,
        tags: [{ label: 'Ops', bg: '#f3f4f6', text: '#111827' }],
        commentsCount: randInt(0, 5),
        attachmentsCount: randInt(0, 2),
        progress: randInt(0, 100),
        dueAt: addDays(start, randInt(10, 55)),
        scheduledDate: addDays(start, randInt(0, 58)),
        assigneeIds: [pick(STAFF).id],
        status: pick([...statuses]),
        locationId: loc.id,
      },
    });
  }
  console.log('✅ Tasks');
}

async function seedChecklists(start: Date) {
  const keys = ['open-cash', 'open-espresso', 'open-pastry', 'close-clean', 'close-cash'];
  const locKeys = ['eixample', 'gotico', 'arc', 'sagrada', 'gracia'];
  for (let d = 0; d < 30; d++) {
    const day = addDays(start, 30 + d);
    for (const lk of locKeys) {
      for (const shiftType of ['opening', 'closing'] as const) {
        for (const taskKey of keys.filter((k) => k.startsWith(shiftType === 'opening' ? 'open' : 'close'))) {
          await prisma.dailyChecklist.create({
            data: {
              shiftType,
              scheduledDate: day,
              locationKey: lk,
              taskKey,
              completed: Math.random() < 0.85,
              completedAt: Math.random() < 0.85 ? atTime(day, shiftType === 'opening' ? 8 : 21) : null,
              completedById: Math.random() < 0.85 ? pick(STAFF).id : null,
              photoUrl: taskKey.includes('pastry') || taskKey.includes('clean') ? '/uploads/checklist/sample.jpg' : null,
            },
          });
        }
      }
    }
  }
  console.log('✅ Daily checklists');
}

async function seedAuditLog() {
  let prevHash = '0000000000000000';
  const actions = ['shift_open', 'shift_close', 'order_void', 'menu_update', 'login'];
  for (let i = 0; i < 120; i++) {
    const action = pick(actions);
    const ts = new Date(Date.now() - randInt(0, 60) * 86400000);
    const payload = JSON.stringify({ action, prevHash, timestamp: ts.toISOString(), i });
    const hash = createHash('sha256').update(payload).digest('hex');
    await prisma.auditLog.create({
      data: {
        action,
        details: { note: `Seed audit event ${i}` },
        userId: pick(STAFF).id,
        prevHash,
        hash,
        createdAt: ts,
      },
    });
    prevHash = hash;
  }
  console.log('✅ Audit log');
}

async function seedTransfers() {
  const items = await prisma.merchInventory.findMany();
  const targets = LOCATIONS.filter((l) => l.id !== 'loc-main-wh');
  for (let i = 0; i < 15; i++) {
    const item = pick(items);
    await prisma.stockTransfer.create({
      data: {
        itemId: item.id,
        sourceLocationId: 'loc-main-wh',
        targetLocationId: pick(targets).id,
        quantity: randInt(2, 12),
        status: pick(['pending', 'in_transit', 'completed']),
        createdByName: pick(STAFF).name,
        createdAt: addDays(new Date(), -randInt(1, 45)),
      },
    });
  }
  console.log('✅ Stock transfers');
}

async function seedActiveOrders(customerIds: string[]) {
  const statuses = ['incoming', 'preparing', 'ready', 'served'] as const;
  const sources = ['dine_in', 'takeaway', 'glovo', 'ubereats'] as const;
  let seq = 900000;

  const ageByStatus: Record<(typeof statuses)[number], [number, number]> = {
    incoming: [5, 25],
    preparing: [15, 90],
    ready: [30, 120],
    served: [45, 180],
  };

  for (const loc of LOCATIONS) {
    for (let i = 0; i < randInt(4, 8); i++) {
      const status = pick([...statuses]);
      const source = pick([...sources]);
      const [minAge, maxAge] = ageByStatus[status];
      const createdAt = new Date(Date.now() - randInt(minAge, maxAge) * 60_000);
      const items = Array.from({ length: randInt(1, 3) }, () => {
        const mi = pick(MENU.items);
        return { name: mi.name, price: mi.price, quantity: randInt(1, 2), paid: false };
      });
      const total = round2(items.reduce((s, it) => s + it.price * it.quantity, 0));
      const tableNum = randInt(1, 14);
      const paid = status === 'served' && Math.random() < 0.4;
      const orderNumber =
        source === 'glovo'
          ? `GLV-${seq++}`
          : source === 'ubereats'
            ? `UBR-${seq++}`
            : `ORD-${String(seq++).padStart(6, '0')}`;

      await prisma.order.create({
        data: {
          orderNumber,
          source,
          customerName: pick(['Walk-in Guest', 'Maria L.', 'Delivery #4421', 'Table Guest']),
          customerId: Math.random() < 0.3 ? pick(customerIds) : undefined,
          tableId: source === 'dine_in' ? `tbl-${loc.id}-${tableNum}` : undefined,
          locationId: loc.id,
          status,
          total,
          paid,
          amountPaid: paid ? total : 0,
          createdAt,
          updatedAt: createdAt,
          items: { create: items },
          transactions: paid
            ? { create: [{ method: pick(['card', 'cash', 'points'] as const), amount: total, createdAt }] }
            : undefined,
        },
      });
    }
  }
  console.log('✅ Active board orders for today');
}

async function main() {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = addDays(end, -60);
  start.setHours(0, 0, 0, 0);

  console.log(`🐕 Corgi Cafe demo seed — ${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}`);

  await wipeDatabase();
  await seedCore();
  const customers = await seedCustomers(start);
  await seedSchedulesAndTimecards(start, end);
  const paidOrders = await seedOrders(start, end, customers);
  await seedFiscalRecords(paidOrders);
  await seedShifts(start, end);
  await seedReviews(start);
  await seedTasks(start);
  await seedChecklists(start);
  await seedAuditLog();
  await seedTransfers();
  await seedActiveOrders(customers);

  const stats = {
    locations: await prisma.location.count(),
    orders: await prisma.order.count(),
    customers: await prisma.customer.count(),
    reviews: await prisma.customerReview.count(),
  };
  console.log('\n🎉 Done!', stats);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectDb();
  });
