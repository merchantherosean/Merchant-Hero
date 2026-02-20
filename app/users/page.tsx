"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Search } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency, formatNumber } from "@/lib/formatters";

interface AgentRow {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: string;
  merchantCount: number;
  totalVolume: number;
  totalNet: number;
}

export default function UsersPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    fetch(`/api/agents?${params}`)
      .then((r) => r.json())
      .then(setAgents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            Users & Agents
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Manage your sales agents and team members
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
          <Users size={16} />
          {agents.length} agents
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      {/* Agent Cards */}
      {loading ? (
        <div className="text-sm animate-pulse" style={{ color: "var(--text-muted)" }}>
          Loading agents...
        </div>
      ) : agents.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center border"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
        >
          <Users size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No agents found. Upload residuals to auto-create agent profiles.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/users/${agent.id}`}
              className="block rounded-xl p-5 border transition-colors"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: "var(--accent-bg)", color: "#7c6aef" }}
                  >
                    {agent.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {agent.name}
                    </p>
                    {agent.email && (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {agent.email}
                      </p>
                    )}
                  </div>
                </div>
                <StatusBadge status={agent.status} />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Merchants
                  </p>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {agent.merchantCount}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Volume
                  </p>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {formatCurrency(agent.totalVolume)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Net
                  </p>
                  <p className="text-sm font-medium" style={{ color: "#34d399" }}>
                    {formatCurrency(agent.totalNet)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
