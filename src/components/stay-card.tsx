"use client";

import { useState, type FormEvent } from "react";

const STORAGE_KEY = "huiting-note-email";

export function StayCard() {
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = email.trim();
    if (!next) {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, next);
    setSaved(next);
  }

  return (
    <section className="stay-card" aria-labelledby="stay-title">
      <h1 id="stay-title">Let&apos;s stay in touch</h1>
      <p>代码、机器猫和机器兔。留下邮箱，有新的东西再写给你。</p>
      {saved ? (
        <p className="stay-done" role="status">
          已记下 {saved}。它先留在这台浏览器里。
        </p>
      ) : (
        <form onSubmit={onSubmit}>
          <label className="stay-label" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button type="submit">Subscribe</button>
        </form>
      )}
    </section>
  );
}
