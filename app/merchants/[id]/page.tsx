"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Store, Plus, Pencil, Trash2, X, Check, StickyNote } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency, formatMonthYear } from "@/lib/formatters";
import { PROCESSOR_LABELS, type Processor } from "@/lib/types";

interface AgentInfo {
  id: string;
  name: string;
  bpsRate: number | null;
}

interface MerchantNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface MerchantDetail {
  id: string;
  mid: string;
  dba: string;
  processor: string;
  status: string;
  agents: AgentInfo[];
  mcc?: string;
  approvalDate?: string;
  riskLevel?: string;
  createdAt: string;
  residuals: {
    year: number;
    month: number;
    volume: number;
    income: number;
    netCommission: number;
    transactions: number;
  }[];
}

export default function MerchantDetailPage() {
  const params = useParams();
  const [merchant, setMerchant] = useState<MerchantDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Notes state
  const [notes, setNotes] = useState<MerchantNote[]>([]);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/merchants/${params.id}`)
      .then((r) => r.json())
      .then(setMerchant)
      .catch(console.error)
      .finally(() => setLoading(false));

    fetch(`/api/merchants/${params.id}/notes`)
      .then((r) => r.json())
      .then(setNotes)
      .catch(console.error);
  }, [params.id]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/merchants/${params.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote.trim() }),
      });
      if (res.ok) {
        const note = await res.json();
        setNotes((prev) => [note, ...prev]);
        setNewNote("");
        setShowAddNote(false);
      }
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleEditNote = async (noteId: string) => {
    if (!editContent.trim()) return;
    try {
      const res = await fetch(`/api/merchants/${params.id}/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
        setEditingNoteId(null);
      }
    } catch (err) {
      console.error("Failed to edit note:", err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/merchants/${params.id}/notes/${noteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        setDeleteConfirmId(null);
      }
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  if (loading) {
    return (
      <div className="text-sm animate-pulse" style={{ color: "var(--text-muted)" }}>
        Loading merchant details...
      </div>
    );
  }

  if (!merchant) {
    return (
      <div>
        <Link href="/merchants" className="text-sm hover:underline" style={{ color: "#5B8C2A" }}>
          &larr; Back to Merchants
        </Link>
        <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
          Merchant not found.
        </p>
      </div>
    );
  }

  const maxVolume = Math.max(...(merchant.residuals.map((r) => r.volume) || [1]), 1);

  return (
    <div>
      <Link
        href="/merchants"
        className="inline-flex items-center gap-1.5 text-sm mb-6 hover:underline"
        style={{ color: "#5B8C2A" }}
      >
        <ArrowLeft size={14} />
        Back to Merchants
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent-bg)" }}
          >
            <Store size={24} style={{ color: "#5B8C2A" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#5B8C2A" }}>
              {merchant.dba}
            </h1>
            <p className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>
              MID: {merchant.mid}
            </p>
          </div>
        </div>
        <StatusBadge status={merchant.status} />
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Processor", value: PROCESSOR_LABELS[merchant.processor as Processor] || merchant.processor },
          { label: "MCC", value: merchant.mcc || "—" },
          { label: "Risk Level", value: merchant.riskLevel || "—" },
          { label: "Agents", value: merchant.agents.length > 0 ? `${merchant.agents.length} assigned` : "Unassigned" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl p-4 border"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
          >
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
              {item.label}
            </p>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Agent Assignments */}
      {merchant.agents.length > 0 && (
        <div
          className="rounded-xl p-6 border mb-8"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Agent Assignments
          </h2>
          <div className="space-y-2">
            {merchant.agents.map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <Link href={`/users/${a.id}`} className="text-sm hover:underline" style={{ color: "#5B8C2A" }}>
                  {a.name}
                </Link>
                <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                  {a.bpsRate != null ? `${a.bpsRate} BPS` : "No BPS set"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div
        className="rounded-xl p-6 border mb-8"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <StickyNote size={16} style={{ color: "#5B8C2A" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Notes
            </h2>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              ({notes.length})
            </span>
          </div>
          {!showAddNote && (
            <button
              onClick={() => setShowAddNote(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white cursor-pointer transition-colors"
              style={{ background: "#5B8C2A" }}
            >
              <Plus size={14} />
              Add Note
            </button>
          )}
        </div>

        {/* Add Note Form */}
        {showAddNote && (
          <div className="mb-4">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Write a note..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none mb-2"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowAddNote(false);
                  setNewNote("");
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                disabled={savingNote || !newNote.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white cursor-pointer disabled:opacity-50"
                style={{ background: "#5B8C2A" }}
              >
                <Check size={12} />
                {savingNote ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>
        )}

        {/* Notes List */}
        {notes.length === 0 && !showAddNote ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No notes yet. Add one to keep track of important details.
          </p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-lg p-3"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                }}
              >
                {editingNoteId === note.id ? (
                  /* Edit Mode */
                  <div>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none mb-2"
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                        color: "var(--text-primary)",
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingNoteId(null)}
                        className="px-2.5 py-1 rounded text-xs cursor-pointer"
                        style={{
                          background: "var(--bg-tertiary)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleEditNote(note.id)}
                        disabled={!editContent.trim()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-white cursor-pointer disabled:opacity-50"
                        style={{ background: "#5B8C2A" }}
                      >
                        <Check size={10} />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div>
                    <pre
                      className="text-sm whitespace-pre-wrap font-sans mb-2"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {note.content}
                    </pre>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {new Date(note.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {note.updatedAt !== note.createdAt && " (edited)"}
                      </span>
                      <div className="flex items-center gap-1">
                        {deleteConfirmId === note.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                              Delete?
                            </span>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="p-1 rounded cursor-pointer"
                              style={{ color: "var(--text-muted)" }}
                            >
                              <X size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1 rounded cursor-pointer"
                              style={{ color: "#ef4444" }}
                            >
                              <Check size={12} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditContent(note.content);
                              }}
                              className="p-1 rounded cursor-pointer transition-opacity hover:opacity-70"
                              style={{ color: "var(--text-muted)" }}
                              title="Edit"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(note.id)}
                              className="p-1 rounded cursor-pointer transition-opacity hover:opacity-70"
                              style={{ color: "#ef4444" }}
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Volume Chart */}
      {merchant.residuals.length > 0 && (
        <div
          className="rounded-xl p-6 border mb-8"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Monthly Volume
          </h2>
          <div className="flex items-end gap-2 h-40">
            {merchant.residuals
              .sort((a, b) => a.year - b.year || a.month - b.month)
              .map((r, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {formatCurrency(r.volume)}
                  </span>
                  <div
                    className="w-full rounded-t-md min-h-[4px] transition-all"
                    style={{
                      height: `${(r.volume / maxVolume) * 100}%`,
                      background: "#5B8C2A",
                    }}
                  />
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {r.month}/{r.year.toString().slice(2)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Residual History Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="px-4 py-3" style={{ background: "var(--bg-tertiary)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Residual History
          </h2>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--bg-tertiary)" }}>
              {["Period", "Volume", "Income", "Net Commission", "Transactions"].map((h) => (
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
            {merchant.residuals.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  No residual data yet.
                </td>
              </tr>
            ) : (
              merchant.residuals
                .sort((a, b) => b.year - a.year || b.month - a.month)
                .map((r, i) => (
                  <tr
                    key={i}
                    className="border-t"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                      {formatMonthYear(r.month, r.year)}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                      {formatCurrency(r.volume)}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                      {formatCurrency(r.income)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "#5B8C2A" }}>
                      {formatCurrency(r.netCommission)}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {r.transactions}
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
