import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import catalogJson from "./tools-catalog.json" with { type: "json" };
import type { ToolItem } from "./tool-groups";

export type { ToolItem } from "./tool-groups";

export type Profile = {
  name: string;
  bio: string;
  github: string;
  xHandle: string;
  avatarUrl: string;
};

export type Note = {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
  githubUrl: string;
};

export type LearningItem = {
  id: string;
  kind: "site" | "book";
  category: string;
  title: string;
  url: string;
  note: string;
};

export type XSave = {
  id: string;
  title: string;
  url: string;
  note: string;
  savedAt: string;
};

export type Store = {
  profile: Profile;
  notes: Note[];
  learning: LearningItem[];
  tools: ToolItem[];
  xSaves: XSave[];
  toolsCustomized?: boolean;
};

export type WriteResult = { ok: true } | { ok: false; reason: "read-only" | "failed" };

const dataDir = path.join(process.cwd(), "data");
const storeFileName = "store.json";

const learningSeed: LearningItem[] = [
  {
    id: "seed-learning-sap",
    kind: "site",
    category: "SAP",
    title: "SAP Learning",
    url: "https://learning.sap.com",
    note: "官方学习站",
  },
  {
    id: "seed-learning-abap-docs",
    kind: "site",
    category: "ABAP",
    title: "ABAP Keyword Documentation",
    url: "https://help.sap.com/doc/abapdocu_latest_index_htm/latest/en-US/index.htm",
    note: "语法和语句",
  },
  {
    id: "seed-learning-clean-abap",
    kind: "book",
    category: "ABAP",
    title: "Clean ABAP",
    url: "https://github.com/SAP/styleguides/blob/main/clean-abap/CleanABAP.md",
    note: "风格指南，可当书读",
  },
];

function normalizeTool(item: unknown): ToolItem {
  const source = typeof item === "object" && item !== null ? (item as Partial<ToolItem>) : {};
  const tag = typeof source.tag === "string" ? source.tag.trim() : "";
  const section = typeof source.section === "string" ? source.section.trim() : "";
  return {
    id: typeof source.id === "string" ? source.id : "",
    name: typeof source.name === "string" ? source.name : "",
    url: typeof source.url === "string" ? source.url : "",
    summary: typeof source.summary === "string" ? source.summary : "",
    tag: tag || "其他",
    section: section || "其他",
  };
}

function committedTools(): ToolItem[] {
  return catalogJson.map((item) => normalizeTool(item));
}

function seed(): Store {
  return {
    profile: {
      name: "LUNA BYTEBUN",
      bio: "写代码，也看 SAP 和 AI。",
      github: "zhouluna",
      xHandle: "",
      avatarUrl: "",
    },
    notes: [],
    learning: learningSeed.map((item) => ({ ...item })),
    tools: committedTools(),
    xSaves: [],
    toolsCustomized: false,
  };
}

function mergeStore(parsed: Partial<Store>): Store {
  const base = seed();
  const customTools = parsed.toolsCustomized === true && Array.isArray(parsed.tools) ? parsed.tools : null;
  return {
    profile: { ...base.profile, ...parsed.profile },
    notes: Array.isArray(parsed.notes) ? parsed.notes : base.notes,
    learning: Array.isArray(parsed.learning) ? parsed.learning : base.learning,
    tools: customTools ? customTools.map((item) => normalizeTool(item)) : base.tools,
    xSaves: Array.isArray(parsed.xSaves) ? parsed.xSaves : base.xSaves,
    toolsCustomized: customTools !== null,
  };
}

// data/ is gitignored. On Vercel the function root is /var/task, and mkdir
// of /var/task/data throws ENOENT. Reading must not create that directory.
export function readStoreAt(dir: string): Store {
  try {
    const parsed = JSON.parse(readFileSync(path.join(dir, storeFileName), "utf8")) as Partial<Store>;
    return mergeStore(parsed);
  } catch {
    return seed();
  }
}

export function readStore(): Store {
  return readStoreAt(dataDir);
}

function writeFailure(error: unknown): WriteResult {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (
    code === "ENOENT" ||
    code === "EACCES" ||
    code === "EPERM" ||
    code === "EROFS" ||
    code === "ENOTDIR" ||
    code === "EISDIR"
  ) {
    return { ok: false, reason: "read-only" };
  }
  return { ok: false, reason: "failed" };
}

export function tryWriteStoreAt(dir: string, store: Store): WriteResult {
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, storeFileName), JSON.stringify(store, null, 2), "utf8");
    return { ok: true };
  } catch (error) {
    return writeFailure(error);
  }
}

export function tryWriteStore(store: Store): WriteResult {
  return tryWriteStoreAt(dataDir, store);
}

export function writeStore(store: Store): void {
  const result = tryWriteStore(store);
  if (!result.ok) {
    throw new Error(result.reason === "read-only" ? "Store directory is read-only." : "Could not write store.");
  }
}

export function newId(): string {
  return randomUUID();
}
