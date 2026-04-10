import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { vendorsApi, type Vendor } from "../lib/api";
import { PageHeader, Badge, LoadingSpinner, EmptyState, ErrorAlert } from "../components/ui";

export function VendorsPage() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    vendorsApi
      .list()
      .then(setVendors)
      .catch(() => setError("협력사 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="협력사 목록" />

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <LoadingSpinner />
      ) : vendors.length === 0 ? (
        <EmptyState
          title="등록된 협력사가 없습니다"
          description="seed.py를 실행하면 샘플 협력사가 생성됩니다."
        />
      ) : (
        <div className="p-6">
          <div className="bg-[#1A1D27] border-2 border-white/10 shadow-[4px_4px_0px_rgba(255,255,255,0.05)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-white/10 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-black">업체명</th>
                  <th className="text-left px-4 py-3 font-black">대표자</th>
                  <th className="text-left px-4 py-3 font-black">공종</th>
                  <th className="text-left px-4 py-3 font-black">지역</th>
                  <th className="text-left px-4 py-3 font-black">평점</th>
                  <th className="text-left px-4 py-3 font-black">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-white/5">
                {vendors.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => navigate(`/vendors/${v.id}`)}
                    className="hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-bold">{v.company_name}</td>
                    <td className="px-4 py-3 text-gray-400">{v.representative_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {v.trade_types.map((t) => (
                          <Badge key={t} variant="info">{t}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{v.regions.join(", ") || "—"}</td>
                    <td className="px-4 py-3 text-gray-400 font-bold">
                      {v.rating != null ? `★ ${v.rating.toFixed(1)}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={v.is_verified ? "success" : "warning"}>
                        {v.is_verified ? "인증" : "미인증"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
