import { describe, it, expect } from "vitest";

import { classify } from "../agents/classifier";
import type { FileDetectedPayload } from "../protocols/agent-message";

function makeFile(overrides: Partial<FileDetectedPayload> = {}): FileDetectedPayload {
  return {
    filePath: "C:/JH-Watch/프로젝트A/05_협력사견적서원본/전기_견적서.xlsx",
    fileName: "전기_견적서.xlsx",
    fileHash: "abc123",
    folderKey: "05_협력사견적서원본",
    detectedAt: new Date().toISOString(),
    sizeBytes: 1024,
    ...overrides,
  };
}

describe("classify — 공종 분류", () => {
  it("전기 키워드 파일명에서 전기 공종 감지", () => {
    const result = classify(makeFile({ fileName: "전기_배선_견적.xlsx" }));
    expect(result.tradeType).toBe("전기");
  });

  it("목공 키워드 감지", () => {
    const result = classify(makeFile({ fileName: "목공_합판_내역서.pdf" }));
    expect(result.tradeType).toBe("목공");
  });

  it("공종 키워드 없으면 null", () => {
    const result = classify(makeFile({ fileName: "일반파일.txt", folderKey: "기타" }));
    expect(result.tradeType).toBeNull();
  });
});

describe("classify — 문서 유형 분류", () => {
  it("폴더키 05_협력사견적서원본 → 견적서", () => {
    const result = classify(makeFile({ folderKey: "05_협력사견적서원본" }));
    expect(result.docType).toBe("견적서");
  });

  it("폴더키 01_도면 → 도면", () => {
    const result = classify(makeFile({ folderKey: "01_도면", fileName: "평면도.dwg" }));
    expect(result.docType).toBe("도면");
  });

  it("파일명에 '견적' 포함 시 견적서", () => {
    const result = classify(makeFile({ folderKey: "기타", fileName: "견적서_최종.xlsx" }));
    expect(result.docType).toBe("견적서");
  });
});

describe("classify — 결과 구조", () => {
  it("filePath와 fileHash가 그대로 전달됨", () => {
    const file = makeFile();
    const result = classify(file);
    expect(result.filePath).toBe(file.filePath);
    expect(result.fileHash).toBe(file.fileHash);
  });

  it("confidence가 0~1 범위", () => {
    const result = classify(makeFile());
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
