import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || "0");
  const month = parseInt(searchParams.get("month") || "0");
  const processor = searchParams.get("processor");

  // Build filter
  const where: Record<string, unknown> = {};
  if (year) where.year = year;
  if (month) where.month = month;
  if (processor && processor !== "all") where.processor = processor;

  const residuals = await prisma.residual.findMany({
    where,
    include: {
      merchant: {
        select: {
          mid: true,
          dba: true,
          agents: {
            include: {
              agent: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { netCommission: "desc" },
  });

  const uploads = await prisma.residualUpload.findMany({
    where: {
      ...(year ? { year } : {}),
      ...(month ? { month } : {}),
    },
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json({
    residuals: residuals.map((r) => ({
      id: r.id,
      mid: r.merchant.mid,
      dba: r.merchant.dba,
      agents: r.merchant.agents.map((ma) => ma.agent.name),
      volume: r.volume,
      income: r.income,
      netCommission: r.netCommission,
      transactions: r.transactions,
      processor: r.processor,
    })),
    uploads,
  });
}
