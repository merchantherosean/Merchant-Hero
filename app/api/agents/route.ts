import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  const agents = await prisma.agent.findMany({
    where,
    include: {
      _count: { select: { merchants: true } },
      residuals: {
        select: { volume: true, netCommission: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    agents.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      phone: a.phone,
      status: a.status,
      merchantCount: a._count.merchants,
      totalVolume: a.residuals.reduce((s, r) => s + r.volume, 0),
      totalNet: a.residuals.reduce((s, r) => s + r.netCommission, 0),
    }))
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
