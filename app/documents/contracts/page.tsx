"use client";

import { FileSignature } from "lucide-react";
import DocumentPage from "@/components/DocumentPage";

export default function ContractsPage() {
  return (
    <DocumentPage
      category="contracts"
      title="Contracts"
      description="Store and manage merchant contracts and agreements"
      icon={FileSignature}
    />
  );
}
