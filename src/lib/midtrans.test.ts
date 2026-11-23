import crypto from "crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  getMidtransCoreApiBaseUrl,
  getMidtransSnapBaseUrl,
  getMidtransSnapScriptUrl,
  mapMidtransStatus,
  verifyMidtransSignature,
} from "./midtrans";
import { signWebhookPayload } from "./webhooks";

describe("Midtrans Security & Status Mapping", () => {
  const serverKey = "Mid-server-test-key-12345";
  const signatureSecretKey = "Mid-server-sig-secret-99999";
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("verifies valid SHA-512 Midtrans webhook signature and rejects tampered payload", () => {
    const orderId = "LNG-261123-ABC12";
    const statusCode = "200";
    const grossAmount = "299000.00";

    const validSignature = crypto
      .createHash("sha512")
      .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
      .digest("hex");

    expect(
      verifyMidtransSignature({
        orderId,
        statusCode,
        grossAmount,
        signatureKey: validSignature,
        serverKey,
      })
    ).toBe(true);

    expect(
      verifyMidtransSignature({
        orderId,
        statusCode,
        grossAmount: "10000.00", // tampered amount
        signatureKey: validSignature,
        serverKey,
      })
    ).toBe(false);
  });

  it("prioritizes MIDTRANS_SIGNATURE_KEY (Access Keys v2) and enforces MIDTRANS_MERCHANT_ID", () => {
    process.env.MIDTRANS_SERVER_KEY = serverKey;
    process.env.MIDTRANS_SIGNATURE_KEY = signatureSecretKey;
    process.env.MIDTRANS_MERCHANT_ID = "M868096796";

    const orderId = "LNG-261123-PROD1";
    const statusCode = "200";
    const grossAmount = "150000.00";

    const sigWithDedicatedSecret = crypto
      .createHash("sha512")
      .update(`${orderId}${statusCode}${grossAmount}${signatureSecretKey}`)
      .digest("hex");

    expect(
      verifyMidtransSignature({
        orderId,
        statusCode,
        grossAmount,
        signatureKey: sigWithDedicatedSecret,
        merchantId: "M868096796",
      })
    ).toBe(true);

    // Rejects mismatched merchant_id even if signature string matches
    expect(
      verifyMidtransSignature({
        orderId,
        statusCode,
        grossAmount,
        signatureKey: sigWithDedicatedSecret,
        merchantId: "M000000000",
      })
    ).toBe(false);
  });

  it("resolves Production vs Sandbox Snap & Core API URLs accurately", () => {
    process.env.MIDTRANS_IS_PRODUCTION = "true";
    expect(getMidtransSnapBaseUrl()).toBe("https://app.midtrans.com/snap/v1/transactions");
    expect(getMidtransSnapScriptUrl()).toBe("https://app.midtrans.com/snap/snap.js");
    expect(getMidtransCoreApiBaseUrl()).toBe("https://api.midtrans.com");

    process.env.MIDTRANS_IS_PRODUCTION = "false";
    expect(getMidtransSnapBaseUrl()).toBe("https://app.sandbox.midtrans.com/snap/v1/transactions");
    expect(getMidtransSnapScriptUrl()).toBe("https://app.sandbox.midtrans.com/snap/snap.js");
    expect(getMidtransCoreApiBaseUrl()).toBe("https://api.sandbox.midtrans.com");
  });

  it("maps Midtrans statuses correctly", () => {
    expect(mapMidtransStatus("settlement")).toBe("paid");
    expect(mapMidtransStatus("capture", "accept")).toBe("paid");
    expect(mapMidtransStatus("capture", "challenge")).toBe("pending");
    expect(mapMidtransStatus("pending")).toBe("pending");
    expect(mapMidtransStatus("expire")).toBe("expired");
    expect(mapMidtransStatus("cancel")).toBe("cancelled");
    expect(mapMidtransStatus("deny")).toBe("cancelled");
    expect(mapMidtransStatus("refund")).toBe("refunded");
  });

  it("signs outbound webhook payloads deterministically with HMAC-SHA256", () => {
    const payload = JSON.stringify({ event: "order.paid", total: 99000 });
    const sig1 = signWebhookPayload(payload, "my-secret");
    const sig2 = signWebhookPayload(payload, "my-secret");
    expect(sig1).toBe(sig2);
    expect(sig1).toHaveLength(64);
  });
});
