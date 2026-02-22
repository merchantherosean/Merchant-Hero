import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  const { action, merchantIds } = body;

  if (!Array.isArray(merchantIds) || merchantIds.length === 0) {
    return NextResponse.json(
      { error: "merchantIds must be a non-empty array" },
      { status: 400 }
    );
  }

  // ── Assign Agent ──────────────────────────────────
  if (action === "assignAgent") {
    const { agentId, bpsRate } = body;
    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    let affected = 0;
    for (const merchantId of merchantIds) {
      await prisma.merchantAgent.upsert({
        where: { merchantId_agentId: { merchantId, agentId } },
        create: { merchantId, agentId, bpsRate: bpsRate ?? null },
        update: { bpsRate: bpsRate ?? null },
      });
      affected++;
    }

    return NextResponse.json({ success: true, affected });
  }

  // ── Update Status ─────────────────────────────────
  if (action === "updateStatus") {
    const { status } = body;
    if (!status || !["Active", "Inactive", "Closed"].includes(status)) {
      return NextResponse.json(
        { error: "status must be Active, Inactive, or Closed" },
        { status: 400 }
      );
    }

    const result = await prisma.merchant.updateMany({
      where: { id: { in: merchantIds } },
      data: { status },
    });

    return NextResponse.json({ success: true, affected: result.count });
  }

  // ── Set Hidden ────────────────────────────────────
  if (action === "setHidden") {
    const { hidden } = body;
    if (typeof hidden !== "boolean") {
      return NextResponse.json({ error: "hidden must be a boolean" }, { status: 400 });
    }

    const result = await prisma.merchant.updateMany({
      where: { id: { in: merchantIds } },
      data: { hidden },
    });

    return NextResponse.json({ success: true, affected: result.count });
  }

  // ── Update BPS Rate ───────────────────────────────
  if (action === "updateBps") {
    const { agentId, bpsRate } = body;
    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    const result = await prisma.merchantAgent.updateMany({
      where: {
        merchantId: { in: merchantIds },
        agentId,
      },
      data: { bpsRate: bpsRate ?? null },
    });

    return NextResponse.json({ success: true, affected: result.count });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
