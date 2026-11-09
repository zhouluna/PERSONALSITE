import { execFileSync } from "node:child_process";
import http from "node:http";
import https from "node:https";

let windowsProxy: string | null | undefined;

function proxyAddress(): string | null {
  const fromEnv = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
  if (fromEnv) return fromEnv;
  if (windowsProxy !== undefined) return windowsProxy;
  windowsProxy = readWindowsProxy();
  return windowsProxy;
}

function readWindowsProxy(): string | null {
  if (process.platform !== "win32") return null;
  try {
    const output = execFileSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        "$s = Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'; if ($s.ProxyEnable -eq 1) { $s.ProxyServer }",
      ],
      { encoding: "utf8", timeout: 8000 },
    ).trim();
    if (!output) return null;
    return output.startsWith("http") ? output : `http://${output}`;
  } catch {
    return null;
  }
}

export function outbound(input: string, init: { method?: string; headers?: HeadersInit; body?: string } = {}): Promise<Response> {
  const proxy = proxyAddress();
  if (!proxy) return fetch(input, init);
  return proxied(input, init, proxy);
}

function proxied(input: string, init: { method?: string; headers?: HeadersInit; body?: string }, proxy: string): Promise<Response> {
  const target = new URL(input);
  const gate = new URL(proxy);
  return new Promise((resolve, reject) => {
    const connect = http.request({
      host: gate.hostname,
      port: gate.port || 80,
      method: "CONNECT",
      path: `${target.hostname}:${target.port || 443}`,
    });
    connect.once("error", reject);
    connect.once("connect", (status, socket) => {
      if (status.statusCode !== 200) {
        socket.destroy();
        reject(new Error(`代理没有接通 ${target.hostname}`));
        return;
      }
      const headers: Record<string, string> = { host: target.host };
      new Headers(init.headers).forEach((value, key) => {
        headers[key] = value;
      });
      const options: https.RequestOptions & { socket: typeof socket } = {
        host: target.hostname,
        servername: target.hostname,
        path: `${target.pathname}${target.search}`,
        method: init.method ?? "GET",
        headers,
        socket,
        agent: false,
      };
      const request = https.request(options, (upstream) => {
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            upstream.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
            upstream.on("end", () => controller.close());
            upstream.on("error", (error) => controller.error(error));
          },
          cancel() {
            upstream.destroy();
          },
        });
        const responseHeaders = new Headers();
        const type = upstream.headers["content-type"];
        if (typeof type === "string") responseHeaders.set("content-type", type);
        resolve(new Response(stream, { status: upstream.statusCode ?? 502, headers: responseHeaders }));
      });
      request.once("error", reject);
      if (init.body) request.write(init.body);
      request.end();
    });
    connect.end();
  });
}
