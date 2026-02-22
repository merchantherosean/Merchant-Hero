"use client";

import { Megaphone, Upload } from "lucide-react";

export default function MarketingPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#5B8C2A" }}>
          Marketing
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Marketing materials, brochures, and promotional content
        </p>
      </div>

      <div
        className="rounded-xl p-12 text-center border"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <Megaphone size={40} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
        <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          Marketing Materials
        </h2>
        <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "var(--text-muted)" }}>
          Upload and manage marketing collateral, sales brochures, and promotional documents.
        </p>
        <button
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white cursor-pointer"
          style={{ background: "#5B8C2A" }}
        >
          <Upload size={16} />
          Upload Material
        </button>
      </div>
    </div>
  );
}
