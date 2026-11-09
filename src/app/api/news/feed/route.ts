import { parseRss, type FeedItem } from "@/lib/rss";

export const dynamic = "force-dynamic";

const cache = new Map<string, { at: number; items: FeedItem[] }>();

const sources: Record<string, { url: string; label: string }> = {
  ai: { url: "https://hnrss.org/newest?q=AI&points=30", label: "Hacker News · AI" },
  sap: { url: "https://news.sap.com/feed/", label: "SAP News" },
};

export async function GET(request: Request): Promise<Response> {
  const kind = new URL(request.url).searchParams.get("kind") === "sap" ? "sap" : "ai";
  const source = sources[kind];
  const cached = cache.get(kind);
  if (cached && Date.now() - cached.at < 15 * 60 * 1000) {
    return Response.json({ kind, source: source.label, items: mark(kind, cached.items) });
  }
  const response = await fetch(source.url, {
    headers: { "user-agent": "huiting-personal", accept: "application/rss+xml, application/xml, text/xml" },
  });
  if (!response.ok) return Response.json({ message: "新闻源暂时没有返回。" }, { status: 502 });
  const items = parseRss(await response.text(), kind === "sap" ? 16 : 8);
  cache.set(kind, { at: Date.now(), items });
  return Response.json({ kind, source: source.label, items: mark(kind, items) });
}

function mark(kind: string, items: FeedItem[]) {
  return items.map((item) => ({
    ...item,
    abap: kind === "sap" && /ABAP|BTP|RAP|S\/4|CAP/i.test(`${item.title} ${item.summary}`),
  }));
}
