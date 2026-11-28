import { beforeAll, describe, expect, it } from "vitest";
import { createReaderToken, readerCookieName, verifyReaderToken, READER_TOKEN_TTL_SECONDS } from "./reader-token";

const EBOOK = "0b6f2a8e-3c1d-4e5f-9a7b-1c2d3e4f5a6b";
const OTHER = "1c7f2a8e-3c1d-4e5f-9a7b-1c2d3e4f5a6b";
const USER = "11111111-2222-3333-4444-555555555555";

beforeAll(() => {
  process.env.READER_TOKEN_SECRET = "test-secret-for-reader-tokens-123";
});

describe("reader token", () => {
  it("round-trips for the same ebook", () => {
    const token = createReaderToken(EBOOK, USER)!;
    expect(verifyReaderToken(EBOOK, token)).toBe(USER);
  });

  it("is bound to one ebook", () => {
    const token = createReaderToken(EBOOK, USER)!;
    expect(verifyReaderToken(OTHER, token)).toBeNull();
  });

  it("expires", () => {
    const now = 1_800_000_000;
    const token = createReaderToken(EBOOK, USER, now)!;
    expect(verifyReaderToken(EBOOK, token, now + READER_TOKEN_TTL_SECONDS - 1)).toBe(USER);
    expect(verifyReaderToken(EBOOK, token, now + READER_TOKEN_TTL_SECONDS + 1)).toBeNull();
  });

  it("rejects tampering with user or expiry", () => {
    const [, exp, sig] = createReaderToken(EBOOK, USER)!.split(".");
    expect(verifyReaderToken(EBOOK, `99999999-2222-3333-4444-555555555555.${exp}.${sig}`)).toBeNull();
    expect(verifyReaderToken(EBOOK, `${USER}.${Number(exp) + 9999}.${sig}`)).toBeNull();
    expect(verifyReaderToken(EBOOK, "garbage")).toBeNull();
    expect(verifyReaderToken(EBOOK, undefined)).toBeNull();
  });

  it("uses a cookie name derived from the ebook id", () => {
    expect(readerCookieName(EBOOK)).toBe("ling_rd_0b6f2a8e3c1d4e5f9a7b1c2d3e4f5a6b");
  });
});
