import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET all tags with merchant counts and volume totals
export async function GET() {
  const tags = await prisma.tag.findMany({
    include: {
      merchants: {
        include: {
          merchant: {
            include: {
              residuals: {
                orderBy: [{ year: "desc" }, { month: "desc" }],
                take: 1,
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
    tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      merchantCount: tag.merchants.length,
      totalVolume: tag.merchants.reduce(
        (sum, mt) => sum + (mt.merchant.residuals[0]?.volume ?? 0),
        0
      ),
      totalNet: tag.merchants.reduce(
        (sum, mt) => sum + (mt.merchant.residuals[0]?.netCommission ?? 0),
        0
      ),
      merchants: tag.merchants.map((mt) => ({
        id: mt.merchant.id,
        mid: mt.merchant.mid,
        dba: mt.merchant.dba,
        processor: mt.merchant.processor,
        volume: mt.merchant.residuals[0]?.volume ?? 0,
        net: mt.merchant.residuals[0]?.netCommission ?? 0,
      })),
    }))
  );
}

// POST create a new tag
export async function POST(req: Request) {
  const body = await req.json();
  const tag = await prisma.tag.create({
    data: {
      name: body.name,
      color: body.color || "#7c6aef",
    },
  });
  return NextResponse.json(tag, { status: 201 });
}

// PUT update tag name/color or add/remove merchants
export async function PUT(req: Request) {
  const body = await req.json();

  // Update tag info
  if (body.name || body.color) {
    await prisma.tag.update({
      where: { id: body.id },
      data: {
        name: body.name,
        color: body.color,
      },
    });
  }

  // Add merchants to tag
  if (body.addMerchantIds && body.addMerchantIds.length > 0) {
    for (const merchantId of body.addMerchantIds) {
      await prisma.merchantTag.upsert({
        where: {
          merchantId_tagId: { merchantId, tagId: body.id },
        },
        create: { merchantId, tagId: body.id },
        update: {},
      });
    }
  }

  // Remove merchants from tag
  if (body.removeMerchantIds && body.removeMerchantIds.length > 0) {
    await prisma.merchantTag.deleteMany({
      where: {
        tagId: body.id,
        merchantId: { in: body.removeMerchantIds },
      },
    });
  }

  return NextResponse.json({ success: true });
}

// DELETE a tag
export async function DELETE(req: Request) {
  const body = await req.json();
  await prisma.merchantTag.deleteMany({ where: { tagId: body.id } });
  await prisma.tag.delete({ where: { id: body.id } });
  return NextResponse.json({ success: true });
}
