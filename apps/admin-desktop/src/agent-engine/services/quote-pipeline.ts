/**
 * PROMPT-08: 견적 표준화 파이프라인
 *
 * 흐름:
 *   파일 업로드
 *   → ESTIMATOR (파싱 시도, 적절한 파서 선택)
 *   → VALIDATOR (신뢰도 검증)
 *   → 성공(≥0.8): 자동 저장
 *   → 경고(0.5~0.8): 경고 포함 저장, 관리자 검토 권고
 *   → 실패(<0.5): manual_review_required = true
 */
import path from "path";
import type { NormalizedQuote, ParseResult, QuoteParser } from "../adapters/quote-parser-interface";
import { ExcelQuoteParser } from "../adapters/excel-quote-parser";
import { HwpStubParser } from "../adapters/hwp-stub";
import { PdfQuoteParser } from "../adapters/pdf-quote-parser";

const PARSERS: QuoteParser[] = [
  new PdfQuoteParser(),
  new ExcelQuoteParser(),
  new HwpStubParser(),
];

export interface PipelineResult {
  quote: NormalizedQuote | null;
  confidence: number;
  requiresManualReview: boolean;
  autoSave: boolean;
  warnings: string[];
  error?: string;
}

export async function runQuotePipeline(
  filePath: string,
  contextHint: Record<string, string> = {},
): Promise<PipelineResult> {
  const ext = (path.extname(filePath).replace(/^\./, "") || filePath.split(".").pop() || "").toLowerCase();

  const parser = PARSERS.find((p) => p.supportedExtensions.includes(ext));
  if (!parser) {
    return {
      quote: null,
      confidence: 0,
      requiresManualReview: true,
      autoSave: false,
      warnings: [],
      error: `지원되지 않는 파일 형식: .${ext}`,
    };
  }

  let result: ParseResult;
  try {
    result = await parser.parse(filePath, contextHint);
  } catch (err) {
    result = { success: false, error: err instanceof Error ? err.message : String(err) };
  }

  if (!result.success || !result.data) {
    return {
      quote: null,
      confidence: 0,
      requiresManualReview: true,
      autoSave: false,
      warnings: [],
      ...(result.error !== undefined ? { error: result.error } : {}),
    };
  }

  const quote = result.data;
  const confidence = quote.parse_log.confidence_score;

  // VALIDATOR: 신뢰도 기준 분기
  if (confidence >= 0.8) {
    return {
      quote,
      confidence,
      requiresManualReview: false,
      autoSave: true,
      warnings: [],
    };
  } else if (confidence >= 0.5) {
    return {
      quote: { ...quote, parse_warnings: [...quote.parse_warnings, "자동 파싱 신뢰도가 낮습니다. 관리자 검토를 권고합니다."] },
      confidence,
      requiresManualReview: false,
      autoSave: true,
      warnings: ["관리자 검토 권고"],
    };
  } else {
    return {
      quote: { ...quote, manual_review_required: true },
      confidence,
      requiresManualReview: true,
      autoSave: false,
      warnings: ["신뢰도 부족 — 수동 보정 필요"],
    };
  }
}
