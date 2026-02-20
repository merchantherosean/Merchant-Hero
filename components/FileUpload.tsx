"use client";

import { useCallback, useState, useRef } from "react";
import { Upload, FileText, X } from "lucide-react";

interface FileUploadProps {
  onUpload: (file: File) => void;
  uploading?: boolean;
  accept?: string;
}

export default function FileUpload({ onUpload, uploading = false, accept = ".csv" }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".csv")) {
        setSelectedFile(file);
      }
    },
    []
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile);
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          dragOver ? "border-[#7c6aef]" : ""
        }`}
        style={{
          borderColor: dragOver ? "#7c6aef" : "var(--border)",
          background: dragOver ? "var(--accent-bg)" : "transparent",
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
        <Upload size={24} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Drag and drop a CSV file here, or <span style={{ color: "#7c6aef" }}>browse</span>
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Supports CSV files from SignaPay, Fiserv, Transaction Company, and Maverick
        </p>
      </div>

      {selectedFile && (
        <div
          className="mt-3 flex items-center justify-between p-3 rounded-lg border"
          style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <FileText size={16} style={{ color: "#7c6aef" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {selectedFile.name}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="p-1.5 rounded-md cursor-pointer"
              style={{ color: "var(--text-muted)" }}
            >
              <X size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUpload();
              }}
              disabled={uploading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer disabled:opacity-50"
              style={{ background: "#7c6aef" }}
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
