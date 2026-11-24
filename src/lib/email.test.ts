import { afterEach, describe, expect, it } from "vitest";
import { isEmailConfigured, resolveFromAddress } from "./email";

describe("Email sender resolution", () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("uses the Gmail account as From and keeps the display name", () => {
    process.env.SMTP_USER = "toko@gmail.com";
    process.env.SMTP_PASS = "abcd efgh ijkl mnop";
    delete process.env.RESEND_API_KEY;

    process.env.EMAIL_FROM = "Ling Studio";
    expect(resolveFromAddress()).toBe('"Ling Studio" <toko@gmail.com>');

    // A different address in EMAIL_FROM is replaced: Gmail would rewrite it anyway
    process.env.EMAIL_FROM = "Ling Studio <halo@domainlain.com>";
    expect(resolveFromAddress()).toBe('"Ling Studio" <toko@gmail.com>');

    delete process.env.EMAIL_FROM;
    expect(resolveFromAddress()).toBe("toko@gmail.com");
    expect(isEmailConfigured()).toBe(true);
  });

  it("falls back to Resend's EMAIL_FROM when SMTP is not set", () => {
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    process.env.RESEND_API_KEY = "re_live_key";
    process.env.EMAIL_FROM = "Ling <halo@domainku.com>";
    expect(resolveFromAddress()).toBe("Ling <halo@domainku.com>");
    expect(isEmailConfigured()).toBe(true);
  });

  it("reports unconfigured when nothing is set", () => {
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.RESEND_API_KEY;
    expect(isEmailConfigured()).toBe(false);
  });
});
