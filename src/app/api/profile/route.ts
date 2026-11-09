import { readStore, writeStore, type Profile } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return Response.json({ profile: readStore().profile });
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Partial<Profile> | null;
  if (!body) return Response.json({ message: "资料格式不对。" }, { status: 400 });
  const store = readStore();
  const next: Profile = {
    name: text(body.name, store.profile.name, 40),
    bio: text(body.bio, store.profile.bio, 280),
    github: slug(body.github, store.profile.github),
    xHandle: slug(body.xHandle, store.profile.xHandle),
    avatarUrl: safeAvatar(body.avatarUrl, store.profile.avatarUrl),
  };
  store.profile = next;
  writeStore(store);
  return Response.json({ profile: next });
}

function text(value: unknown, fallback: string, max: number): string {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, max);
}

function slug(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().replace(/^@/, "").slice(0, 39);
  return /^[A-Za-z0-9-]*$/.test(cleaned) ? cleaned : fallback;
}

function safeAvatar(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  if (value === "") return "";
  if (value.startsWith("/api/files/")) return value;
  return fallback;
}
