export const CACHE_MS = 15 * 60 * 1000;
export const VIDEOS_PER_QUERY = 8;
export const VIDEOS_PER_CATEGORY = 8;

export const RANKING_RULES = [
  "每个分类用下面列出的关键词各搜一次，只取该次搜索靠前的结果。",
  "按视频 id 去重。同一条视频出现在两组及以上关键词里，标成「被反复推荐」。",
  "先按出现次数从高到低排，次数相同再按点赞数从高到低排。",
  "服务器把结果放在内存里，大约 15 分钟。来源失败就留空，不编造视频。",
] as const;

export const YOUTUBE_SOURCE =
  "数据来自 YouTube Data API v3。search.list 按评分（order=rating）取候选，videos.list 读取点赞数、标题和频道。服务器要配置环境变量 YOUTUBE_API_KEY，密钥只留在服务端。";

export const BILIBILI_SOURCE =
  "数据来自 Bilibili 公开搜索，请求带 WBI 签名，不登录。视频搜索没有按点赞排序的参数，候选按收藏数（order=stow）取回，点赞数用返回里的 like。";

export type VideoCategoryId = "ai" | "hardware" | "software";

export type VideoQueryGroup = {
  id: VideoCategoryId;
  label: string;
  queries: readonly string[];
};

export const YOUTUBE_CATEGORIES: readonly VideoQueryGroup[] = [
  { id: "ai", label: "AI", queries: ["AI", "large language model", "machine learning tutorial"] },
  { id: "hardware", label: "AI+硬件", queries: ["AI hardware", "AI robot", "NVIDIA GPU AI", "Raspberry Pi AI"] },
  { id: "software", label: "AI+软件", queries: ["AI software", "AI coding assistant", "open source LLM", "Cursor AI"] },
];

export const BILIBILI_CATEGORIES: readonly VideoQueryGroup[] = [
  { id: "ai", label: "AI", queries: ["AI", "人工智能", "大模型"] },
  { id: "hardware", label: "AI+硬件", queries: ["AI 硬件", "AI 机器人", "树莓派 AI", "GPU AI"] },
  { id: "software", label: "AI+软件", queries: ["AI 软件", "Cursor", "开源大模型", "AI 编程助手"] },
];

export type VideoHit = {
  id: string;
  title: string;
  channel: string;
  url: string;
  likes: number;
  query: string;
};

export type RankedVideo = {
  id: string;
  title: string;
  channel: string;
  url: string;
  likes: number;
  appearances: number;
};

export type CategoryBoard = {
  id: VideoCategoryId;
  label: string;
  queries: string[];
  items: RankedVideo[];
  message?: string;
};

export type VideoBoardPayload = {
  platform: "youtube" | "bilibili";
  source: string;
  rules: readonly string[];
  categories: CategoryBoard[];
  message?: string;
};

export function asCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.trunc(value));
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, Math.trunc(parsed));
  }
  return 0;
}

export function plainText(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function rankVideos(hits: readonly VideoHit[], limit = VIDEOS_PER_CATEGORY): RankedVideo[] {
  const byId = new Map<string, RankedVideo & { queries: Set<string> }>();
  for (const hit of hits) {
    if (!hit.id) continue;
    const current = byId.get(hit.id);
    if (!current) {
      byId.set(hit.id, {
        id: hit.id,
        title: hit.title,
        channel: hit.channel,
        url: hit.url,
        likes: hit.likes,
        appearances: 1,
        queries: new Set([hit.query]),
      });
      continue;
    }
    if (hit.likes > current.likes) current.likes = hit.likes;
    if (!current.title && hit.title) current.title = hit.title;
    if (!current.channel && hit.channel) current.channel = hit.channel;
    if (!current.url && hit.url) current.url = hit.url;
    if (!current.queries.has(hit.query)) {
      current.queries.add(hit.query);
      current.appearances += 1;
    }
  }
  return [...byId.values()]
    .sort((left, right) => right.appearances - left.appearances || right.likes - left.likes || left.title.localeCompare(right.title, "zh"))
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      title: item.title,
      channel: item.channel,
      url: item.url,
      likes: item.likes,
      appearances: item.appearances,
    }));
}

export function bilibiliHits(query: string, result: unknown, limit: number): VideoHit[] {
  if (!Array.isArray(result)) return [];
  const hits: VideoHit[] = [];
  for (const item of result) {
    if (!item || typeof item !== "object") continue;
    const row = item as { type?: unknown; bvid?: unknown; title?: unknown; author?: unknown; like?: unknown };
    if (row.type !== "video" || typeof row.bvid !== "string" || row.bvid.length === 0) continue;
    const title = plainText(typeof row.title === "string" ? row.title : "");
    hits.push({
      id: row.bvid,
      title: title || row.bvid,
      channel: plainText(typeof row.author === "string" ? row.author : ""),
      url: `https://www.bilibili.com/video/${row.bvid}`,
      likes: asCount(row.like),
      query,
    });
    if (hits.length >= limit) break;
  }
  return hits;
}

export function categoryBoards(
  groups: readonly VideoQueryGroup[],
  hits: readonly VideoHit[],
  failures: ReadonlyMap<string, string>,
): CategoryBoard[] {
  return groups.map((group) => {
    const messages = [...new Set(group.queries.flatMap((query) => {
      const failure = failures.get(query);
      return failure ? [failure] : [];
    }))];
    return {
      id: group.id,
      label: group.label,
      queries: [...group.queries],
      items: rankVideos(hits.filter((hit) => group.queries.includes(hit.query))),
      message: messages.length > 0 ? messages.join(" ") : undefined,
    };
  });
}

export function boardResponse(board: VideoBoardPayload): { status: number; body: VideoBoardPayload } {
  const hasItems = board.categories.some((category) => category.items.length > 0);
  const categoryMessage = board.categories.find((category) => category.message)?.message;
  const message = board.message ?? (!hasItems ? categoryMessage : undefined);
  const status = !hasItems && message ? 502 : 200;
  return { status, body: message ? { ...board, message } : board };
}
