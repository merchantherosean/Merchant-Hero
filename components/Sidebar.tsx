"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
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
  { href: "/users", label: "Agents", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme } = useTheme();

  return (
    <aside className="w-60 shrink-0 border-r flex flex-col" style={{ borderColor: "var(--border)", background: "var(--bg-sidebar)" }}>
      {/* Logo */}
      <div className="px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="block">
          <Image
            src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
            alt="Merchant Hero"
            width={180}
            height={90}
            className="w-full h-auto max-w-[180px]"
            priority
          />
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
                  ? "text-[#5B8C2A]"
                  : ""
              }`}
              style={{
                background: active ? "var(--accent-bg)" : "transparent",
                color: active ? "#5B8C2A" : "var(--text-secondary)",
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
