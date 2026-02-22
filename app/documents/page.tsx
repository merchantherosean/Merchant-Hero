"use client";

import { FolderOpen, FileText, Upload } from "lucide-react";

export default function DocumentsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#5B8C2A" }}>
          Documents
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Store and manage your documents
        </p>
      </div>

      <div
        className="rounded-xl p-12 text-center border"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <FolderOpen size={40} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
        <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          Document Storage
        </h2>
        <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "var(--text-muted)" }}>
          Upload and organize documents for your team. Store contracts, agreements, templates, and more.
        </p>
        <div className="flex items-center justify-center gap-4">
          <div
            className="flex items-center gap-3 p-4 rounded-lg border"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
          >
            <FileText size={20} style={{ color: "#5B8C2A" }} />
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Contracts
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Coming soon
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-3 p-4 rounded-lg border"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
          >
            <Upload size={20} style={{ color: "#5B8C2A" }} />
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Templates
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Coming soon
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
