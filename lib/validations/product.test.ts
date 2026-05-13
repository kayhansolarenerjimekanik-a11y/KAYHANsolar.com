import { describe, expect, it } from "vitest";

import { productInputSchema } from "./product";

const validBase = {
  slug: "test-urun",
  name: "Test Ürün",
  shortDescription: "abc12",
  categoryId: "cat-1",
  currentPrice: 100,
  stockQuantity: 5,
  lowStockThreshold: 3,
  media: [{ type: "image", url: "https://example.com/a.jpg" }],
};

describe("productInputSchema — lowStockThreshold", () => {
  it("accepts lowStockThreshold = 0 (means no low-stock alert)", () => {
    const result = productInputSchema.safeParse({ ...validBase, lowStockThreshold: 0 });
    expect(result.success).toBe(true);
  });

  it("rejects lowStockThreshold = -1", () => {
    const result = productInputSchema.safeParse({ ...validBase, lowStockThreshold: -1 });
    expect(result.success).toBe(false);
  });

  it("accepts lowStockThreshold = 3 (default)", () => {
    const result = productInputSchema.safeParse({ ...validBase, lowStockThreshold: 3 });
    expect(result.success).toBe(true);
  });
});

describe("productInputSchema — warrantyYears preprocess", () => {
  it("accepts empty string and converts to null", () => {
    const result = productInputSchema.safeParse({ ...validBase, warrantyYears: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.warrantyYears).toBeNull();
  });

  it("accepts numeric string '5'", () => {
    const result = productInputSchema.safeParse({ ...validBase, warrantyYears: "5" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.warrantyYears).toBe(5);
  });

  it("rejects warrantyYears > 20", () => {
    const result = productInputSchema.safeParse({ ...validBase, warrantyYears: 25 });
    expect(result.success).toBe(false);
  });
});

describe("productInputSchema — media URL", () => {
  it("accepts any HTTPS hostname (admin chose Option A)", () => {
    const result = productInputSchema.safeParse({
      ...validBase,
      media: [{ type: "image", url: "https://www.solinved.com/400w-sokak-aydinlatmasi#photos-1" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid URL", () => {
    const result = productInputSchema.safeParse({
      ...validBase,
      media: [{ type: "image", url: "not-a-url" }],
    });
    expect(result.success).toBe(false);
  });
});
