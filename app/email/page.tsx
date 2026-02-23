"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Mail,
  Send,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import type { SentEmailRecord, EmailTemplateRecord } from "@/lib/types";

type Tab = "Compose" | "Sent" | "Templates";

export default function EmailPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Compose");
  const [templates, setTemplates] = useState<EmailTemplateRecord[]>([]);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchTemplates = useCallback(() => {
    fetch("/api/email/templates")
      .then((r) => r.json())
      .then(setTemplates)
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: "#5B8C2A" }}
        >
          Email
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Send emails and manage templates
        </p>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
          style={{
            background:
              notification.type === "success"
                ? "rgba(91, 140, 42, 0.1)"
                : "rgba(239, 68, 68, 0.1)",
            color:
              notification.type === "success" ? "#5B8C2A" : "#ef4444",
            border: `1px solid ${notification.type === "success" ? "rgba(91, 140, 42, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
          }}
        >
          {notification.type === "success" ? (
            <CheckCircle size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span className="flex-1">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="cursor-pointer opacity-60 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tab Bar */}
      <div
        className="flex gap-1 mb-6 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        {(["Compose", "Sent", "Templates"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors"
            style={{
              color:
                activeTab === tab ? "#5B8C2A" : "var(--text-secondary)",
              borderBottom:
                activeTab === tab
                  ? "2px solid #5B8C2A"
                  : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "Compose" && (
        <ComposeTab
          templates={templates}
          onSuccess={() => showNotification("success", "Email sent successfully!")}
          onError={(msg) => showNotification("error", msg)}
        />
      )}
      {activeTab === "Sent" && <SentTab />}
      {activeTab === "Templates" && (
        <TemplatesTab
          templates={templates}
          onRefresh={fetchTemplates}
          onSuccess={(msg) => showNotification("success", msg)}
          onError={(msg) => showNotification("error", msg)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// COMPOSE TAB
// ──────────────────────────────────────────────
function ComposeTab({
  templates,
  onSuccess,
  onError,
}: {
  templates: EmailTemplateRecord[];
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [sending, setSending] = useState(false);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId) {
      const t = templates.find((t) => t.id === templateId);
      if (t) {
        setSubject(t.subject);
        setBody(t.body);
      }
    }
  };

  const handleSend = async () => {
    if (!to.trim()) {
      onError("Please enter a recipient email address");
      return;
    }
    if (!subject.trim()) {
      onError("Please enter a subject");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          cc: cc.trim() || undefined,
          subject: subject.trim(),
          body: body.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        onError(data.error || "Failed to send email");
        return;
      }

      // Clear form on success
      setTo("");
      setCc("");
      setSubject("");
      setBody("");
      setSelectedTemplateId("");
      onSuccess();
    } catch {
      onError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const inputStyle = {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
  };

  return (
    <div
      className="rounded-xl border p-6"
      style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center gap-2 mb-6">
        <Mail size={18} style={{ color: "#5B8C2A" }} />
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          New Email
        </h2>
      </div>

      <div className="space-y-4">
        {/* To */}
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            To <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com (separate multiple with commas)"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={inputStyle}
          />
        </div>

        {/* CC */}
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            CC{" "}
            <span
              className="font-normal"
              style={{ color: "var(--text-muted)" }}
            >
              (optional)
            </span>
          </label>
          <input
            type="text"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="cc@example.com"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={inputStyle}
          />
        </div>

        {/* Template Selector */}
        {templates.length > 0 && (
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Template
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
              style={inputStyle}
            >
              <option value="">— No template —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Subject */}
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Subject <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={inputStyle}
          />
        </div>

        {/* Body */}
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your email message here..."
            rows={12}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
            style={inputStyle}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={sending}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-white cursor-pointer disabled:opacity-50 transition-colors"
          style={{ background: "#5B8C2A" }}
        >
          <Send size={16} />
          {sending ? "Sending..." : "Send Email"}
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// SENT TAB
// ──────────────────────────────────────────────
function SentTab() {
  const [emails, setEmails] = useState<SentEmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 20;

  const fetchSent = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", page.toString());
    params.set("limit", limit.toString());

    fetch(`/api/email/sent?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setEmails(data.emails);
        setTotal(data.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, page]);

  useEffect(() => {
    fetchSent();
  }, [fetchSent]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.ceil(total / limit);
  const startIdx = (page - 1) * limit + 1;
  const endIdx = Math.min(page * limit, total);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div>
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          placeholder="Search by recipient or subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--border)" }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--bg-tertiary)" }}>
              {["To", "Subject", "Status", "Date", ""].map((h) => (
                <th
                  key={h}
                  className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3"
                  style={{ color: "var(--text-muted)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm animate-pulse"
                  style={{ color: "var(--text-muted)" }}
                >
                  Loading sent emails...
                </td>
              </tr>
            ) : emails.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  {search
                    ? "No emails match your search."
                    : "No emails sent yet."}
                </td>
              </tr>
            ) : (
              emails.map((email) => (
                <>
                  <tr
                    key={email.id}
                    className="border-t cursor-pointer transition-colors"
                    style={{ borderColor: "var(--border)" }}
                    onClick={() =>
                      setExpandedId(
                        expandedId === email.id ? null : email.id
                      )
                    }
                  >
                    <td
                      className="px-4 py-3 text-sm"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {email.to}
                    </td>
                    <td
                      className="px-4 py-3 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {email.subject}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-medium px-2 py-1 rounded-full"
                        style={{
                          background:
                            email.status === "sent"
                              ? "rgba(91, 140, 42, 0.1)"
                              : "rgba(239, 68, 68, 0.1)",
                          color:
                            email.status === "sent"
                              ? "#5B8C2A"
                              : "#ef4444",
                        }}
                      >
                        {email.status === "sent" ? "Sent" : "Failed"}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {formatDate(email.sentAt)}
                    </td>
                    <td className="px-4 py-3">
                      {expandedId === email.id ? (
                        <ChevronUp
                          size={14}
                          style={{ color: "var(--text-muted)" }}
                        />
                      ) : (
                        <ChevronDown
                          size={14}
                          style={{ color: "var(--text-muted)" }}
                        />
                      )}
                    </td>
                  </tr>
                  {expandedId === email.id && (
                    <tr
                      key={`${email.id}-expanded`}
                      style={{ background: "var(--bg-tertiary)" }}
                    >
                      <td colSpan={5} className="px-4 py-4">
                        {email.cc && (
                          <div className="mb-2">
                            <span
                              className="text-xs font-medium"
                              style={{
                                color: "var(--text-muted)",
                              }}
                            >
                              CC:{" "}
                            </span>
                            <span
                              className="text-xs"
                              style={{
                                color: "var(--text-secondary)",
                              }}
                            >
                              {email.cc}
                            </span>
                          </div>
                        )}
                        <pre
                          className="text-sm whitespace-pre-wrap font-sans"
                          style={{
                            color: "var(--text-secondary)",
                          }}
                        >
                          {email.body || "(no body)"}
                        </pre>
                        {email.errorMessage && (
                          <div
                            className="mt-3 text-xs px-3 py-2 rounded"
                            style={{
                              background: "rgba(239, 68, 68, 0.1)",
                              color: "#ef4444",
                            }}
                          >
                            Error: {email.errorMessage}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div
          className="flex items-center justify-between mt-4 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          <span>
            Showing {startIdx}–{endIdx} of {total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-40 text-xs"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-40 text-xs"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// TEMPLATES TAB
// ──────────────────────────────────────────────
function TemplatesTab({
  templates,
  onRefresh,
  onSuccess,
  onError,
}: {
  templates: EmailTemplateRecord[];
  onRefresh: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EmailTemplateRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<EmailTemplateRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");

  const openCreate = () => {
    setEditing(null);
    setFormName("");
    setFormSubject("");
    setFormBody("");
    setShowForm(true);
  };

  const openEdit = (t: EmailTemplateRecord) => {
    setEditing(t);
    setFormName(t.name);
    setFormSubject(t.subject);
    setFormBody(t.body);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formSubject.trim() || !formBody.trim()) {
      onError("All fields are required");
      return;
    }

    setSaving(true);
    try {
      const url = editing
        ? `/api/email/templates/${editing.id}`
        : "/api/email/templates";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          subject: formSubject.trim(),
          body: formBody.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        onError(data.error || "Failed to save template");
        return;
      }

      setShowForm(false);
      onRefresh();
      onSuccess(editing ? "Template updated" : "Template created");
    } catch {
      onError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/email/templates/${deleteConfirm.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        onError(data.error || "Failed to delete template");
        return;
      }

      setDeleteConfirm(null);
      onRefresh();
      onSuccess("Template deleted");
    } catch {
      onError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const inputStyle = {
    background: "var(--bg-primary)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span
          className="text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white cursor-pointer transition-colors"
          style={{ background: "#5B8C2A" }}
        >
          <Plus size={16} />
          New Template
        </button>
      </div>

      {/* Template Cards */}
      {templates.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl border"
          style={{
            borderColor: "var(--border)",
            background: "var(--bg-secondary)",
          }}
        >
          <FileText
            size={32}
            className="mx-auto mb-3 opacity-40"
            style={{ color: "var(--text-muted)" }}
          />
          <p
            className="text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            No templates yet. Create one to speed up your emails.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border p-4"
              style={{
                background: "var(--bg-secondary)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {t.name}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(t)}
                    className="p-1.5 rounded-lg cursor-pointer transition-colors hover:opacity-80"
                    style={{ color: "var(--text-muted)" }}
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(t)}
                    className="p-1.5 rounded-lg cursor-pointer transition-colors hover:opacity-80"
                    style={{ color: "#ef4444" }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p
                className="text-xs mb-2 line-clamp-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Subject: {t.subject}
              </p>
              <p
                className="text-xs line-clamp-2"
                style={{ color: "var(--text-muted)" }}
              >
                {t.body}
              </p>
              <p
                className="text-xs mt-3"
                style={{ color: "var(--text-muted)" }}
              >
                Updated {formatDate(t.updatedAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0, 0, 0, 0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForm(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-xl border p-6"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3
                className="text-base font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {editing ? "Edit Template" : "New Template"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="cursor-pointer"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Template Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Welcome Email"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Subject
                </label>
                <input
                  type="text"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="Email subject line"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Body
                </label>
                <textarea
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  placeholder="Email body text..."
                  rows={8}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                  style={inputStyle}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors"
                  style={{
                    background: "var(--bg-tertiary)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white cursor-pointer disabled:opacity-50 transition-colors"
                  style={{ background: "#5B8C2A" }}
                >
                  {saving
                    ? "Saving..."
                    : editing
                      ? "Update Template"
                      : "Create Template"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0, 0, 0, 0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteConfirm(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl border p-6"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border)",
            }}
          >
            <h3
              className="text-base font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Delete Template
            </h3>
            <p
              className="text-sm mb-5"
              style={{ color: "var(--text-secondary)" }}
            >
              Are you sure you want to delete{" "}
              <strong>{deleteConfirm.name}</strong>? This cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white cursor-pointer disabled:opacity-50"
                style={{ background: "#ef4444" }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
