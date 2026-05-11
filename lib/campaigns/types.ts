export interface AppliedCampaign {
  campaignId: string;
  title: string;
  ruleType: string;
  discountAmount: number; // positive TRY off the subtotal
  freeShipping: boolean;
}

export interface CartCalculationInput {
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  productCategoryById: Record<string, string>; // productId -> categoryId
  baseShippingCost: number;
  freeShippingThreshold: number;
}

export interface CartCalculation {
  subtotal: number;
  totalDiscount: number;
  appliedCampaigns: AppliedCampaign[];
  shippingCost: number;
  total: number;
}
