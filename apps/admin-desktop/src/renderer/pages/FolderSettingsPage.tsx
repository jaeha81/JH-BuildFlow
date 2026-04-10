import { useState } from "react";
import { PageHeader, Input, Button } from "../components/ui";

const STANDARD_FOLDERS = [
  "00_프로젝트기본정보",
  "01_도면",
  "02_공내역서_물량",
  "03_공정일정",
  "04_협력사발주자료",
  "05_협력사견적서원본",
  "06_표준화견적데이터",
  "07_현장사진_이슈",
  "08_정산_세무",
  "09_완료보고",
  "99_로그_감사기록",
];

export function FolderSettingsPage() {
  const [watchRoot, setWatchRoot] = useState(
    "C:/Users/user/JH-BuildFlow-Watch"
  );
  const [saved, setSaved] = useState(false);

  function handleSave() {
    // 실제 구현: IPC로 main process에 설정 변경 전달 → harness.reloadConfig()
    // window.electronAPI?.updateFolderConfig({ watchRoot });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <PageHeader title="로컬 폴더 설정" />

      <div className="p-6 max-w-xl space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-300">감시 루트 폴더</h2>
          <Input
            label="watchRoot 경로"
            value={watchRoot}
            onChange={(e) => setWatchRoot(e.target.value)}
            placeholder="C:/Users/user/JH-BuildFlow-Watch"
          />
          <p className="text-xs text-gray-500">
            이 경로 아래에 아래 표준 폴더 구조를 생성하면 SCANNER 에이전트가 자동으로 파일을 감지합니다.
          </p>

          <Button onClick={handleSave}>
            {saved ? "✓ 저장됨" : "저장 및 재시작"}
          </Button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-300 mb-3">표준 폴더 구조</h2>
          <div className="space-y-1">
            {STANDARD_FOLDERS.map((folder) => (
              <div key={folder} className="flex items-center gap-2 text-xs text-gray-400">
                <span className="text-gray-600">📁</span>
                {folder}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
