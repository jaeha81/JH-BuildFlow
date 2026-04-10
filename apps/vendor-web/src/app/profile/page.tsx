"use client";
import { useEffect, useState } from "react";
import { vendorApi } from "@/lib/api";
import { VendorNav } from "@/components/VendorNav";
import { ErrorAlert } from "@/components/ui";

const TRADE_TYPES = ["목공", "도장", "전기", "조명", "설비", "철근콘크리트", "타일", "방수", "유리", "석고보드", "내장", "외장", "창호"];
const REGIONS = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];

type VendorMe = { id: string; company_name: string; trade_types: string[]; regions: string[] };

export default function ProfilePage() {
  const [vendor, setVendor] = useState<VendorMe | null>(null);
  const [form, setForm] = useState({ company_name: "", trade_types: [] as string[], regions: [] as string[] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    vendorApi.me()
      .then((v) => {
        setVendor(v);
        setForm({ company_name: v.company_name, trade_types: v.trade_types, regions: v.regions });
      })
      .catch(() => setError("내 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  function toggleList(field: "trade_types" | "regions", value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((x) => x !== value)
        : [...prev[field], value],
    }));
  }

  async function handleSave() {
    if (!vendor) return;
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      await vendorApi.update(vendor.id, {
        company_name: form.company_name,
        trade_types: form.trade_types,
        regions: form.regions,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <VendorNav />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-lg font-semibold text-gray-900">내 정보</h1>

        {error && <ErrorAlert message={error} />}
        {success && (
          <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-sm text-green-700">저장되었습니다.</div>
        )}

        {!loading && (
          <div className="space-y-5">
            {/* 업체명 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">업체명</label>
              <input
                value={form.company_name}
                onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 공종 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">담당 공종</label>
              <div className="flex flex-wrap gap-2">
                {TRADE_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleList("trade_types", t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      form.trade_types.includes(t)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 지역 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">활동 지역</label>
              <div className="flex flex-wrap gap-2">
                {REGIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => toggleList("regions", r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      form.regions.includes(r)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "저장 중..." : "변경사항 저장"}
            </button>
          </div>
        )}
      </main>
    </>
  );
}
