"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartPoint = Record<string, string | number>;

type RevenueChartProps = {
  type: "area" | "bar" | "pie";
  data: ChartPoint[];
  xKey?: string;
};

const PIE_COLORS = ["#1A3C6E", "#E67E22", "#10B981", "#7C3AED", "#EF4444", "#0EA5E9"];

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

export function RevenueChart({ type, data, xKey = "date" }: RevenueChartProps) {
  if (!Array.isArray(data) || data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">Aucune donnée disponible</p>;
  }

  if (type === "pie") {
    return (
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip formatter={(v) => new Intl.NumberFormat("fr-FR").format(toNumber(v))} />
            <Pie data={data} dataKey="revenue" nameKey={xKey} innerRadius={50} outerRadius={88}>
              {data.map((entry, index) => (
                <Cell
                  key={`${String(entry[xKey] ?? "item")}-${index}`}
                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "bar") {
    return (
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#64748B" }} />
            <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
            <Tooltip formatter={(v) => new Intl.NumberFormat("fr-FR").format(toNumber(v))} />
            <Bar dataKey="amount" radius={[8, 8, 0, 0]} fill="#1A3C6E" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <defs>
            <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1A3C6E" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#1A3C6E" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="profit-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#64748B" }} />
          <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
          <Tooltip formatter={(v) => new Intl.NumberFormat("fr-FR").format(toNumber(v))} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#1A3C6E"
            fillOpacity={1}
            fill="url(#revenue-fill)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="profit"
            stroke="#10B981"
            fillOpacity={1}
            fill="url(#profit-fill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
