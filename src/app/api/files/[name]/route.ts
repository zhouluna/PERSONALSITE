import { readFileSync } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const contentTypes: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  pdf: "application/pdf",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> },
): Promise<Response> {
  const { name } = await context.params;
  if (!/^[\w.-]+$/.test(name) || name.includes("..")) {
    return new Response("找不到文件。", { status: 404 });
  }
  const ext = name.split(".").pop() ?? "";
  const type = contentTypes[ext];
  if (!type) return new Response("找不到文件。", { status: 404 });
  try {
    const bytes = readFileSync(path.join(process.cwd(), "data", "uploads", name));
    return new Response(bytes, {
      headers: { "content-type": type, "cache-control": "private, max-age=3600" },
    });
  } catch {
    return new Response("找不到文件。", { status: 404 });
  }
}
