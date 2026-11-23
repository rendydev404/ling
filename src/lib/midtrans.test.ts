import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { mapMidtransStatus, verifyMidtransSignature } from "./midtrans";
import { signWebhookPayload } from "./webhooks";

describe("Midtrans Security & Status Mapping", () => {
  const serverKey = "SB-Mid-server-test-key-12345";

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
