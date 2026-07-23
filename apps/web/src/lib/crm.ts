export interface Guest {
  id: string;
  name: string;
  phone: string;
  email: string;
  birthday: string;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'VIP';
  points: number; // 1 point = €1
  ltv: number; // Lifetime Value in €
  visitCount: number;
  lastVisitDate: string;
  favoriteDishes: string[];
  allergyNotes?: string;
  notes?: string;
  joinedDate: string;
}

export const DEFAULT_GUESTS: Guest[] = [
  {
    id: 'g-1',
    name: 'Oleksandr Kovalenko',
    phone: '+34 612 345 678',
    email: 'oleksandr.k@gmail.com',
    birthday: '1990-05-14',
    tier: 'VIP',
    points: 45.50,
    ltv: 350.20,
    visitCount: 24,
    lastVisitDate: '2026-07-10',
    favoriteDishes: ['Cappuccino', 'Avocado Toast', 'Croissant'],
    allergyNotes: 'Nuts (Peanuts)',
    notes: 'Regular guest, prefers oat milk in coffee.',
    joinedDate: '2025-09-01'
  },
  {
    id: 'g-2',
    name: 'Maria Garcia',
    phone: '+34 622 987 654',
    email: 'mgarcia@yahoo.es',
    birthday: '1985-11-22',
    tier: 'Gold',
    points: 18.20,
    ltv: 180.50,
    visitCount: 12,
    lastVisitDate: '2026-07-08',
    favoriteDishes: ['Flat White', 'Salmon Bagel'],
    notes: 'Often works from the Terrace on weekdays.',
    joinedDate: '2025-11-15'
  },
  {
    id: 'g-3',
    name: 'John Doe',
    phone: '+34 655 444 333',
    email: 'john.doe@corporate.com',
    birthday: '1988-02-28',
    tier: 'Silver',
    points: 8.50,
    ltv: 95.00,
    visitCount: 6,
    lastVisitDate: '2026-06-15', // Inactive (more than 25-30 days ago, depending on current date 2026-07-12)
    favoriteDishes: ['Espresso', 'Egg Benedict'],
    allergyNotes: 'Gluten (Severe)',
    notes: 'Leaves generous tips, usually orders takeaways.',
    joinedDate: '2026-01-20'
  },
  {
    id: 'g-4',
    name: 'Anna Petrova',
    phone: '+34 699 111 222',
    email: 'anna.p@mail.ru',
    birthday: '1995-07-07',
    tier: 'Bronze',
    points: 3.40,
    ltv: 34.00,
    visitCount: 2,
    lastVisitDate: '2026-07-11',
    favoriteDishes: ['Matcha Latte', 'Lemon Tart'],
    notes: 'Likes quiet corners in the VIP Room.',
    joinedDate: '2026-06-10'
  },
  {
    id: 'g-5',
    name: 'David Smith',
    phone: '+34 633 555 777',
    email: 'david.smith@techcorp.com',
    birthday: '1992-09-05',
    tier: 'VIP',
    points: 52.00,
    ltv: 410.00,
    visitCount: 30,
    lastVisitDate: '2026-07-12',
    favoriteDishes: ['Cold Brew', 'Vegan Burger', 'Acai Bowl'],
    notes: 'Vegan options only.',
    joinedDate: '2025-08-10'
  },
  {
    id: 'g-6',
    name: 'Elena Rodriguez',
    phone: '+34 644 888 999',
    email: 'elena.rod@hotmail.com',
    birthday: '1993-04-03',
    tier: 'Gold',
    points: 22.10,
    ltv: 215.30,
    visitCount: 15,
    lastVisitDate: '2026-07-09',
    favoriteDishes: ['Latte Macchiato', 'Pancakes'],
    allergyNotes: 'Dairy (Lactose intolerant)',
    notes: 'Prefers soy milk or coconut milk.',
    joinedDate: '2025-10-05'
  },
  {
    id: 'g-7',
    name: 'Marc Vila',
    phone: '+34 600 777 888',
    email: 'mvila@barcelona.cat',
    birthday: '1980-12-12',
    tier: 'Bronze',
    points: 1.50,
    ltv: 15.00,
    visitCount: 1,
    lastVisitDate: '2026-05-01', // Inactive
    favoriteDishes: ['Cortado', 'Pan con Tomate'],
    notes: 'Local customer, speaks Catalan.',
    joinedDate: '2026-05-01'
  },
  {
    id: 'g-8',
    name: 'Sophia Mueller',
    phone: '+34 677 222 111',
    email: 'sophia.m@domain.de',
    birthday: '1998-01-19',
    tier: 'Silver',
    points: 9.60,
    ltv: 120.00,
    visitCount: 8,
    lastVisitDate: '2026-07-05',
    favoriteDishes: ['Americano', 'Cinnamon Roll'],
    notes: 'Friendly tourist who decided to stay in BCN.',
    joinedDate: '2026-03-12'
  },
  {
    id: 'g-9',
    name: 'Lucas Martin',
    phone: '+34 688 333 444',
    email: 'lucas.m@gmail.com',
    birthday: '1987-08-30',
    tier: 'Bronze',
    points: 5.80,
    ltv: 58.00,
    visitCount: 4,
    lastVisitDate: '2026-07-11',
    favoriteDishes: ['Iced Latte', 'Club Sandwich'],
    notes: 'Comes during lunch break.',
    joinedDate: '2026-06-25'
  },
  {
    id: 'g-10',
    name: 'Yuki Tanaka',
    phone: '+34 611 222 333',
    email: 'yuki.t@tanaka.co.jp',
    birthday: '1991-03-25',
    tier: 'Gold',
    points: 25.00,
    ltv: 250.00,
    visitCount: 18,
    lastVisitDate: '2026-06-05', // Inactive (more than 30 days ago)
    favoriteDishes: ['Matcha Latte', 'Cheesecake', 'Mocha'],
    notes: 'Big fan of matcha products.',
    joinedDate: '2025-12-01'
  }
];

