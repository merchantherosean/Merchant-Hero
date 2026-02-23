"use client";

import { Scale } from "lucide-react";
import DocumentPage from "@/components/DocumentPage";

export default function LegalPage() {
  return (
    <DocumentPage
      category="legal"
      title="Legal"
      description="Legal documents, compliance records, and regulatory filings"
      icon={Scale}
    />
  );
}
