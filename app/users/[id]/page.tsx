"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Store, Trash2 } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import StatsCard from "@/components/StatsCard";
import { formatCurrency, formatMonthYear, formatNumber } from "@/lib/formatters";
import { PROCESSOR_LABELS, type Processor } from "@/lib/types";

interface AgentDetail {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  splitPercent?: number;
  status: string;
  createdAt: string;
  merchants: {
    id: string;
    mid: string;
    dba: string;
    processor: string;
    status: string;
    bpsRate: number | null;
  }[];
  monthlyEarnings: {
    year: number;
    month: number;
    volume: number;
    earnings: number;
    merchantCount: number;
  }[];
}

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/agents/${params.id}`)
      .then((r) => r.json())
      .then(setAgent)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="text-sm animate-pulse" style={{ color: "var(--text-muted)" }}>
        Loading agent details...
      </div>
    );
  }

  if (!agent) {
    return (
      <div>
        <Link href="/users" className="text-sm hover:underline" style={{ color: "#7c6aef" }}>
          &larr; Back to Agents
        </Link>
        <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>Agent not found.</p>
      </div>
    );
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/agents/${params.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/users");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  const totalVolume = agent.monthlyEarnings.reduce((s, e) => s + e.volume, 0);
  const totalEarnings = agent.monthlyEarnings.reduce((s, e) => s + e.earnings, 0);

  return (
    <div>
      <Link
        href="/users"
        className="inline-flex items-center gap-1.5 text-sm mb-6 hover:underline"
        style={{ color: "#7c6aef" }}
      >
        <ArrowLeft size={14} />
        Back to Agents
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold"
            style={{ background: "var(--accent-bg)", color: "#7c6aef" }}
          >
            {agent.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {agent.name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              {agent.email && (
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {agent.email}
                </span>
              )}
              {agent.phone && (
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {agent.phone}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={agent.status} />
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors hover:bg-red-500/10"
            style={{ color: "#ef4444", borderColor: "#ef4444" }}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatsCard
          label="Merchants"
          value={formatNumber(agent.merchants.length)}
          icon={<Store size={20} />}
          color="#7c6aef"
        />
        <StatsCard
          label="Total Volume"
          value={formatCurrency(totalVolume)}
          icon={<Users size={20} />}
          color="#60a5fa"
        />
        <StatsCard
          label="Total BPS Earnings"
          value={formatCurrency(totalEarnings)}
          icon={<Users size={20} />}
          color="#34d399"
        />
      </div>

      {/* Merchants Table */}
      <div
        className="rounded-xl border overflow-hidden mb-8"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="px-4 py-3" style={{ background: "var(--bg-tertiary)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Assigned Merchants ({agent.merchants.length})
          </h2>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--bg-tertiary)" }}>
              {["DBA Name", "MID", "Processor", "BPS Rate", "Status"].map((h) => (
                <th
                  key={h}
                  className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agent.merchants.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  No merchants assigned.
                </td>
              </tr>
            ) : (
              agent.merchants.map((m) => (
                <tr key={m.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3">
                    <Link href={`/merchants/${m.id}`} className="text-sm font-medium hover:underline" style={{ color: "var(--text-primary)" }}>
                      {m.dba}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
                    {m.mid}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-md" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                      {PROCESSOR_LABELS[m.processor as Processor] || m.processor}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono" style={{ color: m.bpsRate ? "#7c6aef" : "var(--text-muted)" }}>
                    {m.bpsRate != null ? `${m.bpsRate}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={m.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Monthly Earnings */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="px-4 py-3" style={{ background: "var(--bg-tertiary)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Monthly Earnings
          </h2>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--bg-tertiary)" }}>
              {["Period", "Active Merchants", "Volume", "BPS Earnings"].map((h) => (
                <th
                  key={h}
                  className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agent.monthlyEarnings.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  No earnings data yet.
                </td>
              </tr>
            ) : (
              agent.monthlyEarnings
                .sort((a, b) => b.year - a.year || b.month - a.month)
                .map((e, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                      {formatMonthYear(e.month, e.year)}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {e.merchantCount}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                      {formatCurrency(e.volume)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "#34d399" }}>
                      {formatCurrency(e.earnings)}
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="rounded-xl p-6 w-full max-w-md mx-4 shadow-xl"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              Delete Agent
            </h3>
            <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
              Are you sure you want to delete <strong>{agent.name}</strong>?
            </p>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              Their {agent.merchants.length} merchant assignment{agent.merchants.length !== 1 ? "s" : ""} will be removed. Merchant and residual data will not be deleted.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm rounded-lg border transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-lg text-white transition-colors"
                style={{ background: "#ef4444" }}
              >
                {deleting ? "Deleting..." : "Delete Agent"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
