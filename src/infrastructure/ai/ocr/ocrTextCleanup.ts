/** Normalize OCR output for downstream Gemini analysis. */

const OCR_FIXES: Array<[RegExp, string]> = [
  [/\bl\s*\.\s*797\b/gi, 'I-797'],
  [/\bI\s+797\b/g, 'I-797'],
  [/\bR\s*F\s*E\b/gi, 'RFE'],
  [/\bU\s*S\s*C\s*I\s*S\b/gi, 'USCIS'],
  [/\bA\s*-\s*(\d{8,9})\b/gi, 'A-$1'],
  [/\b(\w)\s+(\w)\s+(\w)\s+(\w)\s+(\w)\s+(\w)\s+(\w)\s+(\w)\s+(\w)\s+(\w)\b/g, '$1$2$3$4$5$6$7$8$9$10'],
];

export function cleanupOcrText(raw: string): string {
  let text = raw.normalize('NFKC');
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  text = text.replace(/[\t\f\v]+/g, ' ');
  text = text.replace(/ +$/gm, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n');
  text = mergeWrappedLines(text);

  for (const [pattern, replacement] of OCR_FIXES) {
    text = text.replace(pattern, replacement);
  }

  return text.trim();
}

function mergeWrappedLines(text: string): string {
  const lines = text.split('\n');
  const merged: string[] = [];
  for (const line of lines) {
    if (!line) {
      if (merged.length > 0 && merged[merged.length - 1] !== '') merged.push('');
      continue;
    }
    const prev = merged[merged.length - 1];
    if (
      prev
      && prev.length > 0
      && !/[.!?:]$/.test(prev)
      && /^[a-z(]/.test(line)
    ) {
      merged[merged.length - 1] = `${prev} ${line}`;
    } else {
      merged.push(line);
    }
  }
  return merged.join('\n');
}
