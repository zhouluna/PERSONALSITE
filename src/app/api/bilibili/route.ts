import { signWbi, wbiKeyFromUrl } from "@/lib/bilibili-wbi";
import {
  BILIBILI_CATEGORIES,
  BILIBILI_SOURCE,
  CACHE_MS,
  RANKING_RULES,
  VIDEOS_PER_QUERY,
  bilibiliHits,
  boardResponse,
  categoryBoards,
  type VideoBoardPayload,
  type VideoHit,
} from "@/lib/video-catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NAV_URL = "https://api.bilibili.com/x/web-interface/nav";
const SEARCH_URL = "https://api.bilibili.com/x/web-interface/wbi/search/type";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const BLOCKED = "Bilibili 拦截了服务器请求，没有拿到视频。";

const cache = new Map<string, { at: number; status: number; board: VideoBoardPayload }>();

type QueryOutcome = { query: string; hits: VideoHit[]; error?: string };

export async function GET(): Promise<Response> {
  const cached = cache.get("board");
  if (cached && Date.now() - cached.at < CACHE_MS) return Response.json(cached.board, { status: cached.status });
  try {
    const board = await loadBoard();
    const result = boardResponse(board);
    cache.set("board", { at: Date.now(), status: result.status, board: result.body });
    return Response.json(result.body, { status: result.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilibili 暂时没有返回。";
    return Response.json({ message }, { status: 502 });
  }
}

async function loadBoard(): Promise<VideoBoardPayload> {
  const keys = await wbiKeys();
  const queries = BILIBILI_CATEGORIES.flatMap((category) => [...category.queries]);
  const outcomes = await mapPool(queries, 3, (query) => searchVideos(query, keys.imgKey, keys.subKey));
  const failures = new Map<string, string>();
  const hits: VideoHit[] = [];
  for (const outcome of outcomes) {
    if (outcome.error) failures.set(outcome.query, outcome.error);
    hits.push(...outcome.hits);
  }
  const blocked = [...failures.values()].every((message) => message === BLOCKED) && failures.size === queries.length;
  return {
    platform: "bilibili",
    source: BILIBILI_SOURCE,
    rules: RANKING_RULES,
    categories: categoryBoards(BILIBILI_CATEGORIES, hits, failures),
    message: blocked ? BLOCKED : undefined,
  };
}

async function wbiKeys(): Promise<{ imgKey: string; subKey: string }> {
  const response = await fetch(NAV_URL, {
    headers: { "user-agent": USER_AGENT, referer: "https://www.bilibili.com/" },
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("Bilibili 没有返回签名参数。");
  const payload = (await response.json()) as { data?: { wbi_img?: { img_url?: string; sub_url?: string } } };
  const imgUrl = payload.data?.wbi_img?.img_url;
  const subUrl = payload.data?.wbi_img?.sub_url;
  if (!imgUrl || !subUrl) throw new Error("Bilibili 没有返回签名参数。");
  return { imgKey: wbiKeyFromUrl(imgUrl), subKey: wbiKeyFromUrl(subUrl) };
}

async function searchVideos(query: string, imgKey: string, subKey: string): Promise<QueryOutcome> {
  const signed = signWbi({ search_type: "video", keyword: query, order: "stow", page: "1" }, imgKey, subKey);
  let response: Response;
  try {
    response = await fetch(`${SEARCH_URL}?${signed}`, {
      headers: { "user-agent": USER_AGENT, referer: "https://www.bilibili.com/" },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return { query, hits: [], error: `「${query}」没有返回。` };
  }
  if (!response.ok) return { query, hits: [], error: response.status === 412 ? BLOCKED : `「${query}」没有返回。` };
  const payload = (await response.json().catch(() => null)) as { code?: number; data?: { result?: unknown } } | null;
  if (!payload || typeof payload.code !== "number") return { query, hits: [], error: BLOCKED };
  if (payload.code === -412) return { query, hits: [], error: BLOCKED };
  if (payload.code !== 0) return { query, hits: [], error: `「${query}」没有返回。` };
  return { query, hits: bilibiliHits(query, payload.data?.result, VIDEOS_PER_QUERY) };
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
