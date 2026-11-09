"use client";

import { useState } from "react";
import { loadDesk } from "@/lib/browser-settings";
import type { CharacterName } from "@/components/desk-context";

type Turn = { role: "user" | "assistant"; content: string };

const personas: Record<CharacterName, string> = {
  cat: "你是 LUNA BYTEBUN 的机器猫。帮她整理笔记、改写句子、把聊天收成可以保存的记录。回答用中文，短，直接。",
  rabbit: "你是 LUNA BYTEBUN 的机器兔。帮她核对技术信息、整理搜索结果、指出下一步该查哪里。回答用中文，先给结论。",
};

export function ChatDrawer({ who, onClose }: { who: CharacterName; onClose: () => void }) {
  const settings = loadDesk();
  const modelId = who === "cat" ? settings.catModelId : settings.rabbitModelId;
  const modelName = who === "cat" ? settings.catModelName : settings.rabbitModelName;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(content: string) {
    const text = content.trim();
    if (!text || busy) return;
    if (!modelId || !settings.apiKey) {
      setError("先打开右上角「模型」，在「猫和兔子」里选模型并填写 API Key。");
      return;
    }
    const history = [...turns, { role: "user" as const, content: text }];
    setTurns([...history, { role: "assistant", content: "" }]);
    setDraft("");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/desk/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-desk-base": settings.baseUrl,
          "x-nvidia-api-key": settings.apiKey,
        },
        body: JSON.stringify({
          modelId,
          messages: [{ role: "system", content: personas[who] }, ...history],
        }),
      });
      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message || "聊天没有发出去。");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          const payload = JSON.parse(data) as { delta?: string; error?: string };
          if (payload.error) throw new Error(payload.error);
          if (payload.delta) {
            answer += payload.delta;
            const snapshot = answer;
            setTurns([...history, { role: "assistant", content: snapshot }]);
          }
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "聊天中断。");
    } finally {
      setBusy(false);
    }
  }

  async function searchThenAsk() {
    const query = draft.trim();
    if (!query) return;
    setBusy(true);
    const [github, ai] = await Promise.all([
      fetch(`/api/news/github?q=${encodeURIComponent(query)}`).then((response) => response.json()).catch(() => null),
      fetch("/api/news/feed?kind=ai").then((response) => response.json()).catch(() => null),
    ]);
    const repos = Array.isArray(github?.repos) ? github.repos.slice(0, 5) : [];
    const items = Array.isArray(ai?.items) ? ai.items.slice(0, 5) : [];
    const lines = [
      `请根据这些公开结果，帮我整理「${query}」。`,
      "",
      "GitHub 今日收藏：",
      ...repos.map((repo: { fullName: string; url: string; stars: number }) => `- ${repo.fullName} (${repo.stars}) ${repo.url}`),
      "",
      "AI 新闻：",
      ...items.map((item: { title: string; link: string }) => `- ${item.title} ${item.link}`),
    ];
    setBusy(false);
    await send(lines.join("\n"));
  }

  async function saveNote() {
    const body = turns.map((turn) => `**${turn.role === "user" ? "我" : who === "cat" ? "猫" : "兔"}**\n\n${turn.content}`).join("\n\n");
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: `${who === "cat" ? "猫" : "兔"}的记录 ${new Date().toLocaleString("zh-CN")}`, body }),
    });
    setError(response.ok ? "已写入 Personal / Notes。" : "笔记没有保存。");
  }

  return (
    <aside className="chat-drawer" aria-label={who === "cat" ? "和机器猫聊天" : "和机器兔聊天"}>
      <header className="modal-head">
        <div>
          <strong>{who === "cat" ? "机器猫" : "机器兔"}</strong>
          <p className="hint">{modelName || "还没选模型"}</p>
        </div>
        <button type="button" onClick={onClose}>关闭</button>
      </header>
      <div className="chat-log">
        {turns.length === 0 ? <p className="hint">可以让它改笔记，或点「搜索后提问」把今天的 GitHub 和 AI 新闻带进来。</p> : null}
        {turns.map((turn, index) => (
          <p key={`${turn.role}-${index}`} className={turn.role === "user" ? "bubble me" : "bubble"}>
            {turn.content || (busy ? "…" : "")}
          </p>
        ))}
      </div>
      {error ? <p className="hint">{error}</p> : null}
      <div className="chat-actions">
        <button type="button" onClick={() => void searchThenAsk()} disabled={busy}>搜索后提问</button>
        <button type="button" onClick={() => void saveNote()} disabled={turns.length === 0}>写入笔记</button>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="写给它" rows={3} />
        <button type="submit" className="solid" disabled={busy}>发送</button>
      </form>
    </aside>
  );
}
