import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PROCESSOR_LABELS, type Processor } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || "");
  const month = parseInt(searchParams.get("month") || "");

  if (!year || !month) {
    return NextResponse.json(
      { error: "year and month query params are required" },
      { status: 400 }
    );
  }

  // Fetch all residuals for the period with merchant details + agent assignments
  const residuals = await prisma.residual.findMany({
    where: { year, month },
    include: {
      merchant: {
        select: {
          id: true,
          mid: true,
          dba: true,
          processor: true,
          status: true,
          hidden: true,
          agents: {
            include: {
              agent: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  // Also fetch previous month data for month-over-month comparison
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevResiduals = await prisma.residual.findMany({
    where: { year: prevYear, month: prevMonth },
    include: {
      merchant: {
        select: {
          agents: {
            include: {
              agent: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  // Build per-merchant rows
  const merchants: {
    dba: string;
    mid: string;
    processor: string;
    status: string;
    volume: number;
    netCommission: number;
    agentPayout: number;
    agentDetails: string;
    mhNetProfit: number;
  }[] = [];

  // Processor breakdown tracking
  const processorMap = new Map<
    string,
    { label: string; volume: number; netCommission: number; agentPayout: number; mhNetProfit: number; count: number }
  >();

  for (const r of residuals) {
    const volume = r.volume;
    const netCommission = r.netCommission;

    // Calculate agent payouts for this merchant
    let agentPayout = 0;
    const agentParts: string[] = [];

    for (const ma of r.merchant.agents) {
      const bps = ma.bpsRate ?? 0;
      const payout = volume * (bps / 10000);
      agentPayout += payout;

      // Build short agent name + BPS label
      const nameParts = ma.agent.name.split(" ");
      const shortName =
        nameParts.length >= 2
          ? `${nameParts[0]} ${nameParts[1][0]}.`
          : nameParts[0];
      agentParts.push(`${shortName} (${String(Number(bps))} BPS)`);
    }

    const mhNetProfit = netCommission - agentPayout;

    merchants.push({
      dba: r.merchant.dba,
      mid: r.merchant.mid,
      processor: r.processor,
      status: r.merchant.status,
      volume,
      netCommission,
      agentPayout,
      agentDetails: agentParts.join(", ") || "—",
      mhNetProfit,
    });

    // Processor breakdown
    const pKey = r.processor;
    const existing = processorMap.get(pKey);
    if (existing) {
      existing.volume += volume;
      existing.netCommission += netCommission;
      existing.agentPayout += agentPayout;
      existing.mhNetProfit += mhNetProfit;
      existing.count += 1;
    } else {
      processorMap.set(pKey, {
        label: PROCESSOR_LABELS[pKey as Processor] || pKey,
        volume,
        netCommission,
        agentPayout,
        mhNetProfit,
        count: 1,
      });
    }
  }

  // Sort by volume descending
  merchants.sort((a, b) => b.volume - a.volume);

  // Totals
  const totalVolume = merchants.reduce((s, m) => s + m.volume, 0);
  const totalNetCommission = merchants.reduce((s, m) => s + m.netCommission, 0);
  const totalAgentPayout = merchants.reduce((s, m) => s + m.agentPayout, 0);
  const totalMhNetProfit = merchants.reduce((s, m) => s + m.mhNetProfit, 0);

  // Previous month totals for comparison
  let prevMonthData: { volume: number; netCommission: number; agentPayout: number; mhNetProfit: number } | null = null;
  if (prevResiduals.length > 0) {
    let pVol = 0;
    let pNet = 0;
    let pAgent = 0;
    for (const r of prevResiduals) {
      pVol += r.volume;
      pNet += r.netCommission;
      for (const ma of r.merchant.agents) {
        pAgent += r.volume * ((ma.bpsRate ?? 0) / 10000);
      }
    }
    prevMonthData = {
      volume: pVol,
      netCommission: pNet,
      agentPayout: pAgent,
      mhNetProfit: pNet - pAgent,
    };
  }

  // Analytics
  const topByProfit = merchants.length > 0
    ? merchants.reduce((best, m) => (m.mhNetProfit > best.mhNetProfit ? m : best))
    : null;
  const topByVolume = merchants.length > 0
    ? merchants.reduce((best, m) => (m.volume > best.volume ? m : best))
    : null;

  const processorBreakdown = Array.from(processorMap.entries())
    .map(([processor, data]) => ({ processor, ...data }))
    .sort((a, b) => b.volume - a.volume);

  const analytics = {
    avgProfitPerMerchant: merchants.length > 0 ? totalMhNetProfit / merchants.length : 0,
    profitMarginPercent: totalNetCommission > 0 ? (totalMhNetProfit / totalNetCommission) * 100 : 0,
    topMerchantByProfit: topByProfit ? { dba: topByProfit.dba, mhNetProfit: topByProfit.mhNetProfit } : null,
    topMerchantByVolume: topByVolume ? { dba: topByVolume.dba, volume: topByVolume.volume } : null,
    processorBreakdown,
    prevMonth: prevMonthData,
    volumeChange: prevMonthData && prevMonthData.volume > 0
      ? ((totalVolume - prevMonthData.volume) / prevMonthData.volume) * 100
      : null,
    profitChange: prevMonthData && prevMonthData.mhNetProfit > 0
      ? ((totalMhNetProfit - prevMonthData.mhNetProfit) / prevMonthData.mhNetProfit) * 100
      : null,
  };

  return NextResponse.json({
    period: { year, month },
    merchants,
    totals: {
      volume: totalVolume,
      netCommission: totalNetCommission,
      agentPayout: totalAgentPayout,
      mhNetProfit: totalMhNetProfit,
      merchantCount: merchants.length,
    },
    analytics,
  });
}
