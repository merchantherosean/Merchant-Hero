"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { useState } from "react";
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
  ChevronDown,
  FileSignature,
  Megaphone,
  GraduationCap,
  Scale,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  children?: { href: string; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }[];
}

const nav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/merchants", label: "Merchants", icon: Store },
  { href: "/reporting", label: "Reporting", icon: BarChart3 },
  { href: "/leads", label: "Leads", icon: Target },
  { href: "/applications", label: "Applications", icon: FileText },
  { href: "/residuals", label: "Residuals", icon: DollarSign },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  {
    href: "/documents",
    label: "Documents",
    icon: FolderOpen,
    children: [
      { href: "/documents/contracts", label: "Contracts", icon: FileSignature },
      { href: "/documents/marketing", label: "Marketing", icon: Megaphone },
      { href: "/documents/training", label: "Training", icon: GraduationCap },
      { href: "/documents/legal", label: "Legal", icon: Scale },
    ],
  },
  { href: "/users", label: "Agents", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    // Auto-open Documents dropdown if we're on a documents sub-page
    const initial: Record<string, boolean> = {};
    nav.forEach((n) => {
      if (n.children && typeof window !== "undefined" && window.location.pathname.startsWith(n.href)) {
        initial[n.href] = true;
      }
    });
    return initial;
  });

  const toggleMenu = (href: string) => {
    setOpenMenus((prev) => ({ ...prev, [href]: !prev[href] }));
  };

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
          const hasChildren = n.children && n.children.length > 0;
          const isOpen = openMenus[n.href] || false;

          return (
            <div key={n.href}>
              {hasChildren ? (
                <button
                  onClick={() => toggleMenu(n.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                    active ? "text-[#5B8C2A]" : ""
                  }`}
                  style={{
                    background: active && !isOpen ? "var(--accent-bg)" : "transparent",
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
                  <span className="flex-1 text-left">{n.label}</span>
                  <ChevronDown
                    size={14}
                    className="transition-transform"
                    style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  />
                </button>
              ) : (
                <Link
                  href={n.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                    active ? "text-[#5B8C2A]" : ""
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
              )}

              {/* Sub-items dropdown */}
              {hasChildren && isOpen && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l pl-2" style={{ borderColor: "var(--border)" }}>
                  {n.children!.map((child) => {
                    const childActive = pathname === child.href;
                    const ChildIcon = child.icon;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-colors ${
                          childActive ? "text-[#5B8C2A]" : ""
                        }`}
                        style={{
                          background: childActive ? "var(--accent-bg)" : "transparent",
                          color: childActive ? "#5B8C2A" : "var(--text-secondary)",
                        }}
                        onMouseEnter={(e) => {
                          if (!childActive) {
                            e.currentTarget.style.background = "var(--bg-secondary)";
                            e.currentTarget.style.color = "var(--text-primary)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!childActive) {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "var(--text-secondary)";
                          }
                        }}
                      >
                        <ChildIcon size={15} strokeWidth={childActive ? 2.2 : 1.8} />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
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
