import type { CSVParseResult, ParsedResidualRecord } from "@/lib/types";
import { csvToRows, findHeaderRow, createColumnMap, getCol, getColAny } from "./index";
import { safeParseCurrency, safeParseInt, safeParsePercent } from "@/lib/formatters";

export function parseSignaPay(csvText: string): CSVParseResult {
  const rows = csvToRows(csvText);
  const errors: string[] = [];
  const records: ParsedResidualRecord[] = [];

  if (rows.length < 2) {
    return { records, errors: ["File appears to be empty"], totalVolume: 0, totalNet: 0 };
  }

  const headerIdx = findHeaderRow(rows, ["dba", "mid", "sales amount", "total net revenue"]);
  const colMap = createColumnMap(rows[headerIdx]);

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    try {
      const mid = getColAny(row, colMap, ["mid"]);
      const dba = getColAny(row, colMap, ["dba"]);

      if (!dba && !mid) continue; // Skip empty rows

      const volume = safeParseCurrency(getColAny(row, colMap, ["sales amount"]));
      const salesCount = safeParseInt(getColAny(row, colMap, ["sales count"]));
      const netRevenue = safeParseCurrency(getColAny(row, colMap, ["total net revenue", "agent net revenue"]));
      const agentName = getColAny(row, colMap, ["sub agent name"]);
      const status = getColAny(row, colMap, ["dba status"]);
      const splitStr = getColAny(row, colMap, ["agent split"]);
      const splitPercent = safeParsePercent(splitStr);

      // Map status
      let mappedStatus: string | undefined;
      if (status) {
        const lower = status.toLowerCase();
        if (lower === "live") mappedStatus = "Active";
        else if (lower === "inactive") mappedStatus = "Inactive";
        else if (lower === "closed") mappedStatus = "Closed";
        else mappedStatus = status;
      }

      records.push({
        mid,
        dba,
        agentName: agentName || undefined,
        volume,
        income: safeParseCurrency(getColAny(row, colMap, ["sales amount"])),
        netCommission: netRevenue,
        transactions: salesCount,
        splitPercent,
        status: mappedStatus,
      });
    } catch (err) {
      errors.push(`Row ${i + 1}: Parse error`);
    }
  }

  const totalVolume = records.reduce((s, r) => s + r.volume, 0);
  const totalNet = records.reduce((s, r) => s + r.netCommission, 0);

  return { records, errors, totalVolume, totalNet };
}
