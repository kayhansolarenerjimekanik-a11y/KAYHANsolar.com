// Unit tests for app/(admin)/kayhan-yonetim/actions/offers-bulk.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { OfferStatus } from "@/lib/data/types";

const requireAdminMock = vi.fn();
const updateOfferMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

vi.mock("@/lib/auth", () => ({
  requireAdmin: () => requireAdminMock(),
}));

vi.mock("@/lib/data", () => ({
  repo: {
    updateOffer: (id: string, patch: unknown) => updateOfferMock(id, patch),
  },
}));

beforeEach(() => {
  requireAdminMock.mockReset();
  requireAdminMock.mockResolvedValue({ id: "u1", role: "admin" });
  updateOfferMock.mockReset();
  updateOfferMock.mockResolvedValue(undefined);
  revalidatePathMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("bulkSetOfferStatusAction — guard rails", () => {
  it("short-circuits on empty id list", async () => {
    const { bulkSetOfferStatusAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/offers-bulk"
    );
    const result = await bulkSetOfferStatusAction([], "in_review");
    expect(result).toEqual({ ok: true, succeeded: 0, failed: 0 });
    expect(updateOfferMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("requires admin authorization before any work", async () => {
    const { bulkSetOfferStatusAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/offers-bulk"
    );
    await bulkSetOfferStatusAction([], "new");
    expect(requireAdminMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid status without touching repo", async () => {
    const { bulkSetOfferStatusAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/offers-bulk"
    );
    const result = await bulkSetOfferStatusAction(
      ["1", "2"],
      "deleted" as OfferStatus,
    );
    expect(result).toEqual({ ok: false, succeeded: 0, failed: 2 });
    expect(updateOfferMock).not.toHaveBeenCalled();
  });

  it.each(["new", "in_review", "responded", "closed"] as const)(
    "accepts allowed status %s",
    async (status) => {
      const { bulkSetOfferStatusAction } = await import(
        "@/app/(admin)/kayhan-yonetim/actions/offers-bulk"
      );
      const result = await bulkSetOfferStatusAction(["o1"], status);
      expect(result.ok).toBe(true);
      expect(result.succeeded).toBe(1);
    },
  );
});

describe("bulkSetOfferStatusAction — respondedAt stamping", () => {
  it("attaches respondedAt as an ISO string when status is 'responded'", async () => {
    const { bulkSetOfferStatusAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/offers-bulk"
    );
    await bulkSetOfferStatusAction(["o1"], "responded");
    expect(updateOfferMock).toHaveBeenCalledTimes(1);
    const [id, patch] = updateOfferMock.mock.calls[0];
    expect(id).toBe("o1");
    expect(patch.status).toBe("responded");
    expect(typeof patch.respondedAt).toBe("string");
    // ISO-8601: 2025-01-01T00:00:00.000Z
    expect(patch.respondedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it("does NOT attach respondedAt for non-'responded' statuses", async () => {
    const { bulkSetOfferStatusAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/offers-bulk"
    );
    await bulkSetOfferStatusAction(["o1"], "in_review");
    const [, patch] = updateOfferMock.mock.calls[0];
    expect(patch.status).toBe("in_review");
    expect(patch.respondedAt).toBeUndefined();
  });

  it("stamps a fresh respondedAt per id (deterministic via fake timer)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-13T12:34:56.000Z"));
    const { bulkSetOfferStatusAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/offers-bulk"
    );
    await bulkSetOfferStatusAction(["a", "b"], "responded");
    vi.useRealTimers();
    const stamps = updateOfferMock.mock.calls.map((c) => c[1].respondedAt);
    expect(stamps).toEqual([
      "2026-05-13T12:34:56.000Z",
      "2026-05-13T12:34:56.000Z",
    ]);
  });
});

describe("bulkSetOfferStatusAction — revalidation + error path", () => {
  it("revalidates teklifler + dashboard when any update succeeds", async () => {
    const { bulkSetOfferStatusAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/offers-bulk"
    );
    await bulkSetOfferStatusAction(["o1"], "closed");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/kayhan-yonetim/teklifler",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/kayhan-yonetim");
  });

  it("does not revalidate when every update fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    updateOfferMock.mockRejectedValue(new Error("DB down"));
    const { bulkSetOfferStatusAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/offers-bulk"
    );
    const result = await bulkSetOfferStatusAction(["o1", "o2"], "closed");
    expect(result).toEqual({ ok: false, succeeded: 0, failed: 2 });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("logs structured error context per failing id", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    updateOfferMock.mockRejectedValueOnce(new Error("constraint"));
    const { bulkSetOfferStatusAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/offers-bulk"
    );
    await bulkSetOfferStatusAction(["o1"], "closed");
    expect(errSpy).toHaveBeenCalledWith(
      "[offers-bulk] updateOffer failed",
      expect.objectContaining({ id: "o1", status: "closed" }),
    );
  });

  it("returns mixed success/failure counts when partial errors occur", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    updateOfferMock.mockResolvedValueOnce(undefined);
    updateOfferMock.mockRejectedValueOnce(new Error("boom"));
    updateOfferMock.mockResolvedValueOnce(undefined);
    const { bulkSetOfferStatusAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/offers-bulk"
    );
    const result = await bulkSetOfferStatusAction(
      ["a", "b", "c"],
      "in_review",
    );
    expect(result).toEqual({ ok: false, succeeded: 2, failed: 1 });
  });
});
