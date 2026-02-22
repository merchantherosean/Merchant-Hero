"use client";

import { GraduationCap, Upload } from "lucide-react";

export default function TrainingPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#5B8C2A" }}>
          Training
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Training guides, onboarding documents, and educational resources
        </p>
      </div>

      <div
        className="rounded-xl p-12 text-center border"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <GraduationCap size={40} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
        <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          Training Resources
        </h2>
        <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "var(--text-muted)" }}>
          Upload agent training manuals, onboarding guides, and educational materials.
        </p>
        <button
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white cursor-pointer"
          style={{ background: "#5B8C2A" }}
        >
          <Upload size={16} />
          Upload Resource
        </button>
      </div>
    </div>
  );
}
