import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Offer } from "@/lib/data/types";

// server-only throws on import — neutralize for the test environment.
vi.mock("server-only", () => ({}));

// Capture send() arguments by mocking the Resend SDK.
const sendMock = vi.fn();
vi.mock("resend", () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: { send: sendMock },
    })),
  };
});

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

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  sendMock.mockReset();
  // Reset env to a known state for each test.
  process.env = { ...ORIGINAL_ENV };
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  delete process.env.ADMIN_EMAIL;
  // FROM / ADMIN_EMAIL are read once at module load — reset module cache so
  // each test sees the env state we set above.
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("isEmailEnabled", () => {
  it("returns false when RESEND_API_KEY is unset", async () => {
    const { isEmailEnabled } = await import("./resend");
    expect(isEmailEnabled()).toBe(false);
  });

  it("returns true when RESEND_API_KEY is set", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const { isEmailEnabled } = await import("./resend");
    expect(isEmailEnabled()).toBe(true);
  });

  it("returns false when RESEND_API_KEY is the empty string", async () => {
    process.env.RESEND_API_KEY = "";
    const { isEmailEnabled } = await import("./resend");
    expect(isEmailEnabled()).toBe(false);
  });
});

describe("sendOfferResponseEmail", () => {
  it("returns ok:false with a user-safe message when offer has no email", async () => {
    const { sendOfferResponseEmail } = await import("./resend");
    const offer = makeOffer({ email: undefined });
    const result = await sendOfferResponseEmail(offer, "Yanıt");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Müşteri e-postası yok");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("short-circuits without calling Resend when RESEND_API_KEY is missing", async () => {
    const { sendOfferResponseEmail } = await import("./resend");
    const offer = makeOffer({ email: "ali@example.com" });
    const result = await sendOfferResponseEmail(offer, "Yanıt");
    expect(result.ok).toBe(true);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("calls Resend with the customer email when API key is set", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    sendMock.mockResolvedValueOnce({ data: { id: "msg-1" }, error: null });
    const { sendOfferResponseEmail } = await import("./resend");
    const offer = makeOffer({ email: "ali@example.com" });
    const result = await sendOfferResponseEmail(offer, "Yanıt metni");
    expect(result.ok).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const arg = sendMock.mock.calls[0][0];
    expect(arg.to).toBe("ali@example.com");
    expect(arg.subject).toBe("Teklif Yanıtınız — KAYHAN Solar");
    expect(typeof arg.html).toBe("string");
    expect(arg.html.length).toBeGreaterThan(0);
  });

  it("uses the default From address when RESEND_FROM_EMAIL is unset", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    sendMock.mockResolvedValueOnce({ data: { id: "msg-1" }, error: null });
    const { sendOfferResponseEmail } = await import("./resend");
    await sendOfferResponseEmail(makeOffer(), "Yanıt");
    expect(sendMock.mock.calls[0][0].from).toBe(
      "KAYHAN Solar <onboarding@resend.dev>",
    );
  });

  it("uses RESEND_FROM_EMAIL when configured", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM_EMAIL = "noreply@kayhansolar.com";
    sendMock.mockResolvedValueOnce({ data: { id: "msg-1" }, error: null });
    const { sendOfferResponseEmail } = await import("./resend");
    await sendOfferResponseEmail(makeOffer(), "Yanıt");
    expect(sendMock.mock.calls[0][0].from).toBe("noreply@kayhansolar.com");
  });

  it("returns ok:false and forwards Resend's error message", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { message: "Recipient rejected" },
    });
    const { sendOfferResponseEmail } = await import("./resend");
    const result = await sendOfferResponseEmail(makeOffer(), "Yanıt");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Recipient rejected");
  });

  it("returns ok:false with the thrown error's message when send rejects", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    sendMock.mockRejectedValueOnce(new Error("Network down"));
    const { sendOfferResponseEmail } = await import("./resend");
    const result = await sendOfferResponseEmail(makeOffer(), "Yanıt");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Network down");
  });

  it("returns ok:false with 'unknown' when send throws a non-Error", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    sendMock.mockRejectedValueOnce("plain string error");
    const { sendOfferResponseEmail } = await import("./resend");
    const result = await sendOfferResponseEmail(makeOffer(), "Yanıt");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("unknown");
  });

  it("does not leak the RESEND_API_KEY value in error messages", async () => {
    process.env.RESEND_API_KEY = "re_super_secret_value_xyz";
    sendMock.mockRejectedValueOnce(new Error("Network down"));
    const { sendOfferResponseEmail } = await import("./resend");
    const result = await sendOfferResponseEmail(makeOffer(), "Yanıt");
    expect(result.error).not.toContain("re_super_secret_value_xyz");
  });
});

describe("sendOfferCreatedEmail", () => {
  it("returns ok:false with a user-safe message when offer has no email", async () => {
    const { sendOfferCreatedEmail } = await import("./resend");
    const offer = makeOffer({ email: undefined });
    const result = await sendOfferCreatedEmail(offer);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Müşteri e-postası yok");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("short-circuits without calling Resend when RESEND_API_KEY is missing", async () => {
    const { sendOfferCreatedEmail } = await import("./resend");
    const result = await sendOfferCreatedEmail(makeOffer());
    expect(result.ok).toBe(true);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("calls Resend with the correct subject and recipient", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    sendMock.mockResolvedValueOnce({ data: { id: "msg-2" }, error: null });
    const { sendOfferCreatedEmail } = await import("./resend");
    await sendOfferCreatedEmail(makeOffer({ email: "ali@example.com" }));
    expect(sendMock).toHaveBeenCalledTimes(1);
    const arg = sendMock.mock.calls[0][0];
    expect(arg.to).toBe("ali@example.com");
    expect(arg.subject).toBe("Talebiniz Alındı — KAYHAN Solar");
    expect(typeof arg.html).toBe("string");
  });

  it("forwards Resend errors as ok:false + message", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { message: "Domain not verified" },
    });
    const { sendOfferCreatedEmail } = await import("./resend");
    const result = await sendOfferCreatedEmail(makeOffer());
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Domain not verified");
  });
});
