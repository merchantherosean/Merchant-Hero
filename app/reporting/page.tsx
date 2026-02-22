"use client";

import { useEffect, useState, useCallback } from "react";
import { BarChart3, FileText } from "lucide-react";
import { formatCurrency, formatCurrencyCompact, formatNumber } from "@/lib/formatters";
import { PROCESSOR_LABELS, MONTHS, type Processor } from "@/lib/types";

interface ReportData {
  processorBreakdown: {
    processor: string;
    label: string;
    merchantCount: number;
    volume: number;
    net: number;
  }[];
  topAgents: {
    id: string;
    name: string;
    merchantCount: number;
    totalVolume: number;
    totalEarnings: number;
  }[];
  topMerchants: {
    id: string;
    dba: string;
    processor: string;
    volume: number;
    net: number;
  }[];
  selectedYear: number | null;
  selectedMonth: number | null;
}

export default function ReportingPage() {
  const currentDate = new Date();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [initialized, setInitialized] = useState(false);
  const [generatingPnl, setGeneratingPnl] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  const handleGeneratePnl = async () => {
    setGeneratingPnl(true);
    try {
      const res = await fetch(`/api/reports/pnl?year=${selectedYear}&month=${selectedMonth}`);
      const pnlData = await res.json();
      const { generatePnlReport } = await import("@/lib/generate-pnl-report");
      generatePnlReport(pnlData);
    } catch (err) {
      console.error("Failed to generate P&L report:", err);
    } finally {
      setGeneratingPnl(false);
    }
  };

  const fetchData = useCallback((year?: number, month?: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (year && month) {
      params.set("year", year.toString());
      params.set("month", month.toString());
    }
    fetch(`/api/stats?${params}`)
      .then((r) => r.json())
      .then((stats) => {
        setData({
          processorBreakdown: stats.processorBreakdown || [],
          topAgents: stats.topAgents || [],
          topMerchants: stats.topMerchants || [],
          selectedYear: stats.selectedYear,
          selectedMonth: stats.selectedMonth,
        });
        // On first load, sync toggles to whatever month the API returned
        if (!initialized && stats.selectedYear && stats.selectedMonth) {
          setSelectedYear(stats.selectedYear);
          setSelectedMonth(stats.selectedMonth);
          setInitialized(true);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [initialized]);

  // Initial load — let API auto-detect latest month
  useEffect(() => {
    if (!initialized) {
      fetchData();
    }
  }, []);

  // When user changes month/year toggles
  useEffect(() => {
    if (initialized) {
      fetchData(selectedYear, selectedMonth);
    }
  }, [selectedYear, selectedMonth, initialized]);

  const maxVolume = data?.processorBreakdown
    ? Math.max(...data.processorBreakdown.map((p) => p.volume), 1)
    : 1;
  const maxAgentEarnings = data?.topAgents
    ? Math.max(...data.topAgents.map((a) => a.totalEarnings), 1)
    : 1;

  const processorColors: Record<string, string> = {
    signapay: "#6366f1",
    fiserv: "#5B8C2A",
    tsys: "#60a5fa",
    maverick: "#fbbf24",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#5B8C2A" }}>
            Reporting
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Analytics and performance insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => { setInitialized(true); setSelectedMonth(parseInt(e.target.value)); }}
            className="px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => { setInitialized(true); setSelectedYear(parseInt(e.target.value)); }}
            className="px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={handleGeneratePnl}
            disabled={generatingPnl}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer disabled:opacity-50 transition-colors"
            style={{ background: "#5B8C2A" }}
          >
            <FileText size={16} />
            {generatingPnl ? "Generating..." : "Generate P&L Report"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm animate-pulse" style={{ color: "var(--text-muted)" }}>Loading reports...</div>
      ) : (
        <>
          {/* Processor Volume Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="rounded-xl p-6 border" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
              <h2 className="text-sm font-semibold mb-6" style={{ color: "var(--text-primary)" }}>
                Volume by Processor
              </h2>
              {data?.processorBreakdown && data.processorBreakdown.length > 0 ? (
                <div className="space-y-4">
                  {data.processorBreakdown.map((p) => (
                    <div key={p.processor}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{p.label}</span>
                        <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                          {formatCurrencyCompact(p.volume)}
                        </span>
                      </div>
                      <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(p.volume / maxVolume) * 100}%`,
                            background: processorColors[p.processor] || "#5B8C2A",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No data for this period.</p>
              )}
            </div>

            {/* Net Revenue by Processor */}
            <div className="rounded-xl p-6 border" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
              <h2 className="text-sm font-semibold mb-6" style={{ color: "var(--text-primary)" }}>
                Net Revenue by Processor
              </h2>
              {data?.processorBreakdown && data.processorBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {data.processorBreakdown.map((p) => {
                    const totalNet = data.processorBreakdown.reduce((s, x) => s + x.net, 0);
                    const pct = totalNet > 0 ? ((p.net / totalNet) * 100).toFixed(1) : "0";
                    return (
                      <div key={p.processor} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ background: processorColors[p.processor] || "#5B8C2A" }} />
                          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{p.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{pct}%</span>
                          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                            {formatCurrency(p.net)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No data for this period.</p>
              )}
            </div>
          </div>

          {/* Top Agents */}
          <div className="rounded-xl p-6 border mb-8" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              Top Agents by Earnings
            </h2>
            {data?.topAgents && data.topAgents.length > 0 ? (
              <div className="space-y-3">
                {data.topAgents.slice(0, 10).map((agent, i) => (
                  <div key={agent.id} className="flex items-center gap-4">
                    <span className="w-6 text-right text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                      #{i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {agent.name}
                        </span>
                        <span className="text-sm font-medium" style={{ color: "#5B8C2A" }}>
                          {formatCurrency(agent.totalEarnings)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(agent.totalEarnings / maxAgentEarnings) * 100}%`,
                            background: "#5B8C2A",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No agent data for this period.</p>
            )}
          </div>

          {/* Top Merchants */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <div className="px-4 py-3" style={{ background: "var(--bg-tertiary)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Top Merchants by Volume
              </h2>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--bg-tertiary)" }}>
                  {["#", "DBA", "Processor", "Volume", "Net"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-2" style={{ color: "var(--text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.topMerchants && data.topMerchants.length > 0 ? (
                  data.topMerchants.slice(0, 15).map((m, i) => (
                    <tr key={m.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: "#5B8C2A" }}>{m.dba}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-md" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                          {PROCESSOR_LABELS[m.processor as Processor] || m.processor}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{formatCurrency(m.volume)}</td>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: "#5B8C2A" }}>{formatCurrency(m.net)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                      No merchant data for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
