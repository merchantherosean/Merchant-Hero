import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const merchant = await prisma.merchant.findUnique({
    where: { id },
    include: {
      agent: { select: { id: true, name: true } },
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
    bpsRate: merchant.bpsRate,
    agentId: merchant.agent?.id ?? null,
    agentName: merchant.agent?.name ?? null,
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

  // Build update data dynamically
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (body.dba !== undefined) data.dba = body.dba;
  if (body.status !== undefined) data.status = body.status;
  if (body.mcc !== undefined) data.mcc = body.mcc;
  if (body.hidden !== undefined) data.hidden = body.hidden;
  if (body.bpsRate !== undefined) data.bpsRate = body.bpsRate;

  // Agent assignment: can pass agentId or null to unassign
  if ("agentId" in body) {
    data.agentId = body.agentId || null;
  }

  const merchant = await prisma.merchant.update({
    where: { id },
    data,
  });

  return NextResponse.json(merchant);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await prisma.merchantTag.deleteMany({ where: { merchantId: id } });
  await prisma.residual.deleteMany({ where: { merchantId: id } });
  await prisma.merchant.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
