import { allowedDeskBase } from "@/lib/desk";
import { outbound } from "@/lib/outbound";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const base = allowedDeskBase(new URL(request.url).searchParams.get("base") ?? "");
  if (!base) return Response.json({ message: "只接受端点台的线上地址或本机 4179。" }, { status: 400 });
  const response = await outbound(`${base.origin}/api/models?status=chat_ready`, {
    headers: { accept: "application/json" },
  }).catch(() => null);
  if (!response?.ok) return Response.json({ message: "没有连上端点台的模型列表。" }, { status: 502 });
  const data = (await response.json()) as { models?: { id: string; displayName: string; status: string }[] };
  return Response.json({
    models: (data.models ?? []).map((model) => ({
      id: model.id,
      displayName: model.displayName,
      status: model.status,
    })),
  });
}
