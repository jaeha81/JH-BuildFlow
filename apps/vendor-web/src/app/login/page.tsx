"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, ApiError } from "@/lib/api";
import { saveVendorTokens, isVendorLoggedIn } from "@/lib/auth";
import { Button, Input, ErrorAlert } from "@/components/ui";
import { useEffect } from "react";

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">협력사 포털</h1>
          <p className="text-sm text-gray-500 mt-1">로그인하여 발주 현황을 확인하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
          <Input label="이메일" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="vendor@example.com" autoFocus />
          <Input label="비밀번호" type="password" required value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          {error && <ErrorAlert message={error} />}
          <Button type="submit" disabled={loading} className="w-full">{loading ? "로그인 중..." : "로그인"}</Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          초대 링크로 가입하셨나요?{" "}
          <Link href="/join" className="text-blue-600 hover:underline">신규 가입</Link>
        </p>
      </div>
    </div>
  );
}
