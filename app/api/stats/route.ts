import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PROCESSOR_LABELS, type Processor } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const [merchantCount, activeMerchantCount, agentCount] = await Promise.all([
    prisma.merchant.count(),
    prisma.merchant.count({ where: { status: "Active" } }),
    prisma.agent.count(),
  ]);

  // Get most recent month with data
  const latestUpload = await prisma.residualUpload.findFirst({
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  let monthlyVolume = 0;
  let monthlyNet = 0;
  let processorBreakdown: { processor: string; label: string; merchantCount: number; volume: number; net: number }[] = [];
  let topAgents: { id: string; name: string; merchantCount: number; totalVolume: number; totalEarnings: number }[] = [];
  let topMerchants: { id: string; dba: string; processor: string; volume: number; net: number }[] = [];

  if (latestUpload) {
    const { year, month } = latestUpload;

    // Aggregate by processor for the latest month
    // Include ALL merchants for company P&L (even hidden ones)
    const residuals = await prisma.residual.findMany({
      where: { year, month },
      include: {
        merchant: {
          select: {
            id: true,
            dba: true,
            processor: true,
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

    // Processor breakdown
    const processorMap = new Map<string, { merchantIds: Set<string>; volume: number; net: number }>();
    for (const r of residuals) {
      const p = r.processor;
      const existing = processorMap.get(p);
      if (existing) {
        existing.merchantIds.add(r.merchant.id);
        existing.volume += r.volume;
        existing.net += r.netCommission;
      } else {
        processorMap.set(p, {
          merchantIds: new Set([r.merchant.id]),
          volume: r.volume,
          net: r.netCommission,
        });
      }
    }

    processorBreakdown = Array.from(processorMap.entries()).map(([p, data]) => ({
      processor: p,
      label: PROCESSOR_LABELS[p as Processor] || p,
      merchantCount: data.merchantIds.size,
      volume: data.volume,
      net: data.net,
    }));

    monthlyVolume = processorBreakdown.reduce((s, p) => s + p.volume, 0);
    monthlyNet = processorBreakdown.reduce((s, p) => s + p.net, 0);

    // Top agents (exclude hidden merchants from agent reports)
    // Calculate earnings via BPS rates from MerchantAgent
    const agentMap = new Map<string, { id: string; name: string; merchantIds: Set<string>; volume: number; earnings: number }>();
    for (const r of residuals) {
      if (r.merchant.hidden) continue;
      for (const ma of r.merchant.agents) {
        const bps = ma.bpsRate ?? 0;
        const earning = r.volume * (bps / 10000);
        const existing = agentMap.get(ma.agent.id);
        if (existing) {
          existing.merchantIds.add(r.merchant.id);
          existing.volume += r.volume;
          existing.earnings += earning;
        } else {
          agentMap.set(ma.agent.id, {
            id: ma.agent.id,
            name: ma.agent.name,
            merchantIds: new Set([r.merchant.id]),
            volume: r.volume,
            earnings: earning,
          });
        }
      }
    }

    topAgents = Array.from(agentMap.values())
      .map((a) => ({
        id: a.id,
        name: a.name,
        merchantCount: a.merchantIds.size,
        totalVolume: a.volume,
        totalEarnings: a.earnings,
      }))
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, 10);

    // Top merchants by volume
    topMerchants = residuals
      .map((r) => ({
        id: r.merchant.id,
        dba: r.merchant.dba,
        processor: r.processor,
        volume: r.volume,
        net: r.netCommission,
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 15);
  }

  // Recent uploads
  const recentUploads = await prisma.residualUpload.findMany({
    orderBy: { uploadedAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    merchantCount,
    activeMerchantCount,
    agentCount,
    monthlyVolume,
    monthlyNet,
    processorBreakdown,
    topAgents,
    topMerchants,
    recentUploads: recentUploads.map((u) => ({
      processor: u.processor,
      year: u.year,
      month: u.month,
      recordCount: u.recordCount,
      uploadedAt: u.uploadedAt,
    })),
  });
}
