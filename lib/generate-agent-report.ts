import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

const BRAND_PURPLE: [number, number, number] = [124, 106, 239];
const BRAND_PURPLE_LIGHT: [number, number, number] = [245, 243, 255];
const BRAND_GREEN: [number, number, number] = [52, 211, 153];
const DARK_TEXT: [number, number, number] = [30, 30, 30];
const MUTED_TEXT: [number, number, number] = [120, 120, 120];

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
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // ──────────────────────────────────────────────
  // HEADER — Purple gradient bar with branding
  // ──────────────────────────────────────────────
  const headerHeight = 80;

  // Main purple bar
  doc.setFillColor(...BRAND_PURPLE);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // Subtle darker strip at bottom of header
  doc.setFillColor(110, 92, 220);
  doc.rect(0, headerHeight - 3, pageWidth, 3, "F");

  // "MH" monogram — white rounded square
  const logoX = margin;
  const logoY = headerHeight / 2 - 18;
  const logoSize = 36;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(logoX, logoY, logoSize, logoSize, 8, 8, "F");

  doc.setTextColor(...BRAND_PURPLE);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("MH", logoX + logoSize / 2, logoY + logoSize / 2 + 5.5, { align: "center" });

  // Brand text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Merchant Hero", logoX + logoSize + 14, headerHeight / 2 - 4);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(220, 215, 255);
  doc.text("COMMISSION REPORT", logoX + logoSize + 14, headerHeight / 2 + 14);

  // Report period badge on the right
  const monthName = MONTHS[data.period.month - 1];
  const periodText = `${monthName} ${data.period.year}`;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(periodText, pageWidth - margin, headerHeight / 2 + 4, { align: "right" });

  // ──────────────────────────────────────────────
  // AGENT INFO SECTION
  // ──────────────────────────────────────────────
  let y = headerHeight + 36;

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
  // SUMMARY CARDS
  // ──────────────────────────────────────────────
  y += 6;
  const cardWidth = (contentWidth - 20) / 3;
  const cardHeight = 52;
  const cardRadius = 6;

  // Card 1: Merchants
  doc.setFillColor(...BRAND_PURPLE_LIGHT);
  doc.roundedRect(margin, y, cardWidth, cardHeight, cardRadius, cardRadius, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED_TEXT);
  doc.text("ACTIVE MERCHANTS", margin + 14, y + 18);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_PURPLE);
  doc.text(data.totals.merchantCount.toString(), margin + 14, y + 40);

  // Card 2: Total Volume
  const card2X = margin + cardWidth + 10;
  doc.setFillColor(...BRAND_PURPLE_LIGHT);
  doc.roundedRect(card2X, y, cardWidth, cardHeight, cardRadius, cardRadius, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED_TEXT);
  doc.text("TOTAL VOLUME", card2X + 14, y + 18);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK_TEXT);
  doc.text(fmtCurrency(data.totals.volume), card2X + 14, y + 40);

  // Card 3: Net Profit
  const card3X = margin + (cardWidth + 10) * 2;
  doc.setFillColor(240, 253, 244); // Light green tint
  doc.roundedRect(card3X, y, cardWidth, cardHeight, cardRadius, cardRadius, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED_TEXT);
  doc.text("NET PROFIT", card3X + 14, y + 18);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_GREEN);
  doc.text(fmtCurrency(data.totals.netProfit), card3X + 14, y + 40);

  y += cardHeight + 24;

  // ──────────────────────────────────────────────
  // SECTION HEADER — "Merchant Breakdown"
  // ──────────────────────────────────────────────
  doc.setFillColor(...BRAND_PURPLE);
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
      // Header styling
      headStyles: {
        fillColor: BRAND_PURPLE,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
        cellPadding: { top: 8, bottom: 8, left: 10, right: 10 },
      },
      // Footer (grand total) styling
      footStyles: {
        fillColor: [240, 240, 245],
        textColor: DARK_TEXT,
        fontStyle: "bold",
        fontSize: 10,
        cellPadding: { top: 10, bottom: 10, left: 10, right: 10 },
      },
      // Body styling
      bodyStyles: {
        fontSize: 9,
        textColor: [60, 60, 60],
        cellPadding: { top: 7, bottom: 7, left: 10, right: 10 },
      },
      alternateRowStyles: {
        fillColor: BRAND_PURPLE_LIGHT,
      },
      // Column configuration
      columnStyles: {
        0: { halign: "center", cellWidth: 30, textColor: MUTED_TEXT },
        1: { cellWidth: "auto" },
        2: { halign: "right", cellWidth: 100 },
        3: { halign: "center", cellWidth: 65 },
        4: { halign: "right", cellWidth: 100 },
      },
      // Color the net profit total green
      didParseCell: (hookData) => {
        if (hookData.section === "foot" && hookData.column.index === 4) {
          hookData.cell.styles.textColor = [...BRAND_GREEN] as unknown as [number, number, number];
        }
      },
      // Rounded look — thin line between rows
      tableLineColor: [230, 230, 230],
      tableLineWidth: 0.5,
    });
  }

  // ──────────────────────────────────────────────
  // FOOTER
  // ──────────────────────────────────────────────
  const finalY = data.merchants.length > 0
    ? doc.lastAutoTable.finalY + 36
    : y + 56;

  // Divider line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
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
  doc.text(
    "Merchant Hero \u2022 Confidential",
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
