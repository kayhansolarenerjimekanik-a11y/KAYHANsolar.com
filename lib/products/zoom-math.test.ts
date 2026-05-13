import { describe, expect, it } from "vitest";

import { clamp01, computeLensRect } from "./zoom-math";

describe("clamp01", () => {
  it("returns 0 for negative input", () => {
    expect(clamp01(-0.5)).toBe(0);
  });

  it("returns 1 for input above 1", () => {
    expect(clamp01(1.5)).toBe(1);
  });

  it("returns same value for input in 0..1 range", () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1)).toBe(1);
  });
});

describe("computeLensRect", () => {
  it("centers lens for center cursor at 2x zoom", () => {
    const r = computeLensRect(0.5, 0.5, 2);
    expect(r.widthPct).toBe(50);
    expect(r.heightPct).toBe(50);
    expect(r.leftPct).toBe(25);
    expect(r.topPct).toBe(25);
  });

  it("places lens at origin for top-left cursor at 2x zoom", () => {
    const r = computeLensRect(0, 0, 2);
    expect(r.leftPct).toBe(0);
    expect(r.topPct).toBe(0);
  });

  it("places lens at edge for bottom-right cursor at 2x zoom", () => {
    const r = computeLensRect(1, 1, 2);
    expect(r.leftPct).toBe(50);
    expect(r.topPct).toBe(50);
  });

  it("returns smaller lens at 3x zoom", () => {
    const r = computeLensRect(0.5, 0.5, 3);
    expect(r.widthPct).toBeCloseTo(33.333, 2);
    expect(r.heightPct).toBeCloseTo(33.333, 2);
  });

  it("clamps out-of-bounds cursor coordinates", () => {
    const r = computeLensRect(-0.5, 1.5, 2);
    expect(r.leftPct).toBe(0);
    expect(r.topPct).toBe(50);
  });
});
