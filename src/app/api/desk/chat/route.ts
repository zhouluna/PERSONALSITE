import { allowedDeskBase } from "@/lib/desk";
import { outbound } from "@/lib/outbound";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const base = allowedDeskBase(request.headers.get("x-desk-base") ?? "");
  const apiKey = request.headers.get("x-nvidia-api-key") ?? "";
  if (!base) return Response.json({ message: "端点台地址不在允许范围内。" }, { status: 400 });
  if (!apiKey) return Response.json({ message: "先在右上角填 NVIDIA API Key。" }, { status: 401 });
  const body = await request.text();
  if (body.length > 200_000) return Response.json({ message: "消息太长。" }, { status: 400 });
  const upstream = await outbound(`${base.origin}/api/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream, application/json",
      "x-nvidia-api-key": apiKey,
    },
    body,
  }).catch(() => null);
  if (!upstream) return Response.json({ message: "没有连上端点台。" }, { status: 502 });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}
