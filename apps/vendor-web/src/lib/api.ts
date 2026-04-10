const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = options.token ?? (typeof window !== "undefined" ? localStorage.getItem("vendor_access_token") : null);
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let msg = res.statusText;
    try { const d = (await res.json()) as { detail?: string }; msg = d.detail ?? msg; } catch {}
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Auth
export type TokenResponse = { access_token: string; refresh_token: string; token_type: string };
export type UserMe = { id: string; email: string; name: string; role: string; company_id: string };

export const authApi = {
  login: (email: string, password: string) =>
    request<TokenResponse>("/auth/login", { method: "POST", body: { email, password } }),
  me: () => request<UserMe>("/auth/me"),
};

// Vendors
export type VendorRegisterBody = {
  company_name: string;
  representative_name: string;
  email: string;
  phone: string;
  address: string;
  business_number?: string;
  trade_types: string[];
  regions: string[];
};

export const vendorApi = {
  register: (body: VendorRegisterBody) =>
    request<{ id: string }>("/vendors/register", { method: "POST", body }),
  me: () => request<{ id: string; company_name: string; trade_types: string[]; regions: string[] }>("/vendors/me"),
  update: (id: string, body: Partial<VendorRegisterBody>) =>
    request<{ id: string }>(`/vendors/${id}`, { method: "PATCH", body }),
};

// Bid Requests
export type BidRequest = {
  id: string;
  project_id: string;
  process_package_id: string;
  sent_at: string | null;
  deadline: string | null;
  response_status: string;
  read_at: string | null;
  project_name?: string;
  trade_type?: string;
};

export const bidRequestApi = {
  list: () => request<BidRequest[]>("/bid-requests/mine"),
  get: (id: string) => request<BidRequest & { bid_package?: { documents: unknown[]; instructions: string } }>(`/bid-requests/${id}`),
  respond: (id: string, status: "accepted" | "rejected" | "on_hold", reason?: string) =>
    request(`/bid-requests/${id}/respond`, { method: "POST", body: { status, reason } }),
};

// Quotes
export type QuoteSubmitBody = {
  bid_request_id: string;
  submission_type: "template" | "pdf" | "excel" | "hwp";
  line_items?: { item_name: string; unit: string; quantity: number; unit_price: number; amount: number }[];
};

export const quoteApi = {
  submit: (body: QuoteSubmitBody) =>
    request<{ id: string }>("/quotes", { method: "POST", body }),
  get: (id: string) => request<{ id: string; parsed_total: number; parse_status: string; submission_type: string }>(`/quotes/${id}`),
};

// Messages
export type Thread = { id: string; thread_type: string; is_closed: boolean; project_id: string };
export type Message = { id: string; sender_role: string; content: string; created_at: string };

export const messageApi = {
  listThreads: () => request<Thread[]>("/messages/threads"),
  getThread: (id: string) => request<{ thread: Thread; messages: Message[] }>(`/messages/threads/${id}`),
  send: (threadId: string, content: string) =>
    request<Message>(`/messages/threads/${threadId}`, { method: "POST", body: { content } }),
};
