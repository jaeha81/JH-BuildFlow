"use client";
import { useState, type FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, ApiError } from "@/lib/api";
import { saveVendorTokens, isVendorLoggedIn } from "@/lib/auth";
import { Button, Input, ErrorAlert } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVendorLoggedIn()) router.replace("/dashboard");
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      saveVendorTokens(res.access_token, res.refresh_token);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "서버에 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* 헤더 */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#5B8DEF] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center">
              <span className="text-xs font-black text-white">JH</span>
            </div>
            <span className="font-black text-black uppercase text-sm tracking-wide">BuildFlow</span>
          </div>
          <h1 className="text-3xl font-black text-black leading-tight">
            협력사<br />
            <span className="text-[#5B8DEF]">포털 로그인</span>
          </h1>
          <div className="w-12 h-1 bg-black mt-3" />
        </div>

        {/* 폼 카드 */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border-2 border-black p-6 space-y-4 shadow-[6px_6px_0px_#000]"
        >
          <Input
            label="이메일"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vendor@example.com"
            autoFocus
          />
          <Input
            label="비밀번호"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          {error && <ErrorAlert message={error} />}
          <Button type="submit" disabled={loading} className="w-full justify-center">
            {loading ? "로그인 중..." : "로그인 →"}
          </Button>
        </form>

        <p className="text-sm font-bold text-black mt-4">
          신규 협력사이신가요?{" "}
          <Link
            href="/join"
            className="text-[#5B8DEF] underline decoration-2 decoration-black underline-offset-2 hover:bg-[#5B8DEF] hover:text-white hover:no-underline px-1 transition-colors"
          >
            가입하기
          </Link>
        </p>
      </div>
    </div>
  );
}
