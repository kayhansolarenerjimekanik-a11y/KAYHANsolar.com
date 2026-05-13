import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { renderOfferResponseEmail } from "./offer-response";
import type { Offer } from "@/lib/data/types";

function makeOffer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: "offer-1",
    status: "in_review",
    fullName: "Ali Veli",
    phone: "5551234567",
    email: "ali@example.com",
    city: "Adana",
    district: "Seyhan",
    installationLocation: "roof",
    installationAddress: "Mahalle X",
    appliances: [],
    detailedDescription: "Açıklama",
    createdAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("renderOfferResponseEmail — HTML escaping", () => {
  it("escapes < and > in the customer's full name", () => {
    const offer = makeOffer({ fullName: "<script>alert('xss')</script>" });
    const html = renderOfferResponseEmail(offer, "Yanıt metni");
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes & in the customer's full name", () => {
    const offer = makeOffer({ fullName: "Tom & Jerry" });
    const html = renderOfferResponseEmail(offer, "Yanıt");
    expect(html).toContain("Tom &amp; Jerry");
    expect(html).not.toContain("Tom & Jerry");
  });

  it("escapes double-quotes in the customer's name", () => {
    const offer = makeOffer({ fullName: 'Ali "the boss" Veli' });
    const html = renderOfferResponseEmail(offer, "Yanıt");
    expect(html).toContain("&quot;the boss&quot;");
  });

  it("escapes HTML in the admin response body", () => {
    const offer = makeOffer();
    const html = renderOfferResponseEmail(
      offer,
      '<img src=x onerror="alert(1)">',
    );
    expect(html).not.toContain('<img src=x onerror="alert(1)">');
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("preserves newlines visually via white-space:pre-wrap (no escape mangling)", () => {
    const offer = makeOffer();
    const html = renderOfferResponseEmail(offer, "Satır 1\nSatır 2");
    expect(html).toContain("white-space:pre-wrap");
    expect(html).toContain("Satır 1\nSatır 2");
  });
});

describe("renderOfferResponseEmail — solar calculator section", () => {
  it("omits the calculator section when totalPowerW is 0", () => {
    const offer = makeOffer({ appliances: [] });
    const html = renderOfferResponseEmail(offer, "Yanıt");
    expect(html).not.toContain("Sistem Tahmini");
  });

  it("includes the calculator section when appliances have power", () => {
    const offer = makeOffer({
      appliances: [{ name: "Klima", powerW: 1200 }],
    });
    const html = renderOfferResponseEmail(offer, "Yanıt");
    expect(html).toContain("Sistem Tahmini");
    expect(html).toContain("Toplam Güç");
  });

  it("renders totalPowerW with tr-TR locale formatting", () => {
    const offer = makeOffer({
      appliances: [
        { name: "Klima", powerW: 1200 },
        { name: "Kombi", powerW: 1800 },
      ],
    });
    const html = renderOfferResponseEmail(offer, "Yanıt");
    // 3000 W; tr-TR uses '.' as thousands separator
    expect(html).toContain("3.000 W");
  });
});

describe("renderOfferResponseEmail — WhatsApp link", () => {
  const originalNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  });
  afterEach(() => {
    if (originalNumber === undefined) {
      delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    } else {
      process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = originalNumber;
    }
  });

  it("uses fallback phone when env var is missing", () => {
    const offer = makeOffer({ fullName: "Ali" });
    const html = renderOfferResponseEmail(offer, "Yanıt");
    expect(html).toContain("https://wa.me/905555555555?text=");
  });

  it("strips non-digit chars from configured WhatsApp number", () => {
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "+90 (555) 123-4567";
    const offer = makeOffer({ fullName: "Ali" });
    const html = renderOfferResponseEmail(offer, "Yanıt");
    expect(html).toContain("https://wa.me/905551234567?text=");
  });

  it("URL-encodes the customer name in the wa.me link", () => {
    const offer = makeOffer({ fullName: "Ahmet Yılmaz" });
    const html = renderOfferResponseEmail(offer, "Yanıt");
    // 'Yılmaz' encodes non-ASCII; space becomes %20
    expect(html).toMatch(/https:\/\/wa\.me\/[0-9]+\?text=[^"]*Ahmet%20Y/);
  });

  it("URL-encodes special characters that would break the link", () => {
    const offer = makeOffer({ fullName: "Ali & Veli" });
    const html = renderOfferResponseEmail(offer, "Yanıt");
    // '&' must be percent-encoded in the query string
    expect(html).toContain("Ali%20%26%20Veli");
  });
});

describe("renderOfferResponseEmail — site URL & footer", () => {
  const originalSite = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });
  afterEach(() => {
    if (originalSite === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSite;
    }
  });

  it("uses fallback site URL when env var is missing", () => {
    const offer = makeOffer();
    const html = renderOfferResponseEmail(offer, "Yanıt");
    expect(html).toContain("https://kayhansolar.com/magaza");
    expect(html).toContain("https://kayhansolar.com/kvkk");
  });

  it("uses configured site URL when set", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://staging.example.com";
    const offer = makeOffer();
    const html = renderOfferResponseEmail(offer, "Yanıt");
    expect(html).toContain("https://staging.example.com/magaza");
    expect(html).toContain("https://staging.example.com/kvkk");
  });

  it("includes KVKK link in the footer", () => {
    const offer = makeOffer();
    const html = renderOfferResponseEmail(offer, "Yanıt");
    expect(html).toMatch(/KVKK.+\/kvkk/);
  });
});

describe("renderOfferResponseEmail — structural sanity", () => {
  it("returns a doctype-prefixed HTML document", () => {
    const offer = makeOffer();
    const html = renderOfferResponseEmail(offer, "Yanıt");
    expect(html.startsWith("<!doctype html>")).toBe(true);
  });

  it("addresses the customer by their (escaped) full name", () => {
    const offer = makeOffer({ fullName: "Ayşe" });
    const html = renderOfferResponseEmail(offer, "Yanıt");
    expect(html).toContain("Sayın Ayşe");
  });
});
