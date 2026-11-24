import { afterEach, describe, expect, it } from "vitest";
import { createAccessToken, verifyAccessToken } from "./order-access";
import { isChannelUnavailableError } from "./midtrans";

describe("Order access tokens", () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("round-trips a valid token and rejects tampering", () => {
    process.env.ORDER_ACCESS_SECRET = "test-secret-at-least-16";
    const token = createAccessToken("LNG-261124-K7Q2M")!;
    expect(verifyAccessToken(token)).toBe("LNG-261124-K7Q2M");
    expect(verifyAccessToken(encodeURIComponent(token))).toBe("LNG-261124-K7Q2M");
    // Swapping the order number must invalidate the signature
    expect(verifyAccessToken(token.replace("K7Q2M", "K7Q2N"))).toBeNull();
    expect(verifyAccessToken("LNG-261124-K7Q2M")).toBeNull();
    expect(verifyAccessToken(`${token}x`)).toBeNull();
  });

  it("refuses to issue tokens without a strong secret", () => {
    delete process.env.ORDER_ACCESS_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(createAccessToken("LNG-1")).toBeNull();
  });
});

describe("Midtrans channel availability classification", () => {
  it("treats activation errors as unavailable, other errors as unknown", () => {
    expect(isChannelUnavailableError("402", "Payment channel is not activated.")).toBe(true);
    expect(isChannelUnavailableError("400", "Payment type is not available")).toBe(true);
    expect(isChannelUnavailableError("401", "Access denied due to unauthorized transaction")).toBe(false);
    expect(isChannelUnavailableError("500", "Internal server error")).toBe(false);
  });
});
