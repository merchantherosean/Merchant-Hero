import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { businessName: { contains: search, mode: "insensitive" } },
      { ownerName: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status && status !== "all") where.status = status;

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(leads);
}

export async function POST(req: Request) {
  const body = await req.json();
  const lead = await prisma.lead.create({
    data: {
      businessName: body.businessName,
      ownerName: body.ownerName,
      email: body.email,
      phone: body.phone,
      location: body.location,
      industry: body.industry,
      confidenceScore: body.confidenceScore || 5,
      source: body.source,
      contactMethod: body.contactMethod,
      followUpPriority: body.followUpPriority || "MEDIUM",
      notes: body.notes,
    },
  });
  return NextResponse.json(lead, { status: 201 });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const lead = await prisma.lead.update({
    where: { id: body.id },
    data: {
      businessName: body.businessName,
      ownerName: body.ownerName,
      email: body.email,
      phone: body.phone,
      location: body.location,
      industry: body.industry,
      confidenceScore: body.confidenceScore,
      source: body.source,
      followUpPriority: body.followUpPriority,
      notes: body.notes,
      status: body.status,
    },
  });
  return NextResponse.json(lead);
}

export async function DELETE(req: Request) {
  const body = await req.json();
  await prisma.lead.delete({ where: { id: body.id } });
  return NextResponse.json({ success: true });
}
