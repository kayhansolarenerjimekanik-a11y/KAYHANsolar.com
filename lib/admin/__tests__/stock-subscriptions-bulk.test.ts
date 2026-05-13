// Unit tests for app/(admin)/kayhan-yonetim/actions/stock-subscriptions-bulk.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.fn();
const markNotifiedMock = vi.fn();
const deleteSubscriptionMock = vi.fn();
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
    markStockSubscriptionNotified: (id: string) => markNotifiedMock(id),
    deleteStockSubscription: (id: string) => deleteSubscriptionMock(id),
  },
}));

beforeEach(() => {
  requireAdminMock.mockReset();
  requireAdminMock.mockResolvedValue({ id: "u1", role: "admin" });
  markNotifiedMock.mockReset();
  markNotifiedMock.mockResolvedValue(undefined);
  deleteSubscriptionMock.mockReset();
  deleteSubscriptionMock.mockResolvedValue(undefined);
  revalidatePathMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("bulkMarkStockNotifiedAction", () => {
  it("short-circuits on empty ids", async () => {
    const { bulkMarkStockNotifiedAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/stock-subscriptions-bulk"
    );
    const result = await bulkMarkStockNotifiedAction([]);
    expect(result).toEqual({ ok: true, succeeded: 0, failed: 0 });
    expect(markNotifiedMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("requires admin authorization", async () => {
    const { bulkMarkStockNotifiedAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/stock-subscriptions-bulk"
    );
    await bulkMarkStockNotifiedAction([]);
    expect(requireAdminMock).toHaveBeenCalledTimes(1);
  });

  it("marks each id and reports succeeded count", async () => {
    const { bulkMarkStockNotifiedAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/stock-subscriptions-bulk"
    );
    const result = await bulkMarkStockNotifiedAction(["s1", "s2"]);
    expect(result).toEqual({ ok: true, succeeded: 2, failed: 0 });
    expect(markNotifiedMock).toHaveBeenNthCalledWith(1, "s1");
    expect(markNotifiedMock).toHaveBeenNthCalledWith(2, "s2");
  });

  it("revalidates stok-bildirimleri + dashboard only on success", async () => {
    const { bulkMarkStockNotifiedAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/stock-subscriptions-bulk"
    );
    await bulkMarkStockNotifiedAction(["s1"]);
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/kayhan-yonetim/stok-bildirimleri",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/kayhan-yonetim");
    expect(revalidatePathMock).toHaveBeenCalledTimes(2);
  });

  it("does not revalidate when nothing succeeded", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    markNotifiedMock.mockRejectedValue(new Error("nope"));
    const { bulkMarkStockNotifiedAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/stock-subscriptions-bulk"
    );
    const result = await bulkMarkStockNotifiedAction(["s1"]);
    expect(result).toEqual({ ok: false, succeeded: 0, failed: 1 });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("logs structured error context per failing id", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    markNotifiedMock.mockRejectedValueOnce(new Error("locked"));
    const { bulkMarkStockNotifiedAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/stock-subscriptions-bulk"
    );
    await bulkMarkStockNotifiedAction(["sx"]);
    expect(errSpy).toHaveBeenCalledWith(
      "[stock-subscriptions-bulk] markNotified failed",
      expect.objectContaining({ id: "sx" }),
    );
  });

  it("continues after a failure and accumulates mixed counts", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    markNotifiedMock.mockResolvedValueOnce(undefined);
    markNotifiedMock.mockRejectedValueOnce(new Error("boom"));
    markNotifiedMock.mockResolvedValueOnce(undefined);
    const { bulkMarkStockNotifiedAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/stock-subscriptions-bulk"
    );
    const result = await bulkMarkStockNotifiedAction(["a", "b", "c"]);
    expect(result).toEqual({ ok: false, succeeded: 2, failed: 1 });
  });
});

describe("bulkDeleteStockSubscriptionsAction", () => {
  it("short-circuits on empty ids", async () => {
    const { bulkDeleteStockSubscriptionsAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/stock-subscriptions-bulk"
    );
    const result = await bulkDeleteStockSubscriptionsAction([]);
    expect(result).toEqual({ ok: true, succeeded: 0, failed: 0 });
    expect(deleteSubscriptionMock).not.toHaveBeenCalled();
  });

  it("requires admin authorization", async () => {
    const { bulkDeleteStockSubscriptionsAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/stock-subscriptions-bulk"
    );
    await bulkDeleteStockSubscriptionsAction([]);
    expect(requireAdminMock).toHaveBeenCalledTimes(1);
  });

  it("deletes each id and reports succeeded count", async () => {
    const { bulkDeleteStockSubscriptionsAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/stock-subscriptions-bulk"
    );
    const result = await bulkDeleteStockSubscriptionsAction(["a", "b"]);
    expect(result).toEqual({ ok: true, succeeded: 2, failed: 0 });
    expect(deleteSubscriptionMock).toHaveBeenCalledTimes(2);
  });

  it("logs structured error per failing id and counts failures", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    deleteSubscriptionMock.mockRejectedValueOnce(new Error("FK"));
    const { bulkDeleteStockSubscriptionsAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/stock-subscriptions-bulk"
    );
    const result = await bulkDeleteStockSubscriptionsAction(["s1"]);
    expect(result).toEqual({ ok: false, succeeded: 0, failed: 1 });
    expect(errSpy).toHaveBeenCalledWith(
      "[stock-subscriptions-bulk] deleteSubscription failed",
      expect.objectContaining({ id: "s1" }),
    );
  });

  it("revalidates stok-bildirimleri + dashboard only on success", async () => {
    const { bulkDeleteStockSubscriptionsAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/stock-subscriptions-bulk"
    );
    await bulkDeleteStockSubscriptionsAction(["s1"]);
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/kayhan-yonetim/stok-bildirimleri",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/kayhan-yonetim");
  });
});
