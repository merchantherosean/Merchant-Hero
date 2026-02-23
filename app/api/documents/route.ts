import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/documents?category=contracts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const where: Record<string, unknown> = {};
  if (category) where.category = category;

  const documents = await prisma.document.findMany({
    where,
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json(documents);
}

// POST /api/documents — save metadata after client-side blob upload
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, category, fileUrl, fileSize, mimeType } = body;

    if (!name || !category || !fileUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const document = await prisma.document.create({
      data: {
        name,
        category,
        fileUrl,
        fileSize: fileSize || 0,
        mimeType: mimeType || "application/octet-stream",
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Document save error:", error);
    return NextResponse.json(
      { error: `Save failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
