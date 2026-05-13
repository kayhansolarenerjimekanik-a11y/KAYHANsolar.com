import { describe, expect, it } from "vitest";

import { productFieldLabel } from "./field-labels";

describe("productFieldLabel", () => {
  it("returns Turkish label for known field", () => {
    expect(productFieldLabel("lowStockThreshold")).toBe("Düşük stok eşiği");
    expect(productFieldLabel("categoryId")).toBe("Kategori");
    expect(productFieldLabel("currentPrice")).toBe("Satış fiyatı");
    expect(productFieldLabel("warrantyYears")).toBe("Garanti (yıl)");
    expect(productFieldLabel("hasFreeShipping")).toBe("Kargo bedava");
    expect(productFieldLabel("media")).toBe("Medya listesi");
  });

  it("parses media.N.url path to '1-indexed medya URL'", () => {
    expect(productFieldLabel("media.0.url")).toBe("1. medya URL");
    expect(productFieldLabel("media.2.url")).toBe("3. medya URL");
  });

  it("parses media.N.altText", () => {
    expect(productFieldLabel("media.0.altText")).toBe("1. medya alt metin");
  });

  it("parses media.N.thumbnailUrl", () => {
    expect(productFieldLabel("media.1.thumbnailUrl")).toBe("2. medya küçük görsel");
  });

  it("parses media.N.type", () => {
    expect(productFieldLabel("media.0.type")).toBe("1. medya tip");
  });

  it("falls back to raw field name for unknown", () => {
    expect(productFieldLabel("foobar")).toBe("foobar");
    expect(productFieldLabel("technicalSpecs.someKey")).toBe("technicalSpecs.someKey");
  });
});
