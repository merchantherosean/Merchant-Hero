"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Store, Search, Eye, EyeOff, UserPlus, UserMinus,
  Tag as TagIcon, Plus, X, Check,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { PROCESSOR_LABELS, MONTHS, type Processor } from "@/lib/types";

interface AgentAssignment {
  id: string;
  name: string;
  bpsRate: number | null;
}

interface TagInfo {
  id: string;
  name: string;
  color: string;
}

interface MerchantRow {
  id: string;
  mid: string;
  dba: string;
  processor: string;
  status: string;
  hidden: boolean;
  agents: AgentAssignment[];
  latestVolume: number | null;
  latestNet: number | null;
  tags: TagInfo[];
}

interface AgentOption {
  id: string;
  name: string;
}

interface TagOption {
  id: string;
  name: string;
  color: string;
  merchantCount: number;
  totalVolume: number;
  totalNet: number;
  merchants: { id: string; dba: string; volume: number; net: number }[];
}

export default function MerchantsPage() {
  const currentDate = new Date();
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [processorFilter, setProcessorFilter] = useState("all");
  const [showHidden, setShowHidden] = useState(false);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tagModal, setTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<string>("new");
  const [tagFilter, setTagFilter] = useState<string>("all");

  // Manage Agents modal state
  const [manageModal, setManageModal] = useState<string | null>(null);
  const [manageAgents, setManageAgents] = useState<AgentAssignment[]>([]);
  const [addAgentId, setAddAgentId] = useState<string>("");
  const [addBps, setAddBps] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Bulk operation modal states
  const [bulkAssignModal, setBulkAssignModal] = useState(false);
  const [bulkAgentId, setBulkAgentId] = useState<string>("");
  const [bulkBps, setBulkBps] = useState<string>("");
  const [bulkStatusModal, setBulkStatusModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>("Active");
  const [bulkHideModal, setBulkHideModal] = useState(false);
  const [bulkHidden, setBulkHidden] = useState<boolean>(true);
  const [bulkSaving, setBulkSaving] = useState(false);

  const fetchMerchants = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (processorFilter !== "all") params.set("processor", processorFilter);
    if (showHidden) params.set("showHidden", "true");
    if (tagFilter !== "all") params.set("tagId", tagFilter);
    params.set("year", selectedYear.toString());
    params.set("month", selectedMonth.toString());
    fetch(`/api/merchants?${params}`)
      .then((r) => r.json())
      .then(setMerchants)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, statusFilter, processorFilter, showHidden, tagFilter, selectedYear, selectedMonth]);

  const fetchAgents = () => {
    fetch("/api/agents").then((r) => r.json()).then(setAgents).catch(console.error);
  };

  const fetchTags = () => {
    fetch("/api/tags").then((r) => r.json()).then(setTags).catch(console.error);
  };

  useEffect(() => {
    fetchMerchants();
    fetchAgents();
    fetchTags();
  }, [fetchMerchants]);

  const toggleHide = async (id: string, currentHidden: boolean) => {
    await fetch(`/api/merchants/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: !currentHidden }),
    });
    fetchMerchants();
  };

  // Open "Manage Agents" modal for a merchant
  const openManageModal = (merchant: MerchantRow) => {
    setManageModal(merchant.id);
    setManageAgents([...merchant.agents]);
    setAddAgentId("");
    setAddBps("");
  };

  // Add an agent to this merchant
  const handleAddAgent = async () => {
    if (!manageModal || !addAgentId) return;
    setSaving(true);
    try {
      await fetch(`/api/merchants/${manageModal}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addAgent: {
            agentId: addAgentId,
            bpsRate: addBps ? parseFloat(addBps) : null,
          },
        }),
      });
      // Refresh the local agent list
      const agentOption = agents.find((a) => a.id === addAgentId);
      setManageAgents((prev) => [...prev, { id: addAgentId, name: agentOption?.name || "", bpsRate: addBps ? parseFloat(addBps) : null }]);
      setAddAgentId("");
      setAddBps("");
      fetchMerchants();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Remove an agent from this merchant
  const handleRemoveAgent = async (agentId: string) => {
    if (!manageModal) return;
    setSaving(true);
    try {
      await fetch(`/api/merchants/${manageModal}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeAgent: { agentId } }),
      });
      setManageAgents((prev) => prev.filter((a) => a.id !== agentId));
      fetchMerchants();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === merchants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(merchants.map((m) => m.id)));
    }
  };

  const handleTagSelected = async () => {
    if (selectedIds.size === 0) return;
    let tagId = selectedTagId;

    if (selectedTagId === "new" && newTagName.trim()) {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim() }),
      });
      const newTag = await res.json();
      tagId = newTag.id;
    }

    if (tagId && tagId !== "new") {
      await fetch("/api/tags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: tagId, addMerchantIds: Array.from(selectedIds) }),
      });
    }

    setTagModal(false);
    setNewTagName("");
    setSelectedTagId("new");
    setSelectedIds(new Set());
    fetchMerchants();
    fetchTags();
  };

  // ── Bulk Operations ──────────────────────────────
  const handleBulkAssignAgent = async () => {
    if (selectedIds.size === 0 || !bulkAgentId) return;
    setBulkSaving(true);
    try {
      await fetch("/api/merchants/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assignAgent",
          merchantIds: Array.from(selectedIds),
          agentId: bulkAgentId,
          bpsRate: bulkBps ? parseFloat(bulkBps) : null,
        }),
      });
      setBulkAssignModal(false);
      setBulkAgentId("");
      setBulkBps("");
      setSelectedIds(new Set());
      fetchMerchants();
    } catch (err) {
      console.error(err);
    } finally {
      setBulkSaving(false);
    }
  };

  const handleBulkUpdateStatus = async () => {
    if (selectedIds.size === 0) return;
    setBulkSaving(true);
    try {
      await fetch("/api/merchants/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateStatus",
          merchantIds: Array.from(selectedIds),
          status: bulkStatus,
        }),
      });
      setBulkStatusModal(false);
      setSelectedIds(new Set());
      fetchMerchants();
    } catch (err) {
      console.error(err);
    } finally {
      setBulkSaving(false);
    }
  };

  const handleBulkSetHidden = async () => {
    if (selectedIds.size === 0) return;
    setBulkSaving(true);
    try {
      await fetch("/api/merchants/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setHidden",
          merchantIds: Array.from(selectedIds),
          hidden: bulkHidden,
        }),
      });
      setBulkHideModal(false);
      setSelectedIds(new Set());
      fetchMerchants();
    } catch (err) {
      console.error(err);
    } finally {
      setBulkSaving(false);
    }
  };

  const removeTag = async (tagId: string, merchantId: string) => {
    await fetch("/api/tags", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tagId, removeMerchantIds: [merchantId] }),
    });
    fetchMerchants();
    fetchTags();
  };

  const selectedVolume = merchants
    .filter((m) => selectedIds.has(m.id))
    .reduce((s, m) => s + (m.latestVolume ?? 0), 0);

  // Agents not yet assigned to the current merchant (for dropdown)
  const availableAgents = agents.filter(
    (a) => !manageAgents.some((ma) => ma.id === a.id)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#5B8C2A" }}>Merchants</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Manage your merchant portfolio across all processors
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>
            <input type="checkbox" checked={showHidden} onChange={() => setShowHidden(!showHidden)} className="rounded" />
            Show hidden
          </label>
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            <Store size={14} className="inline mr-1" />{merchants.length}
          </span>
        </div>
      </div>

      {/* Selection Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg mb-4 border"
          style={{ background: "var(--accent-bg)", borderColor: "rgba(91, 140, 42, 0.3)" }}>
          <span className="text-sm font-medium" style={{ color: "#5B8C2A" }}>
            {selectedIds.size} selected &middot; Volume: {formatCurrency(selectedVolume)}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setTagModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white cursor-pointer"
              style={{ background: "#5B8C2A" }}>
              <TagIcon size={12} /> Tag
            </button>
            <button onClick={() => setBulkAssignModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white cursor-pointer"
              style={{ background: "#5B8C2A" }}>
              <UserPlus size={12} /> Assign Agent
            </button>
            <button onClick={() => setBulkStatusModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
              Status
            </button>
            <button onClick={() => setBulkHideModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
              <EyeOff size={12} /> Hide/Show
            </button>
            <button onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded-lg text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Tag Filter Pills */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button onClick={() => setTagFilter("all")}
            className="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors"
            style={{
              background: tagFilter === "all" ? "#5B8C2A" : "var(--bg-secondary)",
              color: tagFilter === "all" ? "white" : "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}>
            All Merchants
          </button>
          {tags.map((tag) => (
            <button key={tag.id} onClick={() => setTagFilter(tagFilter === tag.id ? "all" : tag.id)}
              className="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors"
              style={{
                background: tagFilter === tag.id ? tag.color : "var(--bg-secondary)",
                color: tagFilter === tag.id ? "white" : "var(--text-secondary)",
                border: `1px solid ${tagFilter === tag.id ? tag.color : "var(--border)"}`,
              }}>
              {tag.name} ({tag.merchantCount}) &middot; {formatCurrency(tag.totalVolume)}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input type="text" placeholder="Search by name or MID..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
          <option value="all">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Closed">Closed</option>
        </select>
        <select value={processorFilter} onChange={(e) => setProcessorFilter(e.target.value)}
          className="px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
          <option value="all">All Processors</option>
          <option value="signapay">SignaPay</option>
          <option value="fiserv">Fiserv / Green Payments</option>
          <option value="tsys">TRNXN Company</option>
          <option value="maverick">Maverick</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--bg-tertiary)" }}>
              <th className="w-10 px-3 py-3">
                <input type="checkbox" checked={merchants.length > 0 && selectedIds.size === merchants.length}
                  onChange={toggleSelectAll} className="rounded cursor-pointer" />
              </th>
              {["DBA Name", "MID", "Processor", "Status", "Agents", "Volume", "Net", "Tags", ""].map((h) => (
                <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-3 py-3" style={{ color: "var(--text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="px-4 py-12 text-center text-sm animate-pulse" style={{ color: "var(--text-muted)" }}>Loading...</td></tr>
            ) : merchants.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>No merchants found. Upload residuals to get started.</td></tr>
            ) : (
              merchants.map((m) => (
                <tr key={m.id} className="border-t transition-colors group"
                  style={{ borderColor: "var(--border)", opacity: m.hidden ? 0.5 : 1 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleSelect(m.id)} className="rounded cursor-pointer" />
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/merchants/${m.id}`} className="text-sm font-medium hover:underline" style={{ color: "#5B8C2A" }}>{m.dba}</Link>
                    {m.hidden && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>HIDDEN</span>}
                  </td>
                  <td className="px-3 py-3 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{m.mid}</td>
                  <td className="px-3 py-3">
                    <span className="text-xs px-2 py-1 rounded-md" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                      {PROCESSOR_LABELS[m.processor as Processor] || m.processor}
                    </span>
                  </td>
                  <td className="px-3 py-3"><StatusBadge status={m.status} /></td>
                  {/* Agents column — show stacked agent pills */}
                  <td className="px-3 py-3">
                    {m.agents.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {m.agents.map((a) => (
                          <div key={a.id} className="flex items-center gap-1.5">
                            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                              {a.name}
                              {a.bpsRate != null && (
                                <span className="ml-1 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                                  ({a.bpsRate} BPS)
                                </span>
                              )}
                            </span>
                            <button onClick={async () => {
                                await fetch(`/api/merchants/${m.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ removeAgent: { agentId: a.id } }),
                                });
                                fetchMerchants();
                              }}
                              className="opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                              style={{ color: "#ef4444" }} title={`Remove ${a.name}`}>
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        <button onClick={() => openManageModal(m)}
                          className="text-[10px] cursor-pointer flex items-center gap-0.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: "#5B8C2A" }}>
                          <Plus size={10} /> Add
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => openManageModal(m)}
                        className="text-xs cursor-pointer flex items-center gap-1" style={{ color: "#5B8C2A" }}>
                        <UserPlus size={12} /> Assign
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                    {m.latestVolume != null ? formatCurrency(m.latestVolume) : "—"}
                  </td>
                  <td className="px-3 py-3 text-sm font-medium" style={{ color: "#5B8C2A" }}>
                    {m.latestNet != null ? formatCurrency(m.latestNet) : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {m.tags.map((tag) => (
                        <span key={tag.id} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full text-white" style={{ background: tag.color }}>
                          {tag.name}
                          <button onClick={() => removeTag(tag.id, m.id)} className="cursor-pointer hover:opacity-70"><X size={8} /></button>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleHide(m.id, m.hidden)}
                        className="p-1 rounded cursor-pointer transition-colors" style={{ color: "var(--text-muted)" }}
                        title={m.hidden ? "Show in reports" : "Hide from reports"}>
                        {m.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={() => openManageModal(m)}
                        className="p-1 rounded cursor-pointer transition-colors" style={{ color: "var(--text-muted)" }} title="Manage agents">
                        <UserPlus size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Manage Agents Modal */}
      {manageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl p-6 border" style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Manage Agents</h2>
              <button onClick={() => setManageModal(null)} className="cursor-pointer" style={{ color: "var(--text-muted)" }}><X size={20} /></button>
            </div>

            {/* Current Agents */}
            {manageAgents.length > 0 ? (
              <div className="space-y-2 mb-4">
                <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Assigned Agents</p>
                {manageAgents.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg border"
                    style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                    <div>
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{a.name}</span>
                      {a.bpsRate != null && (
                        <span className="ml-2 text-xs font-mono" style={{ color: "#5B8C2A" }}>{a.bpsRate} BPS</span>
                      )}
                      {a.bpsRate == null && (
                        <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>No BPS set</span>
                      )}
                    </div>
                    <button onClick={() => handleRemoveAgent(a.id)}
                      disabled={saving}
                      className="p-1 rounded cursor-pointer transition-colors hover:bg-red-500/10"
                      style={{ color: "#ef4444" }} title="Remove agent">
                      <UserMinus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 mb-4 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No agents assigned</p>
              </div>
            )}

            {/* Add Agent */}
            <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Add Agent</p>
              <div className="flex gap-2">
                <select value={addAgentId} onChange={(e) => setAddAgentId(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                  <option value="">Select agent...</option>
                  {availableAgents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <input type="number" step="0.01" placeholder="BPS" value={addBps}
                  onChange={(e) => setAddBps(e.target.value)}
                  className="w-24 px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                <button onClick={handleAddAgent}
                  disabled={!addAgentId || saving}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium text-white cursor-pointer disabled:opacity-50"
                  style={{ background: "#5B8C2A" }}>
                  <Plus size={14} />
                </button>
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                BPS = basis points. Agent earns volume &times; (BPS / 10,000). E.g. 30 BPS on $100k volume = $300.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tag Modal */}
      {tagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl p-6 border" style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Tag {selectedIds.size} Merchants</h2>
              <button onClick={() => setTagModal(false)} className="cursor-pointer" style={{ color: "var(--text-muted)" }}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>Choose or create a tag</label>
                <select value={selectedTagId} onChange={(e) => setSelectedTagId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                  <option value="new">+ Create New Tag</option>
                  {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              {selectedTagId === "new" && (
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>Tag Name</label>
                  <input type="text" placeholder="e.g. North Jersey, High Volume" value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
              )}
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Combined volume: <strong style={{ color: "var(--text-primary)" }}>{formatCurrency(selectedVolume)}</strong>
              </p>
              <button onClick={handleTagSelected}
                disabled={selectedTagId === "new" && !newTagName.trim()}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-white cursor-pointer disabled:opacity-50" style={{ background: "#5B8C2A" }}>
                <TagIcon size={14} className="inline mr-1.5" /> Apply Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Agent Modal */}
      {bulkAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl p-6 border" style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Assign Agent to {selectedIds.size} Merchants
              </h2>
              <button onClick={() => setBulkAssignModal(false)} className="cursor-pointer" style={{ color: "var(--text-muted)" }}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>Select Agent</label>
                <select value={bulkAgentId} onChange={(e) => setBulkAgentId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                  <option value="">Choose an agent...</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>BPS Rate</label>
                <input type="number" step="0.01" placeholder="e.g. 30" value={bulkBps}
                  onChange={(e) => setBulkBps(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                  Agent earns volume &times; (BPS / 10,000). Leave blank for no rate.
                </p>
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Combined volume: <strong style={{ color: "var(--text-primary)" }}>{formatCurrency(selectedVolume)}</strong>
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                If the agent is already assigned to a merchant, the BPS rate will be updated.
              </p>
              <button onClick={handleBulkAssignAgent}
                disabled={!bulkAgentId || bulkSaving}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-white cursor-pointer disabled:opacity-50"
                style={{ background: "#5B8C2A" }}>
                <UserPlus size={14} className="inline mr-1.5" />
                {bulkSaving ? "Assigning..." : "Assign Agent"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Status Modal */}
      {bulkStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl p-6 border" style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Update Status for {selectedIds.size} Merchants
              </h2>
              <button onClick={() => setBulkStatusModal(false)} className="cursor-pointer" style={{ color: "var(--text-muted)" }}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>New Status</label>
                <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <button onClick={handleBulkUpdateStatus}
                disabled={bulkSaving}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-white cursor-pointer disabled:opacity-50"
                style={{ background: "#5B8C2A" }}>
                {bulkSaving ? "Updating..." : "Update Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Hide/Show Modal */}
      {bulkHideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl p-6 border" style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Hide/Show {selectedIds.size} Merchants
              </h2>
              <button onClick={() => setBulkHideModal(false)} className="cursor-pointer" style={{ color: "var(--text-muted)" }}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>Visibility</label>
                <select value={bulkHidden ? "hide" : "show"}
                  onChange={(e) => setBulkHidden(e.target.value === "hide")}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                  <option value="hide">Hide from reports</option>
                  <option value="show">Show in reports</option>
                </select>
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Hidden merchants are excluded from agent commission reports but remain in company P&amp;L data.
              </p>
              <button onClick={handleBulkSetHidden}
                disabled={bulkSaving}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-white cursor-pointer disabled:opacity-50"
                style={{ background: "#5B8C2A" }}>
                {bulkSaving ? "Updating..." : bulkHidden ? "Hide Merchants" : "Show Merchants"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
