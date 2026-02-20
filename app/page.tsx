"use client";

import { useEffect, useState } from "react";
import { LayoutDashboard, Store, Users, DollarSign, TrendingUp, Activity } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import type { StatsResponse } from "@/lib/types";
import { formatCurrencyCompact, formatNumber } from "@/lib/formatters";

export default function Dashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          Dashboard
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Overview of your merchant portfolio
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          label="Total Merchants"
          value={loading ? "..." : formatNumber(stats?.merchantCount ?? 0)}
          icon={<Store size={20} />}
          color="#7c6aef"
        />
        <StatsCard
          label="Active Merchants"
          value={loading ? "..." : formatNumber(stats?.activeMerchantCount ?? 0)}
          icon={<Activity size={20} />}
          color="#34d399"
        />
        <StatsCard
          label="Total Agents"
          value={loading ? "..." : formatNumber(stats?.agentCount ?? 0)}
          icon={<Users size={20} />}
          color="#60a5fa"
        />
        <StatsCard
          label="Monthly Revenue"
          value={loading ? "..." : formatCurrencyCompact(stats?.monthlyNet ?? 0)}
          icon={<DollarSign size={20} />}
          color="#fbbf24"
        />
      </div>

      {/* Processor Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div
          className="rounded-xl p-6 border"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Processor Breakdown
          </h2>
          {loading ? (
            <div className="text-sm animate-pulse" style={{ color: "var(--text-muted)" }}>
              Loading...
            </div>
          ) : stats?.processorBreakdown && stats.processorBreakdown.length > 0 ? (
            <div className="space-y-3">
              {stats.processorBreakdown.map((p) => (
                <div key={p.processor} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        background:
                          p.processor === "signapay"
                            ? "#7c6aef"
                            : p.processor === "fiserv"
                            ? "#34d399"
                            : p.processor === "tsys"
                            ? "#60a5fa"
                            : "#fbbf24",
                      }}
                    />
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {p.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {p.merchantCount} merchants
                    </span>
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {formatCurrencyCompact(p.net)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No data yet. Upload residuals to see processor breakdown.
            </p>
          )}
        </div>

        {/* Recent Uploads */}
        <div
          className="rounded-xl p-6 border"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Recent Uploads
          </h2>
          {loading ? (
            <div className="text-sm animate-pulse" style={{ color: "var(--text-muted)" }}>
              Loading...
            </div>
          ) : stats?.recentUploads && stats.recentUploads.length > 0 ? (
            <div className="space-y-3">
              {stats.recentUploads.map((u, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {u.processor.charAt(0).toUpperCase() + u.processor.slice(1)}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {u.month}/{u.year} &middot; {u.recordCount} records
                    </p>
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date(u.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No uploads yet. Go to Residuals to upload your first CSV.
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div
        className="rounded-xl p-6 border"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/residuals"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: "#7c6aef" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#6b5ce7")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#7c6aef")}
          >
            <TrendingUp size={16} />
            Upload Residuals
          </a>
          <a
            href="/merchants"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
          >
            <Store size={16} />
            View Merchants
          </a>
          <a
            href="/users"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
          >
            <Users size={16} />
            Manage Agents
          </a>
        </div>
      </div>
    </div>
  );
}
