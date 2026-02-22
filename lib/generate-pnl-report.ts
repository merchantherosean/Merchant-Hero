import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { LOGO_BASE64 } from "./logo-base64";

// Type augmentation for jspdf-autotable
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

interface PnlMerchant {
  dba: string;
  mid: string;
  processor: string;
  status: string;
  volume: number;
  netCommission: number;
  agentPayout: number;
  agentDetails: string;
  mhNetProfit: number;
}

interface ProcessorBreakdown {
  processor: string;
  label: string;
  volume: number;
  netCommission: number;
  agentPayout: number;
  mhNetProfit: number;
  count: number;
}

interface PnlAnalytics {
  avgProfitPerMerchant: number;
  profitMarginPercent: number;
  topMerchantByProfit: { dba: string; mhNetProfit: number } | null;
  topMerchantByVolume: { dba: string; volume: number } | null;
  processorBreakdown: ProcessorBreakdown[];
  prevMonth: { volume: number; netCommission: number; agentPayout: number; mhNetProfit: number } | null;
  volumeChange: number | null;
  profitChange: number | null;
}

interface PnlReportData {
  period: { year: number; month: number };
  merchants: PnlMerchant[];
  totals: {
    volume: number;
    netCommission: number;
    agentPayout: number;
    mhNetProfit: number;
    merchantCount: number;
  };
  analytics: PnlAnalytics;
}

// Brand colors
const LIME_GREEN: [number, number, number] = [91, 140, 42];
const LIME_GREEN_LIGHT: [number, number, number] = [240, 248, 232];
const DARK_BROWN: [number, number, number] = [43, 24, 16];
const DARK_TEXT: [number, number, number] = [30, 30, 30];
const MUTED_TEXT: [number, number, number] = [120, 120, 120];
const WHITE: [number, number, number] = [255, 255, 255];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PROCESSOR_LABELS: Record<string, string> = {
  signapay: "SignaPay",
  fiserv: "Fiserv / Green Payments",
  tsys: "TRNXN Company",
  maverick: "Maverick",
};

function fmtCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function fmtCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return fmtCurrency(value);
}

function fmtPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

// ──────────────────────────────────────────────
// Draw the shared header used on every page
// ──────────────────────────────────────────────
function drawHeader(doc: jsPDF, monthName: string, year: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const headerHeight = 90;

  // Lime green accent strip
  doc.setFillColor(...LIME_GREEN);
  doc.rect(0, headerHeight - 4, pageWidth, 4, "F");

  // Logo
  try {
    const logoHeight = 56;
    const logoWidth = logoHeight * 2;
    doc.addImage(LOGO_BASE64, "PNG", margin, (headerHeight - logoHeight) / 2 - 2, logoWidth, logoHeight);
  } catch {
    doc.setTextColor(...LIME_GREEN);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("MERCHANT", margin, headerHeight / 2 + 2);
    const w = doc.getTextWidth("MERCHANT ");
    doc.setTextColor(...DARK_BROWN);
    doc.text("HERO", margin + w, headerHeight / 2 + 2);
  }

  // Report title & period
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED_TEXT);
  doc.text("PROFIT & LOSS REPORT", pageWidth - margin, headerHeight / 2 - 8, { align: "right" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK_BROWN);
  doc.text(`${monthName} ${year}`, pageWidth - margin, headerHeight / 2 + 12, { align: "right" });
}

