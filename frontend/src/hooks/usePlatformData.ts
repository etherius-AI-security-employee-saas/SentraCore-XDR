import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";

import { apiClient } from "../api/client";
import type {
  AlertItem,
  DashboardOverview,
  PlatformSettings,
  ThreatIntel,
  ThreatUpdateMessage,
  Timeline,
  UserRiskRow,
} from "../types/api";

interface PlatformState {
  overview: DashboardOverview | null;
  alerts: AlertItem[];
  users: UserRiskRow[];
  timelines: Timeline[];
  threatIntel: ThreatIntel[];
  settings: PlatformSettings | null;
  selectedTenant: string;
  loading: boolean;
  connection: "connecting" | "live" | "polling" | "offline";
}

const initialState: PlatformState = {
  overview: null,
  alerts: [],
  users: [],
  timelines: [],
  threatIntel: [],
  settings: null,
  selectedTenant: "sentinel-bank",
  loading: true,
  connection: "connecting",
};

export function usePlatformData() {
  const [state, setState] = useState<PlatformState>(initialState);
  const [liveNarrative, setLiveNarrative] = useState<string[]>([]);
  const deferredNarrative = useDeferredValue(liveNarrative);
  const socketRef = useRef<WebSocket | null>(null);
  const refreshTimer = useRef<number | null>(null);

  const refreshTenantData = useEffectEvent(async (tenantSlug: string, preserveLoading = false) => {
    if (!preserveLoading) {
      setState((current) => ({ ...current, loading: true }));
    }
    const [overview, alerts, users, timelines, threatIntel] = await Promise.all([
      apiClient.getOverview(tenantSlug),
      apiClient.getAlerts(tenantSlug),
      apiClient.getUsers(tenantSlug),
      apiClient.getTimeline(tenantSlug),
      apiClient.getThreatIntel(tenantSlug),
    ]);
    startTransition(() => {
      setState((current) => ({
        ...current,
        overview,
        alerts,
        users,
        timelines,
        threatIntel,
        loading: false,
      }));
    });
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const settings = await apiClient.getSettings();
        if (cancelled) {
          return;
        }
        const selectedTenant = settings.platform.default_tenant_slug ?? settings.tenants[0]?.slug ?? "sentinel-bank";
        setState((current) => ({ ...current, settings, selectedTenant }));
        await refreshTenantData(selectedTenant);
      } catch {
        if (!cancelled) {
          setState((current) => ({ ...current, loading: false, connection: "offline" }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshTenantData]);

  useEffect(() => {
    if (!state.selectedTenant) {
      return;
    }
    if (!apiClient.isRealtimeEnabled()) {
      setState((current) => ({ ...current, connection: "polling" }));
      const interval = window.setInterval(() => {
        void refreshTenantData(state.selectedTenant, true);
      }, 10000);
      return () => window.clearInterval(interval);
    }
    const socket = new WebSocket(`${apiClient.getWsBase()}?tenant_slug=${state.selectedTenant}`);
    socketRef.current = socket;
    let keepalive: number | null = null;

    socket.addEventListener("open", () => {
      setState((current) => ({ ...current, connection: "live" }));
      keepalive = window.setInterval(() => socket.send("ping"), 12000);
    });

    socket.addEventListener("message", (message) => {
      const data = JSON.parse(message.data) as ThreatUpdateMessage;
      if (data.type !== "threat_update") {
        return;
      }
      startTransition(() => {
        setLiveNarrative((current) => [
          `${data.payload.event.user}: ${data.payload.event.event_type.replaceAll("_", " ")} scored ${Math.round(data.payload.risk.score)} risk`,
          ...current,
        ].slice(0, 8));
      });
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current);
      }
      refreshTimer.current = window.setTimeout(() => {
        void refreshTenantData(state.selectedTenant, true);
      }, 750);
    });

    socket.addEventListener("close", () => {
      setState((current) => ({ ...current, connection: apiClient.isRealtimeEnabled() ? "offline" : "polling" }));
      if (keepalive) {
        window.clearInterval(keepalive);
      }
    });

    return () => {
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current);
      }
      if (keepalive) {
        window.clearInterval(keepalive);
      }
      socket.close();
    };
  }, [refreshTenantData, state.selectedTenant]);

  const switchTenant = async (tenantSlug: string) => {
    setState((current) => ({ ...current, selectedTenant: tenantSlug }));
    await refreshTenantData(tenantSlug);
  };

  const runSimulation = async (scenario: string) => {
    const target = state.users[0]?.email;
    await apiClient.runSimulation(state.selectedTenant, scenario, target);
    await refreshTenantData(state.selectedTenant, true);
  };

  return {
    ...state,
    highestRiskUser: state.users[0] ?? null,
    openCriticalAlerts: state.alerts.filter((alert) => alert.severity === "critical").length,
    liveNarrative: deferredNarrative,
    switchTenant,
    refresh: () => refreshTenantData(state.selectedTenant),
    runSimulation,
  };
}
