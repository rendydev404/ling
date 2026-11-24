import crypto from "crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildCoreChargeMethodParams,
  extractPaymentInstructions,
  getEnabledPaymentMethods,
  getMidtransCoreApiBaseUrl,
  mapMidtransStatus,
  parseMidtransTime,
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

  it("resolves Production vs Sandbox Core API URLs accurately", () => {
    process.env.MIDTRANS_IS_PRODUCTION = "true";
    expect(getMidtransCoreApiBaseUrl()).toBe("https://api.midtrans.com");

    process.env.MIDTRANS_IS_PRODUCTION = "false";
    expect(getMidtransCoreApiBaseUrl()).toBe("https://api.sandbox.midtrans.com");
  });

  it("builds Core API charge params per payment method", () => {
    expect(buildCoreChargeMethodParams("qris")).toEqual({
      payment_type: "qris",
      qris: { acquirer: "gopay" },
    });
    expect(buildCoreChargeMethodParams("bca_va")).toEqual({
      payment_type: "bank_transfer",
      bank_transfer: { bank: "bca" },
    });
    expect(buildCoreChargeMethodParams("permata_va")).toEqual({
      payment_type: "bank_transfer",
      bank_transfer: { bank: "permata" },
    });
    expect(buildCoreChargeMethodParams("mandiri_bill").payment_type).toBe("echannel");
    expect(buildCoreChargeMethodParams("gopay", "https://x.test/orders/1")).toEqual({
      payment_type: "gopay",
      gopay: { enable_callback: true, callback_url: "https://x.test/orders/1" },
    });
  });

  it("extracts payment instructions from Core API charge responses", () => {
    const va = extractPaymentInstructions("bni_va", {
      transaction_id: "trx-1",
      expiry_time: "2026-11-25 10:00:00",
      va_numbers: [{ bank: "bni", va_number: "9881234567890" }],
    });
    expect(va.vaNumber).toBe("9881234567890");
    expect(va.bank).toBe("bni");
    // WIB (UTC+7) -> UTC
    expect(va.expiresAt).toBe("2026-11-25T03:00:00.000Z");

    const permata = extractPaymentInstructions("permata_va", { permata_va_number: "8562000" });
    expect(permata.vaNumber).toBe("8562000");

    const mandiri = extractPaymentInstructions("mandiri_bill", {
      biller_code: "70012",
      bill_key: "990000000260",
    });
    expect(mandiri).toMatchObject({ billerCode: "70012", billKey: "990000000260" });

    const qris = extractPaymentInstructions("qris", {
      qr_string: "00020101021226...",
      actions: [{ name: "generate-qr-code", url: "https://api.midtrans.com/v2/qris/x/qr-code" }],
    });
    expect(qris.qrString).toBe("00020101021226...");
    expect(qris.qrImageUrl).toContain("qr-code");

    const gopay = extractPaymentInstructions("gopay", {
      actions: [{ name: "deeplink-redirect", url: "gojek://gopay/merchanttransfer?x=1" }],
    });
    expect(gopay.deeplinkUrl).toContain("gojek://");
    expect(parseMidtransTime("bukan tanggal")).toBeNull();
  });

  it("limits checkout to MIDTRANS_ENABLED_METHODS when set", () => {
    process.env.MIDTRANS_ENABLED_METHODS = "qris, bca_va, unknown";
    expect(getEnabledPaymentMethods()).toEqual(["qris", "bca_va"]);
    delete process.env.MIDTRANS_ENABLED_METHODS;
    expect(getEnabledPaymentMethods()).toContain("mandiri_bill");
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
