"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { vendorApi, ApiError } from "@/lib/api";
import { Button, Input, ErrorAlert } from "@/components/ui";

const TRADE_TYPES = ["목공", "도장", "경량", "금속", "전기", "조명", "타일", "유리", "사인", "가구", "턴키"];
const REGIONS = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
const TOTAL_STEPS = 5;

type FormData = {
  company_name: string; representative_name: string; phone: string; email: string; address: string;
  business_number: string; trade_types: string[]; regions: string[];
};

export default function JoinPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormData>({
    company_name: "", representative_name: "", phone: "", email: "", address: "",
    business_number: "", trade_types: [], regions: [],
  });

  function update(field: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleArr(field: "trade_types" | "regions", val: string) {
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(val) ? f[field].filter((v) => v !== val) : [...f[field], val],
    }));
  }

  function next() {
    setError("");
    if (step === 1 && !form.company_name.trim()) { setError("업체명은 필수입니다."); return; }
    if (step === 1 && !form.email.trim()) { setError("이메일은 필수입니다."); return; }
    if (step === 3 && form.trade_types.length === 0) { setError("최소 1개 공종을 선택해주세요."); return; }
    if (step === 4 && form.regions.length === 0) { setError("최소 1개 지역을 선택해주세요."); return; }
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
      await vendorApi.register({
        company_name: form.company_name,
        representative_name: form.representative_name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        business_number: form.business_number || undefined,
        trade_types: form.trade_types,
        regions: form.regions,
      });
      setStep(5);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "가입 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* 헤더 */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#5B8DEF] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center">
              <span className="text-xs font-black text-white">JH</span>
            </div>
            <span className="font-black text-black uppercase text-sm tracking-wide">BuildFlow</span>
          </div>
          <h1 className="text-3xl font-black text-black leading-tight">
            협력사<br />
            <span className="text-[#5B8DEF]">신규 가입</span>
          </h1>
          <div className="w-12 h-1 bg-black mt-3" />

          {step < 5 && (
            <div className="flex items-center gap-1.5 mt-4">
              {Array.from({ length: TOTAL_STEPS - 1 }, (_, i) => (
                <div
                  key={i}
                  className={`h-2 w-8 border-2 border-black transition-colors ${i + 1 <= step ? "bg-[#5B8DEF]" : "bg-white"}`}
                />
              ))}
              <span className="text-xs font-black text-gray-500 ml-2">{step}/4단계</span>
            </div>
          )}
        </div>

        <div className="bg-white border-2 border-black p-6 shadow-[6px_6px_0px_#000] space-y-5">
          {/* Step 1: 기본정보 */}
          {step === 1 && (
            <>
              <h2 className="font-black text-black uppercase tracking-wide text-sm">기본 정보</h2>
              <Input label="업체명" required value={form.company_name} onChange={(e) => update("company_name", e.target.value)} placeholder="우진목공" />
              <Input label="대표자명" value={form.representative_name} onChange={(e) => update("representative_name", e.target.value)} placeholder="홍길동" />
              <Input label="이메일" required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="contact@example.com" />
              <Input label="연락처" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="010-1234-5678" />
              <Input label="주소" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="서울시 강남구" />
            </>
          )}

          {/* Step 2: 사업자 정보 */}
          {step === 2 && (
            <>
              <h2 className="font-black text-black uppercase tracking-wide text-sm">사업자 정보</h2>
              <Input label="사업자등록번호" value={form.business_number} onChange={(e) => update("business_number", e.target.value)} placeholder="123-45-67890" />
              <div className="border-2 border-black border-dashed p-6 text-center">
                <p className="text-sm font-bold text-gray-500">사업자등록증 업로드 (선택)</p>
                <p className="text-xs font-medium text-gray-400 mt-1">PDF, JPG, PNG — 최대 10MB</p>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" id="biz-cert" />
                <label
                  htmlFor="biz-cert"
                  className="mt-3 inline-block px-4 py-2 bg-white border-2 border-black text-xs font-black cursor-pointer
                    shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                >
                  파일 선택
                </label>
              </div>
              <p className="text-xs font-bold text-gray-400">* 사업자등록증은 나중에 제출해도 됩니다.</p>
            </>
          )}

          {/* Step 3: 공종 선택 */}
          {step === 3 && (
            <>
              <h2 className="font-black text-black uppercase tracking-wide text-sm">공종 선택 <span className="text-[#FF6B6B]">*</span></h2>
              <p className="text-xs font-bold text-gray-500">서비스 가능한 공종을 모두 선택하세요</p>
              <div className="flex flex-wrap gap-2">
                {TRADE_TYPES.map((t) => (
                  <button key={t} type="button" onClick={() => toggleArr("trade_types", t)}
                    className={`px-3 py-1.5 text-sm font-bold border-2 border-black transition-all
                      hover:shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] ${
                      form.trade_types.includes(t) ? "bg-[#5B8DEF] text-white shadow-[2px_2px_0px_#000]" : "bg-white text-black"
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 4: 지역 선택 */}
          {step === 4 && (
            <>
              <h2 className="font-black text-black uppercase tracking-wide text-sm">서비스 가능 지역 <span className="text-[#FF6B6B]">*</span></h2>
              <div className="flex flex-wrap gap-2">
                {REGIONS.map((r) => (
                  <button key={r} type="button" onClick={() => toggleArr("regions", r)}
                    className={`px-3 py-1.5 text-sm font-bold border-2 border-black transition-all
                      hover:shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] ${
                      form.regions.includes(r) ? "bg-[#FFE566] text-black shadow-[2px_2px_0px_#000]" : "bg-white text-black"
                    }`}>
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 5: 완료 */}
          {step === 5 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 bg-[#4ADE80] border-2 border-black shadow-[4px_4px_0px_#000] flex items-center justify-center mx-auto">
                <span className="text-2xl font-black">✓</span>
              </div>
              <h2 className="font-black text-black uppercase tracking-wide">가입이 완료되었습니다!</h2>
              <p className="text-sm font-bold text-gray-500">관리자 승인 후 로그인하실 수 있습니다.</p>
              <Button onClick={() => router.push("/login")}>로그인하기</Button>
            </div>
          )}

          {error && <ErrorAlert message={error} />}

          {step < 4 && (
            <div className="flex justify-between pt-2">
              {step > 1 ? (
                <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>이전</Button>
              ) : <div />}
              <Button onClick={next}>다음</Button>
            </div>
          )}
          {step === 4 && (
            <div className="flex justify-between pt-2">
              <Button variant="secondary" onClick={() => setStep(3)}>이전</Button>
              <Button onClick={handleSubmit} disabled={loading}>{loading ? "제출 중..." : "가입 완료"}</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
