import {
  CACHE_MS,
  RANKING_RULES,
  VIDEOS_PER_QUERY,
  YOUTUBE_CATEGORIES,
  YOUTUBE_SOURCE,
  asCount,
  boardResponse,
  categoryBoards,
  type VideoBoardPayload,
  type VideoHit,
} from "@/lib/video-catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

const cache = new Map<string, { at: number; status: number; board: VideoBoardPayload }>();

type QueryOutcome = { query: string; ids: string[]; error?: string; fatal?: boolean };
type VideoStat = { title: string; channel: string; likes: number };

export async function GET(): Promise<Response> {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim() ?? "";
  if (!apiKey) {
    return Response.json(
      { message: "服务器还没有配置 YOUTUBE_API_KEY，所以不能向 YouTube 要视频。" },
      { status: 503 },
    );
  }
  const cached = cache.get("board");
  if (cached && Date.now() - cached.at < CACHE_MS) return Response.json(cached.board, { status: cached.status });
  try {
    const board = await loadBoard(apiKey);
    const result = boardResponse(board);
    cache.set("board", { at: Date.now(), status: result.status, board: result.body });
    return Response.json(result.body, { status: result.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "YouTube 暂时没有返回。";
    return Response.json({ message: message.split(apiKey).join("") }, { status: 502 });
  }
}

async function loadBoard(apiKey: string): Promise<VideoBoardPayload> {
  const queries = YOUTUBE_CATEGORIES.flatMap((category) => [...category.queries]);
  const outcomes = await mapPool(queries, 3, (query) => searchVideos(query, apiKey));
  const fatal = outcomes.find((outcome) => outcome.fatal)?.error;
  const failures = new Map<string, string>();
  const found: { query: string; id: string }[] = [];
  for (const outcome of outcomes) {
    if (outcome.error) failures.set(outcome.query, outcome.error);
    for (const id of outcome.ids) found.push({ query: outcome.query, id });
  }
  const stats = await loadStats([...new Set(found.map((item) => item.id))], apiKey);
  const hits: VideoHit[] = [];
  for (const item of found) {
    const stat = stats.get(item.id);
    if (!stat) continue;
    hits.push({
      id: item.id,
      title: stat.title || item.id,
      channel: stat.channel,
      url: `https://www.youtube.com/watch?v=${encodeURIComponent(item.id)}`,
      likes: stat.likes,
      query: item.query,
    });
  }
  return {
    platform: "youtube",
    source: YOUTUBE_SOURCE,
    rules: RANKING_RULES,
    categories: categoryBoards(YOUTUBE_CATEGORIES, hits, failures),
    message: fatal,
  };
}

async function searchVideos(query: string, apiKey: string): Promise<QueryOutcome> {
  const url = new URL(SEARCH_URL);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("order", "rating");
  url.searchParams.set("maxResults", String(VIDEOS_PER_QUERY));
  url.searchParams.set("q", query);
  url.searchParams.set("key", apiKey);
  let response: Response;
  try {
    response = await fetch(url, { next: { revalidate: 0 }, signal: AbortSignal.timeout(12_000) });
  } catch {
    return { query, ids: [], error: `「${query}」没有返回。` };
  }
  const payload = (await response.json().catch(() => null)) as {
    error?: { errors?: { reason?: string }[] };
    items?: { id?: { videoId?: string } }[];
  } | null;
  if (!response.ok) {
    const reason = payload?.error?.errors?.[0]?.reason;
    if (reason === "quotaExceeded") return { query, ids: [], error: "YouTube 今日配额用完了，稍后再试。", fatal: true };
    if (reason === "keyInvalid" || reason === "API_KEY_INVALID") {
      return { query, ids: [], error: "YouTube 没有接受服务器上的 YOUTUBE_API_KEY。", fatal: true };
    }
    return { query, ids: [], error: `「${query}」没有返回。` };
  }
  const ids = (payload?.items ?? [])
    .map((item) => item.id?.videoId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  return { query, ids };
}

async function loadStats(ids: string[], apiKey: string): Promise<Map<string, VideoStat>> {
  const stats = new Map<string, VideoStat>();
  if (ids.length === 0) return stats;
  for (let index = 0; index < ids.length; index += 50) {
    const chunk = ids.slice(index, index + 50);
    const url = new URL(VIDEOS_URL);
    url.searchParams.set("part", "snippet,statistics");
    url.searchParams.set("id", chunk.join(","));
    url.searchParams.set("key", apiKey);
    let response: Response;
    try {
      response = await fetch(url, { next: { revalidate: 0 }, signal: AbortSignal.timeout(12_000) });
    } catch {
      throw new Error("YouTube 没有返回点赞数。");
    }
    if (!response.ok) throw new Error("YouTube 没有返回点赞数。");
    const payload = (await response.json()) as {
      items?: { id?: string; snippet?: { title?: string; channelTitle?: string }; statistics?: { likeCount?: string } }[];
    };
    for (const item of payload.items ?? []) {
      if (!item.id) continue;
      stats.set(item.id, {
        title: item.snippet?.title ?? "",
        channel: item.snippet?.channelTitle ?? "",
        likes: asCount(item.statistics?.likeCount),
      });
    }
  }
  return stats;
}

async function mapPool<T, R>(items: readonly T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      results[index] = await task(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}
