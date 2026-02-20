import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const links = await prisma.appLink.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });
  return NextResponse.json(links);
}

export async function POST(req: Request) {
  const body = await req.json();
  const link = await prisma.appLink.create({
    data: {
      title: body.title,
      url: body.url,
      description: body.description,
      category: body.category,
    },
  });
  return NextResponse.json(link, { status: 201 });
}

export async function DELETE(req: Request) {
  const body = await req.json();
  await prisma.appLink.delete({ where: { id: body.id } });
  return NextResponse.json({ success: true });
}
