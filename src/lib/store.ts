import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

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

export type ToolItem = {
  id: string;
  name: string;
  url: string;
  summary: string;
  tag: string;
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
};

const dataDir = path.join(process.cwd(), "data");
const storeFile = path.join(dataDir, "store.json");

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
    learning: [
      {
        id: randomUUID(),
        kind: "site",
        category: "SAP",
        title: "SAP Learning",
        url: "https://learning.sap.com",
        note: "官方学习站",
      },
      {
        id: randomUUID(),
        kind: "site",
        category: "ABAP",
        title: "ABAP Keyword Documentation",
        url: "https://help.sap.com/doc/abapdocu_latest_index_htm/latest/en-US/index.htm",
        note: "语法和语句",
      },
      {
        id: randomUUID(),
        kind: "book",
        category: "ABAP",
        title: "Clean ABAP",
        url: "https://github.com/SAP/styleguides/blob/main/clean-abap/CleanABAP.md",
        note: "风格指南，可当书读",
      },
    ],
    tools: [
      {
        id: randomUUID(),
        name: "端点台",
        url: "https://endpoint-desk-luna.vercel.app/chat",
        summary: "免费模型目录和多模型聊天。猫和兔子用这里的模型。",
        tag: "AI",
      },
      {
        id: randomUUID(),
        name: "Astryx",
        url: "https://astryx.atmeta.com",
        summary: "这套页面用的设计系统。",
        tag: "前端",
      },
      {
        id: randomUUID(),
        name: "SAP Help",
        url: "https://help.sap.com",
        summary: "产品文档入口。",
        tag: "SAP",
      },
      {
        id: randomUUID(),
        name: "NVIDIA API keys",
        url: "https://build.nvidia.com/settings",
        summary: "聊天用的 nvapi Key 在这里生成。",
        tag: "AI",
      },
    ],
    xSaves: [],
  };
}

export function readStore(): Store {
  mkdirSync(dataDir, { recursive: true });
  try {
    const parsed = JSON.parse(readFileSync(storeFile, "utf8")) as Store;
    return { ...seed(), ...parsed, profile: { ...seed().profile, ...parsed.profile } };
  } catch {
    const initial = seed();
    writeStore(initial);
    return initial;
  }
}

export function writeStore(store: Store): void {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(storeFile, JSON.stringify(store, null, 2), "utf8");
}

export function newId(): string {
  return randomUUID();
}
