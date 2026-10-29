import {
  EstablishmentType,
  EstablishmentProfile,
  StorageLocationConfig,
  TerminologyDictionary,
} from '../types/establishment';

export const TERMINOLOGY_DICTIONARIES: Record<EstablishmentType, TerminologyDictionary> = {
  BANQUET_COUNTRY_CLUB: {
    guestLabel: 'Member',
    guestPluralLabel: 'Guaranteed Members / Guests',
    eventLabel: 'Banquet / Gala',
    eventPluralLabel: 'Banquets & Member Events',
    venueTypeLabel: 'Country Club & Banquet Estate',
    prepCardTitle: 'Banquet Station Prep Card',
    heroTagline: 'Culinary Operations & Private Banquet Management',
    contractValueLabel: 'Contract Minimum / Banquet Total',
  },
  FINE_DINING: {
    guestLabel: 'Cover',
    guestPluralLabel: 'Reserved Covers',
    eventLabel: 'Private Buyout',
    eventPluralLabel: 'Private Buyouts & Wine Dinners',
    venueTypeLabel: 'Fine Dining & Tasting Room',
    prepCardTitle: 'Tasting Menu Mise en Place',
    heroTagline: 'Haute Cuisine Precision & Cellar Management',
    contractValueLabel: 'Buyout Guarantee / F&B Minimum',
  },
  STEAKHOUSE: {
    guestLabel: 'Guest',
    guestPluralLabel: 'Dining Room Covers',
    eventLabel: 'Private Dining Group',
    eventPluralLabel: 'Private Dining & Group Events',
    venueTypeLabel: 'Chop House & Premium Steakhouse',
    prepCardTitle: 'Butchery & Broiler Station Prep',
    heroTagline: 'Prime Butchery, Par Control & Private Dining',
    contractValueLabel: 'Private Room Minimum Spend',
  },
  BISTRO: {
    guestLabel: 'Cover',
    guestPluralLabel: 'Table Covers',
    eventLabel: 'Evening Service / Special',
    eventPluralLabel: 'Services & Tasting Dinners',
    venueTypeLabel: 'Neighborhood French Bistro',
    prepCardTitle: 'Daily Line Mise en Place',
    heroTagline: 'Market-Fresh Daily Prep & Cellar Control',
    contractValueLabel: 'Service Revenue Target',
  },
  CASUAL_GASTROPUB: {
    guestLabel: 'Patron',
    guestPluralLabel: 'Table Guests & Bar Seats',
    eventLabel: 'Tap Takeover / Group Booking',
    eventPluralLabel: 'Events & Group Bookings',
    venueTypeLabel: 'Craft Gastropub & Brewhouse',
    prepCardTitle: 'Line & Fryer Station Mise',
    heroTagline: 'High-Volume Taproom & Scratch Kitchen',
    contractValueLabel: 'Guaranteed Group Spend',
  },
  CAFE_BAKERY: {
    guestLabel: 'Customer',
    guestPluralLabel: 'Counter Orders & Headcount',
    eventLabel: 'Catering Batch / Corporate Order',
    eventPluralLabel: 'Catering Batches & Wholesale Orders',
    venueTypeLabel: 'Artisan Bakery & Specialty Café',
    prepCardTitle: 'Daily Bake & Production Mise',
    heroTagline: 'Scratch Baking Production & Wholesale Par Engine',
    contractValueLabel: 'Invoice Total',
  },
};

export const ARCHETYPE_METADATA: Record<
  EstablishmentType,
  { defaultName: string; shortBadge: string; description: string; icon: string }
