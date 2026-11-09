export type DeskSettings = {
  baseUrl: string;
  apiKey: string;
  catModelId: string;
  rabbitModelId: string;
  catModelName: string;
  rabbitModelName: string;
};

export type GithubSettings = {
  token: string;
  owner: string;
  repo: string;
};

export const defaultDesk: DeskSettings = {
  baseUrl: "https://endpoint-desk-luna.vercel.app",
  apiKey: "",
  catModelId: "",
  rabbitModelId: "",
  catModelName: "",
  rabbitModelName: "",
};

export function loadDesk(): DeskSettings {
  return { ...defaultDesk, ...readJson("huiting-desk") };
}

export function saveDesk(value: DeskSettings): void {
  localStorage.setItem("huiting-desk", JSON.stringify(value));
}

export function loadGithub(): GithubSettings {
  return {
    token: "",
    owner: "zhouluna",
    repo: "",
    ...readJson("huiting-github"),
  };
}

export function saveGithub(value: GithubSettings): void {
  localStorage.setItem("huiting-github", JSON.stringify(value));
}

function readJson(key: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "{}") as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
  } catch {
    return {};
  }
}
