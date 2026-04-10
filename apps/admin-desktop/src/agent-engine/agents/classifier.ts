import path from "path";

import type { ClassifiedPayload, FileDetectedPayload } from "../protocols/agent-message";

const TRADE_TYPE_KEYWORDS: Record<string, string[]> = {
  목공: ["목공", "목재", "MDF", "합판", "가구공사"],
  도장: ["도장", "페인트", "도료", "도색"],
  경량: ["경량", "칸막이", "LGS", "석고보드"],
  금속: ["금속", "철물", "스틸", "알루미늄"],
  전기: ["전기", "전선", "배선", "분전반", "콘센트"],
  조명: ["조명", "LED", "등기구", "전등"],
  타일: ["타일", "도기", "석재", "마블"],
  유리: ["유리", "글라스", "미러", "거울"],
  사인: ["사인", "간판", "LED채널", "사인물"],
  가구: ["가구", "싱크대", "붙박이"],
  턴키: ["턴키", "일괄", "전체공사"],
};

const DOC_TYPE_KEYWORDS: Record<string, string[]> = {
  도면: ["도면", "평면도", "입면도", "DWG", "CAD"],
  공내역서: ["공내역서", "물량", "내역", "BOQ"],
  견적서: ["견적", "estimate", "quotation"],
  공정일정: ["공정", "일정", "schedule", "공기"],
  사진: ["사진", "현장", "photo", "image", "img"],
  계약서: ["계약", "contract"],
  세금계산서: ["세금계산서", "invoice", "세금"],
};

export type ClassifierResult = ClassifiedPayload;

export function classify(file: FileDetectedPayload): ClassifierResult {
  const nameAndPath = `${file.fileName} ${file.folderKey}`.toLowerCase();

  // 공종 탐지
  let tradeType: string | null = null;
  let maxTradeScore = 0;

  for (const [trade, keywords] of Object.entries(TRADE_TYPE_KEYWORDS)) {
    const score = keywords.filter((k) => nameAndPath.includes(k.toLowerCase())).length;
    if (score > maxTradeScore) {
      maxTradeScore = score;
      tradeType = trade;
    }
  }

  // 문서 유형 탐지
  let docType: string | null = null;
  let maxDocScore = 0;

  // 폴더 키 우선 매핑
  const folderDocMap: Record<string, string> = {
    "01_도면": "도면",
    "02_공내역서_물량": "공내역서",
    "05_협력사견적서원본": "견적서",
    "06_표준화견적데이터": "견적서",
    "03_공정일정": "공정일정",
    "07_현장사진_이슈": "사진",
    "08_정산_세무": "세금계산서",
  };

  if (file.folderKey in folderDocMap) {
    docType = folderDocMap[file.folderKey] ?? null;
    maxDocScore = 10;
  }

  for (const [type, keywords] of Object.entries(DOC_TYPE_KEYWORDS)) {
    const score = keywords.filter((k) => nameAndPath.includes(k.toLowerCase())).length;
    if (score > maxDocScore) {
      maxDocScore = score;
      docType = type;
    }
  }

  // 프로젝트 힌트 (폴더 구조에서 추출)
  const parts = file.filePath.replace(/\\/g, "/").split("/");
  const projectHint = parts.length >= 3 ? (parts[parts.length - 3] ?? null) : null;

  const confidence = Math.min((maxTradeScore + maxDocScore) / 10, 1.0);

  return {
    filePath: file.filePath,
    fileHash: file.fileHash,
    tradeType,
    docType,
    projectHint,
    confidence,
  };
}
