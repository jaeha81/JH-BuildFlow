import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

import type { ClassifiedPayload, PackagedPayload } from "../protocols/agent-message";

export type PackagerConfig = {
  outputDir: string;
};

type PackageGroup = {
  tradeType: string;
  documents: ClassifiedPayload[];
};

/**
 * PACKAGER — 협력사별 발주 자료 세트 생성.
 * 공종별로 문서를 그룹화하고 패키지 디렉토리를 생성한다.
 */
export function pack(
  classified: ClassifiedPayload[],
  config: PackagerConfig
): PackagedPayload[] {
  // 공종별 그룹핑
  const groups = new Map<string, ClassifiedPayload[]>();

  for (const doc of classified) {
    const key = doc.tradeType ?? "미분류";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(doc);
  }

  const packages: PackagedPayload[] = [];

  for (const [tradeType, docs] of groups) {
    const packageId = randomUUID();
    const packageDir = path.join(
      config.outputDir,
      `package_${tradeType}_${packageId.slice(0, 8)}`
    );

    fs.mkdirSync(packageDir, { recursive: true });

    // manifest.json 생성
    const manifest = {
      packageId,
      tradeType,
      createdAt: new Date().toISOString(),
      documents: docs.map((d) => ({
        fileName: path.basename(d.filePath),
        filePath: d.filePath,
        docType: d.docType,
        fileHash: d.fileHash,
      })),
    };

    fs.writeFileSync(
      path.join(packageDir, "manifest.json"),
      JSON.stringify(manifest, null, 2),
      "utf-8"
    );

    packages.push({
      packageId,
      vendorId: null, // 발주 시점에 할당
      tradeType,
      documentPaths: docs.map((d) => d.filePath),
      createdAt: manifest.createdAt,
    });
  }

  return packages;
}
