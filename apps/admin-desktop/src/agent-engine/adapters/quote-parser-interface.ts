/**
 * PROMPT-08: 견적 파서 Adapter 인터페이스 (QuoteParser)
 *
 * NormalizedQuote 표준 출력 구조 + Adapter 패턴 구현체
 */

export interface QuoteHeader {
  vendor_name: string;
  project_name: string;
  submitted_at: string;
  valid_until?: string;
}

export interface VendorBusinessSnapshot {
  biz_number: string;
  representative: string;
  address: string;
}

export interface NormalizedLineItem {
  item_name: string;
  spec?: string;
  unit: string;
  quantity: number;
  unit_price: number;
  amount: number;
  note?: string;
}

export interface ParseLog {
  method: "pdf" | "excel" | "form" | "hwp_stub";
  confidence_score: number; // 0~1
  failed_fields: string[];
}

export interface NormalizedQuote {
  quote_header: QuoteHeader;
  vendor_business_snapshot: VendorBusinessSnapshot;
  quote_total: number;
  tax_included: boolean;
  line_items: NormalizedLineItem[];
  parse_warnings: string[];
  manual_review_required: boolean;
  parse_log: ParseLog;
}

export interface ParseResult {
  success: boolean;
  data?: NormalizedQuote;
  error?: string;
}

/** Adapter 패턴 인터페이스 */
export interface QuoteParser {
  readonly supportedExtensions: string[];
  parse(filePath: string, contextHint?: Record<string, string>): Promise<ParseResult>;
}
