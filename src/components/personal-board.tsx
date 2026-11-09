"use client";

import { useEffect, useState, type ClipboardEvent, type FormEvent } from "react";
import { loadGithub, saveGithub } from "@/lib/browser-settings";
import type { LearningItem, Note } from "@/lib/store";

export function PersonalBoard() {
  const [tab, setTab] = useState<"notes" | "learning">("notes");
  return (
    <main className="page">
      <header className="panel-head">
        <h1>Personal</h1>
        <div className="link-row">
          <button type="button" className={tab === "notes" ? "solid" : ""} onClick={() => setTab("notes")}>Notes</button>
          <button type="button" className={tab === "learning" ? "solid" : ""} onClick={() => setTab("learning")}>Learning hub</button>
        </div>
      </header>
      {tab === "notes" ? <Notes /> : <LearningHub />}
    </main>
  );
}

function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [current, setCurrent] = useState<Note | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [message, setMessage] = useState("");
  const [github, setGithub] = useState({ token: "", owner: "zhouluna", repo: "" });

  useEffect(() => {
    setGithub(loadGithub());
    void fetch("/api/notes").then((response) => response.json()).then((data: { notes: Note[] }) => setNotes(data.notes));
  }, []);

  async function saveNote() {
    if (!current) return;
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(current),
    });
    const data = (await response.json()) as { note?: Note; message?: string };
    if (!response.ok || !data.note) {
      setMessage(data.message || "没有保存。");
      return;
    }
    setCurrent(data.note);
    setNotes((items) => [data.note as Note, ...items.filter((item) => item.id !== data.note?.id)]);
    setMessage("已保存在本机。");
  }

  async function uploadFile(file: File | undefined) {
    if (!file || !current) return;
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/uploads", { method: "POST", body: form });
    const data = (await response.json()) as { url?: string; name?: string; message?: string };
    if (!response.ok || !data.url) {
      setMessage(data.message || "文件没有传上去。");
      return;
    }
    const snippet = file.type.startsWith("image/") ? `\n\n![${data.name}](${data.url})\n` : `\n\n[${data.name}](${data.url})\n`;
    setCurrent({ ...current, body: current.body + snippet });
  }

  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const image = [...event.clipboardData.files].find((file) => file.type.startsWith("image/"));
    if (!image) return;
    event.preventDefault();
    void uploadFile(image);
  }

  async function publish() {
    if (!current) return;
    saveGithub(github);
    const safeName = current.title.replace(/[^\w.-]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "note";
    const response = await fetch("/api/github/upload", {
      method: "POST",
      headers: { "content-type": "application/json", "x-github-token": github.token },
      body: JSON.stringify({
        owner: github.owner,
        repo: github.repo,
        path: `notes/${safeName}.md`,
        content: `# ${current.title}\n\n${current.body}`,
        message: `Update note ${current.title}`,
      }),
    });
    const data = (await response.json()) as { url?: string; message?: string };
    if (!response.ok || !data.url) {
      setMessage(data.message || "GitHub 没有生成链接。");
      return;
    }
    setGithubUrl(data.url);
    const next = { ...current, githubUrl: data.url };
    setCurrent(next);
    await fetch("/api/notes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(next) });
    setMessage("已上传，链接在下面。");
  }

  return (
    <div className="split">
      <aside className="panel">
        <button type="button" className="solid" onClick={() => setCurrent({ id: "", title: "", body: "", updatedAt: "", githubUrl: "" })}>新笔记</button>
        <ul className="plain-list">
          {notes.map((note) => (
            <li key={note.id}><button type="button" onClick={() => setCurrent(note)}>{note.title}</button></li>
          ))}
        </ul>
      </aside>
      <section className="panel">
        {current ? (
          <div className="stack">
            <input value={current.title} placeholder="标题" onChange={(event) => setCurrent({ ...current, title: event.target.value })} />
            <textarea value={current.body} rows={16} placeholder="支持 Markdown。可以直接粘贴图片。" onPaste={onPaste} onChange={(event) => setCurrent({ ...current, body: event.target.value })} />
            <div className="row">
              <label className="file-label">上传文件<input type="file" onChange={(event) => void uploadFile(event.target.files?.[0])} /></label>
              <button type="button" onClick={() => void saveNote()}>保存</button>
              <button type="button" onClick={() => void publish()}>上传到 GitHub</button>
              {current.id ? <button type="button" onClick={() => void fetch(`/api/notes?id=${current.id}`, { method: "DELETE" }).then(() => { setNotes((items) => items.filter((item) => item.id !== current.id)); setCurrent(null); })}>删除</button> : null}
            </div>
            <div className="row">
              <input value={github.owner} onChange={(event) => setGithub({ ...github, owner: event.target.value })} placeholder="owner" aria-label="GitHub owner" />
              <input value={github.repo} onChange={(event) => setGithub({ ...github, repo: event.target.value })} placeholder="repo" aria-label="GitHub repo" />
              <input type="password" value={github.token} onChange={(event) => setGithub({ ...github, token: event.target.value })} placeholder="GitHub token" aria-label="GitHub token" />
            </div>
            <p className="hint">Token 只留在这台浏览器，用来把笔记写成仓库里的 Markdown 并返回查看链接。</p>
            {githubUrl || current.githubUrl ? <a href={githubUrl || current.githubUrl} target="_blank" rel="noreferrer">{githubUrl || current.githubUrl}</a> : null}
            <NotePreview body={current.body} />
          </div>
        ) : <p className="hint">选一条笔记，或新建。猫和兔子聊天后也可以写入这里。</p>}
        {message ? <p className="hint">{message}</p> : null}
      </section>
    </div>
  );
}

function NotePreview({ body }: { body: string }) {
  const blocks = body.split(/\n{2,}/);
  return (
    <article className="note-preview">
      {blocks.map((block, index) => {
        const image = block.trim().match(/^!\[([^\]]*)\]\((\/api\/files\/[^)]+)\)$/);
        if (image) return <img key={index} src={image[2]} alt={image[1]} />;
        return <p key={index}>{block}</p>;
      })}
    </article>
  );
}

