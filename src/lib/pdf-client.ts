"use client";

/**
 * Lazily loads pdf.js (~430 KB) only on pages that actually open a PDF.
 * Worker + fonts/cmaps are static files copied to /public/pdfjs/<version>/.
 */
type PdfjsModule = typeof import("pdfjs-dist");

let loader: Promise<PdfjsModule> | null = null;

export function loadPdfjs(): Promise<PdfjsModule> {
  if (!loader) {
    loader = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = `/pdfjs/${pdfjs.version}/pdf.worker.min.mjs`;
      return pdfjs;
    });
  }
  return loader;
}

export function pdfAssetOptions(version: string) {
  const base = `/pdfjs/${version}/`;
  return {
    cMapUrl: `${base}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${base}standard_fonts/`,
    wasmUrl: `${base}wasm/`,
    iccUrl: `${base}iccs/`,
    isEvalSupported: false,
  };
}

/** Reads page count and renders page 1 as a JPEG cover (used by the admin uploader). */
export async function inspectPdfFile(file: File): Promise<{ pageCount: number; cover: Blob | null }> {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data, ...pdfAssetOptions(pdfjs.version) }).promise;
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: 600 / base.width });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return { pageCount: doc.numPages, cover: null };
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const cover = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return { pageCount: doc.numPages, cover };
  } finally {
    void doc.destroy();
  }
}
