"use client";

import { maskPhoneForDisplay } from "@/lib/phone-regions";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone")?.trim() ?? "";

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [resendLoading, setResendLoading] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join("");

  useEffect(() => {
    if (!phone) router.replace("/auth/login");
  }, [phone, router]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const verifyAndSignIn = useCallback(async () => {
    if (code.length !== 6 || !phone) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = (await res.json()) as { success?: boolean; handoff?: string; error?: string };
      if (!res.ok || !data.success || !data.handoff) {
        setErrorMessage(data.error ?? "Code incorrect.");
        setDigits(["", "", "", "", "", ""]);
        inputsRef.current[0]?.focus();
        return;
      }
      const signRes = await signIn("otp-handoff", { handoff: data.handoff, redirect: false });
      if (signRes?.error) {
        setErrorMessage("Session impossible.");
        return;
      }
      router.push("/boutique");
      router.refresh();
    } catch {
      setErrorMessage("Erreur réseau.");
    } finally {
      setSubmitting(false);
    }
  }, [code, phone, router]);

  useEffect(() => {
    if (code.length === 6 && !submitting) void verifyAndSignIn();
  }, [code, submitting, verifyAndSignIn]);

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = t.split("").concat(Array(6).fill("")).slice(0, 6);
    setDigits(next);
  };

  const maskLabel = phone ? maskPhoneForDisplay(phone) : "••";

  if (!phone) return null;

  return (
    <main className="min-h-screen bg-[#F8F9FA] px-4 py-8">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-xl font-bold text-slate-900">Vérification</h1>
        <p className="mt-1 text-sm text-slate-600">Code envoyé au {maskLabel}</p>

        <div className="mt-8 flex justify-center gap-2" onPaste={onPaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => {
                const next = [...digits];
                next[i] = e.target.value.replace(/\D/g, "").slice(0, 1);
                setDigits(next);
                if (next[i] && i < 5) inputsRef.current[i + 1]?.focus();
              }}
              className="h-12 w-10 rounded-lg border border-slate-200 text-center text-lg font-semibold"
            />
          ))}
        </div>

        {errorMessage ? <p className="mt-3 text-center text-sm text-red-600">{errorMessage}</p> : null}

        {submitting ? (
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Connexion...
          </p>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-600">
          {countdown > 0 ? (
            <span>Renvoyer le code dans {countdown}s</span>
          ) : (
            <button
              type="button"
              onClick={async () => {
                setResendLoading(true);
                await fetch("/api/auth/send-otp", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ phone }),
                });
                setCountdown(60);
                setResendLoading(false);
              }}
              disabled={resendLoading}
              className="font-medium text-[#E67E22] disabled:opacity-50"
            >
              {resendLoading ? "Envoi..." : "Renvoyer le code"}
            </button>
          )}
        </p>

        <p className="mt-6 text-center">
          <Link href="/auth/login" className="text-sm text-[#1A3C6E]">
            ← Changer de numéro
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA] text-slate-600">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
