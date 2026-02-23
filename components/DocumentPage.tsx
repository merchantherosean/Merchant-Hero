"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Upload,
  FileText,
  Trash2,
  Download,
  X,
  AlertCircle,
  FileImage,
  FileVideo,
  FileSpreadsheet,
  Eye,
} from "lucide-react";
import type { DocumentRecord, DocumentCategory } from "@/lib/types";

interface DocumentPageProps {
  category: DocumentCategory;
  title: string;
  description: string;
  icon: React.ComponentType<{
    size?: number;
    className?: string;
    style?: React.CSSProperties;
  }>;
}

export default function DocumentPage({
  category,
  title,
  description,
  icon: Icon,
}: DocumentPageProps) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<DocumentRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [hoverPreview, setHoverPreview] = useState<{ doc: DocumentRecord; x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(() => {
    setLoading(true);
    fetch(`/api/documents?category=${category}`)
      .then((r) => r.json())
      .then(setDocuments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [category]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setUploadProgress(`Uploading ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Upload failed");
        return;
      }

      fetchDocuments();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    setDeleting(true);
    try {
      await fetch(`/api/documents/${deleteDoc.id}`, { method: "DELETE" });
      fetchDocuments();
    } catch {
      console.error("Delete failed");
    } finally {
      setDeleting(false);
      setDeleteDoc(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return FileImage;
    if (mimeType.startsWith("video/")) return FileVideo;
    if (mimeType.includes("spreadsheet") || mimeType.includes("csv"))
      return FileSpreadsheet;
    return FileText;
  };

  const isPreviewable = (mimeType: string) =>
    mimeType.startsWith("image/") ||
    mimeType.startsWith("video/") ||
    mimeType === "application/pdf";

  const handleIconHover = (doc: DocumentRecord, e: React.MouseEvent) => {
    if (!isPreviewable(doc.mimeType)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPreview({ doc, x: rect.right + 8, y: rect.top });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#5B8C2A" }}>
          {title}
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {description}
        </p>
      </div>

      {/* Upload Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer mb-6`}
        style={{
          borderColor: dragOver ? "#5B8C2A" : "var(--border)",
          background: dragOver ? "var(--accent-bg)" : "transparent",
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
        />
        {uploading ? (
          <div className="animate-pulse">
            <Upload
              size={24}
              className="mx-auto mb-2"
              style={{ color: "#5B8C2A" }}
            />
            <p className="text-sm" style={{ color: "#5B8C2A" }}>
              {uploadProgress || "Uploading..."}
            </p>
          </div>
        ) : (
          <>
            <Upload
              size={24}
              className="mx-auto mb-2"
              style={{ color: "var(--text-muted)" }}
            />
            <p
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Drag and drop a file here, or{" "}
              <span style={{ color: "#5B8C2A", fontWeight: 500 }}>browse</span>
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--text-muted)" }}
            >
              Supports any file type (PDF, DOCX, MP4, images, CSV, etc.)
            </p>
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="mb-6 p-3 rounded-lg border flex items-center gap-2"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            borderColor: "rgba(239, 68, 68, 0.3)",
          }}
        >
          <AlertCircle size={16} style={{ color: "#ef4444" }} />
          <span className="text-sm" style={{ color: "#ef4444" }}>
            {error}
          </span>
          <button
            onClick={() => setError(null)}
            className="ml-auto cursor-pointer"
            style={{ color: "#ef4444" }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Documents Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ background: "var(--bg-tertiary)" }}
        >
          <h2
            className="text-sm font-semibold flex items-center gap-2"
            style={{ color: "var(--text-primary)" }}
          >
            <Icon size={16} />
            {title}
          </h2>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {documents.length} file{documents.length !== 1 ? "s" : ""}
          </span>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--bg-tertiary)" }}>
              {["File Name", "Type", "Size", "Uploaded", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm animate-pulse"
                  style={{ color: "var(--text-muted)" }}
                >
                  Loading...
                </td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  No documents yet. Upload a file above to get started.
                </td>
              </tr>
            ) : (
              documents.map((doc) => {
                const FileIcon = getFileIcon(doc.mimeType);
                return (
                  <tr
                    key={doc.id}
                    className="border-t"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="relative cursor-pointer"
                          onMouseEnter={(e) => handleIconHover(doc, e)}
                          onMouseLeave={() => setHoverPreview(null)}
                          onClick={() => isPreviewable(doc.mimeType) && setPreviewDoc(doc)}
                        >
                          <FileIcon
                            size={16}
                            style={{ color: "#5B8C2A" }}
                          />
                          {isPreviewable(doc.mimeType) && (
                            <Eye
                              size={8}
                              className="absolute -bottom-0.5 -right-1"
                              style={{ color: "#5B8C2A" }}
                            />
                          )}
                        </div>
                        <span
                          className="text-sm font-medium truncate max-w-[300px]"
                          style={{ color: "var(--text-primary)", cursor: isPreviewable(doc.mimeType) ? "pointer" : "default" }}
                          title={doc.name}
                          onClick={() => isPreviewable(doc.mimeType) && setPreviewDoc(doc)}
                        >
                          {doc.name}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {doc.mimeType.split("/")[1]?.toUpperCase() || "FILE"}
                    </td>
                    <td
                      className="px-4 py-3 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {formatSize(doc.fileSize)}
                    </td>
                    <td
                      className="px-4 py-3 text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {new Date(doc.uploadedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md transition-colors"
                          style={{ color: "#5B8C2A" }}
                          title="Download"
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "var(--bg-tertiary)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <Download size={15} />
                        </a>
                        <button
                          onClick={() => setDeleteDoc(doc)}
                          className="p-1.5 rounded-md transition-colors cursor-pointer"
                          style={{ color: "#ef4444" }}
                          title="Delete"
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "rgba(239, 68, 68, 0.1)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Hover Preview Tooltip */}
      {hoverPreview && (
        <div
          className="fixed z-50 rounded-lg shadow-xl border overflow-hidden pointer-events-none"
          style={{
            left: Math.min(hoverPreview.x, window.innerWidth - 280),
            top: Math.max(hoverPreview.y - 60, 8),
            background: "var(--bg-secondary)",
            borderColor: "var(--border)",
            width: 260,
            maxHeight: 200,
          }}
        >
          {hoverPreview.doc.mimeType.startsWith("image/") ? (
            <img
              src={hoverPreview.doc.fileUrl}
              alt={hoverPreview.doc.name}
              className="w-full h-full object-contain"
              style={{ maxHeight: 200 }}
            />
          ) : hoverPreview.doc.mimeType.startsWith("video/") ? (
            <video
              src={hoverPreview.doc.fileUrl}
              className="w-full"
              style={{ maxHeight: 200 }}
              muted
              preload="metadata"
            />
          ) : hoverPreview.doc.mimeType === "application/pdf" ? (
            <div className="flex items-center justify-center p-6">
              <div className="text-center">
                <FileText size={32} style={{ color: "#5B8C2A" }} className="mx-auto mb-2" />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Click to preview PDF</p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Full Preview Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="relative rounded-xl overflow-hidden shadow-2xl mx-4"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              maxWidth: "90vw",
              maxHeight: "90vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                {previewDoc.name}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: "#5B8C2A" }}
                  title="Open in new tab"
                >
                  <Download size={16} />
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-md transition-colors cursor-pointer"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex items-center justify-center" style={{ maxHeight: "80vh", overflow: "auto" }}>
              {previewDoc.mimeType.startsWith("image/") ? (
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.name}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              ) : previewDoc.mimeType.startsWith("video/") ? (
                <video
                  src={previewDoc.fileUrl}
                  controls
                  autoPlay
                  className="max-w-full max-h-[80vh]"
                  style={{ minWidth: 500 }}
                />
              ) : previewDoc.mimeType === "application/pdf" ? (
                <iframe
                  src={previewDoc.fileUrl}
                  className="w-full"
                  style={{ width: "80vw", height: "80vh" }}
                  title={previewDoc.name}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="rounded-xl p-6 w-full max-w-md mx-4 shadow-xl"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Delete Document
            </h3>
            <p
              className="text-sm mb-6"
              style={{ color: "var(--text-secondary)" }}
            >
              Are you sure you want to delete{" "}
              <strong>{deleteDoc.name}</strong>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteDoc(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-lg border transition-colors cursor-pointer"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-lg text-white transition-colors cursor-pointer"
                style={{ background: "#ef4444" }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
