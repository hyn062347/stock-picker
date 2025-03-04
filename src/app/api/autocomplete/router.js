import yahooFinance from "yahoo-finance2";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");

  if (!query) {
    return new Response(JSON.stringify({ error: "No query provided" }), { status: 400 });
  }

  try {
    const searchResults = await yahooFinance.search(query);
    return new Response(JSON.stringify(searchResults), { status: 200 });
  } catch (error) {
    console.error("Yahoo Finance Autocomplete API Error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch suggestions" }), { status: 500 });
  }
}