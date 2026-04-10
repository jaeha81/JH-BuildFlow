/**
 * FormInputParser — 직접 입력 데이터 파서 (confidence = 1.0)
 */
import type { NormalizedLineItem, NormalizedQuote, ParseResult, QuoteParser } from "./quote-parser-interface";

export interface FormInputData {
  vendor_name?: string;
  project_name?: string;
  line_items: NormalizedLineItem[];
  tax_included?: boolean;
}

export class FormInputParser implements QuoteParser {
  readonly supportedExtensions: string[] = []; // 파일 없음

  async parse(_filePath: string): Promise<ParseResult> {
    return { success: false, error: "FormInputParser는 파일 경로 방식을 지원하지 않습니다." };
  }

  parseFormData(data: FormInputData): ParseResult {
    const total = data.line_items.reduce((s, i) => s + i.amount, 0);
    const now = new Date().toISOString();
    const quote: NormalizedQuote = {
      quote_header: {
        vendor_name: data.vendor_name ?? "Unknown",
        project_name: data.project_name ?? "Unknown",
        submitted_at: now,
      },
      vendor_business_snapshot: { biz_number: "", representative: "", address: "" },
      quote_total: total,
      tax_included: data.tax_included ?? false,
      line_items: data.line_items,
      parse_warnings: [],
      manual_review_required: false,
      parse_log: {
        method: "form",
        confidence_score: 1.0,
        failed_fields: [],
      },
    };
    return { success: true, data: quote };
  }
}
