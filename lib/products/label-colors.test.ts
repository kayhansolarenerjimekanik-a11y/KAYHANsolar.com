import { describe, expect, it } from "vitest";

import { ALL_LABEL_COLORS, labelColorClasses } from "./label-colors";

describe("labelColorClasses", () => {
  it("returns lime classes", () => {
    expect(labelColorClasses("lime")).toBe("bg-lime-primary/95 text-black");
  });

  it("returns red classes", () => {
    expect(labelColorClasses("red")).toBe("bg-danger/90 text-white");
  });

  it("returns yellow classes", () => {
    expect(labelColorClasses("yellow")).toBe("bg-warning/90 text-white");
  });

  it("returns blue classes", () => {
    expect(labelColorClasses("blue")).toBe("bg-info/90 text-white");
  });

  it("returns purple classes", () => {
    expect(labelColorClasses("purple")).toBe("bg-purple-500/90 text-white");
  });

  it("returns gray classes with border", () => {
    expect(labelColorClasses("gray")).toBe(
      "bg-surface/95 text-foreground border border-border",
    );
  });
});

describe("ALL_LABEL_COLORS", () => {
  it("contains exactly 6 unique colors", () => {
    expect(ALL_LABEL_COLORS).toHaveLength(6);
    expect(new Set(ALL_LABEL_COLORS).size).toBe(6);
  });

  it("contains expected colors in order", () => {
    expect(ALL_LABEL_COLORS).toEqual([
      "lime",
      "red",
      "yellow",
      "blue",
      "purple",
      "gray",
    ]);
  });
});
