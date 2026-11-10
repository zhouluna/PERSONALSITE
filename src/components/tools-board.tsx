"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  BOARD_ORDER,
  filterTools,
  groupTools,
  isBoardName,
  sectionCounts,
  type ToolItem,
} from "@/lib/tool-groups";

type Draft = {
  name: string;
  url: string;
  summary: string;
  tag: string;
  section: string;
};

const emptyDraft: Draft = { name: "", url: "", summary: "", tag: "其他", section: "其他" };

export function ToolsBoard({ initialTools }: { initialTools: ToolItem[] }) {
  const [tools, setTools] = useState(initialTools);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [query, setQuery] = useState("");
  const [board, setBoard] = useState<string>("all");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const messageRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (message) messageRef.current?.scrollIntoView({ block: "nearest" });
  }, [message]);

  const filtered = useMemo(() => filterTools(tools, query), [tools, query]);
  const counts = useMemo(() => sectionCounts(filtered), [filtered]);
  const visible = useMemo(
    () => (board === "all" ? filtered : filtered.filter((tool) => tool.section === board)),
    [filtered, board],
  );
  const groups = useMemo(() => groupTools(visible), [visible]);
  const extraSections = useMemo(
    () => [...counts.keys()].filter((section) => !isBoardName(section)),
    [counts],
  );

  async function add(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/tools", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await response.json().catch(() => null)) as { item?: ToolItem; message?: string } | null;
      if (!response.ok || !data?.item) {
        setMessage(data?.message || "没有加上。");
        return;
      }
      setTools((current) => [data.item as ToolItem, ...current]);
      setDraft({ ...emptyDraft, tag: draft.tag, section: draft.section });
      setBoard(data.item.section);
      setQuery("");
      setMessage("");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const response = await fetch(`/api/tools?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    if (!response.ok) {
      setMessage(data?.message || "没有删除。");
      return;
    }
    setTools((current) => current.filter((item) => item.id !== id));
    setMessage("");
  }

  return (
    <main className="page">
      <h1>Tools</h1>
      <p className="hint">
        {tools.length} 个链接，分成 {BOARD_ORDER.length} 个板块。显示 {visible.length} 个。
      </p>
      {message ? (
        <p className="hint" role="status" ref={messageRef}>
          {message}
        </p>
      ) : null}
      <section className="panel stack" aria-label="筛选">
        <label>
          搜索
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="名字、分类或链接"
          />
        </label>
        <div className="row" role="group" aria-label="板块">
          <button type="button" className={board === "all" ? "solid" : ""} aria-pressed={board === "all"} onClick={() => setBoard("all")}>
            全部 {filtered.length}
          </button>
          {BOARD_ORDER.map((section) => (
            <button
              key={section}
              type="button"
              className={board === section ? "solid" : ""}
              aria-pressed={board === section}
              onClick={() => setBoard(section)}
            >
              {section} {counts.get(section) ?? 0}
            </button>
          ))}
          {extraSections.map((section) => (
            <button
              key={section}
              type="button"
              className={board === section ? "solid" : ""}
              aria-pressed={board === section}
              onClick={() => setBoard(section)}
            >
              {section} {counts.get(section) ?? 0}
            </button>
          ))}
        </div>
      </section>
      {groups.length === 0 ? <p className="hint">没有匹配的工具。</p> : null}
      {groups.map((group) => (
        <section key={group.section} className="panel" aria-label={group.section}>
          <h2>
            {group.section}（{group.tags.reduce((sum, tag) => sum + tag.tools.length, 0)}）
          </h2>
          {group.tags.map((tag) => {
            const showTag = group.tags.length > 1 || tag.tag !== group.section;
            return (
              <section key={tag.tag} aria-label={tag.tag}>
                {showTag ? (
                  <h3>
                    {tag.tag}（{tag.tools.length}）
                  </h3>
                ) : null}
                <ul className="plain-list">
                  {tag.tools.map((tool) => (
                    <li key={tool.id}>
                      <div className="tool-row">
                        <a href={tool.url} target="_blank" rel="noreferrer">
                          {tool.name}
                        </a>
                        <button type="button" onClick={() => void remove(tool.id)} aria-label={`删除 ${tool.name}`}>
                          删除
                        </button>
                      </div>
                      {tool.summary ? <p>{tool.summary}</p> : null}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </section>
      ))}
      <form className="panel stack" onSubmit={(event) => void add(event)}>
        <h2>加入收藏</h2>
        <div className="row">
          <input
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            placeholder="名字"
            required
          />
          <input
            value={draft.url}
            onChange={(event) => setDraft({ ...draft, url: event.target.value })}
            placeholder="https://"
            required
          />
          <select aria-label="板块" value={draft.section} onChange={(event) => setDraft({ ...draft, section: event.target.value })}>
            {BOARD_ORDER.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
          <input
            value={draft.tag}
            onChange={(event) => setDraft({ ...draft, tag: event.target.value })}
            placeholder="分类"
          />
        </div>
        <input
          value={draft.summary}
          onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
          placeholder="为什么推荐"
        />
        <button type="submit" className="solid" disabled={saving}>
          加入收藏
        </button>
      </form>
    </main>
  );
}
