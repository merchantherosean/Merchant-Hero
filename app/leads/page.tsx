"use client";

import { useEffect, useState } from "react";
import { Target, Plus, Search, X } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { LEAD_STATUSES, PRIORITY_OPTIONS } from "@/lib/types";

interface Lead {
  id: string;
  businessName: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  location?: string;
  industry?: string;
  confidenceScore: number;
  source?: string;
  followUpPriority: string;
  notes?: string;
  status: string;
  createdAt: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchLeads = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    fetch(`/api/leads?${params}`)
      .then((r) => r.json())
      .then(setLeads)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLeads();
  }, [search, statusFilter]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      businessName: form.get("businessName"),
      ownerName: form.get("ownerName"),
      email: form.get("email"),
      phone: form.get("phone"),
      location: form.get("location"),
      industry: form.get("industry"),
      source: form.get("source"),
      followUpPriority: form.get("followUpPriority"),
      notes: form.get("notes"),
      confidenceScore: parseInt(form.get("confidenceScore") as string) || 5,
    };
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setShowForm(false);
    fetchLeads();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/leads", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchLeads();
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "HIGH": return "#ef4444";
      case "MEDIUM": return "#fbbf24";
      case "LOW": return "#5B8C2A";
      default: return "var(--text-muted)";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#5B8C2A" }}>
            Leads
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Track and manage prospective merchants
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white cursor-pointer"
          style={{ background: "#5B8C2A" }}
        >
          <Plus size={16} />
          Add Lead
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          <option value="all">All Status</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Lead Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-lg rounded-xl p-6 border"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Add New Lead</h2>
              <button onClick={() => setShowForm(false)} className="cursor-pointer" style={{ color: "var(--text-muted)" }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              {[
                { name: "businessName", label: "Business Name", required: true },
                { name: "ownerName", label: "Owner Name" },
                { name: "email", label: "Email" },
                { name: "phone", label: "Phone" },
                { name: "location", label: "Location" },
                { name: "industry", label: "Industry" },
                { name: "source", label: "Source" },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>{field.label}</label>
                  <input
                    name={field.name}
                    required={field.required}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Priority</label>
                  <select
                    name="followUpPriority"
                    defaultValue="MEDIUM"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Confidence (1-10)</label>
                  <input
                    name="confidenceScore"
                    type="number"
                    min={1}
                    max={10}
                    defaultValue={5}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg text-sm font-medium text-white cursor-pointer"
                style={{ background: "#5B8C2A" }}
              >
                Create Lead
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--bg-tertiary)" }}>
              {["Business", "Owner", "Location", "Industry", "Priority", "Status", "Score"].map((h) => (
                <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3" style={{ color: "var(--text-muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm animate-pulse" style={{ color: "var(--text-muted)" }}>Loading...</td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  No leads yet. Click &quot;Add Lead&quot; to get started.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--text-primary)" }}>{lead.businessName}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{lead.ownerName || "—"}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{lead.location || "—"}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{lead.industry || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium" style={{ color: priorityColor(lead.followUpPriority) }}>
                      {lead.followUpPriority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      onChange={(e) => updateStatus(lead.id, e.target.value)}
                      className="text-xs px-2 py-1 rounded-md outline-none cursor-pointer"
                      style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                    >
                      {LEAD_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: "#5B8C2A" }}>
                    {lead.confidenceScore}/10
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
