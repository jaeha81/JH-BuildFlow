"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import MobileNav from "@/components/MobileNav";
import { messageApi, type Thread, type Message } from "@/lib/api";

function ThreadDetail({
  thread,
  onBack,
}: {
  thread: Thread;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    messageApi
      .getThread(thread.id)
      .then((d) => setMessages(d.messages))
      .finally(() => setLoading(false));
  }, [thread.id]);

  async function handleSend() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const msg = await messageApi.send(thread.id, reply.trim());
      setMessages((prev) => [...prev, msg]);
      setReply("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0F1117] flex flex-col">
      <header className="bg-[#1A1D27] border-b-2 border-white/10 px-4 py-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-white/60 font-black text-lg leading-none"
        >
          ←
        </button>
        <div>
          <p className="text-sm font-black text-white">{thread.thread_type}</p>
          {thread.escalated_at && (
            <p className="text-xs text-[#FF6B6B] font-bold">에스컬레이션됨</p>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-3">
        {loading ? (
          <div className="text-center text-white/30 py-8">로딩 중...</div>
        ) : (
          messages.map((m) => {
            const isAdmin = m.sender_role !== "vendor_user";
            return (
              <div
                key={m.id}
                className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] border-2 px-3 py-2 text-sm font-medium ${
                    isAdmin
                      ? "bg-[#5B8DEF] border-[#5B8DEF] text-white"
                      : "bg-[#1A1D27] border-white/20 text-white"
                  }`}
                  style={{ boxShadow: "2px 2px 0px rgba(255,255,255,0.05)" }}
                >
                  <p>{m.content}</p>
                  <p className={`text-xs mt-1 ${isAdmin ? "text-white/70" : "text-white/40"}`}>
                    {m.sender_role}
                    {m.is_ai_generated && " · AI"}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 답변 입력 */}
      <div className="bg-[#1A1D27] border-t-2 border-white/10 px-4 py-3 flex gap-2 pb-20">
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="답변 입력..."
          className="flex-1 bg-[#0F1117] border-2 border-white/20 text-white text-sm px-3 py-2 focus:outline-none focus:border-[#5B8DEF]"
        />
        <button
          onClick={handleSend}
          disabled={sending || !reply.trim()}
          className="bg-[#5B8DEF] border-2 border-white text-white font-black text-sm px-4 disabled:opacity-40 active:translate-y-0.5 transition-transform"
          style={{ boxShadow: "2px 2px 0px #fff" }}
        >
          전송
        </button>
      </div>
    </div>
  );
}

function MessagesContent() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Thread | null>(null);

  useEffect(() => {
    messageApi.listThreads().then(setThreads).finally(() => setLoading(false));
  }, []);

  if (selected) {
    return <ThreadDetail thread={selected} onBack={() => setSelected(null)} />;
  }

  const escalated = threads.filter((t) => t.escalated_at);

  return (
    <div className="min-h-screen bg-[#0F1117]">
      <header className="bg-[#1A1D27] border-b-2 border-white/10 px-4 py-4">
        <h1 className="text-base font-black text-white">메시지</h1>
        <p className="text-xs text-white/40 mt-0.5">
          전체 {threads.length}건
          {escalated.length > 0 && (
            <span className="ml-2 text-[#FF6B6B] font-bold">에스컬레이션 {escalated.length}건</span>
          )}
        </p>
      </header>

      <main className="page-content px-4 pt-3 space-y-2">
        {/* 에스컬레이션 우선 표시 */}
        {escalated.length > 0 && (
          <>
            <p className="text-xs font-black text-[#FF6B6B] uppercase tracking-widest py-1">
              에스컬레이션 처리 필요
            </p>
            {escalated.map((t) => (
              <ThreadItem key={t.id} thread={t} onClick={() => setSelected(t)} />
            ))}
            <div className="border-t border-white/10 my-2" />
          </>
        )}

        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-[#1A1D27] border-2 border-white/10 animate-pulse" />
          ))
        ) : (
          threads
            .filter((t) => !t.escalated_at)
            .map((t) => <ThreadItem key={t.id} thread={t} onClick={() => setSelected(t)} />)
        )}
      </main>

      <MobileNav />
    </div>
  );
}

function ThreadItem({ thread, onClick }: { thread: Thread; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#1A1D27] border-2 border-white/10 px-4 py-3 active:translate-y-0.5 transition-transform"
      style={{
        borderLeftColor: thread.escalated_at ? "#FF6B6B" : "rgba(255,255,255,0.1)",
        borderLeftWidth: thread.escalated_at ? 4 : 2,
        boxShadow: "3px 3px 0px rgba(255,255,255,0.04)",
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-white">{thread.thread_type}</p>
        <div className="flex items-center gap-2">
          {thread.escalated_at && (
            <span className="text-xs bg-[#FF6B6B] text-white font-black px-1.5 py-0.5">긴급</span>
          )}
          {thread.is_closed && (
            <span className="text-xs text-white/30 font-bold">종료</span>
          )}
        </div>
      </div>
      <p className="text-xs text-white/40 mt-0.5">
        {new Date(thread.created_at).toLocaleDateString("ko-KR")}
      </p>
    </button>
  );
}

export default function MessagesPage() {
  return <AuthGuard>{() => <MessagesContent />}</AuthGuard>;
}
