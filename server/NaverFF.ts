import { load } from "cheerio";
import { httpRequest } from "./httpClient";

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
};

export interface ForeignHoldingRow {
  date: string;
  close: number | null;
  change: number | null;
  changeRate: number | null;
  volume: number | null;
  institutionalNet: number | null;
  foreignNet: number | null;
  foreignShares: number | null;
  foreignOwnership: number | null;
}

function toNumberOrNull(value: string): number | null {
  const cleaned = value.replace(/[,+\s]/g, "").replace(/^\-$/, "");
  if (!cleaned || cleaned === "-" || cleaned === "0") {
    return cleaned === "0" ? 0 : null;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractChange(raw: string): number | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (trimmed.includes("상승")) {
    return toNumberOrNull(`+${trimmed.replace(/[^\d.]/g, "")}`);
  }
  if (trimmed.includes("하락")) {
    return toNumberOrNull(`-${trimmed.replace(/[^\d.]/g, "")}`);
  }
  return toNumberOrNull(trimmed.replace(/[^\d.-]/g, ""));
}

export async function fetchForeignHoldingsTable(code: string, page = 1): Promise<ForeignHoldingRow[]> {
  const symbol = code.replace(/\D/g, "");
  if (!symbol) {
    throw new Error("Invalid stock code for Naver foreign holdings table.");
  }

  const baseUrl = `https://finance.naver.com/item/frgn.naver?code=${symbol}&page=${page}`;
  const response = await httpRequest(baseUrl, { headers: DEFAULT_HEADERS });

  if (!response.ok) {
    throw new Error(`Failed to fetch Naver foreign holdings page: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = load(html);

  const table = $('table[summary*="외국인 기관 순매매 거래량"]');
  if (!table.length) {
    return [];
  }

  const rows: ForeignHoldingRow[] = [];
  table.find("tr").each((_, row) => {
    const columns = $(row).find("td").toArray();
    if (columns.length !== 9) {
      return;
    }

    const [date, close, change, changeRate, volume, instNet, foreignNet, foreignShares, foreignOwnership] =
      columns.map((col) => $(col).text().trim());

    rows.push({
      date,
      close: toNumberOrNull(close),
      change: extractChange(change),
      changeRate: toNumberOrNull(changeRate.replace("%", "")),
      volume: toNumberOrNull(volume),
      institutionalNet: toNumberOrNull(instNet),
      foreignNet: toNumberOrNull(foreignNet),
      foreignShares: toNumberOrNull(foreignShares),
      foreignOwnership: toNumberOrNull(foreignOwnership),
    });
  });

  return rows;
}
