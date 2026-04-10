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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900">협력사 신규 가입</h1>
          {step < 5 && (
            <div className="flex items-center justify-center gap-1.5 mt-4">
              {Array.from({ length: TOTAL_STEPS - 1 }, (_, i) => (
                <div key={i} className={`h-1.5 w-8 rounded-full transition-colors ${i + 1 <= step ? "bg-blue-600" : "bg-gray-200"}`} />
              ))}
              <span className="text-xs text-gray-400 ml-2">{step}/4단계</span>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5">
          {/* Step 1: 기본정보 */}
          {step === 1 && (
            <>
              <h2 className="font-medium text-gray-800">기본 정보</h2>
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
              <h2 className="font-medium text-gray-800">사업자 정보</h2>
              <Input label="사업자등록번호" value={form.business_number} onChange={(e) => update("business_number", e.target.value)} placeholder="123-45-67890" />
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-400">사업자등록증 업로드 (선택)</p>
                <p className="text-xs text-gray-300 mt-1">PDF, JPG, PNG — 최대 10MB</p>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" id="biz-cert" />
                <label htmlFor="biz-cert" className="mt-3 inline-block px-4 py-2 bg-gray-100 rounded-lg text-xs text-gray-600 cursor-pointer hover:bg-gray-200">
                  파일 선택
                </label>
              </div>
              <p className="text-xs text-gray-400">* 사업자등록증은 나중에 제출해도 됩니다.</p>
            </>
          )}

          {/* Step 3: 공종 선택 */}
          {step === 3 && (
            <>
              <h2 className="font-medium text-gray-800">공종 선택 <span className="text-red-500">*</span></h2>
              <p className="text-xs text-gray-500">서비스 가능한 공종을 모두 선택하세요 (복수 선택 가능)</p>
              <div className="flex flex-wrap gap-2">
                {TRADE_TYPES.map((t) => (
                  <button key={t} type="button" onClick={() => toggleArr("trade_types", t)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${form.trade_types.includes(t) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 4: 지역 선택 */}
          {step === 4 && (
            <>
              <h2 className="font-medium text-gray-800">서비스 가능 지역 <span className="text-red-500">*</span></h2>
              <div className="flex flex-wrap gap-2">
                {REGIONS.map((r) => (
                  <button key={r} type="button" onClick={() => toggleArr("regions", r)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${form.regions.includes(r) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 5: 완료 */}
          {step === 5 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl">✓</span>
              </div>
              <h2 className="font-semibold text-gray-800">가입이 완료되었습니다!</h2>
              <p className="text-sm text-gray-500">관리자 승인 후 로그인하실 수 있습니다.</p>
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
