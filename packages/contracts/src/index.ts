export * from './menu-pricing';

export type GuestLocale = 'en' | 'es' | 'ca' | 'uk';

export interface GuestModifierOption {
  id: string;
  name: string;
  price: number;
}

export interface GuestModifierGroup {
  id: string;
  name: string;
  minQty: number;
  maxQty: number;
  options: GuestModifierOption[];
}

export interface GuestMenuCategory {
  id: string;
  name: string;
}

export interface GuestMenuItem {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string;
  image: string;
  basePrice: number;
  allergens: string[];
  tags: string[];
  modifierGroups: GuestModifierGroup[];
}

export interface GuestMenuResponse {
  categories: GuestMenuCategory[];
  items: GuestMenuItem[];
  locale: string;
}

export interface GuestBootstrapResponse {
  locationId: string;
  locationName: string;
  tableId?: string;
  tableNumber?: string;
  locale: GuestLocale;
  supportedLocales: GuestLocale[];
  features: {
    menu: boolean;
    merch: boolean;
    loyalty: boolean;
    orders: boolean;
  };
  branding: {
    name: string;
    themeColor: string;
  };
}

export interface GuestMerchItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  image: string;
  price: number;
  stock: number;
  unit: string;
}

export interface GuestCartModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
}

export interface GuestOrderLineItem {
  menuItemId?: string;
  merchSkuId?: string;
  itemType: 'food' | 'merch';
  name: string;
  quantity: number;
  unitPrice: number;
  comments?: string;
  modifiers?: GuestCartModifier[];
}

export interface GuestCreateOrderRequest {
  locationId: string;
  tableId?: string;
  items: GuestOrderLineItem[];
  tipType?: 'percent' | 'fixed';
  tipValue?: number;
  customerId?: string;
  pointsToSpend?: number;
  customerName?: string;
}

export interface GuestOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  source: string;
  total: number;
  paid: boolean;
  pointsToSpend?: number;
  tableId?: string;
  createdAt: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    itemType: string;
    comments?: string;
  }>;
}

export interface GuestCustomerProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  tier: string;
  points: number;
  ltv: number;
  allergyNotes?: string;
  phoneVerified: boolean;
}

export interface GuestLoyaltyResponse {
  customer: GuestCustomerProfile;
  config: {
    bronzeRate: number;
    silverRate: number;
    goldRate: number;
    vipRate: number;
    silverThreshold: number;
    goldThreshold: number;
    vipThreshold: number;
  };
  nextTier?: string;
  pointsToNextTier?: number;
  qrCode: string;
}

export interface GuestLoyaltyTransaction {
  id: string;
  type: 'earn' | 'spend';
  points: number;
  orderId?: string;
  createdAt: string;
}
