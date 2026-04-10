import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { vendorsApi, type Vendor } from "../lib/api";
import { PageHeader, Button, Badge, LoadingSpinner, ErrorAlert } from "../components/ui";

export function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    vendorsApi
      .get(id)
      .then(setVendor)
      .catch(() => setError("협력사 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title={vendor?.company_name ?? "협력사 상세"}
        actions={
          <Button variant="ghost" onClick={() => navigate(-1)}>
            ← 목록
          </Button>
        }
      />

      {error && <ErrorAlert message={error} />}

      {vendor && (
        <div className="p-6 max-w-2xl space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
            {[
              { label: "대표자", value: vendor.representative_name },
              { label: "이메일", value: vendor.email },
              { label: "연락처", value: vendor.phone },
              { label: "지역", value: vendor.regions.join(", ") || null },
            ].map(({ label, value }) => (
              <div key={label} className="px-5 py-3 flex gap-4">
                <span className="text-xs text-gray-500 w-20 shrink-0 pt-0.5">{label}</span>
                <span className="text-sm text-gray-300">{value ?? "—"}</span>
              </div>
            ))}
            <div className="px-5 py-3 flex gap-4">
              <span className="text-xs text-gray-500 w-20 shrink-0 pt-0.5">공종</span>
              <div className="flex flex-wrap gap-1">
                {vendor.trade_types.map((t) => (
                  <Badge key={t} variant="info">{t}</Badge>
                ))}
              </div>
            </div>
            <div className="px-5 py-3 flex gap-4">
              <span className="text-xs text-gray-500 w-20 shrink-0 pt-0.5">인증 상태</span>
              <Badge variant={vendor.is_verified ? "success" : "warning"}>
                {vendor.is_verified ? "인증 완료" : "미인증"}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
