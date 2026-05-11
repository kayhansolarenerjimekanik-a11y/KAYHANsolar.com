import type { Campaign } from "@/types";

import { asAppliedCampaign, evaluateCampaign } from "./rules";
import type { CartCalculation, CartCalculationInput } from "./types";

export function applyCampaigns(
  input: CartCalculationInput,
  campaigns: Campaign[],
): CartCalculation {
  const subtotal = input.items.reduce(
    (s, item) => s + item.price * item.quantity,
    0,
  );

  const applied = campaigns
    .map((c) => evaluateCampaign(c, input))
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort(
      (a, b) =>
        (b.campaign.displayPriority ?? 0) - (a.campaign.displayPriority ?? 0),
    )
    .map(({ campaign, result }) => asAppliedCampaign(campaign, result));

  const totalDiscount = applied.reduce(
    (s, a) => s + a.discountAmount,
    0,
  );
  const freeShipping = applied.some((a) => a.freeShipping);

  const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
  const shippingCost = freeShipping
    ? 0
    : discountedSubtotal >= input.freeShippingThreshold
      ? 0
      : input.baseShippingCost;

  return {
    subtotal,
    totalDiscount,
    appliedCampaigns: applied,
    shippingCost,
    total: discountedSubtotal + shippingCost,
  };
}

export type {
  AppliedCampaign,
  CartCalculation,
  CartCalculationInput,
} from "./types";
