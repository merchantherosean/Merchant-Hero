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
  bpsRate: number;
  netProfit: number;
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

export function generateAgentReport(data: ReportData): void {
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
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["#", "Location (DBA)", "Volume", "BPS Rate", "Net Profit"]],
      body: data.merchants.map((m, i) => [
        (i + 1).toString(),
        m.dba,
        fmtCurrency(m.volume),
        m.bpsRate.toFixed(1),
        fmtCurrency(m.netProfit),
      ]),
      foot: [[
        "",
        "GRAND TOTAL",
        fmtCurrency(data.totals.volume),
        "",
        fmtCurrency(data.totals.netProfit),
      ]],
      // Header styling — lime green
      headStyles: {
        fillColor: LIME_GREEN,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 10,
        cellPadding: { top: 8, bottom: 8, left: 12, right: 12 },
      },
      // Footer (grand total) styling — dark background, white text
      footStyles: {
        fillColor: DARK_BROWN,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 11,
        cellPadding: { top: 10, bottom: 10, left: 12, right: 12 },
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
      // Make the grand total net profit lime green for emphasis
      didParseCell: (hookData) => {
        if (hookData.section === "foot" && hookData.column.index === 4) {
          hookData.cell.styles.textColor = [...LIME_GREEN] as unknown as [number, number, number];
        }
        // Keep the # column muted in the footer too
        if (hookData.section === "foot" && hookData.column.index === 0) {
          hookData.cell.styles.textColor = [...DARK_BROWN] as unknown as [number, number, number];
        }
      },
      // Thin line between rows
      tableLineColor: [220, 220, 220],
      tableLineWidth: 0.5,
    });
  }

  // ──────────────────────────────────────────────
  // FOOTER
  // ──────────────────────────────────────────────
  const finalY = data.merchants.length > 0
    ? doc.lastAutoTable.finalY + 36
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
  // DOWNLOAD
  // ──────────────────────────────────────────────
  const safeName = data.agent.name.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `${safeName}_Report_${monthName}_${data.period.year}.pdf`;
  doc.save(fileName);
}
