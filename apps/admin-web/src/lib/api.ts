const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "admin_access_token";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {}
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = options.token ?? getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const d = (await res.json()) as { detail?: string };
      msg = d.detail ?? msg;
    } catch {}
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── 타입 ──────────────────────────────────────────────────────────────────────

export type UserMe = { id: string; email: string; name: string; role: string; company_id: string };
export type TokenResponse = { access_token: string; refresh_token: string; token_type: string };

export type Settlement = {
  id: string; project_id: string; vendor_id: string;
  amount: number; approved_amount: number | null;
  status: string; tax_invoice_number: string | null;
  payout_approved_by: string | null; payout_approved_at: string | null;
  created_at: string;
};

export type BidRequest = {
  id: string; project_id: string; vendor_id: string;
  response_status: string; deadline: string | null;
  sent_at: string | null; read_at: string | null;
};

export type Quote = {
  id: string; bid_request_id: string; vendor_id: string;
  parsed_total: number | null; parse_status: string;
  manual_review_required: boolean; submission_type: string;
  created_at: string;
};

export type Vendor = {
  id: string; company_name: string; email: string;
  phone: string | null; trade_types: string[];
  regions: string[]; is_active: boolean; is_verified: boolean;
  rating: number | null;
};

export type Thread = {
  id: string; thread_type: string; is_closed: boolean;
  project_id: string; escalated_at: string | null; created_at: string;
};

export type Message = {
  id: string; sender_role: string; content: string;
  is_ai_generated: boolean; created_at: string;
};

export type DashboardStats = {
  total_vendors: number; active_bids: number;
  pending_settlements: number; escalated_threads: number;
  low_response_vendors: number;
};

// ── API ───────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    request<TokenResponse>("/auth/login", { method: "POST", body: { email, password } }),
  me: () => request<UserMe>("/auth/me"),
};

export const settlementApi = {
  list: (params?: { status?: string }) => {
    const q = params?.status ? `?status=${params.status}` : "";
    return request<Settlement[]>(`/settlements${q}`);
  },
  approve: (id: string, approved_amount: number) =>
    request<Settlement>(`/settlements/${id}/approve`, {
      method: "PUT",
      body: { approved_amount },
    }),
};

export const bidApi = {
  list: (params?: { project_id?: string }) => {
    const q = params?.project_id ? `?project_id=${params.project_id}` : "";
    return request<BidRequest[]>(`/bids${q}`);
  },
};

export const quoteApi = {
  list: () => request<Quote[]>("/quotes"),
};

export const vendorApi = {
  list: () => request<Vendor[]>("/vendors"),
};

export const messageApi = {
  listThreads: () => request<Thread[]>("/messages/threads"),
  getThread: (id: string) =>
    request<{ thread: Thread; messages: Message[] }>(`/messages/threads/${id}`),
  send: (threadId: string, content: string) =>
    request<Message>(`/messages/threads/${threadId}`, {
      method: "POST",
      body: { content },
    }),
  escalationStats: () =>
    request<{ total: number; unresolved: number }>("/messages/escalation-stats"),
};

export const analyticsApi = {
  bidStats: () =>
    request<{
      total_bids: number; response_rate: number;
      pending_count: number; accepted_count: number;
    }>("/analytics/bid-stats"),
};
