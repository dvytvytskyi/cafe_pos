export interface DiscountPreset {
  id: string;
  name: string;
  value: number; // percentage
  color?: string;
}

export const DEFAULT_DISCOUNTS: DiscountPreset[] = [
  { id: '1', name: 'Staff Meal', value: 50 },
  { id: '2', name: 'Friends & Family', value: 15 },
  { id: '3', name: 'Loyalty / VIP', value: 10 },
  { id: '4', name: 'Military / Service', value: 10 },
  { id: '5', name: 'Student', value: 5 },
  { id: '6', name: 'Senior', value: 10 },
  { id: '7', name: 'Happy Hour', value: 20 },
  { id: '8', name: 'Promo Code 1', value: 5 },
  { id: '9', name: 'Promo Code 2', value: 10 },
  { id: '10', name: 'Partner', value: 25 },
  { id: '11', name: 'Birthday', value: 15 },
  { id: '12', name: 'Social Media', value: 5 },
  { id: '13', name: 'Neighborhood', value: 10 },
  { id: '14', name: 'Early Bird', value: 15 },
  { id: '15', name: 'Special Event', value: 20 },
];

// Helper to get from local storage or return defaults
export const getDiscountPresets = (): DiscountPreset[] => {
  if (typeof window === 'undefined') return DEFAULT_DISCOUNTS;
  
  const stored = localStorage.getItem('corgi_discounts_v2'); // updated key to ignore old colored ones
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse discounts", e);
    }
  }
  
  // Set defaults initially if missing
  localStorage.setItem('corgi_discounts_v2', JSON.stringify(DEFAULT_DISCOUNTS));
  return DEFAULT_DISCOUNTS;
};

export const saveDiscountPresets = (presets: DiscountPreset[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('corgi_discounts_v2', JSON.stringify(presets));
  }
};
