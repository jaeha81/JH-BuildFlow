/**
 * PdfQuoteParser — pdfjs-dist 기반 PDF 견적서 파서
 */
import type { NormalizedQuote, ParseResult, QuoteParser } from "./quote-parser-interface";

// 추출된 텍스트에서 금액 패턴 찾기
const AMOUNT_RE = /[\d,]+\s*원?/g;
const TOTAL_KEYWORDS = ["합계", "총액", "total", "sum", "금액합계"];

export class PdfQuoteParser implements QuoteParser {
  readonly supportedExtensions = ["pdf"];

  async parse(filePath: string, contextHint: Record<string, string> = {}): Promise<ParseResult> {
    try {
      // pdfjs-dist dynamic import (Electron/Node 환경)
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js");
      const doc = await pdfjsLib.getDocument({ url: `file://${filePath}` }).promise;

      let fullText = "";
      const failedFields: string[] = [];

      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        fullText += content.items.map((i: { str?: string }) => i.str ?? "").join(" ") + "\n";
      }

      // 라인 파싱 시도
      const lines = fullText.split("\n").filter((l) => l.trim().length > 0);
      const lineItems = _extractLineItems(lines);
      const total = _extractTotal(lines, lineItems);

      if (lineItems.length === 0) failedFields.push("line_items");
      if (!total) failedFields.push("total");

      const confidence = _computeConfidence(lineItems, total, failedFields);
      const manualReview = confidence < 0.5;

      const now = new Date().toISOString();
      const quote: NormalizedQuote = {
        quote_header: {
          vendor_name: contextHint.vendor_name ?? "Unknown",
          project_name: contextHint.project_name ?? "Unknown",
          submitted_at: now,
        },
        vendor_business_snapshot: {
          biz_number: _extractField(fullText, /사업자\s*번호[:\s]*([0-9\-]{10,14})/),
          representative: _extractField(fullText, /대표[자]?[:\s]*([가-힣a-zA-Z\s]{2,20})/),
          address: _extractField(fullText, /주\s*소[:\s]*(.{10,50})/),
        },
        quote_total: total ?? 0,
        tax_included: fullText.includes("부가세 포함") || fullText.includes("VAT 포함"),
        line_items: lineItems,
        parse_warnings: confidence < 0.8 ? ["일부 항목이 자동 추출되지 않았을 수 있습니다."] : [],
        manual_review_required: manualReview,
        parse_log: {
          method: "pdf",
          confidence_score: confidence,
          failed_fields: failedFields,
        },
      };

      return { success: true, data: quote };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

function _extractLineItems(lines: string[]) {
  return lines
    .filter((line) => /\d/.test(line) && /[가-힣a-zA-Z]/.test(line))
    .slice(0, 50)
    .map((line, idx) => {
      const nums = (line.match(/[\d,]+/g) ?? []).map((n) => parseInt(n.replace(/,/g, ""), 10)).filter(Boolean);
      return {
        item_name: line.slice(0, 30).trim(),
        unit: "식",
        quantity: nums[0] ?? 1,
        unit_price: nums[1] ?? 0,
        amount: nums[2] ?? 0,
      };
    })
    .filter((item) => item.amount > 0);
}

function _extractTotal(lines: string[], lineItems: ReturnType<typeof _extractLineItems>): number | null {
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (TOTAL_KEYWORDS.some((k) => lowerLine.includes(k))) {
      const nums = line.match(/[\d,]+/g);
      if (nums) {
        const candidate = parseInt(nums[nums.length - 1].replace(/,/g, ""), 10);
        if (candidate > 0) return candidate;
      }
    }
  }
  return lineItems.reduce((s, i) => s + i.amount, 0) || null;
}

function _extractField(text: string, re: RegExp): string {
  const match = text.match(re);
  return match ? match[1].trim() : "";
}

function _computeConfidence(
  lineItems: unknown[],
  total: number | null,
  failedFields: string[],
): number {
  let score = 1.0;
  if (lineItems.length === 0) score -= 0.4;
  else if (lineItems.length < 3) score -= 0.1;
  if (!total) score -= 0.3;
  score -= failedFields.length * 0.05;
  return Math.max(0, Math.min(1, score));
}
