import { newId, readStore, tryWriteStore, type ToolItem } from "@/lib/store";

export const dynamic = "force-dynamic";

const readOnlyMessage = "线上目录是只读的，不能在这里增删。当前列表来自仓库里的工具目录。";

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
  const section = typeof body?.section === "string" ? body.section.trim().slice(0, 40) : "";
  const tag = typeof body?.tag === "string" ? body.tag.trim().slice(0, 40) : "";
  const store = readStore();
  const item: ToolItem = {
    id: newId(),
    name,
    url: parsed.toString(),
    summary: typeof body?.summary === "string" ? body.summary.trim().slice(0, 280) : "",
    tag: tag || "其他",
    section: section || "其他",
  };
  store.tools = [item, ...store.tools];
  store.toolsCustomized = true;
  const written = tryWriteStore(store);
  if (!written.ok) return Response.json({ message: readOnlyMessage }, { status: 503 });
  return Response.json({ item });
}

export async function DELETE(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return Response.json({ message: "没有这条收藏。" }, { status: 400 });
  const store = readStore();
  const next = store.tools.filter((item) => item.id !== id);
  if (next.length === store.tools.length) {
    return Response.json({ message: "没有这条收藏。" }, { status: 404 });
  }
  store.tools = next;
  store.toolsCustomized = true;
  const written = tryWriteStore(store);
  if (!written.ok) return Response.json({ message: readOnlyMessage }, { status: 503 });
  return Response.json({ ok: true });
}
