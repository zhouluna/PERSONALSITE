export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const token = (request.headers.get("x-github-token") ?? "").trim();
  if (token.length < 20 || token.length > 300) {
    return Response.json({ message: "GitHub token 看起来不对。" }, { status: 400 });
  }
  const body = (await request.json().catch(() => null)) as {
    owner?: unknown;
    repo?: unknown;
    path?: unknown;
    content?: unknown;
    message?: unknown;
  } | null;
  const owner = typeof body?.owner === "string" ? body.owner : "";
  const repo = typeof body?.repo === "string" ? body.repo : "";
  const filePath = typeof body?.path === "string" ? body.path : "";
  const content = typeof body?.content === "string" ? body.content : "";
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
    return Response.json({ message: "仓库所有者和仓库名只接受字母、数字、点和横线。" }, { status: 400 });
  }
  if (!/^[\w./-]+$/.test(filePath) || filePath.includes("..")) {
    return Response.json({ message: "文件路径不安全。" }, { status: 400 });
  }
  if (!content || content.length > 80_000) {
    return Response.json({ message: "内容为空或太长。" }, { status: 400 });
  }
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const headers = {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "user-agent": "huiting-personal",
    "content-type": "application/json",
  };
  const existing = await fetch(url, { headers });
  let sha: string | undefined;
  if (existing.ok) {
    const current = (await existing.json()) as { sha?: string };
    sha = current.sha;
  }
  const response = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: typeof body?.message === "string" && body.message.trim() ? body.message.trim().slice(0, 120) : "Update note",
      content: Buffer.from(content, "utf8").toString("base64"),
      sha,
    }),
  });
  const result = (await response.json().catch(() => null)) as { content?: { html_url?: string }; message?: string } | null;
  if (!response.ok) {
    return Response.json({ message: result?.message || "GitHub 没有收下这个文件。" }, { status: response.status });
  }
  return Response.json({ url: result?.content?.html_url ?? "" });
}
