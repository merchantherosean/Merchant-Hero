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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (search) {
    where.OR = [
      { dba: { contains: search, mode: "insensitive" } },
      { mid: { contains: search } },
    ];
  }
  if (status && status !== "all") where.status = status;
  if (processor && processor !== "all") where.processor = processor;
  if (!showHidden) where.hidden = false;
  if (tagId) {
    where.tags = { some: { tagId } };
  }

  const merchants = await prisma.merchant.findMany({
    where,
    include: {
      agent: { select: { id: true, name: true } },
      residuals: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
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
      bpsRate: m.bpsRate,
      agentId: m.agent?.id ?? null,
      agentName: m.agent?.name ?? null,
      latestVolume: m.residuals[0]?.volume ?? null,
      latestNet: m.residuals[0]?.netCommission ?? null,
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
      agentId: body.agentId,
      bpsRate: body.bpsRate,
    },
  });
  return NextResponse.json(merchant, { status: 201 });
}
