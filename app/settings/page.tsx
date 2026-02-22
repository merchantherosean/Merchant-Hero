"use client";

import { useTheme } from "@/components/ThemeProvider";
import { Settings, Moon, Sun, Building2 } from "lucide-react";

export default function SettingsPage() {
  const { theme, toggle } = useTheme();

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          Settings
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Customize your dashboard experience
        </p>
      </div>

      {/* Appearance */}
      <div
        className="rounded-xl p-6 border mb-6"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
          Appearance
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Theme
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Switch between dark and light mode
            </p>
          </div>
          <button
            onClick={toggle}
            className="relative w-14 h-7 rounded-full transition-colors cursor-pointer"
            style={{ background: theme === "dark" ? "#5B8C2A" : "var(--border)" }}
          >
            <div
              className="absolute top-0.5 w-6 h-6 rounded-full transition-transform flex items-center justify-center"
              style={{
                background: "var(--bg-primary)",
                transform: theme === "dark" ? "translateX(30px)" : "translateX(2px)",
              }}
            >
              {theme === "dark" ? (
                <Moon size={12} style={{ color: "#5B8C2A" }} />
              ) : (
                <Sun size={12} style={{ color: "var(--text-secondary)" }} />
              )}
            </div>
          </button>
        </div>

        {/* Theme preview */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => theme !== "dark" && toggle()}
            className="p-4 rounded-lg border-2 transition-colors text-left"
            style={{
              background: "#0f0f0f",
              borderColor: theme === "dark" ? "#5B8C2A" : "#2a2a2a",
            }}
          >
            <div className="w-full h-2 rounded bg-[#1a1a1a] mb-2" />
            <div className="w-3/4 h-2 rounded bg-[#242424] mb-2" />
            <div className="w-1/2 h-2 rounded bg-[#2a2a2a]" />
            <p className="text-xs mt-3 text-[#888]">Dark Mode</p>
          </button>
          <button
            onClick={() => theme !== "light" && toggle()}
            className="p-4 rounded-lg border-2 transition-colors text-left"
            style={{
              background: "#ffffff",
              borderColor: theme === "light" ? "#5B8C2A" : "#e0e0e0",
            }}
          >
            <div className="w-full h-2 rounded bg-[#f5f5f5] mb-2" />
            <div className="w-3/4 h-2 rounded bg-[#e8e8e8] mb-2" />
            <div className="w-1/2 h-2 rounded bg-[#e0e0e0]" />
            <p className="text-xs mt-3 text-[#666]">Light Mode</p>
          </button>
        </div>
      </div>

      {/* Company Info */}
      <div
        className="rounded-xl p-6 border mb-6"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Building2 size={16} />
          Company Information
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
              Company Name
            </label>
            <input
              type="text"
              defaultValue="Merchant Hero"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </div>
      </div>

      {/* About */}
      <div
        className="rounded-xl p-6 border"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Settings size={16} />
          About
        </h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Version</span>
            <span className="text-sm" style={{ color: "var(--text-primary)" }}>0.1.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Processors</span>
            <span className="text-sm" style={{ color: "var(--text-primary)" }}>SignaPay, Fiserv, TRNXN, Maverick</span>
          </div>
        </div>
      </div>
    </div>
  );
}
