import { useState, type FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, ApiError } from "../lib/api";
import { saveTokens, isLoggedIn } from "../lib/auth";
import { Button, Input } from "../components/ui";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) navigate("/", { replace: true });
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      saveTokens(res.access_token, res.refresh_token);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "서버에 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
      <div className="w-full max-w-sm px-4">
        {/* 로고 */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#5B8DEF] border-2 border-white flex items-center justify-center shadow-[4px_4px_0px_rgba(255,255,255,0.3)]">
              <span className="text-sm font-black text-white">JH</span>
            </div>
            <div>
              <p className="text-white font-black text-base tracking-tight">BuildFlow</p>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Admin Console</p>
            </div>
          </div>
          <h1 className="text-3xl font-black text-white leading-tight">
            관리자<br />
            <span className="text-[#5B8DEF]">로그인</span>
          </h1>
          <div className="w-10 h-1 bg-[#5B8DEF] mt-3" />
        </div>

        {/* 폼 */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#1A1D27] border-2 border-white/20 p-6 space-y-4 shadow-[6px_6px_0px_rgba(255,255,255,0.1)]"
        >
          <Input
            label="이메일"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@jh.com"
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

          {error && (
            <div className="px-3 py-2 bg-[#FF6B6B] border-2 border-white/40 text-sm font-bold text-white shadow-[3px_3px_0px_rgba(255,255,255,0.15)]">
              ⚠ {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full justify-center">
            {loading ? "로그인 중..." : "로그인 →"}
          </Button>
        </form>

        <p className="text-xs font-bold text-gray-600 mt-4 text-center uppercase tracking-wider">
          JH BuildFlow v0.2.0
        </p>
      </div>
    </div>
  );
}
