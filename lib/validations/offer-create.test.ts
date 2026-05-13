import { describe, expect, it } from "vitest";

import { offerCreateSchema } from "./offer-create";

const validBase = {
  fullName: "Ali Veli",
  phone: "5551234567",
  city: "Adana",
  district: "Seyhan",
  installationLocation: "roof" as const,
  installationAddress: "Mahalle X, No 5",
  detailedDescription: "Çatıya 5 kW sistem kurulumu istiyorum.",
};

describe("offerCreateSchema — fullName", () => {
  it("rejects fullName shorter than 3 chars", () => {
    const result = offerCreateSchema.safeParse({ ...validBase, fullName: "Al" });
    expect(result.success).toBe(false);
  });

  it("accepts fullName with exactly 3 chars", () => {
    const result = offerCreateSchema.safeParse({ ...validBase, fullName: "Ali" });
    expect(result.success).toBe(true);
  });

  it("rejects fullName longer than 120 chars", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      fullName: "a".repeat(121),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fullName", () => {
    const { fullName: _unused, ...rest } = validBase;
    const result = offerCreateSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe("offerCreateSchema — phone", () => {
  it("accepts plain 10-digit phone", () => {
    const result = offerCreateSchema.safeParse({ ...validBase, phone: "5551234567" });
    expect(result.success).toBe(true);
  });

  it("accepts phone with +, spaces, parentheses and dashes", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      phone: "+90 (555) 123-4567",
    });
    expect(result.success).toBe(true);
  });

  it("rejects phone shorter than 10 chars", () => {
    const result = offerCreateSchema.safeParse({ ...validBase, phone: "555123456" });
    expect(result.success).toBe(false);
  });

  it("rejects phone longer than 20 chars", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      phone: "+90 555 123 4567 8901",
    });
    expect(result.success).toBe(false);
  });

  it("rejects phone containing letters", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      phone: "555ABCDEFG",
    });
    expect(result.success).toBe(false);
  });
});

describe("offerCreateSchema — email", () => {
  it("accepts valid email", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      email: "test@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string email", () => {
    const result = offerCreateSchema.safeParse({ ...validBase, email: "" });
    expect(result.success).toBe(true);
  });

  it("accepts omitted email", () => {
    const result = offerCreateSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("rejects malformed email", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("offerCreateSchema — installationLocation", () => {
  it("accepts 'roof'", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      installationLocation: "roof",
    });
    expect(result.success).toBe(true);
  });

  it("accepts 'land'", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      installationLocation: "land",
    });
    expect(result.success).toBe(true);
  });

  it("accepts 'other'", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      installationLocation: "other",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown installationLocation", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      installationLocation: "balcony",
    });
    expect(result.success).toBe(false);
  });
});

describe("offerCreateSchema — installationAddress", () => {
  it("rejects address shorter than 5 chars", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      installationAddress: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects address longer than 500 chars", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      installationAddress: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts address with exactly 5 chars", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      installationAddress: "12345",
    });
    expect(result.success).toBe(true);
  });
});

describe("offerCreateSchema — city / district", () => {
  it("rejects city shorter than 2 chars", () => {
    const result = offerCreateSchema.safeParse({ ...validBase, city: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects district shorter than 2 chars", () => {
    const result = offerCreateSchema.safeParse({ ...validBase, district: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects district longer than 80 chars", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      district: "a".repeat(81),
    });
    expect(result.success).toBe(false);
  });
});

describe("offerCreateSchema — appliances", () => {
  it("defaults appliances to empty array when omitted", () => {
    const result = offerCreateSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.appliances).toEqual([]);
  });

  it("accepts an empty appliances array", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      appliances: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts appliance with name only (power & voltage optional)", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      appliances: [{ name: "Buzdolabı" }],
    });
    expect(result.success).toBe(true);
  });

  it("coerces numeric strings for powerW and voltage", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      appliances: [{ name: "Klima", powerW: "1200", voltage: "220" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.appliances[0].powerW).toBe(1200);
      expect(result.data.appliances[0].voltage).toBe(220);
    }
  });

  it("rejects appliance with name shorter than 2 chars", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      appliances: [{ name: "A" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects appliance with negative powerW", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      appliances: [{ name: "Klima", powerW: -100 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects appliance with negative voltage", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      appliances: [{ name: "Klima", voltage: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts powerW = 0 (unknown wattage)", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      appliances: [{ name: "Klima", powerW: 0 }],
    });
    expect(result.success).toBe(true);
  });
});

describe("offerCreateSchema — detailedDescription", () => {
  it("rejects description shorter than 10 chars", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      detailedDescription: "kısa",
    });
    expect(result.success).toBe(false);
  });

  it("rejects description longer than 2000 chars", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      detailedDescription: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts description with exactly 10 chars", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      detailedDescription: "1234567890",
    });
    expect(result.success).toBe(true);
  });

  it("accepts description with exactly 2000 chars", () => {
    const result = offerCreateSchema.safeParse({
      ...validBase,
      detailedDescription: "a".repeat(2000),
    });
    expect(result.success).toBe(true);
  });
});

describe("offerCreateSchema — full valid payload", () => {
  it("accepts a complete valid payload", () => {
    const result = offerCreateSchema.safeParse({
      fullName: "Ahmet Yılmaz",
      phone: "+90 (555) 123-4567",
      email: "ahmet@example.com",
      city: "İstanbul",
      district: "Kadıköy",
      installationLocation: "roof",
      installationAddress: "Caferağa Mah. Moda Cad. No: 10",
      appliances: [
        { name: "Buzdolabı", powerW: 200 },
        { name: "Klima", powerW: 1200, voltage: 220 },
      ],
      detailedDescription:
        "Çatıma 5 kW'lık şebekeden bağımsız bir sistem kurmak istiyorum.",
    });
    expect(result.success).toBe(true);
  });
});
