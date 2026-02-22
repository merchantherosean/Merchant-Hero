"use client";

import { useEffect, useState, useCallback } from "react";
import { DollarSign, Upload, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { PROCESSOR_LABELS, PROCESSORS, MONTHS, type Processor, type UploadResponse } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import StatusBadge from "@/components/StatusBadge";

interface ResidualRow {
  id: string;
  mid: string;
  dba: string;
  agents: string[];
  volume: number;
  income: number;
  netCommission: number;
  transactions: number;
  processor: string;
}

interface UploadRecord {
  id: string;
  processor: string;
  year: number;
  month: number;
  fileName: string;
  recordCount: number;
  totalVolume: number;
  totalNet: number;
  uploadedAt: string;
}

export default function ResidualsPage() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedProcessor, setSelectedProcessor] = useState<Processor>("signapay");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [residuals, setResiduals] = useState<ResidualRow[]>([]);
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewProcessor, setViewProcessor] = useState<string>("all");
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth() + 1);
  const [deleteUpload, setDeleteUpload] = useState<UploadRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchResiduals = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      year: viewYear.toString(),
      month: viewMonth.toString(),
    });
    if (viewProcessor !== "all") params.set("processor", viewProcessor);

    fetch(`/api/residuals?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setResiduals(data.residuals || []);
        setUploads(data.uploads || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [viewYear, viewMonth, viewProcessor]);

  useEffect(() => {
    fetchResiduals();
  }, [fetchResiduals]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("processor", selectedProcessor);
    formData.append("year", selectedYear.toString());
    formData.append("month", selectedMonth.toString());

    try {
      const res = await fetch("/api/residuals/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setUploadResult(data);
      if (data.success) {
        fetchResiduals();
      }
    } catch (err) {
      setUploadResult({
        success: false,
        recordCount: 0,
        totalVolume: 0,
        totalNet: 0,
        newMerchants: 0,
        newAgents: 0,
        errors: ["Upload failed. Please try again."],
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteUpload = async () => {
    if (!deleteUpload) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/residuals/upload/${deleteUpload.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchResiduals();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
      setDeleteUpload(null);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#5B8C2A" }}>
          Residuals
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Upload monthly processor files (CSV or Excel) and view residual data
        </p>
      </div>

      {/* Upload Section */}
      <div
        className="rounded-xl p-6 border mb-8"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Upload size={16} />
          Upload Residuals
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Processor Select */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
              Processor
            </label>
            <select
              value={selectedProcessor}
              onChange={(e) => setSelectedProcessor(e.target.value as Processor)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              {PROCESSORS.map((p) => (
                <option key={p} value={p}>
                  {PROCESSOR_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          {/* Month Select */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Year Select */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <FileUpload onUpload={handleUpload} uploading={uploading} />

        {/* Upload Result */}
        {uploadResult && (
          <div
            className="mt-4 p-4 rounded-lg border"
            style={{
              background: uploadResult.success ? "rgba(52, 211, 153, 0.1)" : "rgba(239, 68, 68, 0.1)",
              borderColor: uploadResult.success ? "rgba(52, 211, 153, 0.3)" : "rgba(239, 68, 68, 0.3)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              {uploadResult.success ? (
                <CheckCircle size={16} style={{ color: "#34d399" }} />
              ) : (
                <AlertCircle size={16} style={{ color: "#ef4444" }} />
              )}
              <span
                className="text-sm font-medium"
                style={{ color: uploadResult.success ? "#34d399" : "#ef4444" }}
              >
                {uploadResult.success ? "Upload Successful" : "Upload Failed"}
              </span>
            </div>
            {uploadResult.success && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Records</p>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {formatNumber(uploadResult.recordCount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total Volume</p>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {formatCurrency(uploadResult.totalVolume)}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total Net</p>
                  <p className="text-sm font-medium" style={{ color: "#34d399" }}>
                    {formatCurrency(uploadResult.totalNet)}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>New Merchants</p>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {uploadResult.newMerchants}
                  </p>
                </div>
              </div>
            )}
            {uploadResult.errors.length > 0 && (
              <div className="mt-2">
                {uploadResult.errors.map((e, i) => (
                  <p key={i} className="text-xs" style={{ color: "#ef4444" }}>
                    {e}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload History */}
      {uploads.length > 0 && (
        <div
          className="rounded-xl p-6 border mb-8"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Upload History for {MONTHS[viewMonth - 1]} {viewYear}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {uploads.map((u) => (
              <div
                key={u.id}
                className="p-3 rounded-lg border relative group"
                style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
              >
                <button
                  onClick={() => setDeleteUpload(u)}
                  className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10"
                  style={{ color: "#ef4444" }}
                  title="Delete upload"
                >
                  <Trash2 size={13} />
                </button>
                <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                  {PROCESSOR_LABELS[u.processor as Processor] || u.processor}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {u.recordCount} records &middot; {formatCurrency(u.totalNet)} net
                </p>
                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                  {new Date(u.uploadedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Residuals */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ background: "var(--bg-tertiary)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Residual Data
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(parseInt(e.target.value))}
              className="px-2 py-1 rounded text-xs outline-none cursor-pointer"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={viewYear}
              onChange={(e) => setViewYear(parseInt(e.target.value))}
              className="px-2 py-1 rounded text-xs outline-none cursor-pointer"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={viewProcessor}
              onChange={(e) => setViewProcessor(e.target.value)}
              className="px-2 py-1 rounded text-xs outline-none cursor-pointer"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              <option value="all">All Processors</option>
              {PROCESSORS.map((p) => (
                <option key={p} value={p}>{PROCESSOR_LABELS[p]}</option>
              ))}
            </select>
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--bg-tertiary)" }}>
              {["DBA", "MID", "Agents", "Volume", "Income", "Net Commission", "Txns"].map((h) => (
                <th
                  key={h}
                  className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm animate-pulse" style={{ color: "var(--text-muted)" }}>
                  Loading...
                </td>
              </tr>
            ) : residuals.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  No residual data for this period. Upload a CSV above.
                </td>
              </tr>
            ) : (
              residuals.map((r) => (
                <tr
                  key={r.id}
                  className="border-t"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: "#5B8C2A" }}>
                    {r.dba}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
                    {r.mid}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {r.agents.length > 0 ? r.agents.join(", ") : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                    {formatCurrency(r.volume)}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                    {formatCurrency(r.income)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: "#34d399" }}>
                    {formatCurrency(r.netCommission)}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {r.transactions}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {residuals.length > 0 && (
          <div
            className="px-4 py-3 flex items-center justify-between border-t"
            style={{ background: "var(--bg-tertiary)", borderColor: "var(--border)" }}
          >
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {residuals.length} records
            </span>
            <div className="flex items-center gap-4">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Volume: {formatCurrency(residuals.reduce((s, r) => s + r.volume, 0))}
              </span>
              <span className="text-xs font-medium" style={{ color: "#34d399" }}>
                Net: {formatCurrency(residuals.reduce((s, r) => s + r.netCommission, 0))}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Delete Upload Confirmation Modal */}
      {deleteUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="rounded-xl p-6 w-full max-w-md mx-4 shadow-xl"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              Delete Upload
            </h3>
            <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
              Are you sure you want to delete the <strong>{PROCESSOR_LABELS[deleteUpload.processor as Processor] || deleteUpload.processor}</strong> upload for{" "}
              <strong>{MONTHS[deleteUpload.month - 1]} {deleteUpload.year}</strong>?
            </p>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              This will remove {deleteUpload.recordCount} residual records. Merchants and agents will not be deleted.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteUpload(null)}
                className="px-4 py-2 text-sm rounded-lg border transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUpload}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-lg text-white transition-colors"
                style={{ background: "#ef4444" }}
              >
                {deleting ? "Deleting..." : "Delete Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
