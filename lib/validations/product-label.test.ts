import { describe, expect, it } from "vitest";

import { labelInputSchema } from "./product-label";

describe("labelInputSchema", () => {
  it("accepts valid input", () => {
    const result = labelInputSchema.safeParse({ name: "Yılbaşı", color: "red" });
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 chars", () => {
    const result = labelInputSchema.safeParse({ name: "A", color: "lime" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 30 chars", () => {
    const result = labelInputSchema.safeParse({
      name: "A".repeat(31),
      color: "lime",
    });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from name", () => {
    const result = labelInputSchema.safeParse({ name: "  Pop  ", color: "blue" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Pop");
  });

  it("rejects invalid color", () => {
    const result = labelInputSchema.safeParse({ name: "Test", color: "orange" });
    expect(result.success).toBe(false);
  });

  it("accepts each of 6 colors", () => {
    for (const c of ["lime", "red", "yellow", "blue", "purple", "gray"] as const) {
      const result = labelInputSchema.safeParse({ name: "Test", color: c });
      expect(result.success).toBe(true);
    }
  });
});
