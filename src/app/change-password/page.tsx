"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LegoLogo } from "@/components/LegoLogo";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((me) => {
        if (!me.user) {
          router.replace("/auth");
          return;
        }
        if (!me.mustChangePassword) {
          router.replace(me.user.role === "admin" && me.isAdmin ? "/admin" : "/home");
          return;
        }
        setName(me.user.name);
        setReady(true);
      })
      .catch(() => router.replace("/auth"));
  }, [router]);

  async function submit() {
    setError("");
    if (password.length < 3) {
      setError("Password must be at least 3 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not update password");
        return;
      }
      const me = await fetch("/api/auth/me").then((r) => r.json());
      if (!me.avatarComplete) {
        router.replace("/avatar?onboarding=1");
      } else if (me.isAdmin) {
        router.replace("/admin");
      } else {
        router.replace("/home");
      }
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return <main className="loading-screen">Loading…</main>;
  }

  return (
    <main className="page-wrap flex min-h-dvh flex-col justify-center py-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <h1 className="text-center">
        <LegoLogo className="text-[clamp(2.8rem,11vw,4.4rem)] leading-none" />
      </h1>
      <div className="panel mx-auto mt-10 w-full max-w-md space-y-5">
        <h2 className="brand-title text-[clamp(1.7rem,5.5vw,2.3rem)]">Change password</h2>
        <p className="soft-copy">
          Set a new password for {name}.
        </p>
        <label className="block text-base font-extrabold">
          New password
          <input
            className="field mt-2"
            type="password"
            value={password}
            autoComplete="new-password"
            enterKeyHint="next"
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className="block text-base font-extrabold">
          Confirm password
          <input
            className="field mt-2"
            type="password"
            value={confirm}
            autoComplete="new-password"
            enterKeyHint="go"
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
        </label>
        {error && <p className="text-base font-extrabold text-[var(--brick-red)]">{error}</p>}
        <button
          type="button"
          className="lego-btn lego-btn-yellow w-full"
          disabled={busy}
          onClick={submit}
        >
          {busy ? "…" : "Save"}
        </button>
      </div>
    </main>
  );
}
