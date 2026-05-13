import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { renderOfferCreatedEmail } from "./offer-created";
import type { Offer } from "@/lib/data/types";

function makeOffer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: "offer-1",
    status: "new",
    fullName: "Ali Veli",
    phone: "5551234567",
    email: "ali@example.com",
    city: "Adana",
    district: "Seyhan",
    installationLocation: "roof",
    installationAddress: "Mahalle X",
    appliances: [],
    detailedDescription: "Açıklama",
    createdAt: "2025-01-15T10:30:00.000Z",
    ...overrides,
  };
}

describe("renderOfferCreatedEmail — HTML escaping", () => {
  it("escapes < and > in the customer's full name", () => {
    const offer = makeOffer({ fullName: "<script>x</script>" });
    const html = renderOfferCreatedEmail(offer);
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;x&lt;/script&gt;");
  });

  it("escapes HTML in the city field", () => {
    const offer = makeOffer({ city: "<b>Adana</b>" });
    const html = renderOfferCreatedEmail(offer);
    expect(html).toContain("&lt;b&gt;Adana&lt;/b&gt;");
  });

  it("escapes HTML in the district field", () => {
    const offer = makeOffer({ district: "Seyhan<script>" });
    const html = renderOfferCreatedEmail(offer);
    expect(html).toContain("Seyhan&lt;script&gt;");
  });

  it("escapes the & character in customer name", () => {
    const offer = makeOffer({ fullName: "Ali & Veli" });
    const html = renderOfferCreatedEmail(offer);
    expect(html).toContain("Ali &amp; Veli");
  });
});

describe("renderOfferCreatedEmail — installation location label", () => {
  it("renders 'Çatı' for 'roof'", () => {
    const offer = makeOffer({ installationLocation: "roof" });
    const html = renderOfferCreatedEmail(offer);
    expect(html).toContain("Çatı");
  });

  it("renders 'Arazi' for 'land'", () => {
    const offer = makeOffer({ installationLocation: "land" });
    const html = renderOfferCreatedEmail(offer);
    expect(html).toContain("Arazi");
  });

  it("renders 'Diğer' for 'other'", () => {
    const offer = makeOffer({ installationLocation: "other" });
    const html = renderOfferCreatedEmail(offer);
    expect(html).toContain("Diğer");
  });
});

describe("renderOfferCreatedEmail — site URL CTA", () => {
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

  it("links the CTA to the fallback site URL when env var is missing", () => {
    const offer = makeOffer();
    const html = renderOfferCreatedEmail(offer);
    expect(html).toContain('href="https://kayhansolar.com"');
  });

  it("links the CTA to the configured site URL when set", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://staging.example.com";
    const offer = makeOffer();
    const html = renderOfferCreatedEmail(offer);
    expect(html).toContain('href="https://staging.example.com"');
  });

  it("renders the 'Anasayfaya Git' CTA button", () => {
    const offer = makeOffer();
    const html = renderOfferCreatedEmail(offer);
    expect(html).toContain("Anasayfaya Git");
  });
});

describe("renderOfferCreatedEmail — structural sanity", () => {
  it("returns a doctype-prefixed HTML document", () => {
    const offer = makeOffer();
    const html = renderOfferCreatedEmail(offer);
    expect(html.startsWith("<!doctype html>")).toBe(true);
  });

  it("addresses the customer with 'Sayın <name>'", () => {
    const offer = makeOffer({ fullName: "Ayşe Demir" });
    const html = renderOfferCreatedEmail(offer);
    expect(html).toContain("Sayın Ayşe Demir");
  });

  it("renders city and district separated by ' / '", () => {
    const offer = makeOffer({ city: "İstanbul", district: "Kadıköy" });
    const html = renderOfferCreatedEmail(offer);
    expect(html).toContain("İstanbul / Kadıköy");
  });

  it("does not leak admin-only fields", () => {
    const offer = makeOffer({
      adminNotes: "SECRET-INTERNAL-NOTE-XYZ",
      adminResponse: "Draft response that shouldn't ship yet",
    });
    const html = renderOfferCreatedEmail(offer);
    expect(html).not.toContain("SECRET-INTERNAL-NOTE-XYZ");
    expect(html).not.toContain("Draft response that shouldn't ship yet");
  });
});
