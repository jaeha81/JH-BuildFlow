import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { projectsApi, ApiError } from "../lib/api";
import { PageHeader, Button, Input, Select, Textarea, ErrorAlert } from "../components/ui";

const INDUSTRY_TEMPLATES = ["카페", "오피스", "병원", "상가"];
const TRADE_TYPES = ["목공", "도장", "경량", "금속", "전기", "조명", "타일", "유리", "사인", "가구", "턴키"];

// 업종별 기본 공종 세트
const INDUSTRY_DEFAULT_TRADES: Record<string, string[]> = {
  카페:   ["목공", "도장", "전기", "조명", "타일"],
  오피스: ["목공", "경량", "도장", "전기", "조명"],
  병원:   ["목공", "경량", "도장", "전기", "조명", "타일"],
  상가:   ["목공", "도장", "전기", "사인"],
};

export function ProjectNewPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    site_address: "",
    client_name: "",
    industry_template: "",
    contract_amount: "",
    estimated_budget: "",
    start_date: "",
    end_date: "",
    notes: "",
  });
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);

  function handleIndustryChange(value: string) {
    setForm((f) => ({ ...f, industry_template: value }));
    setSelectedTrades(INDUSTRY_DEFAULT_TRADES[value] ?? []);
  }

  function toggleTrade(trade: string) {
    setSelectedTrades((prev) =>
      prev.includes(trade) ? prev.filter((t) => t !== trade) : [...prev, trade]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("프로젝트명은 필수입니다.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const project = await projectsApi.create({
        name: form.name,
        site_address: form.site_address || undefined,
        client_name: form.client_name || undefined,
        industry_template: form.industry_template || undefined,
        contract_amount: form.contract_amount ? Number(form.contract_amount) : undefined,
        estimated_budget: form.estimated_budget ? Number(form.estimated_budget) : undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        notes: form.notes || undefined,
      });
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "프로젝트 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="새 프로젝트"
        actions={
          <Button variant="ghost" onClick={() => navigate(-1)}>
            ← 취소
          </Button>
        }
      />

      {error && <ErrorAlert message={error} />}

      <form onSubmit={handleSubmit} className="p-6">
        <div className="max-w-2xl space-y-6">
          {/* 기본 정보 */}
          <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-medium text-gray-300">기본 정보</h2>
            <Input
              label="프로젝트명"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="강남 카페 인테리어 공사"
            />
            <Input
              label="현장 주소"
              value={form.site_address}
              onChange={(e) => setForm((f) => ({ ...f, site_address: e.target.value }))}
              placeholder="서울시 강남구 테헤란로 123"
            />
            <Input
              label="발주처(클라이언트)"
              value={form.client_name}
              onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
              placeholder="스타벅스코리아"
            />
            <Select
              label="업종"
              value={form.industry_template}
              onChange={(e) => handleIndustryChange(e.target.value)}
            >
              <option value="">업종 선택 (선택 시 공종 자동 세팅)</option>
              {INDUSTRY_TEMPLATES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </section>

          {/* 공종 선택 */}
          <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-medium text-gray-300">공종 선택</h2>
            <div className="flex flex-wrap gap-2">
              {TRADE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTrade(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedTrades.includes(t)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </section>

          {/* 금액/일정 */}
          <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-medium text-gray-300">금액 및 일정</h2>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="계약금액 (원)"
                type="number"
                value={form.contract_amount}
                onChange={(e) => setForm((f) => ({ ...f, contract_amount: e.target.value }))}
                placeholder="85000000"
              />
              <Input
                label="예상 예산 (원)"
                type="number"
                value={form.estimated_budget}
                onChange={(e) => setForm((f) => ({ ...f, estimated_budget: e.target.value }))}
                placeholder="90000000"
              />
              <Input
                label="착공일"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              />
              <Input
                label="준공일"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
              />
            </div>
            <Textarea
              label="메모"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="공사 관련 특이사항을 입력하세요"
            />
          </section>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate(-1)}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "생성 중..." : "프로젝트 생성"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
