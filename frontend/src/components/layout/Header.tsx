import { LoaderCircle, Play, RefreshCcw, Wifi, WifiOff } from "lucide-react";

import type { PlatformSettings } from "../../types/api";

interface HeaderProps {
  settings: PlatformSettings | null;
  selectedTenant: string;
  onTenantChange: (slug: string) => void;
  onRefresh: () => void;
  onSimulate: (scenario: string) => void;
  connection: "connecting" | "live" | "polling" | "offline";
}

const scenarios = [
  { id: "phishing_campaign", label: "Phishing Drill" },
  { id: "credential_takeover", label: "Credential Takeover" },
  { id: "insider_exfiltration", label: "Insider Exfiltration" },
  { id: "decoy_tripwire", label: "Decoy Tripwire" },
];

export function Header({
  settings,
  selectedTenant,
  onTenantChange,
  onRefresh,
  onSimulate,
  connection,
}: HeaderProps) {
  return (
    <header className="rounded-[30px] border border-white/10 bg-black/20 p-5 backdrop-blur-xl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-accent/70">Premium SOC Console</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Real-time human attack defense</h2>
          <p className="mt-2 max-w-3xl text-sm text-ink/70">
            SentraCore XDR correlates phishing, behavior, sequence, and contextual telemetry to produce explainable response-grade intelligence.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <label className="block text-[10px] uppercase tracking-[0.3em] text-ink/45">Tenant</label>
            <select
              value={selectedTenant}
              onChange={(event) => onTenantChange(event.target.value)}
              className="mt-2 bg-transparent text-sm text-white outline-none"
            >
              {settings?.tenants.map((tenant) => (
                <option key={tenant.slug} value={tenant.slug} className="bg-slate-900">
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              onClick={() => onSimulate(scenario.id)}
              className="inline-flex items-center gap-2 rounded-2xl border border-safe/20 bg-safe/10 px-4 py-3 text-sm text-safe transition hover:bg-safe/15"
            >
              <Play className="h-4 w-4" />
              {scenario.label}
            </button>
          ))}
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
            {connection === "live" ? (
              <Wifi className="h-4 w-4 text-safe" />
            ) : connection === "polling" ? (
              <Wifi className="h-4 w-4 text-accent" />
            ) : connection === "connecting" ? (
              <LoaderCircle className="h-4 w-4 animate-spin text-accent" />
            ) : (
              <WifiOff className="h-4 w-4 text-danger" />
            )}
            {connection}
          </div>
        </div>
      </div>
    </header>
  );
}
