import type { CSVParseResult, ParsedResidualRecord } from "@/lib/types";
import { csvToRows, findHeaderRow, createColumnMap, getCol, getColAny } from "./index";
import { safeParseCurrency, safeParseInt, safeParsePercent } from "@/lib/formatters";

export function parseTsys(csvText: string): CSVParseResult {
  const rows = csvToRows(csvText);
  const errors: string[] = [];
  const records: ParsedResidualRecord[] = [];

  if (rows.length < 2) {
    return { records, errors: ["File appears to be empty"], totalVolume: 0, totalNet: 0 };
  }

  const headerIdx = findHeaderRow(rows, ["dba", "mid"]);
  const colMap = createColumnMap(rows[headerIdx]);

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    try {
      const mid = getColAny(row, colMap, ["mid"]);
      const dba = getColAny(row, colMap, ["dba"]);

      if (!dba && !mid) continue;

      // Volume: combine bankcard/sales volume + debit volume
      // Handles both file formats:
      //   - partner file: "Bankcard Volume" (Col H) + "Debit Volume" (Col I)
      //   - residual export: "Sales Amount" (Col J)
      //   - legacy: "Volume" + "Debit Volume"
      const bankcardVolume = safeParseCurrency(
        getColAny(row, colMap, ["bankcard volume", "volume", "sales amount"])
      );
      const debitVolume = safeParseCurrency(
        getColAny(row, colMap, ["debit volume"])
      );
      const totalVolume = bankcardVolume + debitVolume;

      const transactions = safeParseInt(
        getColAny(row, colMap, ["bankcard count", "transactions", "sales count"])
      );
      const income = safeParseCurrency(getColAny(row, colMap, ["income"]));

      // Net commission: try all known column name variants
      //   - partner file: "Net Commission" (Col P)
      //   - residual export: "Total Net Revenue"
      //   - legacy: "total net", "net"
      const netCommission = safeParseCurrency(
        getColAny(row, colMap, ["net commission", "total net revenue", "total net", "net"])
      );

      // Agent info — both formats
      const agentName = getColAny(row, colMap, ["sub agent name", "agent", "agent name"]);

      // Parse split from Payout Schedule like "[248] Agent Split 15%"
      // or from "Agent Split" / "Sub Agent Split" columns
      const payoutSchedule = getColAny(row, colMap, ["payout schedule", "agent split", "sub agent split"]);
      let splitPercent: number | undefined;
      if (payoutSchedule) {
        const match = payoutSchedule.match(/(\d+(?:\.\d+)?)%/);
        if (match) {
          splitPercent = parseFloat(match[1]);
        }
      }

      // Get status from DBA Status column (residual export format)
      const dbaStatus = getColAny(row, colMap, ["dba status"]);
      let status: string | undefined;
      if (dbaStatus) {
        const lower = dbaStatus.toLowerCase();
        if (lower === "live") status = "Active";
        else if (lower === "inactive") status = "Inactive";
        else if (lower === "closed" || lower === "cancelled") status = "Closed";
      }

      records.push({
        mid,
        dba,
        agentName: agentName && agentName.toLowerCase() !== "merchant hero" && agentName.toLowerCase() !== "merchant hero llc" ? agentName : undefined,
        volume: totalVolume,
        income,
        netCommission,
        transactions,
        splitPercent,
        status,
      });
    } catch (err) {
      errors.push(`Row ${i + 1}: Parse error`);
    }
  }

  const totalVol = records.reduce((s, r) => s + r.volume, 0);
  const totalNet = records.reduce((s, r) => s + r.netCommission, 0);

  return { records, errors, totalVolume: totalVol, totalNet };
}
