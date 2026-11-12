import { createHash } from "node:crypto";

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
  61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
  36, 20, 34, 44, 52,
] as const;

const WBI_FILTER = /[!'()*]/g;

export function mixinKey(imgKey: string, subKey: string): string {
  const raw = imgKey + subKey;
  return MIXIN_KEY_ENC_TAB.map((index) => raw[index] ?? "").join("").slice(0, 32);
}

export function wbiKeyFromUrl(url: string): string {
  const file = url.slice(url.lastIndexOf("/") + 1);
  const dot = file.lastIndexOf(".");
  return dot === -1 ? file : file.slice(0, dot);
}

export function signWbi(
  params: Record<string, string>,
  imgKey: string,
  subKey: string,
  wts = Math.round(Date.now() / 1000),
): string {
  const signed: Record<string, string> = { ...params, wts: String(wts) };
  const query = Object.keys(signed)
    .sort()
    .map((key) => {
      const value = signed[key].replace(WBI_FILTER, "");
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join("&");
  const wRid = createHash("md5").update(query + mixinKey(imgKey, subKey)).digest("hex");
  return `${query}&w_rid=${wRid}`;
}
