"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("로그인에 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0F1117] flex flex-col items-center justify-center px-4">
      {/* 로고 영역 */}
      <div className="mb-8 text-center">
        <div
          className="inline-block bg-[#5B8DEF] border-2 border-white px-4 py-2 mb-3"
          style={{ boxShadow: "4px 4px 0px #fff" }}
        >
          <span className="text-xl font-black text-white tracking-widest">JH BuildFlow</span>
        </div>
        <p className="text-white/50 text-sm font-bold">관리자 전용 포털</p>
      </div>

      {/* 로그인 폼 */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-[#1A1D27] border-2 border-white/10 p-6"
        style={{ boxShadow: "4px 4px 0px rgba(255,255,255,0.08)" }}
      >
        <h1 className="text-lg font-black text-white mb-6">로그인</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-white/60 mb-1 uppercase tracking-wider">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#0F1117] border-2 border-white/20 text-white px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-[#5B8DEF] transition-colors"
              placeholder="admin@company.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/60 mb-1 uppercase tracking-wider">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#0F1117] border-2 border-white/20 text-white px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-[#5B8DEF] transition-colors"
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-[#FF6B6B]/10 border-2 border-[#FF6B6B] px-3 py-2">
            <p className="text-[#FF6B6B] text-sm font-bold">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full bg-[#5B8DEF] border-2 border-white text-white font-black py-3 text-sm uppercase tracking-wider transition-all active:translate-y-0.5 disabled:opacity-50"
          style={{ boxShadow: loading ? "none" : "3px 3px 0px #fff" }}
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}
