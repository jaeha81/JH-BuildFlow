import fs from "fs";
import path from "path";

import type { ReportPayload, ValidationResultPayload } from "../protocols/agent-message";

export type ReporterConfig = {
  reportsDir: string;
};

/**
 * REPORTER — 견적 비교 결과, 발주 현황, 정산 리포트 생성.
 * 결과를 JSON 형식으로 reports/ 폴더에 저장.
 */
export function generateQuoteComparisonReport(
  validationResults: ValidationResultPayload[],
  config: ReporterConfig
): ReportPayload {
  fs.mkdirSync(config.reportsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportFileName = `quote-comparison-${timestamp}.json`;
  const reportPath = path.join(config.reportsDir, reportFileName);

  const summary: Record<string, unknown> = {
    totalFiles: validationResults.length,
    validCount: validationResults.filter((r) => r.isValid).length,
    manualReviewCount: validationResults.filter((r) => r.manualReviewRequired).length,
    totalIssues: validationResults.reduce((sum, r) => sum + r.issues.length, 0),
    generatedAt: new Date().toISOString(),
  };

  const report = {
    reportType: "quote_comparison",
    summary,
    results: validationResults.map((r) => ({
      filePath: r.filePath,
      isValid: r.isValid,
      issues: r.issues,
      manualReviewRequired: r.manualReviewRequired,
      lineItemCount: r.correctedLineItems.length,
      totalAmount: r.correctedLineItems.reduce((sum, i) => sum + i.amount, 0),
    })),
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

  return {
    reportType: "quote_comparison",
    reportPath,
    generatedAt: new Date().toISOString(),
    summary,
  };
}

export function generateBidStatusReport(
  bidData: Record<string, unknown>[],
  config: ReporterConfig
): ReportPayload {
  fs.mkdirSync(config.reportsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(config.reportsDir, `bid-status-${timestamp}.json`);

  const summary: Record<string, unknown> = {
    totalBids: bidData.length,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(reportPath, JSON.stringify({ summary, data: bidData }, null, 2), "utf-8");

  return {
    reportType: "bid_status",
    reportPath,
    generatedAt: new Date().toISOString(),
    summary,
  };
}
