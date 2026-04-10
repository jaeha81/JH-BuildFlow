import fs from "fs";

import type { LineItem } from "../protocols/agent-message";

export type PdfParseResult = {
  success: boolean;
  rawText: string;
  lineItems: LineItem[];
  parsedTotal: number | null;
  errorDetail: string | null;
};

/**
 * PDF 파싱 어댑터.
 * pdfjs-dist를 사용해 텍스트 추출 후 라인 아이템 파싱 시도.
 * 향후 OCR 교체 가능한 인터페이스 유지.
 */
export async function parsePdf(filePath: string): Promise<PdfParseResult> {
  try {
    // pdfjs-dist는 ESM이므로 dynamic import 사용
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const data = fs.readFileSync(filePath);
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
    const pdf = await loadingTask.promise;

    let rawText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: { str?: string }) => item.str ?? "")
        .join(" ");
      rawText += pageText + "\n";
    }

    const lineItems = extractLineItems(rawText);
    const parsedTotal = extractTotal(rawText);

    return {
      success: true,
      rawText,
      lineItems,
      parsedTotal,
      errorDetail: null,
    };
  } catch (err) {
    return {
      success: false,
      rawText: "",
      lineItems: [],
      parsedTotal: null,
      errorDetail: err instanceof Error ? err.message : String(err),
    };
  }
}

/** 텍스트에서 수량/단가/금액 패턴 파싱 (휴리스틱) */
function extractLineItems(text: string): LineItem[] {
  const lines = text.split("\n");
  const items: LineItem[] = [];

  // 패턴: 항목명 | 단위 | 수량 | 단가 | 금액
  const numPattern = /[\d,]+(?:\.\d+)?/g;

  for (const line of lines) {
    const numbers = line.match(numPattern);
    if (!numbers || numbers.length < 3) continue;

    const amounts = numbers.map((n) => parseFloat(n.replace(/,/g, "")));
    const [qty, unitPrice, amount] = amounts.slice(-3);
    if (!qty || !unitPrice || !amount) continue;

    // 금액 일관성 검증 (±10% 허용)
    const calcAmount = qty * unitPrice;
    if (Math.abs(calcAmount - amount) / (amount || 1) > 0.1) continue;

    const textPart = line.replace(/[\d,\.]+/g, "").trim();
    if (textPart.length < 2) continue;

    items.push({
      itemName: textPart.substring(0, 100),
      unit: "식",
      quantity: qty,
      unitPrice,
      amount,
    });
  }

  return items;
}

function extractTotal(text: string): number | null {
  const totalPatterns = [
    /합\s*계\s*[:\s]*([0-9,]+)/,
    /총\s*금\s*액\s*[:\s]*([0-9,]+)/,
    /total\s*[:\s]*([0-9,]+)/i,
  ];

  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const num = parseFloat(match[1].replace(/,/g, ""));
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return null;
}
