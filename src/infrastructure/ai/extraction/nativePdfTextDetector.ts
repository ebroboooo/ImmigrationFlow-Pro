const MIN_CHARS_PER_PAGE = 25;
const MIN_TOTAL_NATIVE_CHARS = 80;

export interface NativePdfDetectionResult {
  hasSelectableText: boolean;
  text: string;
  pageCount: number;
  averageCharsPerPage: number;
}

export async function detectNativePdfText(
  file: Blob,
  loadPdfDocument: (data: ArrayBuffer) => Promise<Awaited<ReturnType<typeof import('../ocr/pdfJsLoader').loadPdfDocument>>>,
): Promise<NativePdfDetectionResult> {
  const buffer = await file.arrayBuffer();
  const pdf = await loadPdfDocument(buffer);
  const pageCount = pdf.numPages;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : '') ?? '')
      .join(' ')
      .trim();
    pageTexts.push(text);
  }

  const text = pageTexts.join('\n\n');
  const nonEmptyPages = pageTexts.filter((p) => p.length > 0).length;
  const averageCharsPerPage = pageCount > 0 ? text.length / pageCount : 0;
  const hasSelectableText =
    text.length >= MIN_TOTAL_NATIVE_CHARS
    && (nonEmptyPages === 0 || averageCharsPerPage >= MIN_CHARS_PER_PAGE);

  return { hasSelectableText, text, pageCount, averageCharsPerPage };
}

export function isLikelyNativeText(result: NativePdfDetectionResult): boolean {
  return result.hasSelectableText;
}
