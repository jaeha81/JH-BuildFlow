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
        <h1 className="text-lg font-black text-black uppercase tracking-wide">내 정보</h1>

        {error && <ErrorAlert message={error} />}

        {success && (
          <div className="px-4 py-3 bg-[#4ADE80] border-2 border-black text-sm font-black text-black shadow-[3px_3px_0px_#000]">
            ✓ 저장되었습니다.
          </div>
        )}

        {!loading && (
          <div className="space-y-5">
            {/* 업체명 */}
            <div>
              <label className="block text-xs font-black text-black uppercase tracking-wide mb-1.5">업체명</label>
              <input
                value={form.company_name}
                onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                className="w-full border-2 border-black px-4 py-2.5 text-sm font-bold bg-white focus:outline-none focus:shadow-[4px_4px_0px_#000] transition-shadow"
              />
            </div>

            {/* 공종 */}
            <div>
              <label className="block text-xs font-black text-black uppercase tracking-wide mb-2">담당 공종</label>
              <div className="flex flex-wrap gap-2">
                {TRADE_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleList("trade_types", t)}
                    className={`px-3 py-1.5 text-xs font-bold border-2 border-black transition-all
                      hover:shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] ${
                      form.trade_types.includes(t)
                        ? "bg-[#5B8DEF] text-white shadow-[2px_2px_0px_#000]"
                        : "bg-white text-black"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 지역 */}
            <div>
              <label className="block text-xs font-black text-black uppercase tracking-wide mb-2">활동 지역</label>
              <div className="flex flex-wrap gap-2">
                {REGIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => toggleList("regions", r)}
                    className={`px-3 py-1.5 text-xs font-bold border-2 border-black transition-all
                      hover:shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] ${
                      form.regions.includes(r)
                        ? "bg-[#FFE566] text-black shadow-[2px_2px_0px_#000]"
                        : "bg-white text-black"
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
              className="w-full py-3 bg-black text-white text-sm font-black uppercase tracking-wide border-2 border-black
                shadow-[4px_4px_0px_rgba(0,0,0,0.3)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.3)] hover:translate-x-[2px] hover:translate-y-[2px]
                active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
                disabled:opacity-50 transition-all"
            >
              {saving ? "저장 중..." : "변경사항 저장"}
            </button>
          </div>
        )}
      </main>
    </>
  );
}
