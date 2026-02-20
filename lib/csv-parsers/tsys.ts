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

  const headerIdx = findHeaderRow(rows, ["dba", "mid", "volume", "net"]);
  const colMap = createColumnMap(rows[headerIdx]);

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    try {
      const mid = getColAny(row, colMap, ["mid"]);
      const dba = getColAny(row, colMap, ["dba"]);

      if (!dba && !mid) continue;

      // Volume: combine actual volume + debit volume if separate columns exist
      const volume = safeParseCurrency(getColAny(row, colMap, ["volume"]));
      const debitVolume = safeParseCurrency(getColAny(row, colMap, ["debit volume"]));
      const totalVolume = volume + debitVolume;

      const transactions = safeParseInt(getColAny(row, colMap, ["transactions"]));
      const income = safeParseCurrency(getColAny(row, colMap, ["income"]));

      // Net commission: try multiple column name variants
      const netCommission = safeParseCurrency(
        getColAny(row, colMap, ["total net", "net", "net commission"])
      );

      // Agent info
      const agentName = getColAny(row, colMap, ["agent"]);

      // Parse split from Payout Schedule like "[248] Agent Split 15%"
      const payoutSchedule = getColAny(row, colMap, ["payout schedule"]);
      let splitPercent: number | undefined;
      if (payoutSchedule) {
        const match = payoutSchedule.match(/(\d+(?:\.\d+)?)%/);
        if (match) {
          splitPercent = parseFloat(match[1]);
        }
      }

      records.push({
        mid,
        dba,
        agentName: agentName && agentName.toLowerCase() !== "merchant hero" ? agentName : undefined,
        volume: totalVolume,
        income,
        netCommission,
        transactions,
        splitPercent,
      });
    } catch (err) {
      errors.push(`Row ${i + 1}: Parse error`);
    }
  }

  const totalVol = records.reduce((s, r) => s + r.volume, 0);
  const totalNet = records.reduce((s, r) => s + r.netCommission, 0);

  return { records, errors, totalVolume: totalVol, totalNet };
}
