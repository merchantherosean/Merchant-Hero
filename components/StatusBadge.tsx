"use client";

interface StatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  Active: { bg: "rgba(91, 140, 42, 0.1)", text: "#5B8C2A", dot: "#5B8C2A" },
  Live: { bg: "rgba(91, 140, 42, 0.1)", text: "#5B8C2A", dot: "#5B8C2A" },
  Inactive: { bg: "rgba(251, 191, 36, 0.1)", text: "#fbbf24", dot: "#fbbf24" },
  Closed: { bg: "rgba(239, 68, 68, 0.1)", text: "#ef4444", dot: "#ef4444" },
  New: { bg: "rgba(96, 165, 250, 0.1)", text: "#60a5fa", dot: "#60a5fa" },
  Contacted: { bg: "rgba(91, 140, 42, 0.1)", text: "#5B8C2A", dot: "#5B8C2A" },
  Qualified: { bg: "rgba(251, 191, 36, 0.1)", text: "#fbbf24", dot: "#fbbf24" },
  Converted: { bg: "rgba(91, 140, 42, 0.1)", text: "#5B8C2A", dot: "#5B8C2A" },
  Lost: { bg: "rgba(239, 68, 68, 0.1)", text: "#ef4444", dot: "#ef4444" },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] || { bg: "var(--bg-tertiary)", text: "var(--text-muted)", dot: "var(--text-muted)" };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: style.bg, color: style.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: style.dot }}
      />
      {status}
    </span>
  );
}
