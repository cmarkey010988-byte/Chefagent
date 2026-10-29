export type EventCategory =
  | 'BANQUET'
  | 'BUFFET'
  | 'A_LA_CARTE_SPECIAL'
  | 'CATERING_DELIVERY'
  | 'KITCHEN_MAINTENANCE'
  | 'STAFF_MEETING';

export type EventStatus = 'PLANNED' | 'IN_PREP' | 'COMPLETED' | 'CANCELLED';

export type BanquetCourse =
  | 'APPETIZER'
  | 'SALAD'
  | 'ENTREE'
  | 'DESSERT'
  | 'BUFFET_STATION'
  | 'BEVERAGE';

export interface BanquetMenuItem {
  id: string;
  recipeOrIngredientId: string;
  itemName: string;
  course: BanquetCourse;
  targetPortions: number;
  estimatedCostPerPortion: number;
  prepNotes?: string;
  stationAssignment?: 'Sauce/Sauté' | 'Butchery' | 'Garde Manger' | 'Pastry';
}

export interface KitchenEvent {
  id: string;
  title: string;
  category: EventCategory;
  status: EventStatus;
  startTime: number; // Unix timestamp
  endTime: number;   // Unix timestamp
  expectedGuestCount: number;
  guaranteedHeadcount?: number;
  location: string; // e.g., "Grand Ballroom", "Patio Bar", "Main Dining Room", "Wine Cellar"
  clientName?: string;
  eventNotes?: string;
  menuPlan: BanquetMenuItem[]; // Associated banquet/buffet menu items
  // External Sync Flags
  isSyncedToGoogle?: boolean;
  googleCalendarEventId?: string;
  lastSyncedTimestamp?: number;
  createdTimestamp: number;
  updatedTimestamp: number;
}