// ──────────────────────────────────────────────
// Draw footer
// ──────────────────────────────────────────────
function drawFooter(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const footerY = pageHeight - 30;

  doc.setDrawColor(...LIME_GREEN);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED_TEXT);
  doc.text(
    `Generated on ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    margin,
    footerY + 12,
  );
  doc.setTextColor(...DARK_BROWN);
  doc.setFont("helvetica", "bold");
  doc.text("Merchant Hero \u2022 Confidential", pageWidth - margin, footerY + 12, { align: "right" });
}

// ──────────────────────────────────────────────
// MAIN EXPORT
// ──────────────────────────────────────────────
export function generatePnlReport(data: PnlReportData): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  const monthName = MONTHS[data.period.month - 1];

  // ══════════════════════════════════════════════
  // PAGE 1: ANALYTICS SUMMARY
  // ══════════════════════════════════════════════
  drawHeader(doc, monthName, data.period.year);

  let y = 118;

  // Company title
  doc.setTextColor(...DARK_TEXT);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Merchant Hero", margin, y);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED_TEXT);
  doc.text(` \u2014 ${monthName} ${data.period.year} P&L Summary`, margin + doc.getTextWidth("Merchant Hero "), y);
  y += 30;

  // ── Summary Cards (4 across) ──────────────
  const cardWidth = (contentWidth - 18) / 4;
  const cardHeight = 68;
  const cards = [
    { label: "Total Volume", value: fmtCompact(data.totals.volume), color: DARK_TEXT },
    { label: "Gross Commission", value: fmtCompact(data.totals.netCommission), color: DARK_TEXT },
    { label: "Agent Payouts", value: fmtCompact(data.totals.agentPayout), color: [220, 80, 60] as [number, number, number] },
    { label: "MH Net Profit", value: fmtCompact(data.totals.mhNetProfit), color: LIME_GREEN },
  ];

  for (let i = 0; i < cards.length; i++) {
    const cx = margin + i * (cardWidth + 6);
    // Card background
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(cx, y, cardWidth, cardHeight, 6, 6, "F");
    // Green left accent
    doc.setFillColor(...LIME_GREEN);
    doc.roundedRect(cx, y, 4, cardHeight, 2, 2, "F");

    // Label
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED_TEXT);
    doc.text(cards[i].label, cx + 16, y + 24);

    // Value
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...cards[i].color);
    doc.text(cards[i].value, cx + 16, y + 50);
  }
  y += cardHeight + 24;

  // ── Month-over-Month Changes ──────────────
  if (data.analytics.volumeChange !== null || data.analytics.profitChange !== null) {
    doc.setFillColor(...LIME_GREEN);
    doc.roundedRect(margin, y, 4, 16, 2, 2, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK_TEXT);
    doc.text("Month-over-Month", margin + 14, y + 13);
    y += 28;

    const prevMonthName = MONTHS[(data.period.month - 2 + 12) % 12];
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED_TEXT);

    if (data.analytics.volumeChange !== null) {
      const arrow = data.analytics.volumeChange >= 0 ? "\u25B2" : "\u25BC";
      const color: [number, number, number] = data.analytics.volumeChange >= 0 ? [34, 197, 94] : [239, 68, 68];
      doc.setTextColor(...MUTED_TEXT);
      doc.text(`Volume vs ${prevMonthName}:`, margin + 14, y);
      doc.setTextColor(...color);
      doc.setFont("helvetica", "bold");
      doc.text(`  ${arrow} ${fmtPercent(data.analytics.volumeChange)}`, margin + 14 + doc.getTextWidth(`Volume vs ${prevMonthName}: `), y);
      if (data.analytics.prevMonth) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...MUTED_TEXT);
        doc.text(`  (${fmtCompact(data.analytics.prevMonth.volume)} \u2192 ${fmtCompact(data.totals.volume)})`, margin + 14 + doc.getTextWidth(`Volume vs ${prevMonthName}:   ${arrow} ${fmtPercent(data.analytics.volumeChange)}`), y);
      }
      y += 16;
    }

    if (data.analytics.profitChange !== null) {
      const arrow = data.analytics.profitChange >= 0 ? "\u25B2" : "\u25BC";
      const color: [number, number, number] = data.analytics.profitChange >= 0 ? [34, 197, 94] : [239, 68, 68];
      doc.setTextColor(...MUTED_TEXT);
      doc.setFont("helvetica", "normal");
      doc.text(`Net Profit vs ${prevMonthName}:`, margin + 14, y);
      doc.setTextColor(...color);
      doc.setFont("helvetica", "bold");
      doc.text(`  ${arrow} ${fmtPercent(data.analytics.profitChange)}`, margin + 14 + doc.getTextWidth(`Net Profit vs ${prevMonthName}: `), y);
      if (data.analytics.prevMonth) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...MUTED_TEXT);
        doc.text(`  (${fmtCompact(data.analytics.prevMonth.mhNetProfit)} \u2192 ${fmtCompact(data.totals.mhNetProfit)})`, margin + 14 + doc.getTextWidth(`Net Profit vs ${prevMonthName}:   ${arrow} ${fmtPercent(data.analytics.profitChange)}`), y);
      }
      y += 16;
    }
    y += 10;
  }

  // ── Processor Breakdown Table ──────────────
  if (data.analytics.processorBreakdown.length > 0) {
    doc.setFillColor(...LIME_GREEN);
    doc.roundedRect(margin, y, 4, 16, 2, 2, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK_TEXT);
    doc.text("Processor Breakdown", margin + 14, y + 13);
    y += 26;

    const pbBody = data.analytics.processorBreakdown.map((p) => [
      PROCESSOR_LABELS[p.processor] || p.processor,
      p.count.toString(),
      fmtCurrency(p.volume),
      fmtCurrency(p.netCommission),
      fmtCurrency(p.agentPayout),
      fmtCurrency(p.mhNetProfit),
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Processor", "Merchants", "Volume", "Commission", "Agent Pay", "MH Net Profit"]],
      body: pbBody,
      headStyles: {
        fillColor: LIME_GREEN,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 9,
        cellPadding: { top: 6, bottom: 6, left: 10, right: 10 },
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [60, 60, 60],
        cellPadding: { top: 5, bottom: 5, left: 10, right: 10 },
      },
      alternateRowStyles: { fillColor: LIME_GREEN_LIGHT },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { halign: "center", cellWidth: 70 },
        2: { halign: "right", cellWidth: 110 },
        3: { halign: "right", cellWidth: 110 },
        4: { halign: "right", cellWidth: 110 },
        5: { halign: "right", cellWidth: 110 },
      },
      tableLineColor: [220, 220, 220],
      tableLineWidth: 0.5,
    });
    y = doc.lastAutoTable.finalY + 20;
  }

  // ── Key Insights ──────────────
  doc.setFillColor(...LIME_GREEN);
  doc.roundedRect(margin, y, 4, 16, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK_TEXT);
  doc.text("Key Insights", margin + 14, y + 13);
  y += 26;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  const bulletX = margin + 20;

  const insights: string[] = [];
  insights.push(`${data.totals.merchantCount} merchant locations generated ${fmtCompact(data.totals.volume)} in total volume.`);
  insights.push(`Gross commission: ${fmtCurrency(data.totals.netCommission)} | Agent payouts: ${fmtCurrency(data.totals.agentPayout)} | MH net profit: ${fmtCurrency(data.totals.mhNetProfit)}`);
  if (data.totals.merchantCount > 0) {
    insights.push(`Average profit per merchant: ${fmtCurrency(data.analytics.avgProfitPerMerchant)}`);
  }
  if (data.analytics.profitMarginPercent > 0) {
    insights.push(`Profit margin (after agent payouts): ${data.analytics.profitMarginPercent.toFixed(1)}%`);
  }
  if (data.analytics.topMerchantByProfit) {
    insights.push(`Top merchant by profit: ${data.analytics.topMerchantByProfit.dba} (${fmtCurrency(data.analytics.topMerchantByProfit.mhNetProfit)})`);
  }
  if (data.analytics.topMerchantByVolume) {
    insights.push(`Highest volume merchant: ${data.analytics.topMerchantByVolume.dba} (${fmtCompact(data.analytics.topMerchantByVolume.volume)})`);
  }

  for (const line of insights) {
    doc.setFillColor(...LIME_GREEN);
    doc.circle(bulletX - 4, y - 3, 2, "F");
    doc.text(line, bulletX + 4, y);
    y += 16;
  }

  drawFooter(doc);

  // ══════════════════════════════════════════════
  // PAGE 2+: MERCHANT BREAKDOWN TABLE
  // ══════════════════════════════════════════════
  doc.addPage("letter", "landscape");
  drawHeader(doc, monthName, data.period.year);

  let tableY = 108;

  // Section header
  doc.setFillColor(...LIME_GREEN);
  doc.roundedRect(margin, tableY, 4, 16, 2, 2, "F");
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK_TEXT);
  doc.text(`Merchant Breakdown \u2014 ${data.totals.merchantCount} Locations`, margin + 14, tableY + 13);
  tableY += 30;

  if (data.merchants.length === 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED_TEXT);
    doc.text("No residual data available for this period.", margin, tableY + 20);
  } else {
    const tableBody = data.merchants.map((m, i) => [
      (i + 1).toString(),
      m.dba,
      m.mid,
      PROCESSOR_LABELS[m.processor] || m.processor,
      fmtCurrency(m.volume),
      fmtCurrency(m.netCommission),
      fmtCurrency(m.agentPayout),
      fmtCurrency(m.mhNetProfit),
    ]);

    autoTable(doc, {
      startY: tableY,
      margin: { left: margin, right: margin },
      head: [["#", "Location (DBA)", "MID", "Processor", "Volume", "Commission", "Agent Pay", "MH Net Profit"]],
      body: tableBody,
      headStyles: {
        fillColor: LIME_GREEN,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 9,
        cellPadding: { top: 7, bottom: 7, left: 8, right: 8 },
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [60, 60, 60],
        cellPadding: { top: 6, bottom: 6, left: 8, right: 8 },
      },
      alternateRowStyles: {
        fillColor: LIME_GREEN_LIGHT,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 35 },
        1: { cellWidth: "auto" },
        2: { cellWidth: 90, fontSize: 8, textColor: MUTED_TEXT },
        3: { cellWidth: 95, fontSize: 8 },
        4: { halign: "right", cellWidth: 90 },
        5: { halign: "right", cellWidth: 90 },
        6: { halign: "right", cellWidth: 80 },
        7: { halign: "right", cellWidth: 90 },
      },
      // Color the MH Net Profit column green for positive, red for negative
      didParseCell: (hookData) => {
        if (hookData.section === "body" && hookData.column.index === 7) {
          const merchantIdx = hookData.row.index;
          if (merchantIdx < data.merchants.length) {
            const profit = data.merchants[merchantIdx].mhNetProfit;
            if (profit >= 0) {
              hookData.cell.styles.textColor = [...LIME_GREEN] as unknown as [number, number, number];
            } else {
              hookData.cell.styles.textColor = [220, 60, 60] as unknown as [number, number, number];
            }
            hookData.cell.styles.fontStyle = "bold";
          }
        }
      },
      tableLineColor: [220, 220, 220],
      tableLineWidth: 0.5,
      // Redraw header on each new page
      didDrawPage: () => {
        drawHeader(doc, monthName, data.period.year);
        drawFooter(doc);
      },
    });

    // ── Grand Total Row ──────────────
    const gtY = doc.lastAutoTable.finalY;
    const gtHeight = 34;
    const tableRight = margin + contentWidth;

    // Column widths from right: col7=90, col6=80, col5=90, col4=90
    const col7Right = tableRight;
    const col6Right = tableRight - 90;
    const col5Right = col6Right - 80;
    const col4Right = col5Right - 90;

    // Dark brown background bar
    doc.setFillColor(...DARK_BROWN);
    doc.rect(margin, gtY, contentWidth, gtHeight, "F");

    const textY = gtY + gtHeight / 2 + 4;

    // "GRAND TOTAL" label
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.text("GRAND TOTAL", margin + 35 + 8, textY);

    // Volume
    doc.text(fmtCurrency(data.totals.volume), col4Right - 8, textY, { align: "right" });
    // Commission
    doc.text(fmtCurrency(data.totals.netCommission), col5Right - 8, textY, { align: "right" });
    // Agent Pay
    doc.setTextColor(255, 180, 170);
    doc.text(fmtCurrency(data.totals.agentPayout), col6Right - 8, textY, { align: "right" });
    // MH Net Profit — lime green
    doc.setTextColor(...LIME_GREEN);
    doc.text(fmtCurrency(data.totals.mhNetProfit), col7Right - 8, textY, { align: "right" });
  }

  // Footer on last page (only if didDrawPage didn't already add it)
  drawFooter(doc);

  // ── Download ──────────────
  const fileName = `Merchant_Hero_PnL_${monthName}_${data.period.year}.pdf`;
  doc.save(fileName);
}
