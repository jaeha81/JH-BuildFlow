const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = options.token ?? localStorage.getItem("access_token");
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = (await res.json()) as { detail?: string };
      message = data.detail ?? message;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Auth ────────────────────────────────────────────────
export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type UserMe = {
  id: string;
  email: string;
  name: string;
  role: string;
  company_id: string;
};

export const authApi = {
  login: (email: string, password: string) =>
    request<TokenResponse>("/auth/login", { method: "POST", body: { email, password } }),
  me: () => request<UserMe>("/auth/me"),
};

// ── Projects ────────────────────────────────────────────
export type Project = {
  id: string;
  name: string;
  site_address: string | null;
  client_name: string | null;
  industry_template: string | null;
  contract_amount: number | null;
  estimated_budget: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

export type CreateProjectBody = {
  name: string;
  site_address?: string;
  client_name?: string;
  industry_template?: string;
  contract_amount?: number;
  estimated_budget?: number;
  start_date?: string;
  end_date?: string;
  notes?: string;
};

export const projectsApi = {
  list: () => request<Project[]>("/projects"),
  get: (id: string) => request<Project>(`/projects/${id}`),
  create: (body: CreateProjectBody) =>
    request<Project>("/projects", { method: "POST", body }),
  update: (id: string, body: Partial<CreateProjectBody>) =>
    request<Project>(`/projects/${id}`, { method: "PATCH", body }),
};

// ── Vendors ─────────────────────────────────────────────
export type Vendor = {
  id: string;
  company_name: string;
  representative_name: string | null;
  email: string;
  phone: string | null;
  trade_types: string[];
  regions: string[];
  rating: number | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
};

export const vendorsApi = {
  list: () => request<Vendor[]>("/vendors"),
  get: (id: string) => request<Vendor>(`/vendors/${id}`),
};

// ── Process Packages ────────────────────────────────────
export type ProcessPackage = {
  id: string;
  project_id: string;
  trade_type: string;
  budget_allocated: number | null;
  status: string;
};

export const packagesApi = {
  listByProject: (projectId: string) =>
    request<ProcessPackage[]>(`/projects/${projectId}/packages`),
  update: (id: string, body: { budget_allocated?: number; status?: string }) =>
    request<ProcessPackage>(`/packages/${id}`, { method: "PATCH", body }),
};

// ── Settlements ─────────────────────────────────────────
export type Settlement = {
  id: string;
  project_id: string;
  vendor_id: string;
  milestone_type: string;
  requested_amount: number;
  approved_amount: number | null;
  status: string;
  created_at: string;
};

export const settlementsApi = {
  listPending: () => request<Settlement[]>("/settlements?status=requested"),
};

// ── Health ──────────────────────────────────────────────
export const healthApi = {
  check: () => request<{ status: string; timestamp: string }>("/health"),
};
