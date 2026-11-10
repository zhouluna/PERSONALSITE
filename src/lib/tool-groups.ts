export const BOARD_ORDER = [
  "SAP 学习",
  "SAP 开发",
  "SAP 界面",
  "SAP 模块",
  "SAP 技术",
  "AI 工具",
  "KUKA",
  "开发工具",
  "其他",
] as const;

export type BoardName = (typeof BOARD_ORDER)[number];

export type ToolItem = {
  id: string;
  name: string;
  url: string;
  summary: string;
  tag: string;
  section: string;
};

export type ToolTagGroup = {
  tag: string;
  tools: ToolItem[];
};

export type ToolBoardGroup = {
  section: string;
  tags: ToolTagGroup[];
};

const boardNames: ReadonlySet<string> = new Set(BOARD_ORDER);

export function isBoardName(value: string): value is BoardName {
  return boardNames.has(value);
}

export function filterTools(tools: ToolItem[], query: string): ToolItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return tools;
  return tools.filter((tool) =>
    [tool.name, tool.url, tool.summary, tool.tag, tool.section].some((field) =>
      field.toLowerCase().includes(needle),
    ),
  );
}

export function sectionCounts(tools: ToolItem[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const tool of tools) {
    counts.set(tool.section, (counts.get(tool.section) ?? 0) + 1);
  }
  return counts;
}

export function groupTools(tools: ToolItem[]): ToolBoardGroup[] {
  const bySection = new Map<string, Map<string, ToolItem[]>>();
  for (const tool of tools) {
    const section = tool.section.trim() || "其他";
    const tag = tool.tag.trim() || "其他";
    let tags = bySection.get(section);
    if (!tags) {
      tags = new Map();
      bySection.set(section, tags);
    }
    const list = tags.get(tag);
    if (list) list.push(tool);
    else tags.set(tag, [tool]);
  }

  const extras = [...bySection.keys()].filter((section) => !boardNames.has(section));
  const ordered = [...BOARD_ORDER.filter((section) => bySection.has(section)), ...extras];
  return ordered.map((section) => {
    const tags = bySection.get(section);
    if (!tags) return { section, tags: [] };
    return {
      section,
      tags: [...tags.entries()].map(([tag, items]) => ({ tag, tools: items })),
    };
  });
}
