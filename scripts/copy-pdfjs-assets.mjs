// Copies the pdf.js worker and its on-demand assets into public/pdfjs/<version>/ so they
// are served as static, long-cacheable files and only downloaded when a PDF is opened.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = join(root, "node_modules", "pdfjs-dist");
const { version } = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
const outBase = join(root, "public", "pdfjs");
const out = join(outBase, version);

if (existsSync(join(out, "pdf.worker.min.mjs"))) {
  process.exit(0);
}

rmSync(outBase, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(pkgDir, "build", "pdf.worker.min.mjs"), join(out, "pdf.worker.min.mjs"));
for (const dir of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  if (existsSync(join(pkgDir, dir))) cpSync(join(pkgDir, dir), join(out, dir), { recursive: true });
}
console.log(`pdf.js ${version} assets copied to public/pdfjs/${version}`);
