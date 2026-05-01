"use client";

import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RevenuePoint = {
  date: string;
  label?: string;
  revenue: number;
  profit: number;
};

type RevenueChart7Props = {
  data: RevenuePoint[];
};

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

export function RevenueChart7({ data }: RevenueChart7Props) {
  if (!Array.isArray(data) || data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">Aucune donnée disponible</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} />
          <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
          <Tooltip formatter={(v) => new Intl.NumberFormat("fr-FR").format(toNumber(v))} />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Revenus"
            stroke="#1A3C6E"
            strokeWidth={2.5}
            dot={{ r: 2.5 }}
            activeDot={{ r: 4.5 }}
          />
          <Line
            type="monotone"
            dataKey="profit"
            name="Bénéfices"
            stroke="#10B981"
            strokeWidth={2.5}
            dot={{ r: 2.5 }}
            activeDot={{ r: 4.5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
