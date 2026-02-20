import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const qYear = searchParams.get("year");
  const qMonth = searchParams.get("month");

  const where: Record<string, unknown> = {};
  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  // Build residuals filter for the selected period
  const residualsWhere: Record<string, unknown> = {};
  if (qYear && qMonth) {
    residualsWhere.year = parseInt(qYear);
    residualsWhere.month = parseInt(qMonth);
  }

  const agents = await prisma.agent.findMany({
    where,
    include: {
      merchantAssignments: {
        include: {
          merchant: {
            include: {
              residuals: {
                where: residualsWhere,
                select: { volume: true, netCommission: true },
              },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    agents.map((a) => {
      let totalVolume = 0;
      let totalEarnings = 0;

      for (const ma of a.merchantAssignments) {
        const bps = ma.bpsRate ?? 0;
        for (const r of ma.merchant.residuals) {
          totalVolume += r.volume;
          // Agent earnings = volume * (bpsRate / 10000)
          totalEarnings += r.volume * (bps / 10000);
        }
      }

      return {
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        status: a.status,
        merchantCount: a.merchantAssignments.length,
        totalVolume,
        totalEarnings,
      };
    })
  );
}

export async function POST(req: Request) {
  const body = await req.json();
  const agent = await prisma.agent.create({
    data: {
      name: body.name,
      email: body.email,
      phone: body.phone,
      splitPercent: body.splitPercent,
      status: body.status || "Active",
    },
  });
  return NextResponse.json(agent, { status: 201 });
}
