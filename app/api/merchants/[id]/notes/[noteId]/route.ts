import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const { noteId } = await params;
  const body = await req.json();

  if (!body.content?.trim()) {
    return NextResponse.json(
      { error: "Note content is required" },
      { status: 400 }
    );
  }

  const note = await prisma.merchantNote.update({
    where: { id: noteId },
    data: { content: body.content.trim() },
  });

  return NextResponse.json(note);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const { noteId } = await params;

  await prisma.merchantNote.delete({ where: { id: noteId } });

  return NextResponse.json({ success: true });
}
