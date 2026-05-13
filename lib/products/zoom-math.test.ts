import { describe, expect, it } from "vitest";

import {
  clamp01,
  computeLensRect,
  escapeCssUrl,
  isHttpsUrl,
} from "./zoom-math";

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

describe("isHttpsUrl", () => {
  it("returns true for https URLs", () => {
    expect(isHttpsUrl("https://example.com/foo.png")).toBe(true);
  });

  it("returns false for http URLs", () => {
    expect(isHttpsUrl("http://example.com/foo.png")).toBe(false);
  });

  it("returns false for javascript: pseudo-protocol (XSS guard)", () => {
    expect(isHttpsUrl("javascript:alert(1)")).toBe(false);
  });

  it("returns false for data: URIs", () => {
    expect(isHttpsUrl("data:image/png;base64,iVBORw0KG")).toBe(false);
  });

  it("returns false for relative paths", () => {
    expect(isHttpsUrl("/images/foo.png")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isHttpsUrl("")).toBe(false);
  });
});

describe("escapeCssUrl", () => {
  it("escapes double quotes (prevents CSS string escape)", () => {
    expect(escapeCssUrl('https://x.com/a"evil')).toBe(
      "https://x.com/a%22evil",
    );
  });

  it("escapes backslashes (prevents CSS escape sequences)", () => {
    expect(escapeCssUrl("https://x.com/a\\evil")).toBe(
      "https://x.com/a%5Cevil",
    );
  });

  it("escapes closing parenthesis (prevents url() breakout)", () => {
    expect(escapeCssUrl("https://x.com/a.png) /* evil */ ; background: red")).toBe(
      "https://x.com/a.png%29 /* evil */ ; background: red",
    );
  });

  it("escapes opening parenthesis for symmetry", () => {
    expect(escapeCssUrl("https://x.com/a(evil")).toBe("https://x.com/a%28evil");
  });

  it("passes through ordinary safe characters", () => {
    const url = "https://example.com/path/to/image.jpg?v=1";
    expect(escapeCssUrl(url)).toBe(url);
  });
});
