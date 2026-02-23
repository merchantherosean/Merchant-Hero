import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
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

// POST /api/documents — upload file to Vercel Blob + save metadata
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string | null;

    if (!file || !category) {
      return NextResponse.json(
        { error: "Missing file or category" },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const blob = await put(`documents/${category}/${file.name}`, file, {
      access: "public",
    });

    // Save metadata to database
    const document = await prisma.document.create({
      data: {
        name: file.name,
        category,
        fileUrl: blob.url,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { error: `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
