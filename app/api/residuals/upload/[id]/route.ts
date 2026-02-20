import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Find the upload record to get processor/year/month
  const upload = await prisma.residualUpload.findUnique({ where: { id } });
  if (!upload) {
    return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  }

  // Delete all residuals for this processor + month + year
  const deleted = await prisma.residual.deleteMany({
    where: {
      processor: upload.processor,
      year: upload.year,
      month: upload.month,
    },
  });

  // Delete the upload record itself
  await prisma.residualUpload.delete({ where: { id } });

  return NextResponse.json({
    success: true,
    deletedResiduals: deleted.count,
    processor: upload.processor,
    year: upload.year,
    month: upload.month,
  });
}
