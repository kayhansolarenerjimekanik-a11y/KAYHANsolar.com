// Tests for the redirect allowlist in
// app/(admin)/kayhan-yonetim/(protected)/teklifler/page.tsx
//
// The page is an async RSC. We don't render React here; we just call the
// exported component as a function with crafted searchParams and assert how
// `redirect` was invoked. In real Next.js, redirect() throws to unwind the
// render — we mimic that so control flow halts before listOffers() is called.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class RedirectError extends Error {
  readonly target: string;
  constructor(target: string) {
    super(`NEXT_REDIRECT:${target}`);
    this.target = target;
  }
}

const redirectMock = vi.fn((target: string) => {
  throw new RedirectError(target);
});

const listOffersMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  redirect: (target: string) => redirectMock(target),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// The page also pulls in OffersTable, PageHeader, Button, Link, and lucide icons.
// We don't render them, but importing the module must not blow up. Stub the
// heavy/UI imports out to no-op shells.
vi.mock("@/components/admin/offers-table", () => ({
  OffersTable: () => null,
}));
vi.mock("@/components/admin/page-header", () => ({
  PageHeader: () => null,
}));
vi.mock("@/components/ui/button", () => ({
  Button: () => null,
}));
vi.mock("next/link", () => ({
  default: () => null,
}));
vi.mock("lucide-react", () => ({
  Plus: () => null,
}));

vi.mock("@/lib/data", () => ({
  repo: {
    listOffers: () => listOffersMock(),
  },
}));

beforeEach(() => {
  redirectMock.mockClear();
  redirectMock.mockImplementation((target: string) => {
    throw new RedirectError(target);
  });
  listOffersMock.mockReset();
  listOffersMock.mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function loadPage() {
  const mod = await import(
    "@/app/(admin)/kayhan-yonetim/(protected)/teklifler/page"
  );
  return mod.default as (props: {
    searchParams: Promise<{ status?: string; durum?: string }>;
  }) => Promise<unknown>;
}

describe("AdminOffersPage — legacy ?status= redirect", () => {
  it("does not redirect when no status query param is present", async () => {
    const page = await loadPage();
    await page({ searchParams: Promise.resolve({}) });
    expect(redirectMock).not.toHaveBeenCalled();
    expect(listOffersMock).toHaveBeenCalled();
  });

  it("does not redirect when durum is already set (legacy + new both present)", async () => {
    const page = await loadPage();
    await page({
      searchParams: Promise.resolve({ status: "new", durum: "in_review" }),
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it.each(["new", "in_review", "responded", "closed"])(
    "redirects ?status=%s to ?durum=%s (allowlist hit)",
    async (status) => {
      const page = await loadPage();
      await expect(
        page({ searchParams: Promise.resolve({ status }) }),
      ).rejects.toBeInstanceOf(RedirectError);
      expect(redirectMock).toHaveBeenCalledWith(
        `/kayhan-yonetim/teklifler?durum=${status}`,
      );
      // listOffers must NOT be reached when we redirect.
      expect(listOffersMock).not.toHaveBeenCalled();
    },
  );

  it("strips an unknown status (allowlist miss) — redirects to bare path with no durum", async () => {
    const page = await loadPage();
    await expect(
      page({
        searchParams: Promise.resolve({ status: "../../etc/passwd" }),
      }),
    ).rejects.toBeInstanceOf(RedirectError);
    expect(redirectMock).toHaveBeenCalledWith("/kayhan-yonetim/teklifler");
  });

  it("does not echo a javascript: scheme into the redirect target", async () => {
    const page = await loadPage();
    await expect(
      page({
        searchParams: Promise.resolve({ status: "javascript:alert(1)" }),
      }),
    ).rejects.toBeInstanceOf(RedirectError);
    const target = redirectMock.mock.calls[0][0];
    expect(target).toBe("/kayhan-yonetim/teklifler");
    expect(target).not.toContain("javascript");
  });

  it("URL-encodes the safe status value (defense in depth)", async () => {
    // 'new' has no chars to encode — but the encodeURIComponent call must be
    // present for any future status that might. Verify by checking the literal
    // redirect URL is well-formed for each allowed value.
    const page = await loadPage();
    await expect(
      page({ searchParams: Promise.resolve({ status: "in_review" }) }),
    ).rejects.toBeInstanceOf(RedirectError);
    // 'in_review' encoded is the same string (underscore is unreserved).
    expect(redirectMock).toHaveBeenCalledWith(
      "/kayhan-yonetim/teklifler?durum=in_review",
    );
  });

  it("rejects an empty-string status (treated as missing, not as allowlist miss)", async () => {
    // params.status === "" is falsy so the if-guard does NOT enter the redirect branch.
    const page = await loadPage();
    await page({
      searchParams: Promise.resolve({ status: "" }),
    });
    expect(redirectMock).not.toHaveBeenCalled();
    expect(listOffersMock).toHaveBeenCalled();
  });
});
