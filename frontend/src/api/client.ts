import type {
  AlertItem,
  DashboardOverview,
  PlatformSettings,
  ThreatIntel,
  Timeline,
  UserRiskRow,
} from "../types/api";

function getDefaultApiBase() {
  if (typeof window === "undefined") {
    return "http://127.0.0.1:8000/api/v1";
  }
  const { hostname, origin } = window.location;
  if (hostname === "127.0.0.1" || hostname === "localhost") {
    return "http://127.0.0.1:8000/api/v1";
  }
  return `${origin}/api/v1`;
}

function getDefaultWsBase() {
  if (typeof window === "undefined") {
    return "ws://127.0.0.1:8000/ws/live";
  }
  const { hostname, protocol, host } = window.location;
  if (hostname === "127.0.0.1" || hostname === "localhost") {
    return "ws://127.0.0.1:8000/ws/live";
  }
  if ((import.meta.env.VITE_WS_BASE_URL ?? "") === "") {
    return "";
  }
  const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${host}/ws/live`;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? getDefaultApiBase();
const WS_BASE = import.meta.env.VITE_WS_BASE_URL ?? getDefaultWsBase();

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const apiClient = {
  getApiBase: () => API_BASE,
  getWsBase: () => WS_BASE,
  isRealtimeEnabled: () => Boolean(WS_BASE),
  getSettings: () => getJson<PlatformSettings>("/settings"),
  getOverview: (tenantSlug: string) => getJson<DashboardOverview>(`/dashboard/overview?tenant_slug=${tenantSlug}`),
  getAlerts: (tenantSlug: string) => getJson<AlertItem[]>(`/alerts?tenant_slug=${tenantSlug}`),
  getUsers: (tenantSlug: string) => getJson<UserRiskRow[]>(`/users/risk-rankings?tenant_slug=${tenantSlug}`),
  getTimeline: (tenantSlug: string) => getJson<Timeline[]>(`/timeline?tenant_slug=${tenantSlug}`),
  getThreatIntel: (tenantSlug: string) => getJson<ThreatIntel[]>(`/threat-intelligence?tenant_slug=${tenantSlug}`),
  async runSimulation(tenantSlug: string, scenario: string, targetEmail?: string): Promise<void> {
    const response = await fetch(`${API_BASE}/simulations/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_slug: tenantSlug, scenario, target_email: targetEmail ?? null }),
    });
    if (!response.ok) {
      throw new Error(`Simulation failed: ${response.status}`);
    }
  },
};
