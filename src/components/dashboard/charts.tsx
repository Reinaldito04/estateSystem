"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

export const CHART_COLORS = {
  primary: "#2563eb",
  emerald: "#10b981",
  red: "#ef4444",
  amber: "#f59e0b",
  violet: "#8b5cf6",
  slate: "#64748b",
  sky: "#0ea5e9",
};

export const PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.emerald,
  CHART_COLORS.amber,
  CHART_COLORS.violet,
  CHART_COLORS.sky,
  CHART_COLORS.red,
  CHART_COLORS.slate,
];

export function formatMonthLabel(month: string): string {
  const date = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return month;
  return new Intl.DateTimeFormat("es-VE", { month: "short", year: "2-digit" }).format(date);
}

const axisProps = {
  tick: { fontSize: 11, fill: "currentColor" },
  stroke: "currentColor",
  tickLine: false,
  axisLine: false,
} as const;

const gridStroke = "rgba(100,116,139,0.18)";

export function CashflowChart({
  data,
  currency,
}: {
  data: { month: string; income: number; expenses: number; net: number }[];
  currency: string;
}) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Sin movimientos en el período</p>;
  }
  return (
    <div className="h-72 w-full text-muted-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
          <XAxis dataKey="month" tickFormatter={formatMonthLabel} {...axisProps} />
          <YAxis {...axisProps} width={64} tickFormatter={(value) => formatCurrency(Number(value), currency).replace(/\.\d+/, "")} />
          <Tooltip
            formatter={(value, name) => [formatCurrency(Number(value), currency), String(name)]}
            labelFormatter={(label) => formatMonthLabel(String(label))}
            contentStyle={{ borderRadius: 12, border: "1px solid rgba(100,116,139,0.25)", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="income" name="Ingresos" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="expenses" name="Gastos" fill={CHART_COLORS.red} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Line type="monotone" dataKey="net" name="Neto" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BreakdownBarChart({
  data,
  labelMap,
  currency,
}: {
  data: { key: string; total: number }[];
  labelMap: Record<string, string>;
  currency: string;
}) {
  const rows = data.map((row) => ({ ...row, label: labelMap[row.key] ?? row.key })).slice(0, 6);
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Sin datos</p>;
  }
  return (
    <div className="h-64 w-full text-muted-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
          <XAxis type="number" {...axisProps} tickFormatter={(value) => formatCurrency(Number(value), currency).replace(/\.\d+/, "")} />
          <YAxis type="category" dataKey="label" width={110} {...axisProps} />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value), currency), "Total"]}
            contentStyle={{ borderRadius: 12, border: "1px solid rgba(100,116,139,0.25)", fontSize: 12 }}
          />
          <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {rows.map((row, index) => (
              <Cell key={row.key} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ContractsChart({
  newByMonth,
  terminatedByMonth,
}: {
  newByMonth: { month: string; count: number }[];
  terminatedByMonth: { month: string; count: number }[];
}) {
  const merged = newByMonth.map((row, index) => ({
    month: row.month,
    nuevos: row.count,
    finalizados: terminatedByMonth[index]?.count ?? 0,
  }));
  return (
    <div className="h-64 w-full text-muted-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={merged} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
          <XAxis dataKey="month" tickFormatter={formatMonthLabel} {...axisProps} />
          <YAxis {...axisProps} width={40} allowDecimals={false} />
          <Tooltip
            labelFormatter={(label) => formatMonthLabel(String(label))}
            contentStyle={{ borderRadius: 12, border: "1px solid rgba(100,116,139,0.25)", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="nuevos" name="Nuevos" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={26} />
          <Bar dataKey="finalizados" name="Finalizados" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MiniBars({
  data,
  labelMap,
  color = CHART_COLORS.primary,
}: {
  data: { key: string; count: number }[];
  labelMap: Record<string, string>;
  color?: string;
}) {
  const max = Math.max(...data.map((row) => row.count), 1);
  if (data.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">Sin datos</p>;
  }
  return (
    <div className="space-y-2.5">
      {data.slice(0, 6).map((row) => (
        <div key={row.key} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{labelMap[row.key] ?? row.key}</span>
            <span className="font-medium tabular-nums">{row.count}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${(row.count / max) * 100}%`, backgroundColor: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}
