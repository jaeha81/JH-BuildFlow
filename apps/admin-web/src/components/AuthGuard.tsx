"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, ApiError } from "@/lib/api";
import type { UserMe } from "@/lib/api";

interface AuthGuardProps {
  children: (user: UserMe) => React.ReactNode;
  requireRole?: string;
}

export default function AuthGuard({ children, requireRole }: AuthGuardProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.me()
      .then((me) => {
        if (requireRole && me.role !== requireRole) {
          router.replace("/");
          return;
        }
        setUser(me);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
        }
      })
      .finally(() => setLoading(false));
  }, [router, requireRole]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#5B8DEF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;
  return <>{children(user)}</>;
}
