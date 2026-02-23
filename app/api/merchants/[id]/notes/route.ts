import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const notes = await prisma.merchantNote.findMany({
    where: { merchantId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notes);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  if (!body.content?.trim()) {
    return NextResponse.json(
      { error: "Note content is required" },
      { status: 400 }
    );
  }

  const note = await prisma.merchantNote.create({
    data: {
      merchantId: id,
      content: body.content.trim(),
    },
  });

  return NextResponse.json(note, { status: 201 });
}
