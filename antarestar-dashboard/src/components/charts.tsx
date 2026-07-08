"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = { fontSize: 11, fill: "var(--muted)" };
const grid = "var(--border)";

function TT({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs shadow-lg">
      <div className="font-bold mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="muted">{p.name}:</span>
          <span className="font-semibold">{Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export function TrendArea({
  data,
  keys,
  colors = ["#f97316", "#3b82f6", "#10b981"],
  height = 260,
}: {
  data: any[];
  keys: string[];
  colors?: string[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: -18, right: 8, top: 6 }}>
        <defs>
          {keys.map((k, i) => (
            <linearGradient key={k} id={`g${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors[i % colors.length]} stopOpacity={0.35} />
              <stop offset="100%" stopColor={colors[i % colors.length]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} />
        <Tooltip content={<TT />} />
        {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {keys.map((k, i) => (
          <Area
            key={k}
            type="monotone"
            dataKey={k}
            stroke={colors[i % colors.length]}
            strokeWidth={2.5}
            fill={`url(#g${k})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarChartCard({
  data,
  dataKey = "value",
  color = "#f97316",
  height = 260,
  horizontal = false,
  colorByCell,
}: {
  data: any[];
  dataKey?: string;
  color?: string;
  height?: number;
  horizontal?: boolean;
  colorByCell?: (d: any) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ left: horizontal ? 8 : -18, right: 12, top: 6, bottom: 4 }}
      >
        <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" tick={AXIS} axisLine={false} tickLine={false} width={110} />
          </>
        ) : (
          <>
            <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={0} angle={0} />
            <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} />
          </>
        )}
        <Tooltip content={<TT />} cursor={{ fill: "var(--border)", opacity: 0.4 }} />
        <Bar dataKey={dataKey} radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} fill={color}>
          {colorByCell &&
            data.map((d, i) => <Cell key={i} fill={colorByCell(d)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  height = 240,
}: {
  data: { name: string; value: number; color: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={58}
          outerRadius={90}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip content={<TT />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MiniLine({ data, color = "#f97316", height = 40 }: { data: number[]; color?: string; height?: number }) {
  const d = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={d}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
