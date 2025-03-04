import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");

  if (!query || query.length < 2) {
    return NextResponse.json({ quotes: [] }, { status: 200 });
  }

  try {
    const response = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${query}`
    );
    const data = await response.json();

    // ✅ Symbol과 longname만 추출
    const formattedQuotes = (data.quotes || []).map((quote) => ({
      symbol: quote.symbol,
      longname: quote.longname || quote.shortname, // longname 없으면 shortname 사용
    }));

    return NextResponse.json({ quotes: formattedQuotes }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch autocomplete data" },
      { status: 500 }
    );
  }
}