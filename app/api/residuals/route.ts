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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { merchantId, year, month, volume, income, netCommission, transactions } = body;

    if (!merchantId || !year || !month) {
      return NextResponse.json(
        { error: "Location, year, and month are required" },
        { status: 400 }
      );
    }

    // Get the merchant's processor
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { processor: true },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 }
      );
    }

    // Upsert — update if entry exists for this merchant/processor/month, create otherwise
    const residual = await prisma.residual.upsert({
      where: {
        merchantId_processor_year_month: {
          merchantId,
          processor: merchant.processor,
          year: parseInt(year),
          month: parseInt(month),
        },
      },
      update: {
        volume: parseFloat(volume) || 0,
        income: parseFloat(income) || 0,
        netCommission: parseFloat(netCommission) || 0,
        transactions: parseInt(transactions) || 0,
      },
      create: {
        merchantId,
        processor: merchant.processor,
        year: parseInt(year),
        month: parseInt(month),
        volume: parseFloat(volume) || 0,
        income: parseFloat(income) || 0,
        netCommission: parseFloat(netCommission) || 0,
        transactions: parseInt(transactions) || 0,
      },
    });

    return NextResponse.json(residual, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
