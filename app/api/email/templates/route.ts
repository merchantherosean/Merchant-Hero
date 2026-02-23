import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const templates = await prisma.emailTemplate.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, subject, body: templateBody } = body;

    if (!name || !subject || !templateBody) {
      return NextResponse.json(
        { error: "Name, subject, and body are all required" },
        { status: 400 }
      );
    }

    const template = await prisma.emailTemplate.create({
      data: { name, subject, body: templateBody },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    // Handle unique constraint violation on name
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "A template with this name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
