"use client";

export function saveVendorTokens(access: string, refresh: string) {
  localStorage.setItem("vendor_access_token", access);
  localStorage.setItem("vendor_refresh_token", refresh);
}

export function clearVendorTokens() {
  localStorage.removeItem("vendor_access_token");
  localStorage.removeItem("vendor_refresh_token");
}

export function getVendorToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("vendor_access_token");
}

export function isVendorLoggedIn(): boolean {
  return !!getVendorToken();
}
