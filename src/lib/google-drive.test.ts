import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DriveError,
  buildDriveViewUrl,
  extractConfirmFormParams,
  fetchDriveMedia,
  parseContentDispositionFilename,
  parseDriveFileId,
  parseTotalBytesFromHeaders,
  probeDrivePdf,
} from "./google-drive";

describe("google-drive link proxy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts file IDs from standard Google Drive share links", () => {
    expect(
      parseDriveFileId("https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz_012/view?usp=sharing")
    ).toBe("1AbCdEfGhIjKlMnOpQrStUvWxYz_012");

    expect(
      parseDriveFileId("https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz_012")
    ).toBe("1AbCdEfGhIjKlMnOpQrStUvWxYz_012");

    expect(
      parseDriveFileId("https://drive.usercontent.google.com/download?id=1AbCdEfGhIjKlMnOpQrStUvWxYz_012&export=download")
    ).toBe("1AbCdEfGhIjKlMnOpQrStUvWxYz_012");

    expect(parseDriveFileId("1AbCdEfGhIjKlMnOpQrStUvWxYz_012")).toBe("1AbCdEfGhIjKlMnOpQrStUvWxYz_012");
    expect(buildDriveViewUrl("1AbCdEfGhIjKlMnOpQrStUvWxYz_012")).toBe(
      "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz_012/view"
    );
  });

  it("rejects folder links and Google Docs editor links with clear messages", () => {
    expect(() =>
      parseDriveFileId("https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz_012?usp=sharing")
    ).toThrow(/Folder Google Drive/);

    expect(() =>
      parseDriveFileId("https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz_012/edit")
    ).toThrow(/Google Docs/);
  });

  it("parses filenames and byte sizes from upstream headers", () => {
    expect(
      parseContentDispositionFilename("attachment; filename=\"fallback.pdf\"; filename*=UTF-8''Panduan%20Bisnis%202026.pdf")
    ).toBe("Panduan Bisnis 2026.pdf");

    expect(parseContentDispositionFilename('attachment; filename="Ebook-Gratis.pdf"')).toBe("Ebook-Gratis.pdf");

    const rangeHeaders = new Headers({ "content-range": "bytes 0-1023/9437184" });
    expect(parseTotalBytesFromHeaders(rangeHeaders, 206)).toBe(9437184);
  });

  it("parses virus-scan confirmation form inputs for large PDFs", () => {
    const html = `
      <form id="download-form" action="https://drive.usercontent.google.com/download" method="get">
        <input type="hidden" name="id" value="1LargePdfFileId_00001">
        <input type="hidden" name="export" value="download">
        <input type="hidden" name="confirm" value="t">
        <input type="hidden" name="uuid" value="c8a2-uuid-991">
      </form>
    `;
    expect(extractConfirmFormParams(html)).toEqual({
      id: "1LargePdfFileId_00001",
      export: "download",
      confirm: "t",
      uuid: "c8a2-uuid-991",
    });
  });

  it("detects restricted files that redirect to Google login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>ServiceLogin accounts.google.com</html>", {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        })
      )
    );

    await expect(fetchDriveMedia("1RestrictedPdfFileId_00001")).rejects.toThrow(DriveError);
  });

  it("probes a valid PDF link and extracts metadata", async () => {
    const pdfBytes = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(pdfBytes, {
          status: 206,
          headers: {
            "content-type": "application/pdf",
            "content-range": "bytes 0-28/2097152",
            "content-disposition": 'attachment; filename="Strategi-Digital.pdf"',
          },
        })
      )
    );

    const info = await probeDrivePdf("https://drive.google.com/file/d/1ValidPdfFileId_0000001/view?usp=sharing");
    expect(info).toEqual({
      fileId: "1ValidPdfFileId_0000001",
      fileName: "Strategi-Digital.pdf",
      fileSizeBytes: 2097152,
      mimeType: "application/pdf",
    });
  });
});
