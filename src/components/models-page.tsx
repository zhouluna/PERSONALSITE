"use client";

import { useEffect, useState } from "react";
import { defaultDesk, loadDesk, saveDesk, type DeskSettings } from "@/lib/browser-settings";

type ModelOption = { id: string; displayName: string };
type Tab = "desk" | "multi" | "roles";

export function ModelsPage() {
  const [tab, setTab] = useState<Tab>("desk");
  const [settings, setSettings] = useState<DeskSettings>(defaultDesk);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const stored = loadDesk();
    setSettings(stored);
    void loadModels(stored.baseUrl);
  }, []);

  async function loadModels(baseUrl: string) {
    const response = await fetch(`/api/desk/models?base=${encodeURIComponent(baseUrl)}`);
    const data = (await response.json()) as { models?: ModelOption[]; message?: string };
    if (!response.ok || !data.models) {
      setMessage(data.message || "没有读到模型。");
      return;
    }
    setModels(data.models);
    setMessage(`读到 ${data.models.length} 个可聊天模型。`);
  }

  function save(next: DeskSettings = settings) {
    saveDesk(next);
    setSettings(next);
    setMessage("已记在这台浏览器里。Key 不会写进仓库。");
  }

  const base = settings.baseUrl.replace(/\/$/, "");

  return (
    <main className="models-page">
      <div className="models-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "desk"} className={tab === "desk" ? "solid" : ""} onClick={() => setTab("desk")}>目录与对话</button>
        <button type="button" role="tab" aria-selected={tab === "multi"} className={tab === "multi" ? "solid" : ""} onClick={() => setTab("multi")}>多模型聊天</button>
        <button type="button" role="tab" aria-selected={tab === "roles"} className={tab === "roles" ? "solid" : ""} onClick={() => setTab("roles")}>猫和兔子</button>
      </div>
      {tab === "roles" ? (
        <section className="page models-roles" aria-labelledby="roles-title">
          <h1 id="roles-title">猫和兔子的模型</h1>
          <p className="hint">
            左边两页是端点台原来的目录、同步、测速和聊天。这一页只决定点首页的猫或兔子时用哪个模型。
            Key 从 <a href="https://build.nvidia.com/settings" target="_blank" rel="noreferrer">build.nvidia.com</a> 获取。
          </p>
          <div className="panel stack">
            <label>端点台地址<input value={settings.baseUrl} onChange={(event) => setSettings({ ...settings, baseUrl: event.target.value })} /></label>
            <label>NVIDIA API Key<input type="password" value={settings.apiKey} autoComplete="off" onChange={(event) => setSettings({ ...settings, apiKey: event.target.value })} /></label>
            <div className="row">
              <button type="button" onClick={() => void loadModels(settings.baseUrl)}>重新读取模型</button>
              <button type="button" className="solid" onClick={() => save()}>保存</button>
            </div>
            <label>
              机器猫
              <select
                value={settings.catModelId}
                onChange={(event) => {
                  const model = models.find((item) => item.id === event.target.value);
                  setSettings({ ...settings, catModelId: event.target.value, catModelName: model?.displayName ?? "" });
                }}
              >
                <option value="">不使用</option>
                {models.map((model) => <option key={model.id} value={model.id}>{model.displayName}</option>)}
              </select>
            </label>
            <label>
              机器兔
              <select
                value={settings.rabbitModelId}
                onChange={(event) => {
                  const model = models.find((item) => item.id === event.target.value);
                  setSettings({ ...settings, rabbitModelId: event.target.value, rabbitModelName: model?.displayName ?? "" });
                }}
              >
                <option value="">不使用</option>
                {models.map((model) => <option key={model.id} value={model.id}>{model.displayName}</option>)}
              </select>
            </label>
            <p className="hint">当前：猫 {settings.catModelName || "未选"}，兔 {settings.rabbitModelName || "未选"}。</p>
            {message ? <p className="hint">{message}</p> : null}
          </div>
        </section>
      ) : (
        <iframe
          className="models-frame"
          title={tab === "desk" ? "端点台目录与对话" : "端点台多模型聊天"}
          src={tab === "desk" ? `${base}/` : `${base}/chat`}
        />
      )}
    </main>
  );
}
