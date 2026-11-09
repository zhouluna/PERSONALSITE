export function allowedDeskBase(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const host = url.hostname;
  const local = host === "localhost" || host === "127.0.0.1";
  const official = host === "endpoint-desk-luna.vercel.app" && url.protocol === "https:";
  if (!official && !(local && (url.protocol === "http:" || url.protocol === "https:"))) {
    return null;
  }
  url.pathname = url.pathname.replace(/\/$/, "");
  url.search = "";
  url.hash = "";
  return url;
}
