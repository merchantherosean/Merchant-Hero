import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { LOGO_BASE64 } from "./logo-base64";

// Type augmentation for jspdf-autotable
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

interface ReportMerchant {
  dba: string;
  mid: string;
  processor: string;
  volume: number;
  bpsRate: number | null;
  netProfit: number;
  isGrouped?: boolean;
  merchantCount?: number;
}

interface ReportData {
  agent: { name: string; email?: string | null; phone?: string | null };
  period: { year: number; month: number };
  merchants: ReportMerchant[];
  totals: { volume: number; netProfit: number; merchantCount: number };
}

// Brand colors from the Merchant Hero logo
const LIME_GREEN: [number, number, number] = [91, 140, 42];    // #5B8C2A — "MERCHANT" green
const LIME_GREEN_LIGHT: [number, number, number] = [240, 248, 232]; // Light green tint for rows
const DARK_BROWN: [number, number, number] = [43, 24, 16];     // #2B1810 — "HERO" dark brown
const DARK_TEXT: [number, number, number] = [30, 30, 30];
const MUTED_TEXT: [number, number, number] = [120, 120, 120];
const WHITE: [number, number, number] = [255, 255, 255];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmtCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

interface GenerateReportOptions {
  download?: boolean; // defaults to true for backward compatibility
}

interface GenerateReportResult {
  base64: string;
  fileName: string;
}

