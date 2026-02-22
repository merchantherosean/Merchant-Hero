import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || "");
  const month = parseInt(searchParams.get("month") || "");

  if (!year || !month) {
    return NextResponse.json(
      { error: "year and month query params are required" },
      { status: 400 }
    );
  }

  const agent = await prisma.agent.findUnique({
    where: { id },
    include: {
      tags: {
        include: {
          tag: { select: { id: true, name: true } },
        },
      },
      merchantAssignments: {
        include: {
          merchant: {
            select: {
              id: true,
              mid: true,
              dba: true,
              processor: true,
              status: true,
              hidden: true,
              tags: {
                include: {
                  tag: { select: { id: true, name: true } },
                },
              },
              residuals: {
                where: { year, month },
                select: {
                  volume: true,
                  netCommission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Get the set of tag IDs assigned to this agent
  const agentTagIds = new Set(agent.tags.map((at) => at.tag.id));
  const agentTagNames = new Map(agent.tags.map((at) => [at.tag.id, at.tag.name]));

  // Build per-merchant data, grouping by agent-assigned tags
  const tagGroups = new Map<string, { name: string; volume: number; netProfit: number; count: number }>();
  const individualMerchants: {
    dba: string;
    mid: string;
    processor: string;
    volume: number;
    bpsRate: number;
    netProfit: number;
    isGrouped: false;
  }[] = [];

  for (const ma of agent.merchantAssignments) {
    if (ma.merchant.hidden) continue;

    const residual = ma.merchant.residuals[0];
    const volume = residual?.volume ?? 0;
    if (volume === 0) continue;

    const bpsRate = ma.bpsRate ?? 0;
    const netProfit = volume * (bpsRate / 10000);

    // Check if this merchant belongs to any of the agent's assigned tags
    const matchingTagId = ma.merchant.tags.find((mt) => agentTagIds.has(mt.tag.id))?.tag.id;

    if (matchingTagId) {
      // Group under the tag
      const existing = tagGroups.get(matchingTagId);
      if (existing) {
        existing.volume += volume;
        existing.netProfit += netProfit;
        existing.count += 1;
      } else {
        tagGroups.set(matchingTagId, {
          name: agentTagNames.get(matchingTagId) || "Unknown",
          volume,
          netProfit,
          count: 1,
        });
      }
    } else {
      // Individual merchant row
      individualMerchants.push({
        dba: ma.merchant.dba,
        mid: ma.merchant.mid,
        processor: ma.merchant.processor,
        volume,
        bpsRate,
        netProfit,
        isGrouped: false,
      });
    }
  }

  // Build grouped rows
  const groupedRows = Array.from(tagGroups.values()).map((g) => ({
    dba: g.name,
    mid: "",
    processor: "",
    volume: g.volume,
    bpsRate: null as number | null,
    netProfit: g.netProfit,
    isGrouped: true,
    merchantCount: g.count,
  }));

  // Combine: grouped rows first (sorted by volume desc), then individual rows (sorted by volume desc)
  const merchants = [
    ...groupedRows.sort((a, b) => b.volume - a.volume),
    ...individualMerchants.sort((a, b) => b.volume - a.volume),
  ];

  const allVolume = merchants.reduce((s, m) => s + m.volume, 0);
  const allNetProfit = merchants.reduce((s, m) => s + m.netProfit, 0);

  const totals = {
    volume: allVolume,
    netProfit: allNetProfit,
    merchantCount: merchants.length,
  };

  return NextResponse.json({
    agent: {
      name: agent.name,
      email: agent.email,
      phone: agent.phone,
    },
    period: { year, month },
    merchants,
    totals,
  });
}
