"use client";

import { COUNTRY_OPTIONS, buildE164, validateE164 } from "@/lib/phone-regions";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [dial, setDial] = useState(COUNTRY_OPTIONS[0]!.dial);
  const [national, setNational] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const country = COUNTRY_OPTIONS.find((c) => c.dial === dial) ?? COUNTRY_OPTIONS[0]!;
  const e164 = buildE164(dial, national);
  const v = validateE164(e164);
  const phoneValid = v.ok;
  const maxLen = country.maxDigits;
  const otpOptional = process.env.NEXT_PUBLIC_OTP_OPTIONAL === "true";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!phoneValid) {
      setError("Vérifiez la longueur du numéro pour ce pays.");
      return;
    }
    setLoading(true);
    try {
      if (otpOptional) {
        const direct = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: e164 }),
        });
        const directData = (await direct.json()) as { success?: boolean; handoff?: string; error?: string };
        if (!direct.ok || !directData.success || !directData.handoff) {
          setError(directData.error ?? "Connexion directe impossible.");
          return;
        }
        const signRes = await signIn("otp-handoff", { handoff: directData.handoff, redirect: false });
        if (signRes?.error) {
          setError("Session impossible, reconnectez-vous.");
          return;
        }
        router.push("/boutique");
        router.refresh();
        return;
      }

      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: e164 }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error ?? "Envoi du code impossible. Réessayez.");
        return;
      }
      router.push(`/auth/verify?phone=${encodeURIComponent(e164)}`);
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] px-4 py-10">
      <div className="mx-auto w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <div className="text-center">
          <p className="text-2xl font-extrabold text-[#1A3C6E]">ZH CARGO</p>
          <p className="text-xs text-slate-500">Direct depuis la Chine</p>
        </div>

        <h1 className="mt-8 text-xl font-bold text-slate-900">Connexion</h1>
        <p className="mt-1 text-sm text-slate-600">
          {otpOptional ? "Entrez votre numéro pour vous connecter directement" : "Entrez votre numéro pour recevoir un code"}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Pays</label>
            <select
              value={dial}
              onChange={(e) => {
                setDial(e.target.value);
                setNational("");
                setError(null);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.dial} value={c.dial}>
                  {c.flag} {c.name} (+{c.dial})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Numéro de téléphone</label>
            <div className="flex gap-2">
              <span className="flex shrink-0 items-center rounded-xl border border-slate-200 bg-slate-50 px-2 text-sm text-slate-600">
                +{dial}
              </span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={maxLen}
                value={national}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, "");
                  setNational(d.slice(0, maxLen));
                  setError(null);
                }}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                placeholder="0X XX XX XX"
              />
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading || !phoneValid}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E67E22] py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : otpOptional ? (
              "Connexion directe"
            ) : (
              "Recevoir le code"
            )}
          </button>
        </form>
      </div>
      <p className="mt-6 text-center text-xs text-slate-500">
        <Link href="/boutique" className="text-[#1A3C6E]">
          Retour à la boutique
        </Link>
      </p>
    </main>
  );
}
