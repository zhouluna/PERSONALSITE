import { newId, readStore, writeStore, type LearningItem } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return Response.json({ learning: readStore().learning });
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Partial<LearningItem> | null;
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  if (!title) return Response.json({ message: "写一个标题。" }, { status: 400 });
  const kind = body?.kind === "book" ? "book" : "site";
  const store = readStore();
  const item: LearningItem = {
    id: newId(),
    kind,
    category: typeof body?.category === "string" && body.category.trim() ? body.category.trim().slice(0, 40) : "未分类",
    title,
    url: httpUrl(body?.url),
    note: typeof body?.note === "string" ? body.note.trim().slice(0, 280) : "",
  };
  store.learning = [item, ...store.learning];
  writeStore(store);
  return Response.json({ item });
}

export async function DELETE(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const store = readStore();
  store.learning = store.learning.filter((item) => item.id !== id);
  writeStore(store);
  return Response.json({ ok: true });
}

function httpUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}
