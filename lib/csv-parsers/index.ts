import type { Processor, CSVParseResult } from "@/lib/types";
import { parseSignaPay } from "./signapay";
import { parseFiserv } from "./fiserv";
import { parseTsys } from "./tsys";
import { parseMaverick } from "./maverick";

const parsers: Record<Processor, (csvText: string) => CSVParseResult> = {
  signapay: parseSignaPay,
  fiserv: parseFiserv,
  tsys: parseTsys,
  maverick: parseMaverick,
};

export function parseCSV(csvText: string, processor: Processor): CSVParseResult {
  return parsers[processor](csvText);
}

/**
 * Parse CSV text into rows, handling quoted fields with commas/newlines inside.
 */
export function csvToRows(text: string): string[][] {
  const rows: string[][] = [];
  // Remove BOM
  let cleaned = text.replace(/^\uFEFF/, "");
  // Normalize line endings
  cleaned = cleaned.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < cleaned.length && cleaned[i + 1] === '"') {
          // Escaped quote
          currentField += '"';
          i++;
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f !== "")) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  // Push last field and row
  currentRow.push(currentField.trim());
  if (currentRow.some((f) => f !== "")) {
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Find the header row index by looking for known column names.
 * Searches the first 10 rows.
 */
export function findHeaderRow(rows: string[][], knownHeaders: string[]): number {
  const lower = knownHeaders.map((h) => h.toLowerCase());
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const rowLower = rows[i].map((c) => c.toLowerCase().trim());
    const matches = lower.filter((h) => rowLower.some((c) => c.includes(h)));
    if (matches.length >= 2) {
      return i;
    }
  }
  return 0; // default to first row
}

/**
 * Create a column index map from header row.
 */
export function createColumnMap(headerRow: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headerRow.forEach((h, i) => {
    map.set(h.toLowerCase().trim(), i);
  });
  return map;
}

/**
 * Get value from a row by column name (case-insensitive).
 */
export function getCol(row: string[], colMap: Map<string, number>, name: string): string {
  const idx = colMap.get(name.toLowerCase().trim());
  if (idx === undefined || idx >= row.length) return "";
  return row[idx]?.trim() || "";
}

/**
 * Try multiple column names and return the first match.
 */
export function getColAny(row: string[], colMap: Map<string, number>, names: string[]): string {
  for (const name of names) {
    const val = getCol(row, colMap, name);
    if (val) return val;
  }
  return "";
}