export const getGuests = (): Guest[] => {
  if (typeof window === 'undefined') return DEFAULT_GUESTS;
  
  const stored = localStorage.getItem('corgi_guests');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse guests", e);
    }
  }
  
  localStorage.setItem('corgi_guests', JSON.stringify(DEFAULT_GUESTS));
  return DEFAULT_GUESTS;
};

export const saveGuests = (guests: Guest[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('corgi_guests', JSON.stringify(guests));
  }
};

export interface LoyaltyConfig {
  bronzeRate: number;
  silverRate: number;
  goldRate: number;
  vipRate: number;
  silverThreshold: number;
  goldThreshold: number;
  vipThreshold: number;
}

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  bronzeRate: 0.05,
  silverRate: 0.08,
  goldRate: 0.10,
  vipRate: 0.15,
  silverThreshold: 75,
  goldThreshold: 150,
  vipThreshold: 300,
};

export const getLoyaltyConfig = (): LoyaltyConfig => {
  if (typeof window === 'undefined') return DEFAULT_LOYALTY_CONFIG;
  const stored = localStorage.getItem('corgi_loyalty_config');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse loyalty config", e);
    }
  }
  return DEFAULT_LOYALTY_CONFIG;
};

export const saveLoyaltyConfig = (config: LoyaltyConfig) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('corgi_loyalty_config', JSON.stringify(config));
  }
};

export const getTierCashbackRate = (tier: Guest['tier']): number => {
  const config = getLoyaltyConfig();
  switch (tier) {
    case 'Bronze': return config.bronzeRate;
    case 'Silver': return config.silverRate;
    case 'Gold': return config.goldRate;
    case 'VIP': return config.vipRate;
    default: return config.bronzeRate;
  }
};

export const updateTier = (ltv: number): Guest['tier'] => {
  const config = getLoyaltyConfig();
  if (ltv >= config.vipThreshold) return 'VIP';
  if (ltv >= config.goldThreshold) return 'Gold';
  if (ltv >= config.silverThreshold) return 'Silver';
  return 'Bronze';
};

export const updateGuestPointsAndLTV = (
  guestId: string,
  pointsEarned: number,
  pointsSpent: number,
  orderTotal: number,
  currentDate: string = new Date().toISOString().split('T')[0]
) => {
  const guests = getGuests();
  const updatedGuests = guests.map(g => {
    if (g.id === guestId) {
      const newLtv = parseFloat((g.ltv + orderTotal).toFixed(2));
      const newPoints = parseFloat((g.points + pointsEarned - pointsSpent).toFixed(2));
      const newTier = updateTier(newLtv);
      return {
        ...g,
        ltv: newLtv,
        points: newPoints >= 0 ? newPoints : 0,
        tier: newTier,
        visitCount: g.visitCount + 1,
        lastVisitDate: currentDate
      };
    }
    return g;
  });
  saveGuests(updatedGuests);
};
