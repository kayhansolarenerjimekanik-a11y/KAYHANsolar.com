// Unit tests for app/(admin)/kayhan-yonetim/actions/campaigns-bulk.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.fn();
const updateCampaignMock = vi.fn();
const deleteCampaignMock = vi.fn();
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
    updateCampaign: (id: string, patch: unknown) =>
      updateCampaignMock(id, patch),
    deleteCampaign: (id: string) => deleteCampaignMock(id),
  },
}));

beforeEach(() => {
  requireAdminMock.mockReset();
  requireAdminMock.mockResolvedValue({ id: "u1", role: "admin" });
  updateCampaignMock.mockReset();
  updateCampaignMock.mockResolvedValue(undefined);
  deleteCampaignMock.mockReset();
  deleteCampaignMock.mockResolvedValue(undefined);
  revalidatePathMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("bulkSetCampaignActiveAction", () => {
  it("short-circuits on empty ids", async () => {
    const { bulkSetCampaignActiveAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/campaigns-bulk"
    );
    const result = await bulkSetCampaignActiveAction([], true);
    expect(result).toEqual({ ok: true, succeeded: 0, failed: 0 });
    expect(updateCampaignMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("requires admin authorization", async () => {
    const { bulkSetCampaignActiveAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/campaigns-bulk"
    );
    await bulkSetCampaignActiveAction([], true);
    expect(requireAdminMock).toHaveBeenCalledTimes(1);
  });

  it("forwards isActive=true patch to repo for each id", async () => {
    const { bulkSetCampaignActiveAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/campaigns-bulk"
    );
    const result = await bulkSetCampaignActiveAction(["a", "b"], true);
    expect(result).toEqual({ ok: true, succeeded: 2, failed: 0 });
    expect(updateCampaignMock).toHaveBeenNthCalledWith(1, "a", {
      isActive: true,
    });
    expect(updateCampaignMock).toHaveBeenNthCalledWith(2, "b", {
      isActive: true,
    });
  });

  it("forwards isActive=false patch", async () => {
    const { bulkSetCampaignActiveAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/campaigns-bulk"
    );
    await bulkSetCampaignActiveAction(["a"], false);
    expect(updateCampaignMock).toHaveBeenCalledWith("a", { isActive: false });
  });

  it("revalidates the 4 affected paths (home + magaza + admin pages) on success", async () => {
    const { bulkSetCampaignActiveAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/campaigns-bulk"
    );
    await bulkSetCampaignActiveAction(["a"], true);
    const paths = revalidatePathMock.mock.calls.map((c) => c[0]);
    expect(paths).toEqual(
      expect.arrayContaining([
        "/",
        "/magaza",
        "/kayhan-yonetim/kampanyalar",
        "/kayhan-yonetim",
      ]),
    );
    expect(paths).toHaveLength(4);
  });

  it("does not revalidate when nothing succeeded", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    updateCampaignMock.mockRejectedValue(new Error("nope"));
    const { bulkSetCampaignActiveAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/campaigns-bulk"
    );
    const result = await bulkSetCampaignActiveAction(["a", "b"], true);
    expect(result).toEqual({ ok: false, succeeded: 0, failed: 2 });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("logs structured error context per failing id", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    updateCampaignMock.mockRejectedValueOnce(new Error("FK violation"));
    const { bulkSetCampaignActiveAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/campaigns-bulk"
    );
    await bulkSetCampaignActiveAction(["c1"], true);
    expect(errSpy).toHaveBeenCalledWith(
      "[campaigns-bulk] updateCampaign failed",
      expect.objectContaining({ id: "c1", isActive: true }),
    );
  });

  it("accumulates mixed success/failure counts", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    updateCampaignMock.mockResolvedValueOnce(undefined);
    updateCampaignMock.mockRejectedValueOnce(new Error("x"));
    updateCampaignMock.mockResolvedValueOnce(undefined);
    const { bulkSetCampaignActiveAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/campaigns-bulk"
    );
    const result = await bulkSetCampaignActiveAction(
      ["a", "b", "c"],
      true,
    );
    expect(result).toEqual({ ok: false, succeeded: 2, failed: 1 });
  });
});

describe("bulkDeleteCampaignsAction", () => {
  it("short-circuits on empty ids", async () => {
    const { bulkDeleteCampaignsAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/campaigns-bulk"
    );
    const result = await bulkDeleteCampaignsAction([]);
    expect(result).toEqual({ ok: true, succeeded: 0, failed: 0 });
    expect(deleteCampaignMock).not.toHaveBeenCalled();
  });

  it("requires admin authorization", async () => {
    const { bulkDeleteCampaignsAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/campaigns-bulk"
    );
    await bulkDeleteCampaignsAction([]);
    expect(requireAdminMock).toHaveBeenCalledTimes(1);
  });

  it("deletes each id and reports succeeded count", async () => {
    const { bulkDeleteCampaignsAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/campaigns-bulk"
    );
    const result = await bulkDeleteCampaignsAction(["a", "b", "c"]);
    expect(result).toEqual({ ok: true, succeeded: 3, failed: 0 });
    expect(deleteCampaignMock).toHaveBeenCalledTimes(3);
  });

  it("logs error and counts failures without id-leakage", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    deleteCampaignMock.mockRejectedValueOnce(new Error("locked"));
    const { bulkDeleteCampaignsAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/campaigns-bulk"
    );
    const result = await bulkDeleteCampaignsAction(["x1"]);
    expect(result).toEqual({ ok: false, succeeded: 0, failed: 1 });
    expect(errSpy).toHaveBeenCalledWith(
      "[campaigns-bulk] deleteCampaign failed",
      expect.objectContaining({ id: "x1" }),
    );
  });

  it("revalidates the 4 affected paths only on success", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    deleteCampaignMock.mockRejectedValue(new Error("x"));
    const { bulkDeleteCampaignsAction } = await import(
      "@/app/(admin)/kayhan-yonetim/actions/campaigns-bulk"
    );
    await bulkDeleteCampaignsAction(["a"]);
    expect(revalidatePathMock).not.toHaveBeenCalled();

    deleteCampaignMock.mockReset();
    deleteCampaignMock.mockResolvedValue(undefined);
    await bulkDeleteCampaignsAction(["a"]);
    expect(revalidatePathMock).toHaveBeenCalledTimes(4);
  });
});