export function generateAgentReport(
  data: ReportData,
  options?: GenerateReportOptions,
): GenerateReportResult {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  const monthName = MONTHS[data.period.month - 1];

  // ──────────────────────────────────────────────
  // HEADER — White bar with logo
  // ──────────────────────────────────────────────
  const headerHeight = 90;

  // White header background (default page color, no fill needed)

  // Lime green accent strip at bottom of header
  doc.setFillColor(...LIME_GREEN);
  doc.rect(0, headerHeight - 4, pageWidth, 4, "F");

  // Add the Merchant Hero logo
  try {
    // Logo image — positioned in the header
    const logoHeight = 56;
    const logoWidth = logoHeight * 2; // aspect ratio ~2:1
    doc.addImage(LOGO_BASE64, "PNG", margin, (headerHeight - logoHeight) / 2 - 2, logoWidth, logoHeight);
  } catch {
    // Fallback: text-based logo
    doc.setTextColor(...LIME_GREEN);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("MERCHANT", margin, headerHeight / 2 + 2);
    const merchantWidth = doc.getTextWidth("MERCHANT ");
    doc.setTextColor(...DARK_BROWN);
    doc.text("HERO", margin + merchantWidth, headerHeight / 2 + 2);
  }

  // Report period badge on the right
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED_TEXT);
  doc.text("COMMISSION REPORT", pageWidth - margin, headerHeight / 2 - 8, { align: "right" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK_BROWN);
  doc.text(`${monthName} ${data.period.year}`, pageWidth - margin, headerHeight / 2 + 12, { align: "right" });

  // ──────────────────────────────────────────────
  // AGENT INFO SECTION
  // ──────────────────────────────────────────────
  let y = headerHeight + 32;

  // Agent name — large
  doc.setTextColor(...DARK_TEXT);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(data.agent.name, margin, y);
  y += 22;

  // Contact info
  const contactParts: string[] = [];
  if (data.agent.email) contactParts.push(data.agent.email);
  if (data.agent.phone) contactParts.push(data.agent.phone);
  if (contactParts.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED_TEXT);
    doc.text(contactParts.join("  |  "), margin, y);
    y += 20;
  }

  // ──────────────────────────────────────────────
  // SECTION HEADER — "Merchant Breakdown"
  // ──────────────────────────────────────────────
  y += 6;
  doc.setFillColor(...LIME_GREEN);
  doc.roundedRect(margin, y, 4, 16, 2, 2, "F");
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK_TEXT);
  doc.text("Merchant Breakdown", margin + 14, y + 13);
  y += 30;

  // ──────────────────────────────────────────────
  // DATA TABLE
  // ──────────────────────────────────────────────
  if (data.merchants.length === 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED_TEXT);
    doc.text("No residual data available for this period.", margin, y + 20);
  } else {
    // Build table body — grouped rows show tag name + count, individual rows show merchant name
    const tableBody = data.merchants.map((m, i) => {
      const label = m.isGrouped
        ? `${m.dba} (${m.merchantCount} locations)`
        : m.dba;
      const bps = m.bpsRate != null ? String(Number(m.bpsRate)) : "—";
      return [
        (i + 1).toString(),
        label,
        fmtCurrency(m.volume),
        bps,
        fmtCurrency(m.netProfit),
      ];
    });

    // Track which rows are grouped for styling
    const groupedRowIndices = new Set(
      data.merchants.map((m, i) => (m.isGrouped ? i : -1)).filter((i) => i >= 0)
    );

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["#", "Location (DBA)", "Volume", "BPS Rate", "Net Profit"]],
      body: tableBody,
      // Header styling — lime green
      headStyles: {
        fillColor: LIME_GREEN,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 10,
        cellPadding: { top: 8, bottom: 8, left: 12, right: 12 },
      },
      // Body styling
      bodyStyles: {
        fontSize: 10,
        textColor: [60, 60, 60],
        cellPadding: { top: 7, bottom: 7, left: 12, right: 12 },
      },
      alternateRowStyles: {
        fillColor: LIME_GREEN_LIGHT,
      },
      // Column configuration — wider columns for landscape
      columnStyles: {
        0: { halign: "center", cellWidth: 45, textColor: MUTED_TEXT },
        1: { cellWidth: "auto" },
        2: { halign: "right", cellWidth: 130 },
        3: { halign: "center", cellWidth: 80 },
        4: { halign: "right", cellWidth: 130 },
      },
      // Bold grouped rows
      didParseCell: (hookData) => {
        if (hookData.section === "body" && groupedRowIndices.has(hookData.row.index)) {
          hookData.cell.styles.fontStyle = "bold";
          hookData.cell.styles.textColor = [...DARK_TEXT] as unknown as [number, number, number];
        }
      },
      // Thin line between rows
      tableLineColor: [220, 220, 220],
      tableLineWidth: 0.5,
    });

    // ──────────────────────────────────────────────
    // GRAND TOTAL — drawn manually so it only appears once
    // ──────────────────────────────────────────────
    const gtY = doc.lastAutoTable.finalY;
    const gtHeight = 34;
    const tableRight = margin + contentWidth;

    // Column right edges (from right): col4=130, col3=80, col2=130
    const col4Right = tableRight;
    const col3Right = tableRight - 130;
    const col2Right = col3Right - 80;

    // Dark brown background bar
    doc.setFillColor(...DARK_BROWN);
    doc.rect(margin, gtY, contentWidth, gtHeight, "F");

    const textY = gtY + gtHeight / 2 + 4;

    // "GRAND TOTAL" label — left side, after the # column
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.text("GRAND TOTAL", margin + 45 + 12, textY);

    // Volume — right-aligned to match column 2
    doc.text(fmtCurrency(data.totals.volume), col2Right - 12, textY, { align: "right" });

    // Net Profit — right-aligned to match column 4, in lime green
    doc.setTextColor(...LIME_GREEN);
    doc.text(fmtCurrency(data.totals.netProfit), col4Right - 12, textY, { align: "right" });
  }

  // ──────────────────────────────────────────────
  // FOOTER
  // ──────────────────────────────────────────────
  const finalY = data.merchants.length > 0
    ? doc.lastAutoTable.finalY + 32 + 36
    : y + 56;

  // Divider line — lime green
  doc.setDrawColor(...LIME_GREEN);
  doc.setLineWidth(1);
  doc.line(margin, finalY, pageWidth - margin, finalY);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED_TEXT);
  doc.text(
    `Generated on ${new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}`,
    margin,
    finalY + 16,
  );
  doc.setTextColor(...DARK_BROWN);
  doc.setFont("helvetica", "bold");
  doc.text(
    "Merchant Hero \u2022 We Don\u2019t Sell, We Rescue",
    pageWidth - margin,
    finalY + 16,
    { align: "right" },
  );

  // ──────────────────────────────────────────────
  // OUTPUT
  // ──────────────────────────────────────────────
  const safeName = data.agent.name.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `${safeName}_Report_${monthName}_${data.period.year}.pdf`;

  if (options?.download !== false) {
    doc.save(fileName);
  }

  const base64 = doc.output("datauristring").split(",")[1];
  return { base64, fileName };
}
