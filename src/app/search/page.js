"use client";
import { useSearchParams } from "next/navigation";
import Header from "../components/Header"

export default function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("query");

  return (
    <div className="p-4">
      <Header/>
      <h1 className="text-2xl font-bold">Search Results</h1>
      {query ? (
        <p className="mt-2">Results for: <strong>{query}</strong></p>
      ) : (
        <p className="mt-2">No search query provided.</p>
      )}
    </div>
  );
}