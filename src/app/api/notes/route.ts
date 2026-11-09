import { newId, readStore, writeStore, type Note } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const notes = [...readStore().notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return Response.json({ notes });
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Partial<Note> | null;
  if (!body) return Response.json({ message: "笔记格式不对。" }, { status: 400 });
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
  const text = typeof body.body === "string" ? body.body.slice(0, 80_000) : "";
  if (!title && !text.trim()) return Response.json({ message: "先写标题或正文。" }, { status: 400 });
  const store = readStore();
  const existing = typeof body.id === "string" ? store.notes.find((note) => note.id === body.id) : undefined;
  const note: Note = {
    id: existing?.id ?? newId(),
    title: title || "未命名笔记",
    body: text,
    updatedAt: new Date().toISOString(),
    githubUrl: typeof body.githubUrl === "string" ? body.githubUrl : existing?.githubUrl ?? "",
  };
  store.notes = [note, ...store.notes.filter((item) => item.id !== note.id)];
  writeStore(store);
  return Response.json({ note });
}

export async function DELETE(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const store = readStore();
  store.notes = store.notes.filter((note) => note.id !== id);
  writeStore(store);
  return Response.json({ ok: true });
}
