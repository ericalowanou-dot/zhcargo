"use client";

import { Loader2, Lock, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { success?: boolean; handoff?: string };
      if (!res.ok || !data.success || !data.handoff) {
        setError("Identifiants incorrects");
        return;
      }
      const r = await signIn("admin-handoff", { handoff: data.handoff, redirect: false });
      if (r?.error) {
        setError("Identifiants incorrects");
        return;
      }
      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Identifiants incorrects");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
        <h1 className="text-center text-xl font-extrabold text-[#1A3C6E]">ZH CARGO — Administration</h1>
        <p className="mt-1 text-center text-sm text-slate-500">Connexion à l&apos;espace de gestion</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block text-xs font-medium text-slate-600">
            E-mail
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 px-3">
              <Mail className="h-4 w-4 text-slate-400" />
              <input
                type="email"
                autoComplete="email"
                required
                className="h-11 w-full border-0 bg-transparent text-sm outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Mot de passe
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 px-3">
              <Lock className="h-4 w-4 text-slate-400" />
              <input
                type="password"
                autoComplete="current-password"
                required
                className="h-11 w-full border-0 bg-transparent text-sm outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </label>
          {error ? (
            <p className="text-center text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1A3C6E] text-sm font-semibold text-white hover:bg-[#152f56] disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Se connecter
          </button>
        </form>
      </div>
    </main>
  );
}
