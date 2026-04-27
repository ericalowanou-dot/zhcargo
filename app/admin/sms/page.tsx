"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Row = {
  id: string;
  type: string;
  phone: string;
  message: string;
  status: string;
  createdAt: string;
};

const TYPES = ["ALL", "OTP", "CONFIRMATION", "TRANSIT", "DELIVERED", "PROMOTION"];

export default function AdminSmsPage() {
  const [type, setType] = useState("ALL");
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState({ monthSent: 0, successRate: 0 });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/sms?type=${type}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { sms: Row[]; summary: typeof summary };
      setRows(data.sms);
      setSummary(data.summary);
    } catch {
      toast.error("Impossible de charger l'historique SMS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [type]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-slate-900">Historique SMS</h2>
        <Link href="/admin/sms/envoyer" className="rounded-lg bg-[#1A3C6E] px-3 py-2 text-sm font-semibold text-white">
          Envoyer une promotion
        </Link>
      </div>
      <p className="text-sm text-slate-700">
        {summary.monthSent} SMS envoyés ce mois | Taux de succès: {summary.successRate}%
      </p>

      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              type === t ? "border-[#1A3C6E] bg-[#1A3C6E] text-white" : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#1A3C6E]" />
          </div>
        ) : (
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-100 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Téléphone</th>
                <th className="px-3 py-2">Message</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isOpen = !!expanded[r.id];
                const short = r.message.length > 90 ? `${r.message.slice(0, 90)}...` : r.message;
                return (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{r.type}</td>
                    <td className="px-3 py-2">{r.phone}</td>
                    <td className="px-3 py-2">
                      {isOpen ? r.message : short}{" "}
                      {r.message.length > 90 ? (
                        <button
                          type="button"
                          onClick={() => setExpanded((p) => ({ ...p, [r.id]: !p[r.id] }))}
                          className="text-xs font-semibold text-[#1A3C6E]"
                        >
                          {isOpen ? "voir moins" : "voir plus"}
                        </button>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          r.status === "SENT" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {r.status === "SENT" ? "Envoyé" : "Échec"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {new Date(r.createdAt).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

