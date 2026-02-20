import type { CSVParseResult, ParsedResidualRecord } from "@/lib/types";
import { csvToRows, findHeaderRow, createColumnMap, getCol, getColAny } from "./index";
import { safeParseCurrency, safeParseInt } from "@/lib/formatters";

export function parseMaverick(csvText: string): CSVParseResult {
  const rows = csvToRows(csvText);
  const errors: string[] = [];
  const records: ParsedResidualRecord[] = [];

  if (rows.length < 2) {
    return { records, errors: ["File appears to be empty"], totalVolume: 0, totalNet: 0 };
  }

  const headerIdx = findHeaderRow(rows, ["dba", "mid", "bankcard volume", "net commission"]);
  const colMap = createColumnMap(rows[headerIdx]);

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    try {
      const mid = getColAny(row, colMap, ["mid"]);
      const dba = getColAny(row, colMap, ["dba"]);

      if (!dba && !mid) continue;

      // Volume = Bankcard Volume + Debit Volume
      const bankcardVolume = safeParseCurrency(getColAny(row, colMap, ["bankcard volume", "sales amount"]));
      const debitVolume = safeParseCurrency(getColAny(row, colMap, ["debit volume"]));
      const totalVolume = bankcardVolume + debitVolume;

      const transactions = safeParseInt(getColAny(row, colMap, ["bankcard count"]));
      const income = safeParseCurrency(getColAny(row, colMap, ["income"]));

      // Agent Net = Net Commission (or Agent Payout, or Commission)
      const netCommission = safeParseCurrency(
        getColAny(row, colMap, ["net commission", "agent payout", "commission"])
      );

      // Sub Agent Name for agent assignment
      const agentName = getColAny(row, colMap, ["sub agent name"]);

      records.push({
        mid,
        dba,
        agentName: agentName || undefined,
        volume: totalVolume,
        income,
        netCommission,
        transactions,
      });
    } catch (err) {
      errors.push(`Row ${i + 1}: Parse error`);
    }
  }

  const totalVol = records.reduce((s, r) => s + r.volume, 0);
  const totalNet = records.reduce((s, r) => s + r.netCommission, 0);

  return { records, errors, totalVolume: totalVol, totalNet };
}
