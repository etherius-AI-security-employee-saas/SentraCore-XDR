export type Severity = "low" | "medium" | "high" | "critical";

export interface LiveFeedItem {
  kind: string;
  title: string;
  severity: Severity;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface DashboardOverview {
  tenant: { name: string; slug: string; sector: string };
  global_risk_score: number;
  risk_delta: number;
  risk_trend: Array<{ time: string; score: number }>;
  activity_distribution: Array<{ category: string; count: number }>;
  threat_categories: Array<{ category: string; count: number }>;
  activity_heatmap: Array<{ day: number; hour: string; value: number }>;
  live_feed: LiveFeedItem[];
  alerts_summary: Record<string, number>;
  zero_trust: { mode: string; verification_success_rate: number; policy_challenges: number };
  ai_insights: Array<{ title: string; severity: Severity; summary: string; score: number }>;
}

export interface AlertItem {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: string;
  status: string;
  confidence: number;
  detection_source: string;
  explanation: Record<string, unknown>;
  created_at: string;
  user_name: string;
  user_email: string;
}

export interface UserRiskRow {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  risk_score: number;
  delta: number;
  severity: Severity;
  fingerprint: string;
  last_event_type: string;
  last_seen_at: string;
  top_signal: string;
}

export interface TimelineStep {
  id: string;
  label: string;
  stage: string;
  timestamp: string;
  severity: Severity;
  detail: string;
  actor: string;
}

export interface Timeline {
  id: string;
  title: string;
  description: string;
  current_stage: string;
  steps: TimelineStep[];
  started_at: string;
  last_updated_at: string;
}

export interface ThreatIntel {
  indicator: string;
  category: string;
  confidence: number;
  summary: string;
  created_at: string;
}

export interface PlatformSettings {
  platform: {
    name: string;
    environment: string;
    ai_engine_url: string;
    default_tenant_slug: string;
  };
  tenants: Array<{ name: string; slug: string; sector: string; zero_trust_mode: boolean }>;
  rbac: Array<{ role: string; permissions: string[] }>;
  streaming: { mode: string; demo_streaming_enabled: boolean };
}

export interface ThreatUpdateMessage {
  type: "threat_update";
  payload: {
    event: {
      id: string;
      event_type: string;
      risk_score: number;
      severity: Severity;
      summary: string;
      user: string;
      timestamp: string;
    };
    alert: {
      id: string;
      title: string;
      severity: Severity;
      category: string;
      confidence: number;
      created_at: string;
    } | null;
    risk: {
      score: number;
      severity: Severity;
      factors: string[];
    };
  };
}
