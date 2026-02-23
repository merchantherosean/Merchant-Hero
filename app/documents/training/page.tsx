"use client";

import { GraduationCap } from "lucide-react";
import DocumentPage from "@/components/DocumentPage";

export default function TrainingPage() {
  return (
    <DocumentPage
      category="training"
      title="Training"
      description="Training guides, onboarding documents, and educational resources"
      icon={GraduationCap}
    />
  );
}
