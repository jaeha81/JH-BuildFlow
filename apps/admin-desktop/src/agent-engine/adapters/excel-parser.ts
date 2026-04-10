import fs from "fs";

import * as XLSX from "xlsx";

import type { LineItem } from "../protocols/agent-message";

export type ExcelParseResult = {
  success: boolean;
  lineItems: LineItem[];
  parsedTotal: number | null;
  sheetNames: string[];
  errorDetail: string | null;
};

/**
 * Excel 파싱 어댑터.
 * xlsx 라이브러리로 .xlsx/.xls 파일 파싱.
 */
export function parseExcel(filePath: string): ExcelParseResult {
  try {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

    const sheetNames = workbook.SheetNames;
    const allItems: LineItem[] = [];
    let grandTotal: number | null = null;

    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        header: 1,
        defval: "",
      }) as unknown[][];

      const { items, total } = parseRows(rows);
      allItems.push(...items);
      if (total !== null) grandTotal = total;
    }

    return {
      success: true,
      lineItems: allItems,
      parsedTotal: grandTotal,
      sheetNames,
      errorDetail: null,
    };
  } catch (err) {
    return {
      success: false,
      lineItems: [],
      parsedTotal: null,
      sheetNames: [],
      errorDetail: err instanceof Error ? err.message : String(err),
    };
  }
}

function parseRows(rows: unknown[][]): { items: LineItem[]; total: number | null } {
  const items: LineItem[] = [];
  let total: number | null = null;

  // 헤더 행 탐색
  let headerRow = -1;
  let qtyCol = -1;
  let unitPriceCol = -1;
  let amountCol = -1;
  let nameCol = -1;
  let unitCol = -1;

  const HEADER_KEYWORDS: Record<string, string[]> = {
    name: ["공종", "항목", "내역", "품명", "공사명"],
    unit: ["단위", "규격"],
    qty: ["수량", "물량"],
    unitPrice: ["단가", "단위가격"],
    amount: ["금액", "합계", "소계"],
  };

  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i];
    if (!row) continue;
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] ?? "").trim();
      if (HEADER_KEYWORDS.name.some((k) => cell.includes(k))) nameCol = j;
      if (HEADER_KEYWORDS.unit.some((k) => cell.includes(k))) unitCol = j;
      if (HEADER_KEYWORDS.qty.some((k) => cell.includes(k))) qtyCol = j;
      if (HEADER_KEYWORDS.unitPrice.some((k) => cell.includes(k))) unitPriceCol = j;
      if (HEADER_KEYWORDS.amount.some((k) => cell.includes(k))) amountCol = j;
    }
    if (qtyCol !== -1 && amountCol !== -1) {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) return { items, total };

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const rawQty = parseFloat(String(row[qtyCol] ?? "").replace(/,/g, ""));
    const rawUnitPrice = parseFloat(String(row[unitPriceCol] ?? "").replace(/,/g, ""));
    const rawAmount = parseFloat(String(row[amountCol] ?? "").replace(/,/g, ""));

    if (isNaN(rawAmount)) continue;

    // 합계 행 감지
    const rowText = row.map((c) => String(c ?? "")).join("");
    if (["합계", "총계", "total"].some((k) => rowText.includes(k))) {
      total = rawAmount;
      continue;
    }

    if (isNaN(rawQty) || isNaN(rawUnitPrice)) continue;

    const itemName = nameCol !== -1 ? String(row[nameCol] ?? "").trim() : "";
    if (!itemName) continue;

    items.push({
      itemName: itemName.substring(0, 200),
      unit: unitCol !== -1 ? String(row[unitCol] ?? "식").trim() : "식",
      quantity: rawQty,
      unitPrice: rawUnitPrice,
      amount: rawAmount,
    });
  }

  return { items, total };
}
