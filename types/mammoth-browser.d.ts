// mammoth ships its browser bundle without a type file; only the one call used in lib/biodata-import/extract.ts is typed.
declare module "mammoth/mammoth.browser.min.js" {
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string; messages: unknown[] }>;
}
