import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCSV } from "@/lib/csv-parsers";
import type { Processor } from "@/lib/types";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

/**
 * Convert an xlsx/xls file buffer into CSV text.
 * Takes the first sheet and outputs standard CSV.
 */
function xlsxToCSV(buffer: ArrayBuffer): string {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_csv(sheet);
}

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

    // Handle both CSV and xlsx/xls files
    let csvText: string;
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const buffer = await file.arrayBuffer();
      csvText = xlsxToCSV(buffer);
    } else {
      csvText = await file.text();
    }

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

      // Upsert agent if present (creates agent record but does NOT auto-assign to merchant)
      if (record.agentName) {
        const normalizedName = record.agentName.trim();
        if (normalizedName && normalizedName.toLowerCase() !== "merchant hero" && normalizedName.toLowerCase() !== "merchant hero llc") {
          const agent = await prisma.agent.upsert({
            where: { name: normalizedName },
            create: {
              name: normalizedName,
              status: "Active",
            },
            update: {},
          });

          // Check if this was a new agent (created recently)
          const agentAge = Date.now() - new Date(agent.createdAt).getTime();
          if (agentAge < 5000) newAgents++;
        }
      }

      // Upsert merchant (no agent assignment — agents are assigned manually via UI)
      // If merchant is marked as "lost", preserve its hidden/closed/lost state
      const existingMerchant = await prisma.merchant.findUnique({
        where: { mid: record.mid },
        select: { lost: true },
      });

      const merchant = await prisma.merchant.upsert({
        where: { mid: record.mid },
        create: {
          mid: record.mid,
          dba: record.dba,
          processor,
          status: record.status || "Active",
        },
        update: existingMerchant?.lost
          ? {
              // Lost merchants: only update DBA, keep hidden+closed+lost intact
              dba: record.dba || undefined,
            }
          : {
              dba: record.dba || undefined,
              status: record.status || undefined,
            },
      });

      // Check if new merchant
      const merchantAge = Date.now() - new Date(merchant.createdAt).getTime();
      if (merchantAge < 5000) newMerchants++;

      // Upsert residual record (pure financial data, no agent reference)
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
          processor,
          year,
          month,
          volume: record.volume,
          income: record.income,
          netCommission: record.netCommission,
          transactions: record.transactions,
        },
        update: {
          volume: record.volume,
          income: record.income,
          netCommission: record.netCommission,
          transactions: record.transactions,
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
