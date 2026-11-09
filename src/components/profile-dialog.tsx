"use client";

import { useEffect, useState } from "react";
import type { Profile } from "@/lib/store";

export function ProfileDialog({ onClose }: { onClose: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/profile")
      .then((response) => response.json())
      .then((data: { profile: Profile }) => setProfile(data.profile));
  }, []);

  async function save() {
    if (!profile) return;
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(profile),
    });
    const data = (await response.json()) as { profile?: Profile; message?: string };
    if (!response.ok || !data.profile) {
      setMessage(data.message || "没有保存。");
      return;
    }
    setProfile(data.profile);
    setMessage("已保存。");
  }

  async function onAvatar(file: File | undefined) {
    if (!file || !profile) return;
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/uploads", { method: "POST", body: form });
    const data = (await response.json()) as { url?: string; message?: string };
    if (!response.ok || !data.url) {
      setMessage(data.message || "头像没有传上去。");
      return;
    }
    setProfile({ ...profile, avatarUrl: data.url });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal" onClick={(event) => event.stopPropagation()} aria-labelledby="profile-title">
        <header className="modal-head">
          <h2 id="profile-title">个人信息</h2>
          <button type="button" onClick={onClose}>关闭</button>
        </header>
        {profile ? (
          <div className="stack">
            <label className="avatar-edit">
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <span>头像</span>}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => void onAvatar(event.target.files?.[0])} />
            </label>
            <label>名字<input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
            <label>简介<textarea value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} /></label>
            <label>GitHub<input value={profile.github} onChange={(event) => setProfile({ ...profile, github: event.target.value })} /></label>
            <label>X 账号<input value={profile.xHandle} placeholder="不含 @" onChange={(event) => setProfile({ ...profile, xHandle: event.target.value })} /></label>
            <button type="button" className="solid" onClick={() => void save()}>保存</button>
            {message ? <p className="hint">{message}</p> : null}
          </div>
        ) : (
          <p className="hint">正在读取。</p>
        )}
      </section>
    </div>
  );
}
