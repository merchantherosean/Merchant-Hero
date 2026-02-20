"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  BarChart3,
  Target,
  FileText,
  DollarSign,
  Calendar,
  FolderOpen,
  Users,
  Settings,
} from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/merchants", label: "Merchants", icon: Store },
  { href: "/reporting", label: "Reporting", icon: BarChart3 },
  { href: "/leads", label: "Leads", icon: Target },
  { href: "/applications", label: "Applications", icon: FileText },
  { href: "/residuals", label: "Residuals", icon: DollarSign },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/users", label: "Users", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r flex flex-col" style={{ borderColor: "var(--border)", background: "var(--bg-sidebar)" }}>
      {/* Logo */}
      <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#7c6aef] flex items-center justify-center">
            <span className="text-white font-bold text-sm">MH</span>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Merchant Hero
            </h1>
            <p className="text-[10px] tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>
              Dashboard
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map((n) => {
          const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                active
                  ? "text-[#7c6aef]"
                  : ""
              }`}
              style={{
                background: active ? "var(--accent-bg)" : "transparent",
                color: active ? "#7c6aef" : "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "var(--bg-secondary)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              {n.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 text-xs border-t" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
        Merchant Hero v0.1
      </div>
    </aside>
  );
}
