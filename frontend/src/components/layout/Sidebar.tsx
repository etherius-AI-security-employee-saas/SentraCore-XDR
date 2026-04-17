import { Activity, AlertTriangle, Cog, Radar, Shield, Users } from "lucide-react";

const items = [
  { id: "dashboard", label: "Dashboard", icon: Shield },
  { id: "alerts", label: "Alerts", icon: AlertTriangle },
  { id: "users", label: "Users", icon: Users },
  { id: "threat-intelligence", label: "Threat Intelligence", icon: Radar },
  { id: "attack-timeline", label: "Attack Timeline", icon: Activity },
  { id: "settings", label: "Settings", icon: Cog },
];

interface SidebarProps {
  activeView: string;
  onChange: (value: string) => void;
}

export function Sidebar({ activeView, onChange }: SidebarProps) {
  return (
    <aside className="flex min-h-[calc(100vh-32px)] w-full max-w-[250px] flex-col rounded-[32px] border border-white/10 bg-black/25 p-4 backdrop-blur-xl">
      <div className="rounded-3xl border border-safe/30 bg-safe/10 p-4">
        <div className="mb-4 flex items-center gap-3">
          <img src="/sentracore-logo.svg" alt="SentraCore XDR logo" className="h-12 w-12 rounded-2xl border border-white/10 bg-black/30 p-1" />
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-safe/60">SENTRACORE</p>
            <p className="text-sm text-ink/70">XDR for the human attack surface</p>
          </div>
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-white">SentraCore XDR</h1>
        <p className="mt-3 text-sm text-ink/70">Behavioral intelligence, attack simulation, and explainable defense for modern security teams.</p>
      </div>
      <nav className="mt-6 space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeView;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                active ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(69,248,130,0.35)]" : "text-ink/70 hover:bg-white/5"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-safe" : "text-ink/60"}`} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="mt-auto rounded-3xl border border-danger/20 bg-danger/10 p-4">
        <p className="text-[11px] uppercase tracking-[0.3em] text-danger/70">Zero Trust</p>
        <p className="mt-2 text-sm text-ink/80">Every action is continuously re-verified. Suspicious drift escalates verification and containment automatically.</p>
      </div>
    </aside>
  );
}
