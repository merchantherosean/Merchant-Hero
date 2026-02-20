import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const agent = await prisma.agent.findUnique({
    where: { id },
    include: {
      merchants: {
        select: {
          id: true,
          mid: true,
          dba: true,
          processor: true,
          status: true,
        },
      },
      residuals: {
        select: {
          year: true,
          month: true,
          volume: true,
          netCommission: true,
          merchantId: true,
        },
      },
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Aggregate monthly earnings
  const monthlyMap = new Map<string, { year: number; month: number; volume: number; net: number; merchants: Set<string> }>();
  for (const r of agent.residuals) {
    const key = `${r.year}-${r.month}`;
    const existing = monthlyMap.get(key);
    if (existing) {
      existing.volume += r.volume;
      existing.net += r.netCommission;
      existing.merchants.add(r.merchantId);
    } else {
      monthlyMap.set(key, {
        year: r.year,
        month: r.month,
        volume: r.volume,
        net: r.netCommission,
        merchants: new Set([r.merchantId]),
      });
    }
  }

  const monthlyEarnings = Array.from(monthlyMap.values()).map((e) => ({
    year: e.year,
    month: e.month,
    volume: e.volume,
    net: e.net,
    merchantCount: e.merchants.size,
  }));

  return NextResponse.json({
    id: agent.id,
    name: agent.name,
    email: agent.email,
    phone: agent.phone,
    splitPercent: agent.splitPercent,
    status: agent.status,
    createdAt: agent.createdAt,
    merchants: agent.merchants,
    monthlyEarnings,
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Unassign merchants and residuals before deleting the agent
  await prisma.merchant.updateMany({ where: { agentId: id }, data: { agentId: null } });
  await prisma.residual.updateMany({ where: { agentId: id }, data: { agentId: null } });
  await prisma.agent.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const agent = await prisma.agent.update({
    where: { id },
    data: {
      name: body.name,
      email: body.email,
      phone: body.phone,
      splitPercent: body.splitPercent,
      status: body.status,
    },
  });

  return NextResponse.json(agent);
}
