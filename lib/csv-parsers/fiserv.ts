import type { CSVParseResult, ParsedResidualRecord } from "@/lib/types";
import { csvToRows, findHeaderRow, createColumnMap, getCol, getColAny } from "./index";
import { safeParseCurrency, safeParseInt } from "@/lib/formatters";

export function parseFiserv(csvText: string): CSVParseResult {
  const rows = csvToRows(csvText);
  const errors: string[] = [];
  const records: ParsedResidualRecord[] = [];

  if (rows.length < 2) {
    return { records, errors: ["File appears to be empty"], totalVolume: 0, totalNet: 0 };
  }

  // Fiserv has title row, blank row, then headers on row 3
  const headerIdx = findHeaderRow(rows, ["merchant", "merchant id", "sales amount", "agent net"]);
  const colMap = createColumnMap(rows[headerIdx]);

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    try {
      const merchantId = getColAny(row, colMap, ["merchant id"]);
      const dba = getColAny(row, colMap, ["merchant"]);

      if (!dba && !merchantId) continue;

      const volume = safeParseCurrency(getColAny(row, colMap, ["sales amount"]));
      const totalProfit = safeParseCurrency(getColAny(row, colMap, ["net"]));
      const agentNet = safeParseCurrency(getColAny(row, colMap, ["agent net"]));
      const transactions = safeParseInt(getColAny(row, colMap, ["transactions"]));

      records.push({
        mid: merchantId,
        dba,
        volume,
        income: totalProfit,
        netCommission: agentNet,
        transactions,
      });
    } catch (err) {
      errors.push(`Row ${i + 1}: Parse error`);
    }
  }

  const totalVolume = records.reduce((s, r) => s + r.volume, 0);
  const totalNet = records.reduce((s, r) => s + r.netCommission, 0);

  return { records, errors, totalVolume, totalNet };
}
