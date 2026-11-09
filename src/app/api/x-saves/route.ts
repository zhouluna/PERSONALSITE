import { newId, readStore, writeStore, type XSave } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return Response.json({ items: readStore().xSaves });
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Partial<XSave> | null;
  const urlText = typeof body?.url === "string" ? body.url.trim() : "";
  let url: URL;
  try {
    url = new URL(urlText);
  } catch {
    return Response.json({ message: "贴一条 http(s) 链接。" }, { status: 400 });
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return Response.json({ message: "贴一条 http(s) 链接。" }, { status: 400 });
  }
  const store = readStore();
  const item: XSave = {
    id: newId(),
    title: typeof body?.title === "string" && body.title.trim() ? body.title.trim().slice(0, 140) : url.hostname,
    url: url.toString(),
    note: typeof body?.note === "string" ? body.note.trim().slice(0, 280) : "",
    savedAt: new Date().toISOString(),
  };
  store.xSaves = [item, ...store.xSaves];
  writeStore(store);
  return Response.json({ item });
}

export async function DELETE(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const store = readStore();
  store.xSaves = store.xSaves.filter((item) => item.id !== id);
  writeStore(store);
  return Response.json({ ok: true });
}
