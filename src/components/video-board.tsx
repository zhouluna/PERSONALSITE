"use client";

import { useEffect, useState } from "react";
import {
  BILIBILI_CATEGORIES,
  BILIBILI_SOURCE,
  RANKING_RULES,
  YOUTUBE_CATEGORIES,
  YOUTUBE_SOURCE,
  type CategoryBoard,
  type RankedVideo,
  type VideoQueryGroup,
} from "@/lib/video-catalog";

type Platform = "youtube" | "bilibili";

type BoardCopy = {
  title: string;
  source: string;
  endpoint: string;
  groups: readonly VideoQueryGroup[];
};

export function VideoBoard({ platform }: { platform: Platform }) {
  const copy = boardCopy(platform);
  const [categories, setCategories] = useState<CategoryBoard[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const endpoint = copy.endpoint;
    let cancelled = false;
    void fetch(endpoint)
      .then(async (response) => {
        const data = (await response.json()) as { message?: string; categories?: CategoryBoard[] };
        if (cancelled) return;
        if (data.message) setError(data.message);
        else if (!response.ok) setError("没有返回。");
        setCategories(data.categories ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("没有连上服务器。");
      });
    return () => {
      cancelled = true;
    };
  }, [copy.endpoint]);

  return (
    <main className="page">
      <h1>{copy.title}</h1>
      {error ? <p className="hint">{error}</p> : null}
      <section className="panel">
        <h2>排序规则</h2>
        <ol className="rank-list">
          {RANKING_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
        <p className="hint">{copy.source}</p>
      </section>
      {copy.groups.map((group) => {
        const category = categories?.find((item) => item.id === group.id);
        const items = (category?.items ?? []).filter((item) => item.url.startsWith("https://"));
        return (
          <section className="panel" key={group.id}>
            <h2>{group.label}</h2>
            <p className="hint">关键词：{group.queries.join("、")}</p>
            {category?.message && category.message !== error ? <p className="hint">{category.message}</p> : null}
            {categories === null && !error ? <p className="hint">正在读取…</p> : <VideoList items={items} />}
          </section>
        );
      })}
    </main>
  );
}

function VideoList({ items }: { items: RankedVideo[] }) {
  if (items.length === 0) return <p className="hint">这一类暂时没有视频。</p>;
  return (
    <ol className="rank-list">
      {items.map((item) => (
        <li key={item.id}>
          <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
          <span>
            {item.likes.toLocaleString("zh-CN")} 赞
            {item.appearances >= 2 ? <span className="repeat-badge">被反复推荐 · {item.appearances} 个关键词</span> : null}
            {item.channel ? ` · ${item.channel}` : ""}
          </span>
        </li>
      ))}
    </ol>
  );
}

function boardCopy(platform: Platform): BoardCopy {
  switch (platform) {
    case "youtube":
      return { title: "YouTube", source: YOUTUBE_SOURCE, endpoint: "/api/youtube", groups: YOUTUBE_CATEGORIES };
    case "bilibili":
      return { title: "Bilibili", source: BILIBILI_SOURCE, endpoint: "/api/bilibili", groups: BILIBILI_CATEGORIES };
    default: {
      const unreachable: never = platform;
      return unreachable;
    }
  }
}
