"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { XSave } from "@/lib/store";

type Repo = { fullName: string; url: string; description: string; stars: number; language: string };
type GithubPayload = {
  query: string;
  today: string;
  github: string;
  accountUrl: string;
  searchUrl: string;
  repos: Repo[];
  message?: string;
};
type FeedItem = { title: string; link: string; date: string; summary: string; abap?: boolean };
type Profile = { github: string; xHandle: string };

export function NewsBoard() {
  const [profile, setProfile] = useState<Profile>({ github: "zhouluna", xHandle: "" });
  const [query, setQuery] = useState("AI");
  const [github, setGithub] = useState<GithubPayload | null>(null);
  const [ai, setAi] = useState<FeedItem[]>([]);
  const [sap, setSap] = useState<FeedItem[]>([]);
  const [abapOnly, setAbapOnly] = useState(false);
  const [saves, setSaves] = useState<XSave[]>([]);
  const [xTitle, setXTitle] = useState("");
  const [xUrl, setXUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/profile").then((response) => response.json()).then((data: { profile: Profile }) => setProfile(data.profile));
    void fetch("/api/x-saves").then((response) => response.json()).then((data: { items: XSave[] }) => setSaves(data.items));
    void loadFeeds();
  }, []);

  async function loadGithub(nextQuery = query) {
    const response = await fetch(`/api/news/github?q=${encodeURIComponent(nextQuery)}`);
    const data = (await response.json()) as GithubPayload;
    if (!response.ok) {
      setError(data.message || "GitHub 没有返回。");
      return;
    }
    setGithub(data);
  }

  async function loadFeeds() {
    const [aiResponse, sapResponse] = await Promise.all([
      fetch("/api/news/feed?kind=ai"),
      fetch("/api/news/feed?kind=sap"),
    ]);
    const aiData = (await aiResponse.json()) as { items?: FeedItem[]; message?: string };
    const sapData = (await sapResponse.json()) as { items?: FeedItem[]; message?: string };
    if (aiData.items) setAi(aiData.items);
    if (sapData.items) setSap(sapData.items);
    if (!aiResponse.ok || !sapResponse.ok) setError(aiData.message || sapData.message || "有一条新闻源没有返回。");
    await loadGithub("AI");
  }

  async function saveX(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/x-saves", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: xTitle, url: xUrl }),
    });
    const data = (await response.json()) as { item?: XSave; message?: string };
    if (!response.ok || !data.item) {
      setError(data.message || "没有收藏。");
      return;
    }
    setSaves((current) => [data.item as XSave, ...current]);
    setXTitle("");
    setXUrl("");
  }

  const xHandle = profile.xHandle;
  const sapItems = abapOnly ? sap.filter((item) => item.abap) : sap;

  return (
    <main className="page">
      <h1>News</h1>
      {error ? <p className="hint">{error}</p> : null}
      <section className="panel">
        <header className="panel-head">
          <h2>GitHub 今日收藏</h2>
          <a href={github?.accountUrl || `https://github.com/${profile.github}`} target="_blank" rel="noreferrer">@{github?.github || profile.github}</a>
        </header>
        <form className="row" onSubmit={(event) => { event.preventDefault(); void loadGithub(); }}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="GitHub 搜索词" />
          <button type="submit">看今天</button>
          <a href={github?.searchUrl || "https://github.com/search?q=AI&type=repositories&s=stars&o=desc"} target="_blank" rel="noreferrer">总榜</a>
        </form>
        <p className="hint">按今天新建、星标从高到低。日期 {github?.today || "…"}。</p>
        <RepoList repos={github?.repos ?? []} />
      </section>
      <section className="panel">
        <header className="panel-head">
          <h2>X 上的技术分享</h2>
          <a href="https://x.com/home" target="_blank" rel="noreferrer">打开 X</a>
        </header>
        <p className="hint">X 时间线没有公开接口，这里不编造帖子。用下面的入口看最新内容，看到想留的就贴回来。</p>
        <div className="link-row">
          {xHandle ? <a href={`https://x.com/${xHandle}`} target="_blank" rel="noreferrer">@{xHandle}</a> : <span>在右上角填写 X 账号</span>}
          <a href="https://x.com/search?q=free%20AI%20tool&src=typed_query&f=live" target="_blank" rel="noreferrer">免费工具</a>
          <a href="https://x.com/search?q=AI%20tutorial&src=typed_query&f=live" target="_blank" rel="noreferrer">教程</a>
          <a href="https://x.com/search?q=ABAP%20OR%20SAP&src=typed_query&f=live" target="_blank" rel="noreferrer">SAP / ABAP</a>
        </div>
        <form className="row" onSubmit={(event) => void saveX(event)}>
          <input value={xTitle} onChange={(event) => setXTitle(event.target.value)} placeholder="标题" />
          <input value={xUrl} onChange={(event) => setXUrl(event.target.value)} placeholder="https://x.com/..." />
          <button type="submit">收藏</button>
        </form>
        <ul className="plain-list">
          {saves.map((item) => (
            <li key={item.id}>
              <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
              <button type="button" onClick={() => void fetch(`/api/x-saves?id=${item.id}`, { method: "DELETE" }).then(() => setSaves((current) => current.filter((save) => save.id !== item.id)))}>删除</button>
            </li>
          ))}
        </ul>
      </section>
      <section className="split">
        <article className="panel">
          <h2>AI 新闻</h2>
          <p className="hint">来源 Hacker News，关键词 AI，至少 30 分。</p>
          <FeedList items={ai} />
        </article>
        <article className="panel">
          <header className="panel-head">
            <h2>SAP / ABAP</h2>
            <button type="button" onClick={() => setAbapOnly((value) => !value)}>{abapOnly ? "看全部 SAP" : "只看 ABAP 相关"}</button>
          </header>
          <p className="hint">来源 SAP News。ABAP 相关按标题和摘要里的 ABAP、BTP、RAP、S/4、CAP 筛。</p>
          <FeedList items={sapItems} empty={abapOnly ? "今天这条 SAP 新闻流里没有命中 ABAP。" : "暂时没有条目。"} />
        </article>
      </section>
    </main>
  );
}

function RepoList({ repos }: { repos: Repo[] }) {
  if (repos.length === 0) return <p className="hint">今天还没有匹配的新仓库。</p>;
  return (
    <ol className="rank-list">
      {repos.map((repo) => (
        <li key={repo.url}>
          <a href={repo.url} target="_blank" rel="noreferrer">{repo.fullName}</a>
          <span>{repo.stars} stars{repo.language ? ` · ${repo.language}` : ""}</span>
          {repo.description ? <p>{repo.description}</p> : null}
        </li>
      ))}
    </ol>
  );
}

function FeedList({ items, empty = "暂时没有条目。" }: { items: FeedItem[]; empty?: string }) {
  if (items.length === 0) return <p className="hint">{empty}</p>;
  return (
    <ul className="plain-list">
      {items.map((item) => (
        <li key={item.link}>
          <a href={item.link} target="_blank" rel="noreferrer">{item.title}</a>
          {item.summary ? <p>{item.summary}</p> : null}
        </li>
      ))}
    </ul>
  );
}
