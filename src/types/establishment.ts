export type EstablishmentType =
  | 'FINE_DINING'
  | 'STEAKHOUSE'
  | 'CASUAL_GASTROPUB'
  | 'BISTRO'
  | 'CAFE_BAKERY'
  | 'BANQUET_COUNTRY_CLUB';

export interface StorageLocationConfig {
  id: string;
  name: string;
  isNonFoodZone: boolean;
  displayOrder: number;
}

export interface EstablishmentProfile {
  id: string;
  name: string;
  type: EstablishmentType;
  primaryLocations: StorageLocationConfig[];
  currencySymbol: string;
}

export interface TerminologyDictionary {
  guestLabel: string;
  guestPluralLabel: string;
  eventLabel: string;
  eventPluralLabel: string;
  venueTypeLabel: string;
  prepCardTitle: string;
  heroTagline: string;
  contractValueLabel: string;
}
