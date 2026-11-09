"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { ToolItem } from "@/lib/store";

export function ToolsBoard() {
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [draft, setDraft] = useState({ name: "", url: "", summary: "", tag: "其他" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/tools").then((response) => response.json()).then((data: { tools: ToolItem[] }) => setTools(data.tools));
  }, []);

  async function add(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/tools", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = (await response.json()) as { item?: ToolItem; message?: string };
    if (!response.ok || !data.item) {
      setMessage(data.message || "没有加上。");
      return;
    }
    setTools((current) => [data.item as ToolItem, ...current]);
    setDraft({ name: "", url: "", summary: "", tag: draft.tag });
    setMessage("");
  }

  const tags = [...new Set(tools.map((tool) => tool.tag))];
  return (
    <main className="page">
      <h1>Tools</h1>
      <form className="panel stack" onSubmit={(event) => void add(event)}>
        <div className="row">
          <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="名字" required />
          <input value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="https://" required />
          <input value={draft.tag} onChange={(event) => setDraft({ ...draft, tag: event.target.value })} placeholder="分类" />
        </div>
        <input value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} placeholder="为什么推荐" />
        <button type="submit" className="solid">加入收藏</button>
        {message ? <p className="hint">{message}</p> : null}
      </form>
      {tags.map((tag) => (
        <section key={tag} className="panel">
          <h2>{tag}</h2>
          <ul className="plain-list">
            {tools.filter((tool) => tool.tag === tag).map((tool) => (
              <li key={tool.id}>
                <a href={tool.url} target="_blank" rel="noreferrer">{tool.name}</a>
                {tool.summary ? <p>{tool.summary}</p> : null}
                <button type="button" onClick={() => void fetch(`/api/tools?id=${tool.id}`, { method: "DELETE" }).then(() => setTools((current) => current.filter((item) => item.id !== tool.id)))}>删除</button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
