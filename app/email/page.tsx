"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Mail,
  Inbox,
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
  RefreshCw,
  User,
  Paperclip,
  BookUser,
} from "lucide-react";
import type { SentEmailRecord, EmailTemplateRecord } from "@/lib/types";

interface InboxEmail {
  uid: number;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
  seen: boolean;
}

interface AgentContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
}

type Tab = "Inbox" | "Compose" | "Sent" | "Templates" | "Contacts";

// ──────────────────────────────────────────────
// PAGE (Suspense wrapper for useSearchParams)
// ──────────────────────────────────────────────
export default function EmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div
            className="text-sm animate-pulse"
            style={{ color: "var(--text-muted)" }}
          >
            Loading email...
          </div>
        </div>
      }
    >
      <EmailPageContent />
    </Suspense>
  );
}

// ──────────────────────────────────────────────
// PAGE CONTENT (main layout + tab management)
// ──────────────────────────────────────────────
function EmailPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("Inbox");
  const [templates, setTemplates] = useState<EmailTemplateRecord[]>([]);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Prefill state for Compose tab (from URL params or Contacts)
  const [prefillTo, setPrefillTo] = useState("");
  const [prefillSubject, setPrefillSubject] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<{
    base64: string;
    fileName: string;
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

  // Read URL params + sessionStorage on mount (from "Email Report" flow)
  useEffect(() => {
    const tab = searchParams.get("tab");
    const to = searchParams.get("to");
    const subject = searchParams.get("subject");

    if (tab === "Compose") setActiveTab("Compose");
    if (to) setPrefillTo(to);
    if (subject) setPrefillSubject(subject);

    // Read pending PDF attachment from sessionStorage
    try {
      const stored = sessionStorage.getItem("pendingEmailAttachment");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.base64 && parsed.fileName) {
          setPendingAttachment(parsed);
        }
        sessionStorage.removeItem("pendingEmailAttachment");
      }
    } catch {
      // Ignore parse errors
    }

    // Clean URL params after reading
    if (tab || to || subject) {
      router.replace("/email");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler for ContactsTab → compose to an agent
  const handleComposeTo = (email: string) => {
    setPrefillTo(email);
    setPrefillSubject("");
    setPendingAttachment(null);
    setActiveTab("Compose");
  };

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
        {(["Inbox", "Compose", "Sent", "Templates", "Contacts"] as Tab[]).map(
          (tab) => (
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
          )
        )}
      </div>

      {/* Tab Content */}
      {activeTab === "Inbox" && <InboxTab />}
      {activeTab === "Compose" && (
        <ComposeTab
          templates={templates}
          initialTo={prefillTo}
          initialSubject={prefillSubject}
          initialAttachment={pendingAttachment}
          onSuccess={() => {
            showNotification("success", "Email sent successfully!");
            setPrefillTo("");
            setPrefillSubject("");
            setPendingAttachment(null);
          }}
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
      {activeTab === "Contacts" && <ContactsTab onCompose={handleComposeTo} />}
    </div>
  );
}

// ──────────────────────────────────────────────
// INBOX TAB
// ──────────────────────────────────────────────
function InboxTab() {
  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedUid, setExpandedUid] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteConfirmUid, setDeleteConfirmUid] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const limit = 25;

  const fetchInbox = useCallback(
    (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      fetch(`/api/email/inbox?page=${page}&limit=${limit}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            console.error("Inbox error:", data.error);
            setEmails([]);
            setTotal(0);
          } else {
            setEmails(data.emails || []);
            setTotal(data.total || 0);
          }
        })
        .catch(console.error)
        .finally(() => {
          setLoading(false);
          setRefreshing(false);
        });
    },
    [page]
  );

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

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

  const extractName = (from: string) => {
    // "John Doe <john@example.com>" → "John Doe"
    const match = from.match(/^(.+?)\s*<.*>$/);
    return match ? match[1].trim() : from;
  };

  const handleDelete = async (uid: number) => {
    setDeleting(true);
    try {
      const res = await fetch("/api/email/inbox", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uids: [uid] }),
      });
      if (res.ok) {
        // Remove from local state immediately
        setEmails((prev) => prev.filter((e) => e.uid !== uid));
        setTotal((prev) => prev - 1);
        setDeleteConfirmUid(null);
        setExpandedUid(null);
      }
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {/* Header with refresh */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          {total > 0 ? `${total} messages` : ""}
        </span>
        <button
          onClick={() => fetchInbox(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors disabled:opacity-50"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Email List */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--border)" }}
      >
        {loading ? (
          <div
            className="px-4 py-12 text-center text-sm animate-pulse"
            style={{ color: "var(--text-muted)" }}
          >
            Connecting to inbox...
          </div>
        ) : emails.length === 0 ? (
          <div
            className="px-4 py-12 text-center"
            style={{ color: "var(--text-muted)" }}
          >
            <Inbox size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No emails in inbox.</p>
          </div>
        ) : (
          <div>
            {emails.map((email, i) => (
              <div key={email.uid}>
                <div
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
                  style={{
                    borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                    background:
                      expandedUid === email.uid
                        ? "var(--bg-tertiary)"
                        : !email.seen
                          ? "var(--bg-secondary)"
                          : "transparent",
                  }}
                  onClick={() =>
                    setExpandedUid(expandedUid === email.uid ? null : email.uid)
                  }
                >
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: "rgba(91, 140, 42, 0.1)",
                      color: "#5B8C2A",
                    }}
                  >
                    <User size={14} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-sm truncate"
                        style={{
                          color: "var(--text-primary)",
                          fontWeight: email.seen ? "normal" : "600",
                        }}
                      >
                        {extractName(email.from)}
                      </span>
                      <span
                        className="text-xs flex-shrink-0"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {formatDate(email.date)}
                      </span>
                    </div>
                    <p
                      className="text-sm truncate"
                      style={{
                        color: "var(--text-secondary)",
                        fontWeight: email.seen ? "normal" : "500",
                      }}
                    >
                      {email.subject}
                    </p>
                    {!expandedUid || expandedUid !== email.uid ? (
                      <p
                        className="text-xs truncate mt-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {email.body.slice(0, 120)}
                        {email.body.length > 120 ? "..." : ""}
                      </p>
                    ) : null}
                  </div>

                  {/* Expand indicator */}
                  <div className="flex-shrink-0 mt-1">
                    {expandedUid === email.uid ? (
                      <ChevronUp size={14} style={{ color: "var(--text-muted)" }} />
                    ) : (
                      <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
                    )}
                  </div>
                </div>

                {/* Expanded View */}
                {expandedUid === email.uid && (
                  <div
                    className="px-4 pb-4 pt-1"
                    style={{ background: "var(--bg-tertiary)" }}
                  >
                    <div className="ml-11">
                      <div className="mb-3 space-y-1">
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          <span className="font-medium">From: </span>
                          <span style={{ color: "var(--text-secondary)" }}>
                            {email.from}
                          </span>
                        </div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          <span className="font-medium">To: </span>
                          <span style={{ color: "var(--text-secondary)" }}>
                            {email.to}
                          </span>
                        </div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          <span className="font-medium">Date: </span>
                          <span style={{ color: "var(--text-secondary)" }}>
                            {formatDate(email.date)}
                          </span>
                        </div>
                      </div>
                      <div
                        className="rounded-lg p-3 text-sm"
                        style={{
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <pre
                          className="whitespace-pre-wrap font-sans"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {email.body || "(no content)"}
                        </pre>
                      </div>

                      {/* Delete Button */}
                      <div className="mt-3 flex justify-end">
                        {deleteConfirmUid === email.uid ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs"
                              style={{ color: "var(--text-muted)" }}
                            >
                              Delete this email?
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmUid(null);
                              }}
                              className="px-2.5 py-1 rounded text-xs cursor-pointer"
                              style={{
                                background: "var(--bg-secondary)",
                                border: "1px solid var(--border)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(email.uid);
                              }}
                              disabled={deleting}
                              className="px-2.5 py-1 rounded text-xs font-medium text-white cursor-pointer disabled:opacity-50"
                              style={{ background: "#ef4444" }}
                            >
                              {deleting ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmUid(email.uid);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs cursor-pointer transition-colors hover:opacity-80"
                            style={{ color: "#ef4444" }}
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
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
// COMPOSE TAB
// ──────────────────────────────────────────────
function ComposeTab({
  templates,
  initialTo,
  initialSubject,
  initialAttachment,
  onSuccess,
  onError,
}: {
  templates: EmailTemplateRecord[];
  initialTo?: string;
  initialSubject?: string;
  initialAttachment?: { base64: string; fileName: string } | null;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [to, setTo] = useState(initialTo || "");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(initialSubject || "");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<
    { base64: string; fileName: string }[]
  >(initialAttachment ? [initialAttachment] : []);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync when prefill props change (e.g. Contacts → Compose)
  useEffect(() => {
    if (initialTo !== undefined) setTo(initialTo);
  }, [initialTo]);

  useEffect(() => {
    if (initialSubject !== undefined) setSubject(initialSubject);
  }, [initialSubject]);

  useEffect(() => {
    setAttachments(initialAttachment ? [initialAttachment] : []);
  }, [initialAttachment]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      // 10MB limit per file
      if (file.size > 10 * 1024 * 1024) {
        onError(`File "${file.name}" is too large (max 10MB)`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        setAttachments((prev) => [...prev, { base64, fileName: file.name }]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const toAddresses = to.split(",").map((e) => e.trim()).filter(Boolean);
    for (const addr of toAddresses) {
      if (!emailRegex.test(addr)) {
        onError(`Invalid email address: "${addr}"`);
        return;
      }
    }

    if (!subject.trim()) {
      onError("Please enter a subject");
      return;
    }

    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        to: to.trim(),
        cc: cc.trim() || undefined,
        subject: subject.trim(),
        body: body.trim(),
      };

      // Include attachments in payload if present
      if (attachments.length > 0) {
        payload.attachments = attachments.map((a) => ({
          filename: a.fileName,
          content: a.base64,
          encoding: "base64",
        }));
      }

      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      setAttachments([]);
      setSelectedTemplateId("");
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      onError(`Failed to send: ${message}. Try a smaller attachment.`);
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

        {/* Attachments */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors"
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            <Paperclip size={14} />
            Attach Files
          </button>

          {attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {attachments.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                  style={{
                    background: "rgba(91, 140, 42, 0.08)",
                    border: "1px solid rgba(91, 140, 42, 0.2)",
                  }}
                >
                  <Paperclip size={14} style={{ color: "#5B8C2A" }} />
                  <span
                    className="text-sm flex-1 truncate font-medium"
                    style={{ color: "#5B8C2A" }}
                  >
                    {a.fileName}
                  </span>
                  <button
                    onClick={() => removeAttachment(i)}
                    className="cursor-pointer p-0.5 rounded hover:opacity-70 transition-opacity"
                    style={{ color: "#5B8C2A" }}
                    title="Remove attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={sending}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-white cursor-pointer disabled:opacity-50 transition-colors"
          style={{ background: "#5B8C2A" }}
        >
          <Send size={16} />
          {sending
            ? "Sending..."
            : attachments.length > 0
              ? `Send Email with ${attachments.length} Attachment${attachments.length > 1 ? "s" : ""}`
              : "Send Email"}
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

// ──────────────────────────────────────────────
// CONTACTS TAB (Address Book)
// ──────────────────────────────────────────────
function ContactsTab({ onCompose }: { onCompose: (email: string) => void }) {
  const [agents, setAgents] = useState<AgentContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data: AgentContact[]) => {
        setAgents(
          data.map((a) => ({
            id: a.id,
            name: a.name,
            email: a.email || null,
            phone: a.phone || null,
            status: a.status || "active",
          }))
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.email && a.email.toLowerCase().includes(search.toLowerCase())) ||
      (a.phone && a.phone.includes(search))
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookUser size={16} style={{ color: "#5B8C2A" }} />
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Agent Contacts
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            ({agents.length})
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
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
              {["Agent", "Email", "Phone", "Status", ""].map((h) => (
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
                  Loading contacts...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  {search
                    ? "No contacts match your search."
                    : "No agents found."}
                </td>
              </tr>
            ) : (
              filtered.map((agent) => (
                <tr
                  key={agent.id}
                  className="border-t transition-colors"
                  style={{ borderColor: "var(--border)" }}
                >
                  {/* Name with avatar */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold"
                        style={{
                          background: "rgba(91, 140, 42, 0.1)",
                          color: "#5B8C2A",
                        }}
                      >
                        {getInitials(agent.name)}
                      </div>
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {agent.name}
                      </span>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3">
                    {agent.email ? (
                      <span
                        className="text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {agent.email}
                      </span>
                    ) : (
                      <span
                        className="text-xs italic"
                        style={{ color: "var(--text-muted)" }}
                      >
                        No email
                      </span>
                    )}
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-3">
                    {agent.phone ? (
                      <span
                        className="text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {agent.phone}
                      </span>
                    ) : (
                      <span
                        className="text-xs italic"
                        style={{ color: "var(--text-muted)" }}
                      >
                        —
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-medium px-2 py-1 rounded-full"
                      style={{
                        background:
                          agent.status === "active"
                            ? "rgba(91, 140, 42, 0.1)"
                            : "rgba(239, 68, 68, 0.1)",
                        color:
                          agent.status === "active"
                            ? "#5B8C2A"
                            : "#ef4444",
                      }}
                    >
                      {agent.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>

                  {/* Compose button */}
                  <td className="px-4 py-3">
                    {agent.email ? (
                      <button
                        onClick={() => onCompose(agent.email!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors hover:opacity-80"
                        style={{
                          background: "rgba(91, 140, 42, 0.1)",
                          color: "#5B8C2A",
                        }}
                      >
                        <Mail size={12} />
                        Compose
                      </button>
                    ) : (
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        No email
                      </span>
                    )}
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
