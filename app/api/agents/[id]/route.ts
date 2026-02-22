import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const agent = await prisma.agent.findUnique({
    where: { id },
    include: {
      tags: {
        include: {
          tag: { select: { id: true, name: true, color: true } },
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
          },
        },
      },
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Build merchants list with bpsRate
  const merchants = agent.merchantAssignments.map((ma) => ({
    id: ma.merchant.id,
    mid: ma.merchant.mid,
    dba: ma.merchant.dba,
    processor: ma.merchant.processor,
    status: ma.merchant.status,
    bpsRate: ma.bpsRate,
  }));

  // Aggregate monthly earnings using BPS calculation
  const monthlyMap = new Map<string, { year: number; month: number; volume: number; earnings: number; merchants: Set<string> }>();

  for (const ma of agent.merchantAssignments) {
    const bps = ma.bpsRate ?? 0;
    for (const r of ma.merchant.residuals) {
      const key = `${r.year}-${r.month}`;
      const earning = r.volume * (bps / 10000);
      const existing = monthlyMap.get(key);
      if (existing) {
        existing.volume += r.volume;
        existing.earnings += earning;
        existing.merchants.add(r.merchantId);
      } else {
        monthlyMap.set(key, {
          year: r.year,
          month: r.month,
          volume: r.volume,
          earnings: earning,
          merchants: new Set([r.merchantId]),
        });
      }
    }
  }

  const monthlyEarnings = Array.from(monthlyMap.values()).map((e) => ({
    year: e.year,
    month: e.month,
    volume: e.volume,
    earnings: e.earnings,
    merchantCount: e.merchants.size,
  }));

  const tags = agent.tags.map((at) => ({
    id: at.tag.id,
    name: at.tag.name,
    color: at.tag.color,
  }));

  return NextResponse.json({
    id: agent.id,
    name: agent.name,
    email: agent.email,
    phone: agent.phone,
    splitPercent: agent.splitPercent,
    status: agent.status,
    createdAt: agent.createdAt,
    merchants,
    monthlyEarnings,
    tags,
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // MerchantAgent records will cascade-delete automatically
  await prisma.agent.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  // Handle tag assignment
  if (body.addTagId) {
    await prisma.agentTag.upsert({
      where: { agentId_tagId: { agentId: id, tagId: body.addTagId } },
      create: { agentId: id, tagId: body.addTagId },
      update: {},
    });
    return NextResponse.json({ success: true });
  }

  // Handle tag removal
  if (body.removeTagId) {
    await prisma.agentTag.deleteMany({
      where: { agentId: id, tagId: body.removeTagId },
    });
    return NextResponse.json({ success: true });
  }

  // Regular agent update
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
