export type FeedItem = {
  title: string;
  link: string;
  date: string;
  summary: string;
};

function decode(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseRss(xml: string, limit = 8): FeedItem[] {
  return xml
    .split(/<item\b/i)
    .slice(1, limit + 1)
    .map((chunk) => {
      const pick = (tag: string) => {
        const match = chunk.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
        return match ? decode(match[1]) : "";
      };
      return {
        title: pick("title"),
        link: pick("link"),
        date: pick("pubDate"),
        summary: pick("description").slice(0, 220),
      };
    })
    .filter((item) => item.title && item.link.startsWith("http"));
}
