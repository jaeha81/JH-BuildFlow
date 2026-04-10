import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { packagesApi, projectsApi, type ProcessPackage, type Project } from "../lib/api";
import { PageHeader, Button, LoadingSpinner, ErrorAlert } from "../components/ui";

export function ProjectPackagesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [packages, setPackages] = useState<ProcessPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [budgets, setBudgets] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    Promise.all([projectsApi.get(id), packagesApi.listByProject(id)])
      .then(([proj, pkgs]) => {
        setProject(proj);
        setPackages(pkgs);
        const init: Record<string, string> = {};
        for (const p of pkgs) {
          init[p.id] = p.budget_allocated?.toString() ?? "";
        }
        setBudgets(init);
      })
      .catch(() => setError("패키지 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [id]);

  const totalBudget = project?.estimated_budget ?? 0;
  const allocatedTotal = Object.values(budgets).reduce(
    (sum, v) => sum + (parseFloat(v) || 0),
    0
  );
  const isOverBudget = totalBudget > 0 && allocatedTotal > totalBudget;

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="공종별 예산 배분"
        actions={
          <Button variant="ghost" onClick={() => navigate(-1)}>
            ← 프로젝트
          </Button>
        }
      />

      {error && <ErrorAlert message={error} />}

      <div className="p-6 max-w-2xl space-y-4">
        {/* 예산 요약 */}
        {totalBudget > 0 && (
          <div className={`rounded-xl border p-4 ${isOverBudget ? "border-red-700 bg-red-950/30" : "border-gray-800 bg-gray-900"}`}>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">전체 예산</span>
              <span className="text-white">{totalBudget.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-400">배분 합계</span>
              <span className={isOverBudget ? "text-red-400" : "text-green-400"}>
                {allocatedTotal.toLocaleString()}원
              </span>
            </div>
            {isOverBudget && (
              <p className="text-xs text-red-400 mt-2">
                ⚠ 예산 초과: {(allocatedTotal - totalBudget).toLocaleString()}원
              </p>
            )}
            {/* 진행바 */}
            <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isOverBudget ? "bg-red-500" : "bg-blue-500"}`}
                style={{ width: `${Math.min((allocatedTotal / totalBudget) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* 공종별 입력 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
          {packages.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-500 text-center">등록된 공종 패키지가 없습니다</p>
          ) : (
            packages.map((pkg) => (
              <div key={pkg.id} className="px-5 py-4 flex items-center gap-4">
                <span className="text-sm text-white w-20 shrink-0">{pkg.trade_type}</span>
                <input
                  type="number"
                  value={budgets[pkg.id] ?? ""}
                  onChange={(e) =>
                    setBudgets((prev) => ({ ...prev, [pkg.id]: e.target.value }))
                  }
                  placeholder="예산 (원)"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                {totalBudget > 0 && budgets[pkg.id] && (
                  <span className="text-xs text-gray-500 w-12 text-right">
                    {((parseFloat(budgets[pkg.id] ?? "0") / totalBudget) * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {packages.length > 0 && (
          <div className="flex justify-end">
            <Button>저장</Button>
          </div>
        )}
      </div>
    </div>
  );
}
