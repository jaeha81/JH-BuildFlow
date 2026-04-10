import path from "path";

import { parseExcel } from "../adapters/excel-parser";
import { isHwpFile, parseHwp } from "../adapters/hwp-stub";
import { parsePdf } from "../adapters/pdf-parser";
import type { ParseResultPayload } from "../protocols/agent-message";

const PDF_EXTS = [".pdf"];
const EXCEL_EXTS = [".xlsx", ".xls", ".xlsm"];

/**
 * ESTIMATOR — 견적 파일 파싱 및 표준화.
 * PDF → pdfjs-dist
 * Excel → xlsx
 * HWP → stub (manual_review_required = true)
 * adapter 패턴으로 향후 OCR 교체 가능.
 */
export async function estimate(filePath: string): Promise<ParseResultPayload> {
  const ext = path.extname(filePath).toLowerCase();

  if (isHwpFile(filePath)) {
    const result = parseHwp(filePath);
    return {
      filePath,
      fileHash: "",
      parsedTotal: null,
      lineItems: [],
      parseStatus: "failed",
      manualReviewRequired: true,
      errorDetail: result.reason,
    };
  }

  if (PDF_EXTS.includes(ext)) {
    const result = await parsePdf(filePath);
    return {
      filePath,
      fileHash: "",
      parsedTotal: result.parsedTotal,
      lineItems: result.lineItems,
      parseStatus: result.success ? "success" : "failed",
      manualReviewRequired: !result.success || result.lineItems.length === 0,
      errorDetail: result.errorDetail,
    };
  }

  if (EXCEL_EXTS.includes(ext)) {
    const result = parseExcel(filePath);
    return {
      filePath,
      fileHash: "",
      parsedTotal: result.parsedTotal,
      lineItems: result.lineItems,
      parseStatus: result.success ? "success" : "failed",
      manualReviewRequired: !result.success || result.lineItems.length === 0,
      errorDetail: result.errorDetail,
    };
  }

  return {
    filePath,
    fileHash: "",
    parsedTotal: null,
    lineItems: [],
    parseStatus: "failed",
    manualReviewRequired: true,
    errorDetail: `지원하지 않는 파일 형식: ${ext}`,
  };
}

export function isEstimateFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return (
    PDF_EXTS.includes(ext) ||
    EXCEL_EXTS.includes(ext) ||
    isHwpFile(filePath)
  );
}
