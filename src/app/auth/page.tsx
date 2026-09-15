"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "pick" | "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("pick");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      if (mode === "register" || data.needsAvatar) {
        router.push("/avatar?onboarding=1");
      } else {
        router.push("/home");
      }
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-6 py-10">
      <h1 className="brand-title text-4xl tracking-wide">LEGOTRACK</h1>
      <p className="mt-2 text-sm text-black/70">Sign in with just a name and password.</p>

      {mode === "pick" && (
        <div className="mt-10 flex flex-col gap-4">
          <button type="button" className="lego-btn lego-btn-primary" onClick={() => setMode("login")}>
            Log in
          </button>
          <button type="button" className="lego-btn" onClick={() => setMode("register")}>
            Create account
          </button>
          <button type="button" className="text-sm font-semibold underline" onClick={() => router.push("/")}>
            Back to splash
          </button>
        </div>
      )}

      {(mode === "login" || mode === "register") && (
        <div className="panel mt-8 space-y-4">
          <h2 className="brand-title text-2xl">
            {mode === "login" ? "Log in" : "Create account"}
          </h2>
          <label className="block text-sm font-bold">
            Name
            <input
              className="field mt-1"
              value={name}
              autoComplete="username"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-sm font-bold">
            Password
            <input
              className="field mt-1"
              type="password"
              value={password}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="text-sm font-semibold text-[var(--brick-red)]">{error}</p>}
          <button
            type="button"
            className="lego-btn lego-btn-primary w-full"
            disabled={busy}
            onClick={submit}
          >
            {busy ? "…" : "Continue"}
          </button>
          <button type="button" className="text-sm font-semibold underline" onClick={() => setMode("pick")}>
            Back
          </button>
        </div>
      )}
    </main>
  );
}
