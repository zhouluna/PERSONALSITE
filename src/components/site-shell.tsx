"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ChatDrawer } from "@/components/chat-drawer";
import { DeskContextProvider, type CharacterName } from "@/components/desk-context";
import { ProfileDialog } from "@/components/profile-dialog";

export function SiteShell({ children }: { children: ReactNode }) {
  const [chat, setChat] = useState<CharacterName | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <DeskContextProvider value={{ openChat: setChat, openProfile: () => setProfileOpen(true) }}>
      <header className="topbar">
        <nav>
          <Link href="/">LUNA BYTEBUN</Link>
          <Link href="/news">News</Link>
          <Link href="/youtube">YouTube</Link>
          <Link href="/bilibili">Bilibili</Link>
          <Link href="/personal">Personal</Link>
          <Link href="/tools">Tools</Link>
        </nav>
        <div className="top-actions">
          <Link href="/models">模型</Link>
          <ProfileButton onClick={() => setProfileOpen(true)} />
        </div>
      </header>
      {children}
      {chat ? <ChatDrawer who={chat} onClose={() => setChat(null)} /> : null}
      {profileOpen ? <ProfileDialog onClose={() => setProfileOpen(false)} /> : null}
    </DeskContextProvider>
  );
}

function ProfileButton({ onClick }: { onClick: () => void }) {
  const [avatar, setAvatar] = useState("");
  useEffect(() => {
    void fetch("/api/profile")
      .then((response) => response.json())
      .then((data: { profile?: { avatarUrl?: string } }) => setAvatar(data.profile?.avatarUrl || ""));
  }, []);
  return (
    <button type="button" className="avatar-button" onClick={onClick} aria-label="编辑个人信息和头像">
      {avatar ? <img src={avatar} alt="" /> : "我"}
    </button>
  );
}
