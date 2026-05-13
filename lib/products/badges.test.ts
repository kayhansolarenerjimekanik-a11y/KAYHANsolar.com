import { describe, expect, it } from "vitest";

import { deriveBadges } from "./badges";

const base = {
  hasFreeShipping: false,
  isFeatured: false,
  isNewArrival: false,
  stockQuantity: 100,
  lowStockThreshold: 3,
  warrantyYears: null,
} as const;

describe("deriveBadges", () => {
  it("returns empty array when no flags are set", () => {
    expect(deriveBadges(base)).toEqual([]);
  });

  it("returns kargo_bedava when hasFreeShipping is true", () => {
    expect(deriveBadges({ ...base, hasFreeShipping: true })).toEqual([
      "kargo_bedava",
    ]);
  });

  it("returns yeni when isNewArrival is true", () => {
    expect(deriveBadges({ ...base, isNewArrival: true })).toEqual(["yeni"]);
  });

  it("returns tercih_edilen when isFeatured is true", () => {
    expect(deriveBadges({ ...base, isFeatured: true })).toEqual([
      "tercih_edilen",
    ]);
  });

  it("returns stokta_son when stockQuantity > 0 and <= lowStockThreshold", () => {
    expect(
      deriveBadges({ ...base, stockQuantity: 3, lowStockThreshold: 3 }),
    ).toEqual(["stokta_son"]);
    expect(
      deriveBadges({ ...base, stockQuantity: 1, lowStockThreshold: 3 }),
    ).toEqual(["stokta_son"]);
  });

  it("does NOT return stokta_son when stockQuantity is 0", () => {
    expect(
      deriveBadges({ ...base, stockQuantity: 0, lowStockThreshold: 3 }),
    ).toEqual([]);
  });

  it("does NOT return stokta_son when stockQuantity > threshold", () => {
    expect(
      deriveBadges({ ...base, stockQuantity: 4, lowStockThreshold: 3 }),
    ).toEqual([]);
  });

  it("returns 5_yil_garanti only for warrantyYears === 5", () => {
    expect(deriveBadges({ ...base, warrantyYears: 5 })).toEqual([
      "5_yil_garanti",
    ]);
  });

  it("returns 10_yil_garanti only for warrantyYears === 10", () => {
    expect(deriveBadges({ ...base, warrantyYears: 10 })).toEqual([
      "10_yil_garanti",
    ]);
  });

  it("returns no warranty badge for other warranty values", () => {
    expect(deriveBadges({ ...base, warrantyYears: 3 })).toEqual([]);
    expect(deriveBadges({ ...base, warrantyYears: 0 })).toEqual([]);
    expect(deriveBadges({ ...base, warrantyYears: null })).toEqual([]);
  });

  it("composes multiple badges in stable order", () => {
    expect(
      deriveBadges({
        hasFreeShipping: true,
        isFeatured: true,
        isNewArrival: true,
        stockQuantity: 2,
        lowStockThreshold: 3,
        warrantyYears: 5,
      }),
    ).toEqual([
      "kargo_bedava",
      "yeni",
      "tercih_edilen",
      "stokta_son",
      "5_yil_garanti",
    ]);
  });
});
