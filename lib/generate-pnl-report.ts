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

// Header dimensions — compact to avoid overlapping data
const HEADER_HEIGHT = 56;
const CONTENT_START = HEADER_HEIGHT + 16; // where content begins after header

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

function calcAvgBps(agentPayout: number, volume: number): number {
  return volume > 0 ? (agentPayout / volume) * 10000 : 0;
}

function fmtBps(value: number): string {
  // Show as whole number if no decimals, otherwise 1 decimal
  return Number.isInteger(Math.round(value * 10) / 10)
    ? Math.round(value).toString()
    : value.toFixed(1);
}

// ──────────────────────────────────────────────
// Draw compact header — logo left, title right
// ──────────────────────────────────────────────
function drawHeader(doc: jsPDF, monthName: string, year: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  // White background for header area
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, HEADER_HEIGHT, "F");

  // Lime green accent strip at bottom of header
  doc.setFillColor(...LIME_GREEN);
  doc.rect(0, HEADER_HEIGHT - 3, pageWidth, 3, "F");

  // Logo — compact size
  try {
    const logoH = 36;
    const logoW = logoH * 2;
    doc.addImage(LOGO_BASE64, "PNG", margin, (HEADER_HEIGHT - 3 - logoH) / 2, logoW, logoH);
  } catch {
    doc.setTextColor(...LIME_GREEN);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("MERCHANT", margin, HEADER_HEIGHT / 2 + 2);
    const w = doc.getTextWidth("MERCHANT ");
    doc.setTextColor(...DARK_BROWN);
    doc.text("HERO", margin + w, HEADER_HEIGHT / 2 + 2);
  }

  // Report title & period — right side
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED_TEXT);
  doc.text("PROFIT & LOSS REPORT", pageWidth - margin, HEADER_HEIGHT / 2 - 6, { align: "right" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK_BROWN);
  doc.text(`${monthName} ${year}`, pageWidth - margin, HEADER_HEIGHT / 2 + 8, { align: "right" });
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

  let y = CONTENT_START;

  // Company title
  doc.setTextColor(...DARK_TEXT);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Merchant Hero", margin, y);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED_TEXT);
  const titleW = doc.getTextWidth("Merchant Hero ");
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  const mhWidth = doc.getTextWidth("Merchant Hero");
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(` \u2014 ${monthName} ${data.period.year} P&L Summary`, margin + mhWidth, y);
  y += 26;

  // ── Summary Cards (4 across) ──────────────
  const cardWidth = (contentWidth - 18) / 4;
  const cardHeight = 60;
  const cards = [
    { label: "Total Volume", value: fmtCompact(data.totals.volume), color: DARK_TEXT },
    { label: "Gross Commission", value: fmtCompact(data.totals.netCommission), color: DARK_TEXT },
    { label: "Agent Payouts", value: fmtCompact(data.totals.agentPayout), color: [220, 80, 60] as [number, number, number] },
    { label: "MH Net Profit", value: fmtCompact(data.totals.mhNetProfit), color: LIME_GREEN },
  ];

  for (let i = 0; i < cards.length; i++) {
    const cx = margin + i * (cardWidth + 6);
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(cx, y, cardWidth, cardHeight, 6, 6, "F");
    doc.setFillColor(...LIME_GREEN);
    doc.roundedRect(cx, y, 4, cardHeight, 2, 2, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED_TEXT);
    doc.text(cards[i].label, cx + 14, y + 20);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...cards[i].color);
    doc.text(cards[i].value, cx + 14, y + 44);
  }
  y += cardHeight + 20;

  // ── Month-over-Month Changes ──────────────
  if (data.analytics.volumeChange !== null || data.analytics.profitChange !== null) {
    doc.setFillColor(...LIME_GREEN);
    doc.roundedRect(margin, y, 4, 14, 2, 2, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK_TEXT);
    doc.text("Month-over-Month", margin + 12, y + 11);
    y += 24;

    const prevMonthName = MONTHS[(data.period.month - 2 + 12) % 12];
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    if (data.analytics.volumeChange !== null) {
      const arrow = data.analytics.volumeChange >= 0 ? "\u25B2" : "\u25BC";
      const color: [number, number, number] = data.analytics.volumeChange >= 0 ? [34, 197, 94] : [239, 68, 68];
      doc.setTextColor(...MUTED_TEXT);
      doc.text(`Volume vs ${prevMonthName}:`, margin + 12, y);
      doc.setTextColor(...color);
      doc.setFont("helvetica", "bold");
      const labelW = doc.getTextWidth(`Volume vs ${prevMonthName}: `);
      doc.text(`  ${arrow} ${fmtPercent(data.analytics.volumeChange)}`, margin + 12 + labelW, y);
      if (data.analytics.prevMonth) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...MUTED_TEXT);
        const changeW = doc.getTextWidth(`  ${arrow} ${fmtPercent(data.analytics.volumeChange)} `);
        doc.text(`(${fmtCompact(data.analytics.prevMonth.volume)} \u2192 ${fmtCompact(data.totals.volume)})`, margin + 12 + labelW + changeW, y);
      }
      y += 14;
    }

    if (data.analytics.profitChange !== null) {
      const arrow = data.analytics.profitChange >= 0 ? "\u25B2" : "\u25BC";
      const color: [number, number, number] = data.analytics.profitChange >= 0 ? [34, 197, 94] : [239, 68, 68];
      doc.setTextColor(...MUTED_TEXT);
      doc.setFont("helvetica", "normal");
      doc.text(`Net Profit vs ${prevMonthName}:`, margin + 12, y);
      doc.setTextColor(...color);
      doc.setFont("helvetica", "bold");
      const labelW = doc.getTextWidth(`Net Profit vs ${prevMonthName}: `);
      doc.text(`  ${arrow} ${fmtPercent(data.analytics.profitChange)}`, margin + 12 + labelW, y);
      if (data.analytics.prevMonth) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...MUTED_TEXT);
        const changeW = doc.getTextWidth(`  ${arrow} ${fmtPercent(data.analytics.profitChange)} `);
        doc.text(`(${fmtCompact(data.analytics.prevMonth.mhNetProfit)} \u2192 ${fmtCompact(data.totals.mhNetProfit)})`, margin + 12 + labelW + changeW, y);
      }
      y += 14;
    }
    y += 8;
  }

  // ── Processor Breakdown Table ──────────────
  if (data.analytics.processorBreakdown.length > 0) {
    doc.setFillColor(...LIME_GREEN);
    doc.roundedRect(margin, y, 4, 14, 2, 2, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK_TEXT);
    doc.text("Processor Breakdown", margin + 12, y + 11);
    y += 22;

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
        fontSize: 8,
        cellPadding: { top: 5, bottom: 5, left: 8, right: 8 },
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [60, 60, 60],
        cellPadding: { top: 4, bottom: 4, left: 8, right: 8 },
      },
      alternateRowStyles: { fillColor: LIME_GREEN_LIGHT },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { halign: "center", cellWidth: 65 },
        2: { halign: "right", cellWidth: 100 },
        3: { halign: "right", cellWidth: 100 },
        4: { halign: "right", cellWidth: 100 },
        5: { halign: "right", cellWidth: 100 },
      },
      tableLineColor: [220, 220, 220],
      tableLineWidth: 0.5,
    });
    y = doc.lastAutoTable.finalY + 16;
  }

  // ── Key Insights ──────────────
  doc.setFillColor(...LIME_GREEN);
  doc.roundedRect(margin, y, 4, 14, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK_TEXT);
  doc.text("Key Insights", margin + 12, y + 11);
  y += 22;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  const bulletX = margin + 18;

  const totalAvgBps = calcAvgBps(data.totals.agentPayout, data.totals.volume);

  const insights: string[] = [];
  insights.push(`${data.totals.merchantCount} merchant locations generated ${fmtCompact(data.totals.volume)} in total volume.`);
  insights.push(`Gross commission: ${fmtCurrency(data.totals.netCommission)} | Agent payouts: ${fmtCurrency(data.totals.agentPayout)} | MH net profit: ${fmtCurrency(data.totals.mhNetProfit)}`);
  if (data.totals.merchantCount > 0) {
    insights.push(`Average profit per merchant: ${fmtCurrency(data.analytics.avgProfitPerMerchant)} | Average BPS payout: ${fmtBps(totalAvgBps)} BPS`);
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
    doc.circle(bulletX - 4, y - 3, 1.5, "F");
    doc.text(line, bulletX + 2, y);
    y += 14;
  }

  drawFooter(doc);

  // ══════════════════════════════════════════════
  // PAGE 2+: MERCHANT BREAKDOWN TABLE
  // ══════════════════════════════════════════════
  doc.addPage("letter", "landscape");
  drawHeader(doc, monthName, data.period.year);

  let tableY = CONTENT_START;

  // Section header
  doc.setFillColor(...LIME_GREEN);
  doc.roundedRect(margin, tableY, 4, 14, 2, 2, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK_TEXT);
  doc.text(`Merchant Breakdown \u2014 ${data.totals.merchantCount} Locations`, margin + 12, tableY + 12);
  tableY += 24;

  if (data.merchants.length === 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED_TEXT);
    doc.text("No residual data available for this period.", margin, tableY + 20);
  } else {
    // Build table body with AVG BPS column
    const tableBody = data.merchants.map((m, i) => {
      const avgBps = calcAvgBps(m.agentPayout, m.volume);
      return [
        (i + 1).toString(),
        m.dba,
        m.mid,
        PROCESSOR_LABELS[m.processor] || m.processor,
        fmtCurrency(m.volume),
        fmtCurrency(m.netCommission),
        fmtCurrency(m.agentPayout),
        fmtCurrency(m.mhNetProfit),
        avgBps > 0 ? fmtBps(avgBps) : "\u2014",
      ];
    });

    autoTable(doc, {
      startY: tableY,
      margin: { left: margin, right: margin, top: CONTENT_START },
      head: [["#", "Location (DBA)", "MID", "Processor", "Volume", "Commission", "Agent Pay", "MH Net Profit", "AVG BPS"]],
      body: tableBody,
      headStyles: {
        fillColor: LIME_GREEN,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: { top: 6, bottom: 6, left: 6, right: 6 },
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [60, 60, 60],
        cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
      },
      alternateRowStyles: {
        fillColor: LIME_GREEN_LIGHT,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 30 },    // #
        1: { cellWidth: "auto" },                    // DBA
        2: { cellWidth: 80, fontSize: 7, textColor: MUTED_TEXT }, // MID
        3: { cellWidth: 80, fontSize: 7 },           // Processor
        4: { halign: "right", cellWidth: 80 },       // Volume
        5: { halign: "right", cellWidth: 80 },       // Commission
        6: { halign: "right", cellWidth: 70 },       // Agent Pay
        7: { halign: "right", cellWidth: 80 },       // MH Net Profit
        8: { halign: "center", cellWidth: 55 },      // AVG BPS
      },
      // Color MH Net Profit green/red + style AVG BPS
      didParseCell: (hookData) => {
        if (hookData.section === "body") {
          // MH Net Profit column (index 7)
          if (hookData.column.index === 7) {
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
          // AVG BPS column (index 8) — muted style
          if (hookData.column.index === 8) {
            hookData.cell.styles.textColor = [...MUTED_TEXT] as unknown as [number, number, number];
            hookData.cell.styles.fontStyle = "bold";
          }
        }
      },
      tableLineColor: [220, 220, 220],
      tableLineWidth: 0.5,
      // Redraw header & footer on continuation pages
      didDrawPage: () => {
        drawHeader(doc, monthName, data.period.year);
        drawFooter(doc);
      },
    });

    // ── Grand Total Row ──────────────
    const gtY = doc.lastAutoTable.finalY;
    const gtHeight = 32;
    const tableRight = margin + contentWidth;

    // Column widths from right: col8=55 (AVG BPS), col7=80 (MH Net), col6=70 (Agent Pay), col5=80 (Commission), col4=80 (Volume)
    const col8Right = tableRight;
    const col7Right = tableRight - 55;
    const col6Right = col7Right - 80;
    const col5Right = col6Right - 70;
    const col4Right = col5Right - 80;

    // Dark brown background bar
    doc.setFillColor(...DARK_BROWN);
    doc.rect(margin, gtY, contentWidth, gtHeight, "F");

    const textY = gtY + gtHeight / 2 + 3;

    // "GRAND TOTAL" label
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.text("GRAND TOTAL", margin + 30 + 6, textY);

    // Volume
    doc.text(fmtCurrency(data.totals.volume), col4Right - 6, textY, { align: "right" });
    // Commission
    doc.text(fmtCurrency(data.totals.netCommission), col5Right - 6, textY, { align: "right" });
    // Agent Pay
    doc.setTextColor(255, 180, 170);
    doc.text(fmtCurrency(data.totals.agentPayout), col6Right - 6, textY, { align: "right" });
    // MH Net Profit — lime green
    doc.setTextColor(...LIME_GREEN);
    doc.text(fmtCurrency(data.totals.mhNetProfit), col7Right - 6, textY, { align: "right" });
    // AVG BPS — white centered
    doc.setTextColor(...WHITE);
    const avgBpsCenter = col7Right + (col8Right - col7Right) / 2;
    doc.text(fmtBps(totalAvgBps), avgBpsCenter, textY, { align: "center" });
  }

  // Footer on last page
  drawFooter(doc);

  // ── Download ──────────────
  const fileName = `Merchant_Hero_PnL_${monthName}_${data.period.year}.pdf`;
  doc.save(fileName);
}
