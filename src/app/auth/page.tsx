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
    <main className="page-wrap flex min-h-dvh flex-col py-[max(2rem,env(safe-area-inset-top))]">
      <h1 className="lego-logo text-[clamp(2.6rem,10vw,4.2rem)] leading-none">LEGOTRACK</h1>
      <p className="soft-copy mt-4 text-center">Just your name and a password. Easy!</p>

      {mode === "pick" && (
        <div className="mx-auto mt-10 flex w-full max-w-md flex-col gap-4">
          <button
            type="button"
            className="lego-btn lego-btn-yellow w-full"
            onClick={() => setMode("login")}
          >
            Log in
          </button>
          <button type="button" className="lego-btn w-full" onClick={() => setMode("register")}>
            Create account
          </button>
          <button
            type="button"
            className="mt-2 text-base font-extrabold underline"
            onClick={() => router.push("/")}
          >
            Back to splash
          </button>
        </div>
      )}

      {(mode === "login" || mode === "register") && (
        <div className="panel mx-auto mt-8 w-full max-w-md space-y-5">
          <h2 className="brand-title text-[clamp(1.6rem,5vw,2.2rem)]">
            {mode === "login" ? "Log in" : "Create account"}
          </h2>
          <label className="block text-base font-extrabold">
            Name
            <input
              className="field mt-2"
              value={name}
              autoComplete="username"
              enterKeyHint="next"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-base font-extrabold">
            Password
            <input
              className="field mt-2"
              type="password"
              value={password}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              enterKeyHint="go"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p className="text-base font-extrabold text-[var(--brick-red)]">{error}</p>
          )}
          <button
            type="button"
            className="lego-btn lego-btn-yellow w-full"
            disabled={busy}
            onClick={submit}
          >
            {busy ? "…" : "Continue"}
          </button>
          <button
            type="button"
            className="w-full text-base font-extrabold underline"
            onClick={() => setMode("pick")}
          >
            Back
          </button>
        </div>
      )}
    </main>
  );
}
