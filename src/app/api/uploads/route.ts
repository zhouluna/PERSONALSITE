import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const types: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "text/plain": "txt",
  "text/markdown": "md",
  "application/pdf": "pdf",
};

export async function POST(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ message: "没有文件。" }, { status: 400 });
  const ext = types[file.type];
  if (!ext) return Response.json({ message: "只接收图片、文本、Markdown 或 PDF。" }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return Response.json({ message: "文件超过 4MB。" }, { status: 400 });
  const name = `${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "data", "uploads");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return Response.json({ url: `/api/files/${name}`, name: file.name });
}
