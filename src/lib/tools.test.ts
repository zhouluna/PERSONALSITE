import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { GET } from "../app/api/tools/route";
import { readStoreAt, tryWriteStoreAt } from "./store";
import { BOARD_ORDER, filterTools, groupTools, type ToolItem } from "./tool-groups";

const expectedCounts: Record<(typeof BOARD_ORDER)[number], number> = {
  "SAP 学习": 48,
  "SAP 开发": 282,
  "SAP 界面": 113,
  "SAP 模块": 108,
  "SAP 技术": 181,
  "AI 工具": 40,
  KUKA: 25,
  开发工具: 52,
  其他: 107,
};

function loadCatalog(): ToolItem[] {
  const file = fileURL(import.meta.url, "./tools-catalog.json");
  return JSON.parse(readFileSync(file, "utf8")) as ToolItem[];
}

function fileURL(parent: string, relative: string): string {
  return new URL(relative, parent).pathname;
}

test("committed catalog keeps all 956 bookmarks in the nine boards", () => {
  const catalog = loadCatalog();
  assert.equal(catalog.length, 956);
  assert.equal(new Set(catalog.map((item) => item.id)).size, 956);
  const groups = groupTools(catalog);
  assert.deepEqual(
    groups.map((group) => group.section),
    [...BOARD_ORDER],
  );
  for (const group of groups) {
    const section = group.section as (typeof BOARD_ORDER)[number];
    const count = group.tags.reduce((sum, tag) => sum + tag.tools.length, 0);
    assert.equal(count, expectedCounts[section], section);
  }
  assert.equal(
    groups.reduce((sum, group) => sum + group.tags.reduce((inner, tag) => inner + tag.tools.length, 0), 0),
    956,
  );
  for (const item of catalog) {
    assert.ok(item.name.trim(), item.id);
    assert.ok(item.url.startsWith("http://") || item.url.startsWith("https://"), item.url);
    assert.equal(item.url.includes("accounts.sap.com"), false, item.url);
  }
  const interfaceBoard = groups.find((group) => group.section === "SAP 界面");
  assert.deepEqual(
    interfaceBoard?.tags.map((tag) => [tag.tag, tag.tools.length]),
    [
      ["SAP Fiori", 70],
      ["SAP UI5", 41],
      ["SAP Web Dynpro", 2],
    ],
  );
});

test("search matches name, tag, and url without dropping the source order", () => {
  const catalog = loadCatalog();
  assert.equal(filterTools(catalog, "   ").length, 956);
  const fiori = filterTools(catalog, "fiori");
  assert.ok(fiori.length > 0);
  assert.ok(fiori.every((item) => `${item.name} ${item.tag} ${item.url} ${item.summary} ${item.section}`.toLowerCase().includes("fiori")));
  const grouped = groupTools(fiori);
  const order = BOARD_ORDER.filter((section) => grouped.some((group) => group.section === section));
  assert.deepEqual(grouped.map((group) => group.section), [...order]);
  const interfaceBoard = grouped.find((group) => group.section === "SAP 界面");
  assert.equal(interfaceBoard?.tags[0]?.tag, "SAP Fiori");
  assert.equal(interfaceBoard?.tags[0]?.tools.length, 70);
});

test("read does not create a store file and ignores an old tool list", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "tools-read-"));
  try {
    const store = readStoreAt(dir);
    assert.equal(store.tools.length, 956);
    assert.equal(store.toolsCustomized, false);
    assert.equal(existsSync(path.join(dir, "store.json")), false);

    writeFileSync(
      path.join(dir, "store.json"),
      JSON.stringify({
        profile: { name: "Huiting" },
        tools: [{ id: "old", name: "old", url: "https://example.com", summary: "", tag: "旧" }],
        notes: [{ id: "n1", title: "笔记", body: "", updatedAt: "2026-01-01", githubUrl: "" }],
      }),
    );
    const merged = readStoreAt(dir);
    assert.equal(merged.tools.length, 956);
    assert.equal(merged.profile.name, "Huiting");
    assert.equal(merged.profile.github, "zhouluna");
    assert.equal(merged.notes[0]?.title, "笔记");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("read still returns the catalog when the directory cannot be created", () => {
  const parent = mkdtempSync(path.join(tmpdir(), "tools-ro-"));
  chmodSync(parent, 0o555);
  try {
    const store = readStoreAt(path.join(parent, "data"));
    assert.equal(store.tools.length, 956);
    assert.equal(existsSync(path.join(parent, "data")), false);
    const written = tryWriteStoreAt(path.join(parent, "data"), { ...store, toolsCustomized: true });
    assert.deepEqual(written, { ok: false, reason: "read-only" });
    assert.equal(existsSync(path.join(parent, "data")), false);
  } finally {
    chmodSync(parent, 0o755);
    rmSync(parent, { recursive: true, force: true });
  }
});

test("a file blocking the store path fails the write and keeps the catalog readable", () => {
  const parent = mkdtempSync(path.join(tmpdir(), "tools-block-"));
  const blocker = path.join(parent, "blocked");
  writeFileSync(blocker, "not a directory");
  try {
    const blockedDir = path.join(blocker, "data");
    assert.equal(readStoreAt(blockedDir).tools.length, 956);
    const written = tryWriteStoreAt(blockedDir, readStoreAt(blockedDir));
    assert.equal(written.ok, false);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("a writable store can replace the catalog only after toolsCustomized is set", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "tools-write-"));
  try {
    const store = readStoreAt(dir);
    const kept = store.tools[0];
    assert.ok(kept);
    const written = tryWriteStoreAt(dir, { ...store, tools: [kept], toolsCustomized: true });
    assert.deepEqual(written, { ok: true });
    const again = readStoreAt(dir);
    assert.equal(again.tools.length, 1);
    assert.equal(again.tools[0]?.id, kept.id);
    assert.equal(again.tools[0]?.section, kept.section);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("GET /api/tools returns the catalog without writing data/store.json", async () => {
  const response = await GET();
  assert.equal(response.status, 200);
  const body = (await response.json()) as { tools: ToolItem[] };
  assert.equal(body.tools.length, 956);
  assert.equal(body.tools[0]?.section, "AI 工具");
  assert.equal(existsSync(path.join(process.cwd(), "data", "store.json")), false);
});
