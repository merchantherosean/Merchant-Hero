import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const merchant = await prisma.merchant.findUnique({
    where: { id },
    include: {
      agents: {
        include: {
          agent: { select: { id: true, name: true } },
        },
      },
      residuals: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        select: {
          year: true,
          month: true,
          volume: true,
          income: true,
          netCommission: true,
          transactions: true,
        },
      },
      tags: {
        include: {
          tag: { select: { id: true, name: true, color: true } },
        },
      },
    },
  });

  if (!merchant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: merchant.id,
    mid: merchant.mid,
    dba: merchant.dba,
    processor: merchant.processor,
    status: merchant.status,
    hidden: merchant.hidden,
    lost: merchant.lost,
    agents: merchant.agents.map((ma) => ({
      id: ma.agent.id,
      name: ma.agent.name,
      bpsRate: ma.bpsRate,
    })),
    mcc: merchant.mcc,
    approvalDate: merchant.approvalDate,
    riskLevel: merchant.riskLevel,
    createdAt: merchant.createdAt,
    residuals: merchant.residuals,
    tags: merchant.tags.map((t) => ({ id: t.tag.id, name: t.tag.name, color: t.tag.color })),
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  // Handle agent assignment operations
  if (body.addAgent) {
    const { agentId, bpsRate } = body.addAgent;
    await prisma.merchantAgent.upsert({
      where: { merchantId_agentId: { merchantId: id, agentId } },
      create: { merchantId: id, agentId, bpsRate: bpsRate ?? null },
      update: { bpsRate: bpsRate ?? null },
    });
    return NextResponse.json({ success: true });
  }

  if (body.removeAgent) {
    const { agentId } = body.removeAgent;
    await prisma.merchantAgent.deleteMany({
      where: { merchantId: id, agentId },
    });
    return NextResponse.json({ success: true });
  }

  if (body.updateAgentBps) {
    const { agentId, bpsRate } = body.updateAgentBps;
    await prisma.merchantAgent.update({
      where: { merchantId_agentId: { merchantId: id, agentId } },
      data: { bpsRate },
    });
    return NextResponse.json({ success: true });
  }

  // Mark as Lost — sets lost=true, hidden=true, status=Closed
  if (body.markLost) {
    const merchant = await prisma.merchant.update({
      where: { id },
      data: { lost: true, hidden: true, status: "Closed" },
    });
    return NextResponse.json(merchant);
  }

  // Unmark Lost — sets lost=false (keeps hidden/status as-is for manual adjustment)
  if (body.unmarkLost) {
    const merchant = await prisma.merchant.update({
      where: { id },
      data: { lost: false, hidden: false, status: "Active" },
    });
    return NextResponse.json(merchant);
  }

  // Build update data for other merchant fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (body.dba !== undefined) data.dba = body.dba;
  if (body.status !== undefined) data.status = body.status;
  if (body.mcc !== undefined) data.mcc = body.mcc;
  if (body.hidden !== undefined) data.hidden = body.hidden;

  const merchant = await prisma.merchant.update({
    where: { id },
    data,
  });

  return NextResponse.json(merchant);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await prisma.merchantTag.deleteMany({ where: { merchantId: id } });
  await prisma.merchantAgent.deleteMany({ where: { merchantId: id } });
  await prisma.residual.deleteMany({ where: { merchantId: id } });
  await prisma.merchant.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
