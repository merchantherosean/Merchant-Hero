"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Users, Search, Plus } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { MONTHS } from "@/lib/types";

interface AgentRow {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: string;
  merchantCount: number;
  totalVolume: number;
  totalEarnings: number;
}

export default function UsersPage() {
  const currentDate = new Date();
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: "", email: "", phone: "" });

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  const fetchAgents = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("year", selectedYear.toString());
    params.set("month", selectedMonth.toString());
    fetch(`/api/agents?${params}`)
      .then((r) => r.json())
      .then(setAgents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, selectedYear, selectedMonth]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleAddAgent = async () => {
    if (!newAgent.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAgent.name.trim(),
          email: newAgent.email.trim() || null,
          phone: newAgent.phone.trim() || null,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewAgent({ name: "", email: "", phone: "" });
        fetchAgents();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            Agents
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Manage your sales agents and team members
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <span className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
            <Users size={16} />
            {agents.length} agents
          </span>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-white"
            style={{ background: "#5B8C2A" }}
          >
            <Plus size={16} />
            Add Agent
          </button>
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
                    style={{ background: "var(--accent-bg)", color: "#5B8C2A" }}
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
                    Earnings
                  </p>
                  <p className="text-sm font-medium" style={{ color: "#34d399" }}>
                    {formatCurrency(agent.totalEarnings)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add Agent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="rounded-xl p-6 w-full max-w-md mx-4 shadow-xl"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              Add Agent
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                  Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  placeholder="Full name"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                  Email
                </label>
                <input
                  type="email"
                  value={newAgent.email}
                  onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
                  placeholder="agent@example.com"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                  Phone
                </label>
                <input
                  type="tel"
                  value={newAgent.phone}
                  onChange={(e) => setNewAgent({ ...newAgent, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewAgent({ name: "", email: "", phone: "" });
                }}
                className="px-4 py-2 text-sm rounded-lg border transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleAddAgent}
                disabled={saving || !newAgent.name.trim()}
                className="px-4 py-2 text-sm rounded-lg text-white transition-colors disabled:opacity-50"
                style={{ background: "#5B8C2A" }}
              >
                {saving ? "Adding..." : "Add Agent"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
