import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { to: { contains: search, mode: "insensitive" as const } },
          { subject: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [emails, total] = await Promise.all([
    prisma.sentEmail.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.sentEmail.count({ where }),
  ]);

  return NextResponse.json({ emails, total, page, limit });
}
