export type Processor = "signapay" | "fiserv" | "tsys" | "maverick";

export const PROCESSOR_LABELS: Record<Processor, string> = {
  signapay: "SignaPay",
  fiserv: "Fiserv / Green Payments",
  tsys: "TRNXN Company",
  maverick: "Maverick",
};

export const PROCESSORS: Processor[] = ["signapay", "fiserv", "tsys", "maverick"];

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const STATUS_OPTIONS = ["Active", "Inactive", "Closed"] as const;
export type MerchantStatus = (typeof STATUS_OPTIONS)[number];

export const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Converted", "Lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const PRIORITY_OPTIONS = ["HIGH", "MEDIUM", "LOW"] as const;
export type Priority = (typeof PRIORITY_OPTIONS)[number];

// CSV parsing types
export interface ParsedResidualRecord {
  mid: string;
  dba: string;
  agentName?: string;
  volume: number;
  income: number;
  netCommission: number;
  transactions: number;
  splitPercent?: number;
  status?: string;
}

export interface CSVParseResult {
  records: ParsedResidualRecord[];
  errors: string[];
  totalVolume: number;
  totalNet: number;
}

// API response types
export interface StatsResponse {
  merchantCount: number;
  activeMerchantCount: number;
  agentCount: number;
  monthlyVolume: number;
  monthlyNet: number;
  selectedYear: number | null;
  selectedMonth: number | null;
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
  recentUploads: {
    processor: string;
    year: number;
    month: number;
    recordCount: number;
    uploadedAt: string;
  }[];
}

export interface UploadResponse {
  success: boolean;
  recordCount: number;
  totalVolume: number;
  totalNet: number;
  newMerchants: number;
  newAgents: number;
  errors: string[];
}

// Document management
export const DOCUMENT_CATEGORIES = ["contracts", "marketing", "training", "legal"] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  contracts: "Contracts",
  marketing: "Marketing",
  training: "Training",
  legal: "Legal",
};

export interface DocumentRecord {
  id: string;
  name: string;
  category: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

// Email
export const EMAIL_STATUSES = ["sent", "failed"] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export interface SentEmailRecord {
  id: string;
  to: string;
  cc: string | null;
  subject: string;
  body: string;
  status: string;
  errorMessage: string | null;
  sentAt: string;
}

export interface EmailTemplateRecord {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}
