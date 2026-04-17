import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ShieldCheck, Sparkles, UserRound, Waves } from "lucide-react";

import { PremiumCard } from "./components/PremiumCard";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { usePlatformData } from "./hooks/usePlatformData";

const chartPalette = ["#45F882", "#43D9FF", "#FFAA5C", "#FF5C7A", "#7CF0FF"];
const severityTone = {
  low: "text-safe",
  medium: "text-alert",
  high: "text-danger",
  critical: "text-danger",
};

function formatDelta(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function dayLabel(day: number) {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][day] ?? "Day";
}

export default function App() {
  const {
    overview,
    alerts,
    users,
    timelines,
    threatIntel,
    settings,
    selectedTenant,
    connection,
    loading,
    highestRiskUser,
    openCriticalAlerts,
    liveNarrative,
    switchTenant,
    refresh,
    runSimulation,
  } = usePlatformData();
  const [activeView, setActiveView] = useState("dashboard");
  const [replayIndex, setReplayIndex] = useState(0);

  useEffect(() => {
    if (!timelines[0]?.steps.length) {
      return;
    }
    const interval = window.setInterval(() => {
      setReplayIndex((current) => (current + 1) % timelines[0].steps.length);
    }, 1800);
    return () => window.clearInterval(interval);
  }, [timelines]);

  const topTimeline = timelines[0];

  return (
    <div className="grid-overlay min-h-screen bg-shell px-4 py-4 lg:px-6">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-4 xl:flex-row">
        <Sidebar activeView={activeView} onChange={setActiveView} />
        <main className="flex-1 space-y-4">
          <Header
            settings={settings}
            selectedTenant={selectedTenant}
            onTenantChange={(tenant) => void switchTenant(tenant)}
            onRefresh={() => void refresh()}
            onSimulate={(scenario) => void runSimulation(scenario)}
            connection={connection}
          />

          <section className="grid gap-4 xl:grid-cols-4">
            <PremiumCard title="Global Risk Score" kicker="Live posture" className="xl:col-span-1">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-5xl font-semibold text-white">{Math.round(overview?.global_risk_score ?? 0)}</div>
                  <p className={`mt-2 text-sm ${Number(overview?.risk_delta ?? 0) >= 0 ? "text-danger" : "text-safe"}`}>
                    {formatDelta(overview?.risk_delta ?? 0)} in the last decision window
                  </p>
                </div>
                <ShieldCheck className="h-12 w-12 text-safe/80" />
              </div>
            </PremiumCard>

            <PremiumCard title="Critical Alerts" kicker="Immediate actions" className="xl:col-span-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-5xl font-semibold text-white">{openCriticalAlerts}</div>
                  <p className="mt-2 text-sm text-ink/70">Escalated by AI fusion and zero trust verification drift.</p>
                </div>
                <AlertTriangle className="h-12 w-12 text-danger/80" />
              </div>
            </PremiumCard>

            <PremiumCard title="Highest-Risk User" kicker="Digital behavior fingerprint" className="xl:col-span-1">
              <div className="space-y-2">
                <div className="text-xl font-semibold text-white">{highestRiskUser?.full_name ?? "Loading"}</div>
                <p className="text-sm text-ink/70">{highestRiskUser?.role ?? "Preparing tenant feed"}</p>
                <div className="inline-flex rounded-full border border-danger/20 bg-danger/10 px-3 py-1 text-sm text-danger">
                  {highestRiskUser ? `${Math.round(highestRiskUser.risk_score)} risk` : "Pending"}
                </div>
              </div>
            </PremiumCard>

            <PremiumCard title="Zero Trust Mode" kicker="Continuous verification" className="xl:col-span-1">
              <div className="space-y-2">
                <div className="text-xl font-semibold text-white">{overview?.zero_trust.mode ?? "Strict"}</div>
                <p className="text-sm text-ink/70">
                  {overview?.zero_trust.verification_success_rate ?? 0}% verification success with {overview?.zero_trust.policy_challenges ?? 0} live policy challenges.
                </p>
                <div className="inline-flex rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-sm text-accent">
                  {connection === "live"
                    ? "Streaming telemetry connected"
                    : connection === "polling"
                      ? "Adaptive polling active"
                      : "Streaming reconnection in progress"}
                </div>
              </div>
            </PremiumCard>
          </section>

          {activeView === "dashboard" && (
            <div className="grid gap-4 xl:grid-cols-12">
              <PremiumCard title="Risk Trend" kicker="Fusion output over time" className="xl:col-span-7">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={overview?.risk_trend ?? []}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                      <XAxis dataKey="time" stroke="#6F809C" />
                      <YAxis stroke="#6F809C" />
                      <Tooltip contentStyle={{ background: "#0F1725", border: "1px solid rgba(255,255,255,0.1)" }} />
                      <Line type="monotone" dataKey="score" stroke="#45F882" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </PremiumCard>

              <PremiumCard title="Threat Categories" kicker="Current tenant mix" className="xl:col-span-5">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={overview?.threat_categories ?? []} innerRadius={62} outerRadius={98} paddingAngle={4} dataKey="count" nameKey="category">
                        {(overview?.threat_categories ?? []).map((_, index) => (
                          <Cell key={index} fill={chartPalette[index % chartPalette.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#0F1725", border: "1px solid rgba(255,255,255,0.1)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </PremiumCard>

              <PremiumCard title="Live Threat Feed" kicker="Streaming decisions" className="xl:col-span-4">
                <div className="space-y-3">
                  {overview?.live_feed.slice(0, 5).map((item) => (
                    <div key={`${item.title}-${item.timestamp}`} className="rounded-2xl border border-white/5 bg-white/5 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <span className={`text-xs uppercase ${severityTone[item.severity]}`}>{item.severity}</span>
                      </div>
                      <p className="mt-2 text-xs text-ink/65">{String(item.payload.description ?? "")}</p>
                    </div>
                  ))}
                </div>
              </PremiumCard>

              <PremiumCard title="Activity Distribution" kicker="Telemetry mix" className="xl:col-span-4">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview?.activity_distribution ?? []}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                      <XAxis dataKey="category" stroke="#6F809C" tick={{ fontSize: 11 }} angle={-15} height={70} textAnchor="end" />
                      <YAxis stroke="#6F809C" />
                      <Tooltip contentStyle={{ background: "#0F1725", border: "1px solid rgba(255,255,255,0.1)" }} />
                      <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                        {(overview?.activity_distribution ?? []).map((_, index) => (
                          <Cell key={index} fill={chartPalette[index % chartPalette.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </PremiumCard>

              <PremiumCard title="AI Insights" kicker="Explainable detections" className="xl:col-span-4">
                <div className="space-y-3">
                  {(overview?.ai_insights ?? []).map((insight) => (
                    <div key={insight.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-accent" />
                        <p className="text-sm font-medium text-white">{insight.title}</p>
                      </div>
                      <p className="mt-2 text-sm text-ink/70">{insight.summary}</p>
                      <p className={`mt-3 text-xs uppercase tracking-[0.25em] ${severityTone[insight.severity]}`}>
                        {insight.severity} | score {Math.round(insight.score)}
                      </p>
                    </div>
                  ))}
                </div>
              </PremiumCard>

              <PremiumCard title="User Risk Ranking" kicker="Role-aware prioritization" className="xl:col-span-7">
                <div className="space-y-3">
                  {users.slice(0, 6).map((user) => (
                    <div key={user.user_id} className="grid gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 md:grid-cols-[2fr_1fr_1fr_1fr]">
                      <div>
                        <div className="flex items-center gap-2">
                          <UserRound className="h-4 w-4 text-accent" />
                          <p className="font-medium text-white">{user.full_name}</p>
                        </div>
                        <p className="mt-1 text-sm text-ink/65">{user.role} | {user.department}</p>
                        <p className="mt-2 text-xs text-ink/55">{user.top_signal}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-ink/45">Risk</p>
                        <p className={`mt-2 text-2xl font-semibold ${severityTone[user.severity]}`}>{Math.round(user.risk_score)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-ink/45">Delta</p>
                        <p className={`mt-2 text-lg ${user.delta >= 0 ? "text-danger" : "text-safe"}`}>{formatDelta(user.delta)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-ink/45">Fingerprint</p>
                        <p className="mt-2 text-sm text-white">{user.fingerprint}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </PremiumCard>

              <PremiumCard title="Activity Heatmap" kicker="Behavioral intensity by hour" className="xl:col-span-5">
                <div className="space-y-2">
                  <div className="grid grid-cols-8 gap-2 text-xs text-ink/45">
                    <div />
                    {["00", "04", "08", "12", "16", "20", "22"].map((hour) => (
                      <div key={hour} className="text-center">
                        {hour}
                      </div>
                    ))}
                  </div>
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                    <div key={day} className="grid grid-cols-8 gap-2 text-xs">
                      <div className="pt-2 text-ink/45">{dayLabel(day)}</div>
                      {[0, 4, 8, 12, 16, 20, 22].map((hour) => {
                        const cell = overview?.activity_heatmap.find((item) => item.day === day && item.hour === `${hour.toString().padStart(2, "0")}:00`);
                        const intensity = Math.min(1, (cell?.value ?? 0) / 6);
                        return (
                          <div
                            key={`${day}-${hour}`}
                            className="h-10 rounded-xl border border-white/5"
                            style={{ backgroundColor: `rgba(69, 248, 130, ${0.08 + intensity * 0.75})` }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </PremiumCard>

              <PremiumCard title="Attack Replay Mode" kicker="Sequenced reconstruction" className="xl:col-span-12">
                <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
                  <div className="space-y-3">
                    {topTimeline?.steps.map((step, index) => (
                      <motion.div
                        key={step.id}
                        animate={{ scale: replayIndex === index ? 1.02 : 1 }}
                        className={`rounded-2xl border bg-white/5 p-4 ${replayIndex === index ? "border-accent/40" : "border-white/5"}`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-white">{step.label}</p>
                          <span className={`text-xs uppercase ${severityTone[step.severity]}`}>{step.stage}</span>
                        </div>
                        <p className="mt-2 text-sm text-ink/70">{step.detail}</p>
                      </motion.div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-3xl border border-accent/20 bg-accent/10 p-5">
                      <p className="text-[11px] uppercase tracking-[0.35em] text-accent/70">Live replay narrative</p>
                      <div className="mt-4 space-y-3">
                        {liveNarrative.map((item) => (
                          <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-3xl border border-danger/20 bg-danger/10 p-5">
                      <p className="text-[11px] uppercase tracking-[0.35em] text-danger/70">Containment guidance</p>
                      <p className="mt-3 text-sm text-ink/75">
                        Revoke suspicious sessions, isolate affected devices, trip adaptive MFA, and retain the event sequence for analyst replay and post-incident coaching.
                      </p>
                    </div>
                  </div>
                </div>
              </PremiumCard>
            </div>
          )}

          {activeView === "alerts" && (
            <PremiumCard title="Alert Command Board" kicker="Severity prioritized">
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-medium text-white">{alert.title}</p>
                        <p className="mt-2 text-sm text-ink/70">{alert.description}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm uppercase ${severityTone[alert.severity]}`}>{alert.severity}</p>
                        <p className="mt-2 text-xs text-ink/50">{alert.user_name} | {alert.category}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </PremiumCard>
          )}

          {activeView === "users" && (
            <PremiumCard title="User Risk Intelligence" kicker="Behavior fingerprinting">
              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.user_id} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                    <div className="grid gap-3 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
                      <div>
                        <p className="text-lg font-medium text-white">{user.full_name}</p>
                        <p className="text-sm text-ink/65">{user.email}</p>
                      </div>
                      <div><p className="text-[10px] uppercase tracking-[0.25em] text-ink/45">Role</p><p className="mt-2 text-white">{user.role}</p></div>
                      <div><p className="text-[10px] uppercase tracking-[0.25em] text-ink/45">Last Event</p><p className="mt-2 text-white">{user.last_event_type}</p></div>
                      <div><p className="text-[10px] uppercase tracking-[0.25em] text-ink/45">Risk</p><p className={`mt-2 ${severityTone[user.severity]}`}>{Math.round(user.risk_score)}</p></div>
                      <div><p className="text-[10px] uppercase tracking-[0.25em] text-ink/45">Signal</p><p className="mt-2 text-white">{user.top_signal}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </PremiumCard>
          )}

          {activeView === "threat-intelligence" && (
            <div className="grid gap-4 xl:grid-cols-2">
              <PremiumCard title="Threat Intelligence" kicker="Mock enrichment">
                <div className="space-y-3">
                  {threatIntel.map((item) => (
                    <div key={`${item.indicator}-${item.created_at}`} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-white">{item.indicator}</p>
                        <p className="text-sm text-accent">{Math.round(item.confidence * 100)}%</p>
                      </div>
                      <p className="mt-2 text-sm text-ink/70">{item.summary}</p>
                    </div>
                  ))}
                </div>
              </PremiumCard>
              <PremiumCard title="Behavioral Insights" kicker="What the AI sees">
                <div className="space-y-3">
                  {(overview?.ai_insights ?? []).map((insight) => (
                    <div key={insight.title} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                      <p className="font-medium text-white">{insight.title}</p>
                      <p className="mt-2 text-sm text-ink/70">{insight.summary}</p>
                    </div>
                  ))}
                </div>
              </PremiumCard>
            </div>
          )}

          {activeView === "attack-timeline" && (
            <PremiumCard title="Attack Timeline Explorer" kicker="Post-attack reconstruction">
              <div className="space-y-6">
                {timelines.map((timeline) => (
                  <div key={timeline.id} className="rounded-3xl border border-white/5 bg-white/5 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xl font-medium text-white">{timeline.title}</p>
                        <p className="mt-2 text-sm text-ink/70">{timeline.description}</p>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-sm text-accent">
                        <Waves className="h-4 w-4" />
                        {timeline.current_stage}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 xl:grid-cols-3">
                      {timeline.steps.map((step) => (
                        <div key={step.id} className="rounded-2xl border border-white/5 bg-black/20 p-4">
                          <p className="font-medium text-white">{step.label}</p>
                          <p className="mt-2 text-sm text-ink/65">{step.detail}</p>
                          <p className={`mt-3 text-xs uppercase ${severityTone[step.severity]}`}>{step.stage}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </PremiumCard>
          )}

          {activeView === "settings" && (
            <div className="grid gap-4 xl:grid-cols-2">
              <PremiumCard title="Platform Configuration" kicker="Multi-tenant SaaS model">
                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                    <p className="text-sm text-ink/55">Environment</p>
                    <p className="mt-1 text-white">{settings?.platform.environment ?? "development"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                    <p className="text-sm text-ink/55">Streaming</p>
                    <p className="mt-1 text-white">{settings?.streaming.mode ?? "websocket"} / demo {String(settings?.streaming.demo_streaming_enabled)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                    <p className="text-sm text-ink/55">AI Engine</p>
                    <p className="mt-1 text-white">{settings?.platform.ai_engine_url ?? "offline"}</p>
                  </div>
                </div>
              </PremiumCard>
              <PremiumCard title="RBAC Profile" kicker="Role-based access control">
                <div className="space-y-3">
                  {settings?.rbac.map((role) => (
                    <div key={role.role} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                      <p className="font-medium text-white">{role.role}</p>
                      <p className="mt-2 text-sm text-ink/70">{role.permissions.join(" | ")}</p>
                    </div>
                  ))}
                </div>
              </PremiumCard>
            </div>
          )}

          {loading && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-ink/70">
              Initializing SOC telemetry, risk models, and tenant intelligence surfaces.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

