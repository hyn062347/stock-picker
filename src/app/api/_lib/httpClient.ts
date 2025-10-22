type FetchFn = (input: any, init?: any) => Promise<any>;

let fetchImplPromise: Promise<FetchFn> | null = null;

async function ensureFetch(): Promise<FetchFn> {
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis) as FetchFn;
  }
  if (!fetchImplPromise) {
    fetchImplPromise = import("node-fetch").then((mod) => mod.default as unknown as FetchFn);
  }
  return fetchImplPromise;
}

export async function httpRequest(url: string, init: Record<string, unknown> = {}) {
  const fetchFn = await ensureFetch();
  return fetchFn(url, init);
}