> = {
  BANQUET_COUNTRY_CLUB: {
    defaultName: 'Waverley Country Club',
    shortBadge: 'Country Club & Banquets',
    description: 'High-capacity member banquets, golf events, fine galas, and multi-course plated dinners.',
    icon: '🏰',
  },
  FINE_DINING: {
    defaultName: 'L’Auberge Étoile',
    shortBadge: 'Michelin / Tasting Room',
    description: 'Pre-fixe tasting menus, wine pairings, exclusive buyouts, and meticulous line mise en place.',
    icon: '✨',
  },
  STEAKHOUSE: {
    defaultName: 'Black Angus Reserve Chop House',
    shortBadge: 'Prime Chop House',
    description: 'Dry-aged prime cuts, raw seafood bar, extensive cellar, and high-dollar private dining rooms.',
    icon: '🥩',
  },
  BISTRO: {
    defaultName: 'Le Petit Bistro & Bar',
    shortBadge: 'Neighborhood Bistro',
    description: 'Daily blackboard specials, seasonal local ingredients, natural wines, and intimate dinner service.',
    icon: '🍷',
  },
  CASUAL_GASTROPUB: {
    defaultName: 'The Copper Kettle Taproom',
    shortBadge: 'Gastropub & Brewhouse',
    description: 'Craft beer tap takeovers, gourmet comfort burgers, weekend brunch, and sports viewings.',
    icon: '🍺',
  },
  CAFE_BAKERY: {
    defaultName: 'Artisan Flour & Bean Bakery',
    shortBadge: 'Bakery & Roastery',
    description: 'Early morning dough batches, artisan croissants, espresso bar, and corporate breakfast catering.',
    icon: '🥐',
  },
};

