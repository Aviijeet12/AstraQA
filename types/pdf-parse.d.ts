declare module "pdf-parse/lib/pdf-parse.js" {
  import type { Buffer } from "node:buffer";
  interface PdfData {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    version: string;
    text: string;
  }
  function pdfParse(dataBuffer: Buffer | ArrayBuffer | Uint8Array, options?: Record<string, unknown>): Promise<PdfData>;
  export = pdfParse;
}
