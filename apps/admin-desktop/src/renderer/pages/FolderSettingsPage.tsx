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
        <div className="bg-[#1A1D27] border-2 border-white/10 p-5 shadow-[4px_4px_0px_rgba(255,255,255,0.05)] space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-[#5B8DEF] border border-white" />
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">감시 루트 폴더</h2>
          </div>
          <Input
            label="watchRoot 경로"
            value={watchRoot}
            onChange={(e) => setWatchRoot(e.target.value)}
            placeholder="C:/Users/user/JH-BuildFlow-Watch"
          />
          <p className="text-xs text-gray-500 font-medium">
            이 경로 아래에 아래 표준 폴더 구조를 생성하면 SCANNER 에이전트가 자동으로 파일을 감지합니다.
          </p>

          <Button onClick={handleSave}>
            {saved ? "✓ 저장됨" : "저장 및 재시작"}
          </Button>
        </div>

        <div className="bg-[#1A1D27] border-2 border-white/10 p-5 shadow-[4px_4px_0px_rgba(255,255,255,0.05)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-[#4ADE80] border border-white" />
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">표준 폴더 구조</h2>
          </div>
          <div className="space-y-1.5">
            {STANDARD_FOLDERS.map((folder) => (
              <div key={folder} className="flex items-center gap-2 text-xs font-bold text-gray-400">
                <span className="w-2 h-2 bg-[#5B8DEF]/40 border border-[#5B8DEF]/60 shrink-0" />
                {folder}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