export const DEFAULT_LOCATIONS_BY_TYPE: Record<EstablishmentType, StorageLocationConfig[]> = {
  BANQUET_COUNTRY_CLUB: [
    { id: 'loc-bcc-1', name: 'Walk-In Cooler', isNonFoodZone: false, displayOrder: 1 },
    { id: 'loc-bcc-2', name: 'Dry Prep', isNonFoodZone: false, displayOrder: 2 },
    { id: 'loc-bcc-3', name: 'Freezer', isNonFoodZone: false, displayOrder: 3 },
    { id: 'loc-bcc-4', name: 'Bar', isNonFoodZone: false, displayOrder: 4 },
    { id: 'loc-bcc-5', name: 'Chemical Storage', isNonFoodZone: true, displayOrder: 5 },
    { id: 'loc-bcc-6', name: 'Janitorial / Facilities', isNonFoodZone: true, displayOrder: 6 },
    { id: 'loc-bcc-7', name: 'Paper Goods', isNonFoodZone: true, displayOrder: 7 },
    { id: 'loc-bcc-8', name: 'Bar Consumables', isNonFoodZone: true, displayOrder: 8 },
  ],
  FINE_DINING: [
    { id: 'loc-fd-1', name: 'Walk-In Cooler', isNonFoodZone: false, displayOrder: 1 },
    { id: 'loc-fd-2', name: 'Dry Aging Cabinet', isNonFoodZone: false, displayOrder: 2 },
    { id: 'loc-fd-3', name: 'Pastry Walk-In', isNonFoodZone: false, displayOrder: 3 },
    { id: 'loc-fd-4', name: 'Sommelier Wine Cellar', isNonFoodZone: false, displayOrder: 4 },
    { id: 'loc-fd-5', name: 'Linen & Tableware Vault', isNonFoodZone: true, displayOrder: 5 },
    { id: 'loc-fd-6', name: 'Dish Machine Chemistry', isNonFoodZone: true, displayOrder: 6 },
    { id: 'loc-fd-7', name: 'Service Station Supplies', isNonFoodZone: true, displayOrder: 7 },
  ],
  STEAKHOUSE: [
    { id: 'loc-sh-1', name: 'Meat Locker (Dry-Age)', isNonFoodZone: false, displayOrder: 1 },
    { id: 'loc-sh-2', name: 'Main Kitchen Walk-In', isNonFoodZone: false, displayOrder: 2 },
    { id: 'loc-sh-3', name: 'Broiler Line Reach-In', isNonFoodZone: false, displayOrder: 3 },
    { id: 'loc-sh-4', name: 'Main Bar Reach-In', isNonFoodZone: false, displayOrder: 4 },
    { id: 'loc-sh-5', name: 'Sanitation Chemicals', isNonFoodZone: true, displayOrder: 5 },
    { id: 'loc-sh-6', name: 'Bar Disposables & Picks', isNonFoodZone: true, displayOrder: 6 },
    { id: 'loc-sh-7', name: 'Kitchen Linen & Aprons', isNonFoodZone: true, displayOrder: 7 },
  ],
  BISTRO: [
    { id: 'loc-bs-1', name: 'Walk-In Cooler', isNonFoodZone: false, displayOrder: 1 },
    { id: 'loc-bs-2', name: 'Dry Pantry', isNonFoodZone: false, displayOrder: 2 },
    { id: 'loc-bs-3', name: 'Bar Under-Counter', isNonFoodZone: false, displayOrder: 3 },
    { id: 'loc-bs-4', name: 'Charcuterie Prep Cooler', isNonFoodZone: false, displayOrder: 4 },
    { id: 'loc-bs-5', name: 'Warewash Chemicals', isNonFoodZone: true, displayOrder: 5 },
    { id: 'loc-bs-6', name: 'Paper & Takeaway Consumables', isNonFoodZone: true, displayOrder: 6 },
    { id: 'loc-bs-7', name: 'Facilities & Janitorial', isNonFoodZone: true, displayOrder: 7 },
  ],
  CASUAL_GASTROPUB: [
    { id: 'loc-gp-1', name: 'Walk-In Keg & Food Cooler', isNonFoodZone: false, displayOrder: 1 },
    { id: 'loc-gp-2', name: 'Fry Line Reach-In', isNonFoodZone: false, displayOrder: 2 },
    { id: 'loc-gp-3', name: 'Dry Storage Racks', isNonFoodZone: false, displayOrder: 3 },
    { id: 'loc-gp-4', name: 'Taproom Bar Back', isNonFoodZone: false, displayOrder: 4 },
    { id: 'loc-gp-5', name: 'Draft Line Cleaner & Chemicals', isNonFoodZone: true, displayOrder: 5 },
    { id: 'loc-gp-6', name: 'Eco Disposables & Baskets', isNonFoodZone: true, displayOrder: 6 },
    { id: 'loc-gp-7', name: 'Janitorial Supplies', isNonFoodZone: true, displayOrder: 7 },
  ],
  CAFE_BAKERY: [
    { id: 'loc-cb-1', name: 'Proofer & Retarder Walk-In', isNonFoodZone: false, displayOrder: 1 },
    { id: 'loc-cb-2', name: 'Flour & Grain Dry Silo Room', isNonFoodZone: false, displayOrder: 2 },
    { id: 'loc-cb-3', name: 'Dairy & Butter Cooler', isNonFoodZone: false, displayOrder: 3 },
    { id: 'loc-cb-4', name: 'Espresso Bar Reach-In', isNonFoodZone: false, displayOrder: 4 },
    { id: 'loc-cb-5', name: 'Bakery Boxes & Bags', isNonFoodZone: true, displayOrder: 5 },
    { id: 'loc-cb-6', name: 'Dish & Sanitizer Chemicals', isNonFoodZone: true, displayOrder: 6 },
    { id: 'loc-cb-7', name: 'Hot Cups & Beverage Consumables', isNonFoodZone: true, displayOrder: 7 },
  ],
};

export function getTerminology(type: EstablishmentType): TerminologyDictionary {
  return TERMINOLOGY_DICTIONARIES[type] || TERMINOLOGY_DICTIONARIES.BANQUET_COUNTRY_CLUB;
}

export function getDefaultLocationsForType(type: EstablishmentType): StorageLocationConfig[] {
  return JSON.parse(JSON.stringify(DEFAULT_LOCATIONS_BY_TYPE[type] || DEFAULT_LOCATIONS_BY_TYPE.BANQUET_COUNTRY_CLUB));
}

export function getDefaultProfileForType(type: EstablishmentType = 'BANQUET_COUNTRY_CLUB'): EstablishmentProfile {
  const meta = ARCHETYPE_METADATA[type];
  return {
    id: `est-${type.toLowerCase()}`,
    name: meta ? meta.defaultName : 'Waverley Country Club',
    type,
    primaryLocations: getDefaultLocationsForType(type),
    currencySymbol: '$',
  };
}
