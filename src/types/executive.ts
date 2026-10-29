/**
 * src/types/executive.ts
 *
 * AI Executive Workflow Contracts: Automated Restocking & Expiration-Driven Menus
 */
import { PurchaseOrder } from './restaurant';
import type { InventoryItem } from './index';

export interface VendorRestockGroup {
  vendorName: string;
  vendorContact?: string;
  items: Array<{
    item: InventoryItem;
    deficit: number;
    subtotal: number;
  }>;
  totalOrderCost: number;
  draftPurchaseOrder: PurchaseOrder;
}

export interface RestockWorkflowResult {
  generatedAt: string;
  vendorGroups: VendorRestockGroup[];
  primaryVendorName: string;
  totalDeficitCost: number;
  totalDeficitItems: number;
  summaryMessage: string;
}

export interface ExpirationSurplusItem {
  item: InventoryItem;
  daysUntilExpiration: number;
  urgency: 'CRITICAL_48H' | 'NEAR_EXPIRY_72H' | 'SURPLUS_ABOVE_PAR';
  surplusQuantity: number;
  unitCost: number;
  dollarAtRisk: number;
}

export interface ExpirationMenuProposal {
  id: string;
  dishName: string;
  category: 'A La Carte Daily Special' | 'Chef Tasting Feature' | 'Banquet Carvery / Buffet';
  description: string;
  targetPrice: number;
  portionCost: number;
  foodCostPercentage: number;
  utilizedExpiringItems: Array<{
    ingredientName: string;
    quantity: number;
    unit: string;
    subtotal: number;
  }>;
  platingNotes: string;
  winePairing: string;
  station: string;
  chefInstructions: string;
}

export interface ExpirationWorkflowResult {
  generatedAt: string;
  expiringItemsCount: number;
  totalValueAtRisk: number;
  proposals: ExpirationMenuProposal[];
  summaryMessage: string;
}

export interface ExecutiveToastState {
  id: string;
  title: string;
  subtitle: string;
  stage: 'ANALYZING' | 'SYNTHESIZING' | 'COMPLETED' | 'ERROR';
  actionLabel?: string;
  onAction?: () => void;
  autoDismissMs?: number;
}
