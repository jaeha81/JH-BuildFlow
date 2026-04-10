"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { messageApi, type Thread, type Message } from "@/lib/api";
import { VendorNav } from "@/components/VendorNav";
import { LoadingSpinner, ErrorAlert } from "@/components/ui";

export default function ThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!threadId) return;
    messageApi.getThread(threadId)
      .then(({ thread, messages }) => { setThread(thread); setMessages(messages); })
      .catch(() => setError("메시지를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!threadId || !input.trim()) return;
    setSending(true);
    try {
      const msg = await messageApi.send(threadId, input.trim());
      setMessages((prev) => [...prev, msg]);
      setInput("");
    } catch {
      setError("메시지 전송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (loading) return <><VendorNav /><LoadingSpinner /></>;

  const isClosed = thread?.is_closed ?? false;

  return (
    <>
      <VendorNav />
      <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
        {/* 헤더 */}
        <div className="flex items-center gap-3 pb-4 border-b-2 border-black">
          <button
            onClick={() => router.back()}
            className="text-xs font-black border-2 border-black px-2 py-0.5 hover:bg-black hover:text-white transition-colors"
          >
            ←
          </button>
          <div>
            <p className="text-sm font-black text-black uppercase tracking-wide">Q&A 스레드</p>
            {isClosed && <p className="text-xs font-bold text-gray-500">종료된 스레드</p>}
          </div>
        </div>

        {error && <ErrorAlert message={error} />}

        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-sm font-bold text-gray-400 py-8">첫 메시지를 보내주세요</p>
          ) : (
            messages.map((m) => {
              const isVendor = m.sender_role === "vendor";
              return (
                <div key={m.id} className={`flex ${isVendor ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs border-2 px-4 py-2.5 ${
                    isVendor
                      ? "bg-[#5B8DEF] text-white border-black shadow-[3px_3px_0px_#000]"
                      : "bg-white text-black border-black shadow-[3px_3px_0px_#000]"
                  }`}>
                    <p className="text-sm font-medium whitespace-pre-wrap">{m.content}</p>
                    <p className={`text-xs mt-1 font-bold ${isVendor ? "text-blue-200" : "text-gray-400"}`}>
                      {new Date(m.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        {!isClosed ? (
          <div className="border-t-2 border-black pt-3 flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요 (Enter 전송)"
              rows={2}
              className="flex-1 border-2 border-black px-3 py-2 text-sm font-medium resize-none focus:outline-none focus:shadow-[4px_4px_0px_#000] transition-shadow"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="px-4 bg-black text-white text-sm font-black border-2 border-black
                shadow-[4px_4px_0px_rgba(0,0,0,0.3)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.3)] hover:translate-x-[2px] hover:translate-y-[2px]
                active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
                disabled:opacity-40 transition-all"
            >
              전송
            </button>
          </div>
        ) : (
          <div className="border-t-2 border-black pt-3 text-center text-xs font-black text-gray-500 uppercase tracking-wide">
            종료된 스레드입니다
          </div>
        )}
      </div>
    </>
  );
}
