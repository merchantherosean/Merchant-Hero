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

  // Build per-merchant report rows
  // Exclude hidden merchants (consistent with agent report exclusion)
  const merchants = agent.merchantAssignments
    .filter((ma) => !ma.merchant.hidden)
    .map((ma) => {
      const residual = ma.merchant.residuals[0];
      const volume = residual?.volume ?? 0;
      const bpsRate = ma.bpsRate ?? 0;
      const netProfit = volume * (bpsRate / 10000);

      return {
        dba: ma.merchant.dba,
        mid: ma.merchant.mid,
        processor: ma.merchant.processor,
        volume,
        bpsRate,
        netProfit,
      };
    })
    .filter((m) => m.volume > 0)
    .sort((a, b) => b.volume - a.volume);

  const totals = {
    volume: merchants.reduce((s, m) => s + m.volume, 0),
    netProfit: merchants.reduce((s, m) => s + m.netProfit, 0),
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
