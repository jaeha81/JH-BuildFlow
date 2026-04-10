"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { messageApi, type Thread } from "@/lib/api";
import { VendorNav } from "@/components/VendorNav";
import { Badge, LoadingSpinner, ErrorAlert } from "@/components/ui";

export default function MessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    messageApi.listThreads()
      .then(setThreads)
      .catch(() => setError("메시지 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  const TYPE_LABEL: Record<string, string> = {
    qa: "Q&A",
    notice: "공지",
    negotiation: "협의",
  };

  return (
    <>
      <VendorNav />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <h1 className="text-lg font-black text-black uppercase tracking-wide">Q&A 메시지</h1>

        {error && <ErrorAlert message={error} />}

        {loading ? (
          <LoadingSpinner />
        ) : threads.length === 0 ? (
          <div className="text-center py-16 font-bold text-gray-500 text-sm border-2 border-black shadow-[4px_4px_0px_#000] bg-white">
            메시지 스레드가 없습니다
          </div>
        ) : (
          <div className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white divide-y-2 divide-black">
            {threads.map((t) => (
              <Link
                key={t.id}
                href={`/messages/${t.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-[#F5F0E8] transition-colors"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-black text-black">{TYPE_LABEL[t.thread_type] ?? t.thread_type}</p>
                  <p className="text-xs font-medium text-gray-500">프로젝트 #{t.project_id.slice(0, 8)}</p>
                </div>
                <Badge variant={t.is_closed ? "default" : "info"}>
                  {t.is_closed ? "종료" : "진행 중"}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
