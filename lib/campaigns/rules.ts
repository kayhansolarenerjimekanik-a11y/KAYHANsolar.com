import type { Campaign } from "@/types";

import type { AppliedCampaign, CartCalculationInput } from "./types";

function matchesCampaign(
  productId: string,
  input: CartCalculationInput,
  campaign: Campaign,
): boolean {
  if (campaign.applicableTo === "all") return true;
  if (campaign.applicableTo === "product") {
    return campaign.targetIds.includes(productId);
  }
  if (campaign.applicableTo === "category") {
    const categoryId = input.productCategoryById[productId];
    return categoryId ? campaign.targetIds.includes(categoryId) : false;
  }
  return false;
}

function readNumber(
  config: Record<string, unknown>,
  key: string,
  fallback = 0,
): number {
  const v = config[key];
  return typeof v === "number" ? v : fallback;
}

interface RuleApplication {
  discountAmount: number;
  freeShipping: boolean;
}

export function applyPercentOff(
  campaign: Campaign,
  input: CartCalculationInput,
): RuleApplication {
  const pct = readNumber(campaign.ruleConfig, "discountPercent");
  if (pct <= 0) return { discountAmount: 0, freeShipping: false };
  let discount = 0;
  for (const item of input.items) {
    if (!matchesCampaign(item.productId, input, campaign)) continue;
    discount += item.price * item.quantity * (pct / 100);
  }
  return { discountAmount: Math.round(discount), freeShipping: false };
}

export function applyBuyXGetY(
  campaign: Campaign,
  input: CartCalculationInput,
): RuleApplication {
  const buyQty = readNumber(campaign.ruleConfig, "buyQuantity");
  const getQty = readNumber(campaign.ruleConfig, "getQuantity", 1);
  const pct = readNumber(campaign.ruleConfig, "discountPercent");
  if (buyQty <= 0 || getQty <= 0 || pct <= 0) {
    return { discountAmount: 0, freeShipping: false };
  }
  const matchingUnitPrices: number[] = [];
  for (const item of input.items) {
    if (!matchesCampaign(item.productId, input, campaign)) continue;
    for (let i = 0; i < item.quantity; i++) {
      matchingUnitPrices.push(item.price);
    }
  }
  if (matchingUnitPrices.length < buyQty + getQty) {
    return { discountAmount: 0, freeShipping: false };
  }
  matchingUnitPrices.sort((a, b) => a - b);
  const groupSize = buyQty + getQty;
  const groupCount = Math.floor(matchingUnitPrices.length / groupSize);
  let discount = 0;
  for (let g = 0; g < groupCount; g++) {
    for (let j = 0; j < getQty; j++) {
      const idx = g * groupSize + j;
      discount += matchingUnitPrices[idx] * (pct / 100);
    }
  }
  return { discountAmount: Math.round(discount), freeShipping: false };
}

export function applyBundleDiscount(
  campaign: Campaign,
  input: CartCalculationInput,
): RuleApplication {
  const requiredIds = (campaign.ruleConfig.requiredProductIds as string[] | undefined) ?? [];
  const discountAmount = readNumber(campaign.ruleConfig, "discountAmount");
  if (requiredIds.length === 0 || discountAmount <= 0) {
    return { discountAmount: 0, freeShipping: false };
  }
  const inCart = new Set(input.items.map((i) => i.productId));
  const allPresent = requiredIds.every((id) => inCart.has(id));
  return allPresent
    ? { discountAmount: Math.round(discountAmount), freeShipping: false }
    : { discountAmount: 0, freeShipping: false };
}

export function applyFreeShipping(
  campaign: Campaign,
  input: CartCalculationInput,
): RuleApplication {
  const anyMatch = input.items.some((item) =>
    matchesCampaign(item.productId, input, campaign),
  );
  return { discountAmount: 0, freeShipping: anyMatch };
}

export function applyFixedAmountOff(
  campaign: Campaign,
  input: CartCalculationInput,
): RuleApplication {
  const amount = readNumber(campaign.ruleConfig, "discountAmount");
  if (amount <= 0) return { discountAmount: 0, freeShipping: false };
  const anyMatch = input.items.some((item) =>
    matchesCampaign(item.productId, input, campaign),
  );
  return anyMatch
    ? { discountAmount: Math.round(amount), freeShipping: false }
    : { discountAmount: 0, freeShipping: false };
}

export function isActiveNow(campaign: Campaign): boolean {
  if (!campaign.isActive) return false;
  const now = Date.now();
  const start = +new Date(campaign.startDate);
  if (start > now) return false;
  if (campaign.endDate) {
    const end = +new Date(campaign.endDate);
    if (end < now) return false;
  }
  return true;
}

export function evaluateCampaign(
  campaign: Campaign,
  input: CartCalculationInput,
): { result: RuleApplication; campaign: Campaign } | null {
  if (!isActiveNow(campaign)) return null;
  let result: RuleApplication;
  switch (campaign.ruleType) {
    case "percent_off":
      result = applyPercentOff(campaign, input);
      break;
    case "buy_x_get_y_discount":
      result = applyBuyXGetY(campaign, input);
      break;
    case "bundle_discount":
      result = applyBundleDiscount(campaign, input);
      break;
    case "free_shipping":
      result = applyFreeShipping(campaign, input);
      break;
    case "fixed_amount_off":
      result = applyFixedAmountOff(campaign, input);
      break;
    default:
      return null;
  }
  if (result.discountAmount === 0 && !result.freeShipping) return null;
  return { result, campaign };
}

export function asAppliedCampaign(
  campaign: Campaign,
  result: RuleApplication,
): AppliedCampaign {
  return {
    campaignId: campaign.id,
    title: campaign.title,
    ruleType: campaign.ruleType,
    discountAmount: result.discountAmount,
    freeShipping: result.freeShipping,
  };
}
