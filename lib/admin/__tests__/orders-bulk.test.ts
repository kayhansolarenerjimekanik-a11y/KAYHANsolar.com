// Unit tests for app/(admin)/kayhan-yonetim/actions/orders-bulk.ts
// Located under lib/admin/__tests__/ because vitest.config only collects
// lib/** and components/**, but the action file lives under app/.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Order, OrderStatus } from "@/lib/data/types";

// Hoisted mocks so they're available before the dynamic import below.
const requireAdminMock = vi.fn();
const updateOrderStatusMock = vi.fn();
const sendOrderStatusEmailMock = vi.fn();
const revalidatePathMock = vi.fn();

// server-only would throw if loaded outside a Next runtime — neutralize.
vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

vi.mock("@/lib/auth", () => ({
  requireAdmin: () => requireAdminMock(),
}));

vi.mock("@/lib/data", () => ({
  repo: {
    updateOrderStatus: (id: string, status: OrderStatus) =>
      updateOrderStatusMock(id, status),
  },
}));

vi.mock("@/lib/email/resend", () => ({
  sendOrderStatusEmail: (order: Order) => sendOrderStatusEmailMock(order),
}));

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "ord-1",
    orderNumber: "K-0001",
    items: [],
    subtotal: 1000,
    shippingCost: 0,
    total: 1000,
    discountAmount: 0,
    appliedCampaignIds: [],
    status: "pending",
    customerName: "Ali Veli",
    customerPhone: "5551234567",
    shippingAddress: {
      city: "Adana",
      district: "Seyhan",
      detailedAddress: "Mahalle X",
    },
    paymentMethod: "whatsapp",
    createdAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  requireAdminMock.mockReset();
  requireAdminMock.mockResolvedValue({ id: "u1", role: "admin" });
  updateOrderStatusMock.mockReset();
  sendOrderStatusEmailMock.mockReset();
  sendOrderStatusEmailMock.mockResolvedValue({ ok: true });
  revalidatePathMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("bulkSetOrderStatusAction — guard rails", () => {
  it("short-circuits on empty id list and never touches repo", async () => {
    const { bulkSetOrderStatusAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/orders-bulk"
    );
    const result = await bulkSetOrderStatusAction([], "confirmed");
    expect(result).toEqual({ ok: true, succeeded: 0, failed: 0 });
    expect(updateOrderStatusMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("calls requireAdmin even for empty id list (authorization first)", async () => {
    const { bulkSetOrderStatusAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/orders-bulk"
    );
    await bulkSetOrderStatusAction([], "confirmed");
    expect(requireAdminMock).toHaveBeenCalledTimes(1);
  });

  it("returns ok:false with failed=ids.length when status is not in allowlist", async () => {
    const { bulkSetOrderStatusAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/orders-bulk"
    );
    const result = await bulkSetOrderStatusAction(
      ["a", "b", "c"],
      "exploded" as OrderStatus,
    );
    expect(result).toEqual({ ok: false, succeeded: 0, failed: 3 });
    expect(updateOrderStatusMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it.each([
    "pending",
    "whatsapp_sent",
    "confirmed",
    "preparing",
    "shipped",
    "delivered",
    "cancelled",
  ] as const)("accepts allowed status %s", async (status) => {
    updateOrderStatusMock.mockResolvedValue(makeOrder({ id: "x", status }));
    const { bulkSetOrderStatusAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/orders-bulk"
    );
    const result = await bulkSetOrderStatusAction(["x"], status);
    expect(result.ok).toBe(true);
    expect(result.succeeded).toBe(1);
    expect(updateOrderStatusMock).toHaveBeenCalledWith("x", status);
  });
});

describe("bulkSetOrderStatusAction — success path", () => {
  it("accumulates succeeded across multiple ids", async () => {
    updateOrderStatusMock.mockImplementation((id: string) =>
      Promise.resolve(makeOrder({ id, status: "confirmed" })),
    );
    const { bulkSetOrderStatusAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/orders-bulk"
    );
    const result = await bulkSetOrderStatusAction(
      ["a", "b", "c"],
      "confirmed",
    );
    expect(result).toEqual({ ok: true, succeeded: 3, failed: 0 });
    expect(updateOrderStatusMock).toHaveBeenCalledTimes(3);
  });

  it("revalidates both siparisler and dashboard paths when any update succeeded", async () => {
    updateOrderStatusMock.mockResolvedValue(makeOrder());
    const { bulkSetOrderStatusAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/orders-bulk"
    );
    await bulkSetOrderStatusAction(["a"], "confirmed");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/kayhan-yonetim/siparisler",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/kayhan-yonetim");
  });

  it("sends status email for each successfully updated order", async () => {
    const updated = makeOrder({ id: "a", status: "shipped" });
    updateOrderStatusMock.mockResolvedValue(updated);
    const { bulkSetOrderStatusAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/orders-bulk"
    );
    await bulkSetOrderStatusAction(["a"], "shipped");
    expect(sendOrderStatusEmailMock).toHaveBeenCalledTimes(1);
    expect(sendOrderStatusEmailMock).toHaveBeenCalledWith(updated);
  });
});

describe("bulkSetOrderStatusAction — failure handling", () => {
  it("logs an error and increments failed when repo throws", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    updateOrderStatusMock.mockRejectedValueOnce(new Error("DB down"));
    const { bulkSetOrderStatusAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/orders-bulk"
    );
    const result = await bulkSetOrderStatusAction(["a"], "confirmed");
    expect(result).toEqual({ ok: false, succeeded: 0, failed: 1 });
    expect(errSpy).toHaveBeenCalledWith(
      "[orders-bulk] updateOrderStatus failed",
      expect.objectContaining({ id: "a", status: "confirmed" }),
    );
  });

  it("continues processing remaining ids after a failure (mixed batch)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    updateOrderStatusMock.mockImplementationOnce(() =>
      Promise.reject(new Error("boom")),
    );
    updateOrderStatusMock.mockImplementationOnce((id: string) =>
      Promise.resolve(makeOrder({ id })),
    );
    updateOrderStatusMock.mockImplementationOnce((id: string) =>
      Promise.resolve(makeOrder({ id })),
    );
    const { bulkSetOrderStatusAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/orders-bulk"
    );
    const result = await bulkSetOrderStatusAction(
      ["a", "b", "c"],
      "confirmed",
    );
    expect(result).toEqual({ ok: false, succeeded: 2, failed: 1 });
    expect(updateOrderStatusMock).toHaveBeenCalledTimes(3);
  });

  it("does not call revalidatePath when zero succeeded", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    updateOrderStatusMock.mockRejectedValue(new Error("boom"));
    const { bulkSetOrderStatusAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/orders-bulk"
    );
    await bulkSetOrderStatusAction(["a", "b"], "confirmed");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("treats email-send failures as non-fatal (still counts as succeeded)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    updateOrderStatusMock.mockResolvedValue(makeOrder({ status: "shipped" }));
    sendOrderStatusEmailMock.mockRejectedValueOnce(new Error("smtp down"));
    const { bulkSetOrderStatusAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/orders-bulk"
    );
    const result = await bulkSetOrderStatusAction(["a"], "shipped");
    expect(result).toEqual({ ok: true, succeeded: 1, failed: 0 });
    expect(errSpy).toHaveBeenCalledWith(
      "[email] sendOrderStatusEmail failed",
      expect.any(Error),
    );
  });
});
