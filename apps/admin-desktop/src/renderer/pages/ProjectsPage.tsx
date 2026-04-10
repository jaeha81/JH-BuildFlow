import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { projectsApi, type Project } from "../lib/api";
import {
  PageHeader, Button, Badge, LoadingSpinner, EmptyState, ErrorAlert,
} from "../components/ui";

const STATUS_LABEL: Record<string, { label: string; variant: "success" | "warning" | "info" | "default" | "error" }> = {
  draft:          { label: "초안", variant: "default" },
  active:         { label: "진행 중", variant: "success" },
  bid_collecting: { label: "견적 수집", variant: "info" },
  contracted:     { label: "계약", variant: "info" },
  in_progress:    { label: "시공 중", variant: "warning" },
  completed:      { label: "완료", variant: "success" },
  cancelled:      { label: "취소", variant: "error" },
};

export function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    projectsApi
      .list()
      .then(setProjects)
      .catch(() => setError("프로젝트 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="프로젝트"
        actions={
          <Button onClick={() => navigate("/projects/new")}>+ 새 프로젝트</Button>
        }
      />

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <LoadingSpinner />
      ) : projects.length === 0 ? (
        <EmptyState
          title="등록된 프로젝트가 없습니다"
          description="새 프로젝트를 생성해서 공사 현장을 관리하세요."
          action={<Button onClick={() => navigate("/projects/new")}>+ 새 프로젝트</Button>}
        />
      ) : (
        <div className="p-6">
          <div className="bg-[#1A1D27] border-2 border-white/10 shadow-[4px_4px_0px_rgba(255,255,255,0.05)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-white/10 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-black">프로젝트명</th>
                  <th className="text-left px-4 py-3 font-black">업종</th>
                  <th className="text-left px-4 py-3 font-black">현장 주소</th>
                  <th className="text-right px-4 py-3 font-black">계약금액</th>
                  <th className="text-left px-4 py-3 font-black">상태</th>
                  <th className="text-left px-4 py-3 font-black">시작일</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-white/5">
                {projects.map((p) => {
                  const st = STATUS_LABEL[p.status] ?? { label: p.status, variant: "default" };
                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/projects/${p.id}`)}
                      className="hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-white font-bold">{p.name}</td>
                      <td className="px-4 py-3 text-gray-400">{p.industry_template ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">
                        {p.site_address ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300 font-bold">
                        {p.contract_amount
                          ? `${(p.contract_amount / 10000).toFixed(0)}만원`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{p.start_date ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
