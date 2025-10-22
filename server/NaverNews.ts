import { load } from "cheerio";
import { httpRequest } from "./httpClient";

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
};

export interface NaverArticle {
  url: string;
  title: string;
  content: string;
}

function sanitizeTickerSymbol(raw: string): string {
  return raw.replace(/\D/g, "");
}

function resolveNewsUrl(url: string): string {
  const parsed = new URL(url);

  if (parsed.hostname.endsWith("finance.naver.com") && parsed.pathname.includes("news_read.naver")) {
    const aid = parsed.searchParams.get("article_id") ?? "";
    const oid = parsed.searchParams.get("office_id") ?? "";

    if (aid && oid) {
      return `https://n.news.naver.com/mnews/article/${oid}/${aid}`;
    }
  }

  if (parsed.pathname.startsWith("/item/")) {
    return new URL(parsed.pathname + parsed.search, "https://finance.naver.com").toString();
  }

  return parsed.toString();
}

async function fetchArticle(url: string): Promise<NaverArticle> {
  const resolved = resolveNewsUrl(url);
  const response = await httpRequest(resolved, { headers: DEFAULT_HEADERS });

  if (!response.ok) {
    throw new Error(`Failed to fetch article ${resolved}: ${response.status}`);
  }

  const html = await response.text();
  const $ = load(html);

  const title = $("h2#title_area span").text().trim() || $("h2#title_area").text().trim();
  const article = $("article#dic_area");
  if (!article.length) {
    return { url: resolved, title, content: "" };
  }

  article.find("script, style, table").remove();
  article.find("br").replaceWith("\n");

  const content = article
    .text()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  return { url: resolved, title, content };
}

export async function fetchNaverNewsArticles(code: string, page = 1): Promise<NaverArticle[]> {
  const symbol = sanitizeTickerSymbol(code);
  if (!symbol) {
    throw new Error("Invalid stock code for Naver news.");
  }

  const baseUrl = `https://finance.naver.com/item/news.naver?code=${symbol}&page=${page}`;
  const initialResponse = await httpRequest(baseUrl, { headers: DEFAULT_HEADERS });

  if (!initialResponse.ok) {
    throw new Error(`Failed to fetch Naver news page: ${initialResponse.status} ${initialResponse.statusText}`);
  }

  const initialHtml = await initialResponse.text();
  const $ = load(initialHtml);

  const frameSrc = $("#news_frame").attr("src");
  if (!frameSrc) {
    return [];
  }

  const pageAwareSrc = frameSrc.includes("page=") ? frameSrc : `${frameSrc}&page=${page}`;
  const iframeUrl = new URL(pageAwareSrc, baseUrl).toString();

  const iframeHeaders = {
    ...DEFAULT_HEADERS,
    Referer: baseUrl,
  };

  const iframeResponse = await httpRequest(iframeUrl, { headers: iframeHeaders });
  if (!iframeResponse.ok) {
    throw new Error(`Failed to fetch Naver iframe: ${iframeResponse.status} ${iframeResponse.statusText}`);
  }

  const iframeHtml = await iframeResponse.text();
  const $$ = load(iframeHtml);
  $$(".relation_lst").remove();

  const links = new Set<string>();

  $$("a[href]").each((_, element) => {
    const href = $$(element).attr("href");
    if (!href) {
      return;
    }

    if (href.startsWith("https://n.news.naver.com/mnews/article")) {
      links.add(href);
      return;
    }

    if (href.startsWith("/item/news_read.naver")) {
      const absolute = new URL(href, "https://finance.naver.com").toString();
      links.add(absolute);
    }
  });

  const articles: NaverArticle[] = [];

  for (const url of links) {
    try {
      const article = await fetchArticle(url);
      articles.push(article);
    } catch (error) {
      console.warn(`[WARN] Failed to crawl article ${url}: ${(error as Error).message}`);
    }
  }

  return articles;
}
