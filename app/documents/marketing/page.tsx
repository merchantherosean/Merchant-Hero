"use client";

import { Megaphone } from "lucide-react";
import DocumentPage from "@/components/DocumentPage";

export default function MarketingPage() {
  return (
    <DocumentPage
      category="marketing"
      title="Marketing"
      description="Marketing materials, brochures, and promotional content"
      icon={Megaphone}
    />
  );
}
