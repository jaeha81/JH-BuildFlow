"use client";

import { clearToken, setToken, authApi, type UserMe } from "./api";

const ADMIN_ROLES = ["super_admin", "sub_admin", "site_manager", "accounting"];

export async function login(email: string, password: string): Promise<UserMe> {
  const tokens = await authApi.login(email, password);
  setToken(tokens.access_token);

  const me = await authApi.me();
  if (!ADMIN_ROLES.includes(me.role)) {
    clearToken();
    throw new Error("관리자 계정만 접근 가능합니다.");
  }
  return me;
}

export function logout(): void {
  clearToken();
  window.location.href = "/login";
}

export function isSuperAdmin(role: string): boolean {
  return role === "super_admin";
}
