/**
 * HWP 파일 어댑터 — stub 구현.
 * HWP 파싱은 현재 지원하지 않음.
 * 파일 수신만 허용하고 manual_review_required = true 반환.
 * 향후 HWP 파서 라이브러리 연동 시 이 모듈만 교체.
 */

export type HwpStubResult = {
  success: false;
  manualReviewRequired: true;
  reason: string;
};

export function parseHwp(filePath: string): HwpStubResult {
  return {
    success: false,
    manualReviewRequired: true,
    reason: `HWP 파일 자동 파싱 미지원 — 수동 검토 필요: ${filePath}`,
  };
}

export function isHwpFile(filePath: string): boolean {
  return filePath.toLowerCase().endsWith(".hwp") || filePath.toLowerCase().endsWith(".hwpx");
}
