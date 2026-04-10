import type { LineItem, ParseResultPayload, ValidationResultPayload } from "../protocols/agent-message";

const MIN_ITEM_AMOUNT = 1000;       // 1천원 미만은 이상값
const MAX_ITEM_AMOUNT = 5_000_000_000; // 50억 초과는 이상값

/**
 * VALIDATOR — 파싱 결과 검증 및 수동 보정 큐 분류.
 */
export function validate(parseResult: ParseResultPayload): ValidationResultPayload {
  const issues: string[] = [];

  if (parseResult.parseStatus === "failed") {
    return {
      filePath: parseResult.filePath,
      isValid: false,
      issues: [parseResult.errorDetail ?? "파싱 실패"],
      manualReviewRequired: true,
      correctedLineItems: [],
    };
  }

  if (parseResult.lineItems.length === 0) {
    issues.push("라인 아이템이 없습니다 — 수동 입력 필요");
  }

  const corrected: LineItem[] = [];

  for (const item of parseResult.lineItems) {
    const itemIssues: string[] = [];

    // 금액 범위 검증
    if (item.amount < MIN_ITEM_AMOUNT) {
      itemIssues.push(`금액 이상값: ${item.amount} (항목: ${item.itemName})`);
    }
    if (item.amount > MAX_ITEM_AMOUNT) {
      itemIssues.push(`금액 초과값: ${item.amount} (항목: ${item.itemName})`);
    }

    // 수량×단가 = 금액 검증 (±5% 허용)
    const calcAmount = item.quantity * item.unitPrice;
    const deviation = Math.abs(calcAmount - item.amount) / (item.amount || 1);
    if (deviation > 0.05 && item.quantity > 0 && item.unitPrice > 0) {
      itemIssues.push(
        `수량×단가 불일치: ${item.quantity}×${item.unitPrice}=${calcAmount} ≠ ${item.amount} (항목: ${item.itemName})`
      );
      // 자동 보정: 수량×단가로 재계산
      corrected.push({ ...item, amount: Math.round(calcAmount) });
    } else {
      corrected.push(item);
    }

    issues.push(...itemIssues);
  }

  // 합계 검증
  if (parseResult.parsedTotal !== null && corrected.length > 0) {
    const calcTotal = corrected.reduce((sum, i) => sum + i.amount, 0);
    const totalDev = Math.abs(calcTotal - parseResult.parsedTotal) / (parseResult.parsedTotal || 1);
    if (totalDev > 0.05) {
      issues.push(
        `합계 불일치: 계산값 ${calcTotal.toLocaleString()} ≠ 파싱값 ${parseResult.parsedTotal.toLocaleString()}`
      );
    }
  }

  const manualReviewRequired = issues.length > 0 || parseResult.manualReviewRequired;

  return {
    filePath: parseResult.filePath,
    isValid: issues.length === 0,
    issues,
    manualReviewRequired,
    correctedLineItems: corrected,
  };
}
