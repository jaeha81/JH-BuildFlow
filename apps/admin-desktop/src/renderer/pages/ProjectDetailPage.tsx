import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { projectsApi, type Project } from "../lib/api";
import { PageHeader, Button, Badge, LoadingSpinner, ErrorAlert } from "../components/ui";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    projectsApi
      .get(id)
      .then(setProject)
      .catch(() => setError("프로젝트를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title={project?.name ?? "프로젝트 상세"}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate(`/projects/${id}/packages`)}>
              공종별 패키지
            </Button>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              ← 목록
            </Button>
          </div>
        }
      />

      {error && <ErrorAlert message={error} />}

      {project && (
        <div className="p-6 space-y-4 max-w-2xl">
          <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
            {[
              { label: "현장 주소", value: project.site_address },
              { label: "발주처", value: project.client_name },
              { label: "업종", value: project.industry_template },
              {
                label: "계약금액",
                value: project.contract_amount
                  ? `${project.contract_amount.toLocaleString()}원`
                  : null,
              },
              {
                label: "예상 예산",
                value: project.estimated_budget
                  ? `${project.estimated_budget.toLocaleString()}원`
                  : null,
              },
              {
                label: "기간",
                value:
                  project.start_date && project.end_date
                    ? `${project.start_date} ~ ${project.end_date}`
                    : null,
              },
              { label: "메모", value: project.notes },
            ].map(({ label, value }) => (
              <div key={label} className="px-5 py-3 flex gap-4">
                <span className="text-xs text-gray-500 w-24 shrink-0 pt-0.5">{label}</span>
                <span className="text-sm text-gray-300">{value ?? "—"}</span>
              </div>
            ))}
            <div className="px-5 py-3 flex gap-4">
              <span className="text-xs text-gray-500 w-24 shrink-0 pt-0.5">상태</span>
              <Badge variant="success">{project.status}</Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
