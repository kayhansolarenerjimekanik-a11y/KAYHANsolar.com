import { describe, expect, it } from "vitest";

import { applyCampaigns } from "./index";

const noCampaigns: never[] = [];

describe("applyCampaigns — hasFreeShipping per item", () => {
  it("free shipping when at least one cart item has hasFreeShipping=true", () => {
    const result = applyCampaigns(
      {
        items: [
          { productId: "p1", quantity: 1, price: 1000, hasFreeShipping: true },
          { productId: "p2", quantity: 1, price: 2000, hasFreeShipping: false },
        ],
        productCategoryById: { p1: "c1", p2: "c2" },
        baseShippingCost: 500,
        freeShippingThreshold: 50000,
      },
      noCampaigns,
    );
    expect(result.shippingCost).toBe(0);
    expect(result.total).toBe(3000);
  });

  it("normal shipping when no item has hasFreeShipping", () => {
    const result = applyCampaigns(
      {
        items: [
          { productId: "p1", quantity: 1, price: 1000, hasFreeShipping: false },
        ],
        productCategoryById: { p1: "c1" },
        baseShippingCost: 500,
        freeShippingThreshold: 50000,
      },
      noCampaigns,
    );
    expect(result.shippingCost).toBe(500);
    expect(result.total).toBe(1500);
  });

  it("subtotal threshold still kicks in even without hasFreeShipping", () => {
    const result = applyCampaigns(
      {
        items: [
          { productId: "p1", quantity: 100, price: 1000, hasFreeShipping: false },
        ],
        productCategoryById: { p1: "c1" },
        baseShippingCost: 500,
        freeShippingThreshold: 50000,
      },
      noCampaigns,
    );
    expect(result.shippingCost).toBe(0);
  });
});
