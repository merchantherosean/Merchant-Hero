"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Store, Trash2, FileText, Tag, Plus, X, Mail, Pencil, Check } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import StatsCard from "@/components/StatsCard";
import { formatCurrency, formatMonthYear, formatNumber } from "@/lib/formatters";
import { PROCESSOR_LABELS, MONTHS, type Processor } from "@/lib/types";

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
  tags?: {
    id: string;
    name: string;
    color: string;
  }[];
}

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [allTags, setAllTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState("");

  useEffect(() => {
    fetch(`/api/agents/${params.id}`)
      .then((r) => r.json())
      .then(setAgent)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  // Default report month/year to the most recent month with data
  useEffect(() => {
    if (agent && agent.monthlyEarnings.length > 0) {
      const sorted = [...agent.monthlyEarnings].sort(
        (a, b) => b.year - a.year || b.month - a.month
      );
      setReportMonth(sorted[0].month);
      setReportYear(sorted[0].year);
    }
  }, [agent]);

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
        <Link href="/users" className="text-sm hover:underline" style={{ color: "#5B8C2A" }}>
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

  async function handleGenerateReport() {
    setGenerating(true);
    try {
      const res = await fetch(
        `/api/agents/${params.id}/report?year=${reportYear}&month=${reportMonth}`
      );
      if (!res.ok) throw new Error("Failed to fetch report data");
      const data = await res.json();
      const { generateAgentReport } = await import("@/lib/generate-agent-report");
      generateAgentReport(data);
      setShowReportModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }

  async function handleEmailReport() {
    setEmailing(true);
    try {
      const res = await fetch(
        `/api/agents/${params.id}/report?year=${reportYear}&month=${reportMonth}`
      );
      if (!res.ok) throw new Error("Failed to fetch report data");
      const data = await res.json();
      const { generateAgentReport } = await import("@/lib/generate-agent-report");
      const result = generateAgentReport(data, { download: false });

      if (result) {
        sessionStorage.setItem(
          "pendingEmailAttachment",
          JSON.stringify({ base64: result.base64, fileName: result.fileName })
        );
      }

      const monthName = MONTHS[reportMonth - 1];
      const emailParams = new URLSearchParams({
        tab: "Compose",
        to: agent?.email || "",
        subject: `Commission Report - ${monthName} ${reportYear}`,
      });

      setShowReportModal(false);
      router.push(`/email?${emailParams.toString()}`);
    } catch (err) {
      console.error(err);
    } finally {
      setEmailing(false);
    }
  }

  function startEditing() {
    if (!agent) return;
    setEditName(agent.name);
    setEditEmail(agent.email || "");
    setEditPhone(agent.phone || "");
    setEditStatus(agent.status);
    setEditing(true);
  }

  async function handleSaveProfile() {
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim() || null,
          phone: editPhone.trim() || null,
          status: editStatus,
        }),
      });
      if (res.ok) {
        // Refresh agent data
        const refreshRes = await fetch(`/api/agents/${params.id}`);
        const data = await refreshRes.json();
        setAgent(data);
        setEditing(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function fetchAllTags() {
    const res = await fetch("/api/tags");
    const data = await res.json();
    setAllTags(data.map((t: { id: string; name: string; color: string }) => ({ id: t.id, name: t.name, color: t.color })));
  }

  async function handleAddTag(tagId: string) {
    await fetch(`/api/agents/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addTagId: tagId }),
    });
    // Refresh agent data
    const res = await fetch(`/api/agents/${params.id}`);
    const data = await res.json();
    setAgent(data);
    setShowTagDropdown(false);
  }

  async function handleRemoveTag(tagId: string) {
    await fetch(`/api/agents/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeTagId: tagId }),
    });
    const res = await fetch(`/api/agents/${params.id}`);
    const data = await res.json();
    setAgent(data);
  }

  const totalVolume = agent.monthlyEarnings.reduce((s, e) => s + e.volume, 0);
  const totalEarnings = agent.monthlyEarnings.reduce((s, e) => s + e.earnings, 0);

  return (
    <div>
      <Link
        href="/users"
        className="inline-flex items-center gap-1.5 text-sm mb-6 hover:underline"
        style={{ color: "#5B8C2A" }}
      >
        <ArrowLeft size={14} />
        Back to Agents
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold"
            style={{ background: "var(--accent-bg)", color: "#5B8C2A" }}
          >
            {agent.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#5B8C2A" }}>
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
              {!agent.email && !agent.phone && (
                <span className="text-sm italic" style={{ color: "var(--text-muted)" }}>
                  No contact info —{" "}
                  <button onClick={startEditing} className="underline cursor-pointer" style={{ color: "#5B8C2A" }}>
                    add email
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={agent.status} />
          {!editing && (
            <button
              onClick={startEditing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors"
              style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <Pencil size={14} />
              Edit
            </button>
          )}
          <button
            onClick={() => setShowReportModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors"
            style={{ color: "#5B8C2A", borderColor: "#5B8C2A" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(91, 140, 42, 0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <FileText size={14} />
            Generate Report
          </button>
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

      {/* Edit Profile Panel */}
      {editing && (
        <div
          className="rounded-xl border p-5 mb-8"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Edit Agent Profile
            </h2>
            <button
              onClick={() => setEditing(false)}
              className="p-1 rounded cursor-pointer"
              style={{ color: "var(--text-muted)" }}
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
            </div>
            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                Email
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="agent@example.com"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
            </div>
            {/* Phone */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                Phone
              </label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
            </div>
            {/* Status */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-sm rounded-lg border cursor-pointer transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={saving || !editName.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white cursor-pointer disabled:opacity-50 transition-colors"
              style={{ background: "#5B8C2A" }}
            >
              <Check size={14} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* Report Tags */}
      <div className="flex items-center gap-2 flex-wrap mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Report Tags:
        </span>
        {(agent.tags || []).map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-white"
            style={{ background: t.color }}
          >
            {t.name}
            <button
              onClick={() => handleRemoveTag(t.id)}
              className="hover:opacity-70 transition-opacity"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <div className="relative">
          <button
            onClick={() => {
              fetchAllTags();
              setShowTagDropdown(!showTagDropdown);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            <Plus size={12} />
            Add Tag
          </button>
          {showTagDropdown && (
            <div
              className="absolute top-full left-0 mt-1 w-48 rounded-lg border shadow-lg z-20 py-1 max-h-48 overflow-y-auto"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
            >
              {allTags
                .filter((t) => !(agent.tags || []).some((at) => at.id === t.id))
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleAddTag(t.id)}
                    className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
                    style={{ color: "var(--text-primary)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.color }} />
                    {t.name}
                  </button>
                ))}
              {allTags.filter((t) => !(agent.tags || []).some((at) => at.id === t.id)).length === 0 && (
                <div className="px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  No more tags available
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatsCard
          label="Merchants"
          value={formatNumber(agent.merchants.length)}
          icon={<Store size={20} />}
          color="#5B8C2A"
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
          color="#5B8C2A"
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
                    <Link href={`/merchants/${m.id}`} className="text-sm font-medium hover:underline" style={{ color: "#5B8C2A" }}>
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
                  <td className="px-4 py-3 text-sm font-mono" style={{ color: m.bpsRate ? "#5B8C2A" : "var(--text-muted)" }}>
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
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "#5B8C2A" }}>
                      {formatCurrency(e.earnings)}
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* Generate Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="rounded-xl p-6 w-full max-w-md mx-4 shadow-xl"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(91, 140, 42, 0.15)" }}
              >
                <FileText size={18} color="#5B8C2A" />
              </div>
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Generate Commission Report
              </h3>
            </div>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              Select a month and year to generate a PDF report for <strong style={{ color: "var(--text-primary)" }}>{agent.name}</strong>.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Month
                </label>
                <select
                  value={reportMonth}
                  onChange={(e) => setReportMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Year
                </label>
                <select
                  value={reportYear}
                  onChange={(e) => setReportYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 text-sm rounded-lg border transition-colors cursor-pointer"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                disabled={generating || emailing}
              >
                Cancel
              </button>
              <button
                onClick={handleEmailReport}
                disabled={generating || emailing || !agent.email}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-colors cursor-pointer disabled:opacity-50"
                style={{ color: "#5B8C2A", borderColor: "#5B8C2A" }}
                title={!agent.email ? "No email address on file for this agent" : "Email report to agent"}
              >
                <Mail size={14} />
                {emailing ? "Preparing..." : "Email Report"}
              </button>
              <button
                onClick={handleGenerateReport}
                disabled={generating || emailing}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white transition-colors cursor-pointer disabled:opacity-50"
                style={{ background: "#5B8C2A" }}
              >
                <FileText size={14} />
                {generating ? "Generating..." : "Generate PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

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
