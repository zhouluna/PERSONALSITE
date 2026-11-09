import { newId, readStore, writeStore, type ToolItem } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return Response.json({ tools: readStore().tools });
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Partial<ToolItem> | null;
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return Response.json({ message: "需要一个 http(s) 链接。" }, { status: 400 });
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return Response.json({ message: "需要一个 http(s) 链接。" }, { status: 400 });
  }
  if (!name) return Response.json({ message: "写工具名字。" }, { status: 400 });
  const store = readStore();
  const item: ToolItem = {
    id: newId(),
    name,
    url: parsed.toString(),
    summary: typeof body?.summary === "string" ? body.summary.trim().slice(0, 280) : "",
    tag: typeof body?.tag === "string" && body.tag.trim() ? body.tag.trim().slice(0, 24) : "其他",
  };
  store.tools = [item, ...store.tools];
  writeStore(store);
  return Response.json({ item });
}

export async function DELETE(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const store = readStore();
  store.tools = store.tools.filter((item) => item.id !== id);
  writeStore(store);
  return Response.json({ ok: true });
}
