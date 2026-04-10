/**
 * ExcelQuoteParser — xlsx 기반 Excel 견적서 파서
 * 헤더 자동 감지 (항목명 | 단위 | 수량 | 단가 | 금액)
 */
import type { NormalizedLineItem, NormalizedQuote, ParseResult, QuoteParser } from "./quote-parser-interface";

const HEADER_ALIASES: Record<string, string[]> = {
  item_name: ["항목명", "공사명", "품명", "내역", "item", "description"],
  unit: ["단위", "unit"],
  quantity: ["수량", "qty", "quantity"],
  unit_price: ["단가", "unit price", "unit_price", "단가(원)"],
  amount: ["금액", "합계", "amount", "소계", "금액(원)"],
};

export class ExcelQuoteParser implements QuoteParser {
  readonly supportedExtensions = ["xlsx", "xls"];

  async parse(filePath: string, contextHint: Record<string, string> = {}): Promise<ParseResult> {
    try {
      const xlsx = await import("xlsx");
      const wb = xlsx.readFile(filePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: unknown[][] = xlsx.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];

      if (rows.length < 2) {
        return { success: false, error: "데이터가 부족합니다." };
      }

      // 헤더 행 감지
      const headerRowIdx = _findHeaderRow(rows);
      if (headerRowIdx < 0) {
        return {
          success: false,
          error: "헤더 행을 찾을 수 없습니다.",
        };
      }

      const headerRow = rows[headerRowIdx].map((h) => String(h ?? "").toLowerCase().trim());
      const colMap = _mapColumns(headerRow);

      const failedFields = Object.entries(colMap)
        .filter(([, v]) => v === -1)
        .map(([k]) => k);

      const lineItems: NormalizedLineItem[] = [];
      let total = 0;

      for (let r = headerRowIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        const itemName = String(row[colMap.item_name] ?? "").trim();
        if (!itemName) continue;

        const qty = _toNum(row[colMap.quantity]);
        const price = _toNum(row[colMap.unit_price]);
        const amt = colMap.amount >= 0 ? _toNum(row[colMap.amount]) : qty * price;

        lineItems.push({
          item_name: itemName,
          unit: colMap.unit >= 0 ? String(row[colMap.unit] ?? "식") : "식",
          quantity: qty,
          unit_price: price,
          amount: amt,
        });
        total += amt;
      }

      const confidence = _computeConfidence(lineItems, total, failedFields);
      const now = new Date().toISOString();
      const quote: NormalizedQuote = {
        quote_header: {
          vendor_name: contextHint.vendor_name ?? "Unknown",
          project_name: contextHint.project_name ?? "Unknown",
          submitted_at: now,
        },
        vendor_business_snapshot: { biz_number: "", representative: "", address: "" },
        quote_total: total,
        tax_included: false,
        line_items: lineItems,
        parse_warnings: confidence < 0.8 ? ["일부 열을 자동 매핑하지 못했을 수 있습니다."] : [],
        manual_review_required: confidence < 0.5,
        parse_log: {
          method: "excel",
          confidence_score: confidence,
          failed_fields: failedFields,
        },
      };
      return { success: true, data: quote };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}

function _findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i].map((c) => String(c ?? "").toLowerCase());
    const matched = HEADER_ALIASES.item_name.some((alias) => row.some((c) => c.includes(alias)));
    if (matched) return i;
  }
  return -1;
}

function _mapColumns(header: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const idx = header.findIndex((h) => aliases.some((a) => h.includes(a)));
    result[field] = idx;
  }
  return result;
}

function _toNum(val: unknown): number {
  if (typeof val === "number") return val;
  const n = parseFloat(String(val ?? "0").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

function _computeConfidence(items: NormalizedLineItem[], total: number, failedFields: string[]): number {
  let score = 1.0;
  if (items.length === 0) score -= 0.5;
  else if (items.length < 2) score -= 0.15;
  if (total === 0) score -= 0.2;
  score -= failedFields.length * 0.1;
  return Math.max(0, Math.min(1, score));
}
