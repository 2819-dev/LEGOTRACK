"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isIPad9FamilyKiosk } from "@/lib/device";
import { LegoLogo } from "@/components/LegoLogo";

type Mode = "pick" | "login" | "register";

function AuthForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [mode, setMode] = useState<Mode>("pick");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [kiosk, setKiosk] = useState(false);
  const [gateOn, setGateOn] = useState(false);

  useEffect(() => {
    setKiosk(isIPad9FamilyKiosk());
    fetch("/api/settings/access-gate", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setGateOn(Boolean(d.accessGateEnabled)))
      .catch(() => setGateOn(false));
  }, []);

  useEffect(() => {
    const qMode = search.get("mode");
    const qError = search.get("error");
    if (qMode === "login" || qMode === "register") setMode(qMode);
    if (qError) setError(qError);
  }, [search]);

  const openSignup = !gateOn || kiosk;
  const openPlayerLogin = !gateOn || kiosk;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "register" && !openSignup) {
      setError("Registration is closed on this device");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      // JSON + 200 Set-Cookie (not a 303 redirect) — Safari/iOS often drops
      // cookies that arrive only on redirect responses.
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ name, password, kiosk }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setBusy(false);
        return;
      }

      // Confirm the session cookie actually stuck before leaving this page
      const me = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "same-origin",
      }).then((r) => r.json());
      if (!me?.user) {
        setError("Signed in, but the session did not stick. Try again.");
        setBusy(false);
        return;
      }

      let next = "/home";
      if (data.mustChangePassword) next = "/change-password";
      else if (data.role === "admin") next = "/admin";
      else if (mode === "register" || data.needsAvatar) next = "/avatar?onboarding=1";
      window.location.replace(next);
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  return (
    <main className="page-wrap flex min-h-dvh flex-col justify-center py-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <h1 className="text-center">
        <LegoLogo className="text-[clamp(2.8rem,11vw,4.4rem)] leading-none" />
      </h1>
      <p className="soft-copy mt-4 text-center">
        {openPlayerLogin ? "Sign in with your name and password." : "Admin sign-in only"}
      </p>

      {mode === "pick" && (
        <div className="mx-auto mt-12 flex w-full max-w-md flex-col gap-4">
          <button
            type="button"
            className="lego-btn lego-btn-yellow w-full"
            onClick={() => {
              setError("");
              setMode("login");
            }}
          >
            Log in
          </button>
          {openSignup && (
            <button
              type="button"
              className="lego-btn w-full"
              onClick={() => {
                setError("");
                setMode("register");
              }}
            >
              Create account
            </button>
          )}
          <button
            type="button"
            className="mt-3 min-h-12 text-base font-extrabold underline"
            onClick={() => router.push("/")}
          >
            Back
          </button>
        </div>
      )}

      {(mode === "login" || (mode === "register" && openSignup)) && (
        <form
          className="panel mx-auto mt-10 w-full max-w-md space-y-5"
          onSubmit={submit}
        >
          <h2 className="brand-title text-[clamp(1.7rem,5.5vw,2.3rem)]">
            {mode === "login"
              ? openPlayerLogin
                ? "Log in"
                : "Admin log in"
              : "Create account"}
          </h2>
          <label className="block text-base font-extrabold">
            Name
            <input
              className="field mt-2"
              name="name"
              value={name}
              required
              autoComplete="username"
              enterKeyHint="next"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-base font-extrabold">
            Password
            <input
              className="field mt-2"
              name="password"
              type="password"
              value={password}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              enterKeyHint="go"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p className="text-base font-extrabold text-[var(--brick-red)]">{error}</p>
          )}
          <button
            type="submit"
            className="lego-btn lego-btn-yellow w-full"
            disabled={busy}
          >
            {busy ? "…" : "Continue"}
          </button>
          <button
            type="button"
            className="min-h-12 w-full text-base font-extrabold underline"
            onClick={() => {
              setError("");
              setMode("pick");
            }}
          >
            Back
          </button>
        </form>
      )}
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<main className="loading-screen">Loading…</main>}>
      <AuthForm />
    </Suspense>
  );
}
