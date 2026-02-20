import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const status = searchParams.get("status");
  const processor = searchParams.get("processor");
  const showHidden = searchParams.get("showHidden") === "true";
  const tagId = searchParams.get("tagId");
  const qYear = searchParams.get("year");
  const qMonth = searchParams.get("month");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (search) {
    where.OR = [
      { dba: { contains: search, mode: "insensitive" } },
      { mid: { contains: search } },
    ];
  }
  if (status === "Lost") {
    where.lost = true;
    // Lost merchants are always hidden, so bypass the hidden filter
  } else {
    if (status && status !== "all") where.status = status;
    if (!showHidden) where.hidden = false;
  }
  if (processor && processor !== "all") where.processor = processor;
  if (tagId) {
    where.tags = { some: { tagId } };
  }

  const merchants = await prisma.merchant.findMany({
    where,
    include: {
      agents: {
        include: {
          agent: { select: { id: true, name: true } },
        },
      },
      residuals: qYear && qMonth
        ? {
            where: { year: parseInt(qYear), month: parseInt(qMonth) },
            select: { volume: true, netCommission: true },
          }
        : {
            orderBy: [{ year: "desc" as const }, { month: "desc" as const }],
            take: 1,
            select: { volume: true, netCommission: true },
          },
      tags: {
        include: {
          tag: { select: { id: true, name: true, color: true } },
        },
      },
    },
    orderBy: { dba: "asc" },
  });

  return NextResponse.json(
    merchants.map((m) => ({
      id: m.id,
      mid: m.mid,
      dba: m.dba,
      processor: m.processor,
      status: m.status,
      hidden: m.hidden,
      lost: m.lost,
      agents: m.agents.map((ma) => ({
        id: ma.agent.id,
        name: ma.agent.name,
        bpsRate: ma.bpsRate,
      })),
      latestVolume: m.residuals.length > 0 ? m.residuals.reduce((s, r) => s + r.volume, 0) : null,
      latestNet: m.residuals.length > 0 ? m.residuals.reduce((s, r) => s + r.netCommission, 0) : null,
      tags: m.tags.map((t) => ({ id: t.tag.id, name: t.tag.name, color: t.tag.color })),
    }))
  );
}

export async function POST(req: Request) {
  const body = await req.json();
  const merchant = await prisma.merchant.create({
    data: {
      mid: body.mid,
      dba: body.dba,
      processor: body.processor,
      status: body.status || "Active",
    },
  });
  return NextResponse.json(merchant, { status: 201 });
}