function LearningHub() {
  const [items, setItems] = useState<LearningItem[]>([]);
  const [draft, setDraft] = useState({ kind: "site" as "site" | "book", category: "SAP", title: "", url: "", note: "" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/learning").then((response) => response.json()).then((data: { learning: LearningItem[] }) => setItems(data.learning));
  }, []);

  async function add(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/learning", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = (await response.json()) as { item?: LearningItem; message?: string };
    if (!response.ok || !data.item) {
      setMessage(data.message || "没有加上。");
      return;
    }
    setItems((current) => [data.item as LearningItem, ...current]);
    setDraft({ ...draft, title: "", url: "", note: "" });
    setMessage("");
  }

  const categories = [...new Set(items.map((item) => item.category))];
  return (
    <div className="stack">
      <form className="panel stack" onSubmit={(event) => void add(event)}>
        <div className="row">
          <select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value === "book" ? "book" : "site" })}>
            <option value="site">网站</option>
            <option value="book">书</option>
          </select>
          <input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="分类" />
          <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="标题" required />
        </div>
        <input value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="https://" />
        <input value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="一句话" />
        <button type="submit" className="solid">加入</button>
        {message ? <p className="hint">{message}</p> : null}
      </form>
      {categories.map((category) => (
        <section key={category} className="panel">
          <h2>{category}</h2>
          <ul className="plain-list">
            {items.filter((item) => item.category === category).map((item) => (
              <li key={item.id}>
                <strong>{item.kind === "book" ? "书" : "站"}</strong>{" "}
                {item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : item.title}
                {item.note ? <p>{item.note}</p> : null}
                <button type="button" onClick={() => void fetch(`/api/learning?id=${item.id}`, { method: "DELETE" }).then(() => setItems((current) => current.filter((entry) => entry.id !== item.id)))}>删除</button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
