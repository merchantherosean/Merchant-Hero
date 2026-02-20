import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCSV } from "@/lib/csv-parsers";
import type { Processor } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const processor = formData.get("processor") as Processor;
    const year = parseInt(formData.get("year") as string);
    const month = parseInt(formData.get("month") as string);

    if (!file || !processor || !year || !month) {
      return NextResponse.json(
        { success: false, errors: ["Missing required fields"], recordCount: 0, totalVolume: 0, totalNet: 0, newMerchants: 0, newAgents: 0 },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const result = parseCSV(csvText, processor);

    if (result.records.length === 0) {
      return NextResponse.json(
        { success: false, errors: ["No records parsed from CSV. Check file format."], recordCount: 0, totalVolume: 0, totalNet: 0, newMerchants: 0, newAgents: 0 },
        { status: 400 }
      );
    }

    let newMerchants = 0;
    let newAgents = 0;

    // Process each record
    for (const record of result.records) {
      if (!record.mid) continue;

      // Upsert agent if present
      let agentId: string | undefined;
      if (record.agentName) {
        const normalizedName = record.agentName.trim();
        if (normalizedName && normalizedName.toLowerCase() !== "merchant hero" && normalizedName.toLowerCase() !== "merchant hero llc") {
          const agent = await prisma.agent.upsert({
            where: { name: normalizedName },
            create: {
              name: normalizedName,
              status: "Active",
              splitPercent: record.splitPercent,
            },
            update: {
              splitPercent: record.splitPercent ?? undefined,
            },
          });
          agentId = agent.id;

          // Check if this was a new agent (created recently)
          const agentAge = Date.now() - new Date(agent.createdAt).getTime();
          if (agentAge < 5000) newAgents++;
        }
      }

      // Upsert merchant
      const merchant = await prisma.merchant.upsert({
        where: { mid: record.mid },
        create: {
          mid: record.mid,
          dba: record.dba,
          processor,
          status: record.status || "Active",
          agentId,
        },
        update: {
          dba: record.dba || undefined,
          status: record.status || undefined,
          agentId: agentId || undefined,
        },
      });

      // Check if new merchant
      const merchantAge = Date.now() - new Date(merchant.createdAt).getTime();
      if (merchantAge < 5000) newMerchants++;

      // Upsert residual record
      await prisma.residual.upsert({
        where: {
          merchantId_processor_year_month: {
            merchantId: merchant.id,
            processor,
            year,
            month,
          },
        },
        create: {
          merchantId: merchant.id,
          agentId,
          processor,
          year,
          month,
          volume: record.volume,
          income: record.income,
          netCommission: record.netCommission,
          transactions: record.transactions,
          splitPercent: record.splitPercent,
        },
        update: {
          volume: record.volume,
          income: record.income,
          netCommission: record.netCommission,
          transactions: record.transactions,
          splitPercent: record.splitPercent,
          agentId: agentId || undefined,
        },
      });
    }

    // Record the upload
    await prisma.residualUpload.upsert({
      where: {
        processor_year_month: { processor, year, month },
      },
      create: {
        processor,
        year,
        month,
        fileName: file.name,
        recordCount: result.records.length,
        totalVolume: result.totalVolume,
        totalNet: result.totalNet,
      },
      update: {
        fileName: file.name,
        recordCount: result.records.length,
        totalVolume: result.totalVolume,
        totalNet: result.totalNet,
        uploadedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      recordCount: result.records.length,
      totalVolume: result.totalVolume,
      totalNet: result.totalNet,
      newMerchants,
      newAgents,
      errors: result.errors,
    }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, errors: [`Server error: ${error instanceof Error ? error.message : "Unknown error"}`], recordCount: 0, totalVolume: 0, totalNet: 0, newMerchants: 0, newAgents: 0 },
      { status: 500 }
    );
  }
}
