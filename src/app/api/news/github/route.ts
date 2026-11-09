import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

type Repo = {
  fullName: string;
  url: string;
  description: string;
  stars: number;
  language: string;
  pushedAt: string;
};

const cache = new Map<string, { at: number; repos: Repo[] }>();

export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 60) || "AI";
  const today = new Date().toISOString().slice(0, 10);
  const key = `${query}|${today}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < 15 * 60 * 1000) {
    return Response.json(payload(query, today, cached.repos));
  }
  const search = new URL("https://api.github.com/search/repositories");
  search.searchParams.set("q", `${query} created:>=${today}`);
  search.searchParams.set("sort", "stars");
  search.searchParams.set("order", "desc");
  search.searchParams.set("per_page", "8");
  const response = await fetch(search, {
    headers: { accept: "application/vnd.github+json", "user-agent": "huiting-personal" },
    next: { revalidate: 0 },
  });
  if (!response.ok) {
    return Response.json({ message: "GitHub 搜索暂时没有返回。" }, { status: 502 });
  }
  const data = (await response.json()) as {
    items?: {
      full_name?: string;
      html_url?: string;
      description?: string | null;
      stargazers_count?: number;
      language?: string | null;
      pushed_at?: string;
    }[];
  };
  const repos: Repo[] = (data.items ?? []).map((item) => ({
    fullName: item.full_name ?? "",
    url: item.html_url ?? "",
    description: item.description ?? "",
    stars: item.stargazers_count ?? 0,
    language: item.language ?? "",
    pushedAt: item.pushed_at ?? "",
  }));
  cache.set(key, { at: Date.now(), repos });
  return Response.json(payload(query, today, repos));
}

function payload(query: string, today: string, repos: Repo[]) {
  const github = readStore().profile.github || "zhouluna";
  return {
    query,
    today,
    github,
    accountUrl: `https://github.com/${github}`,
    searchUrl: `https://github.com/search?q=${encodeURIComponent(query)}&type=repositories&s=stars&o=desc`,
    repos,
  };
}
