"use client";

import { Scale, Upload } from "lucide-react";

export default function LegalPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#5B8C2A" }}>
          Legal
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Legal documents, compliance records, and regulatory filings
        </p>
      </div>

      <div
        className="rounded-xl p-12 text-center border"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <Scale size={40} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
        <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          Legal Documents
        </h2>
        <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "var(--text-muted)" }}>
          Upload and manage legal documents, compliance records, and regulatory filings.
        </p>
        <button
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white cursor-pointer"
          style={{ background: "#5B8C2A" }}
        >
          <Upload size={16} />
          Upload Document
        </button>
      </div>
    </div>
  );
}
