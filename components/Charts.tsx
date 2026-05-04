"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PIE_COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#6366f1",
  "#14b8a6",
  "#a855f7",
  "#eab308",
  "#22c55e",
  "#0ea5e9",
  "#f43f5e",
  "#64748b",
];

export const RESULT_COLORS: Record<string, string> = {
  확정: "#10b981",
  검토: "#0ea5e9",
  거절: "#ef4444",
  부재: "#a78bfa",
  기타: "#94a3b8",
  "(미분류)": "#cbd5e1",
};

export const REASON_COLORS: Record<string, string> = {
  수수료: "#f97316",
  서비스: "#3b82f6",
  현재만족: "#22c55e",
  약정기간: "#a855f7",
  관심없음: "#94a3b8",
  성향: "#ec4899",
  기타: "#cbd5e1",
  "(미분류)": "#e2e8f0",
};

type Item = { name: string; value: number };

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  fontSize: 12,
  boxShadow: "0 4px 16px rgba(15, 23, 42, 0.06)",
} as const;

/**
 * Recharts ResponsiveContainer가 hydration 직후 부모 너비를 0으로 측정해
 * 차트가 렌더되지 않는 이슈를 회피하기 위해, 클라이언트 마운트 후에만
 * 차트를 그린다. 마운트 전에는 동일 높이의 placeholder를 보여 레이아웃 점프를 막는다.
 */
function ClientOnly({
  height,
  children,
}: {
  height: number | string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return (
      <div
        style={{ width: "100%", height }}
        className="flex items-center justify-center text-xs text-slate-300"
      >
        차트 로딩 중…
      </div>
    );
  }
  return <>{children}</>;
}

function MiniLegend({
  data,
  colorMap,
  total,
}: {
  data: Item[];
  colorMap?: Record<string, string>;
  total: number;
}) {
  return (
    <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] sm:grid-cols-3">
      {data.map((d, i) => {
        const pct = total > 0 ? (d.value / total) * 100 : 0;
        const color = colorMap?.[d.name] ?? PIE_COLORS[i % PIE_COLORS.length];
        return (
          <li
            key={d.name}
            className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                style={{ background: color }}
              />
              <span className="truncate text-slate-600">{d.name}</span>
            </span>
            <span className="tabular text-slate-700">
              <span className="font-semibold">{d.value}</span>
              <span className="ml-1 text-[11px] text-slate-400">
                {pct.toFixed(1)}%
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function HorizontalBar({
  data,
  colorMap,
}: {
  data: Item[];
  colorMap?: Record<string, string>;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const height = Math.max(180, data.length * 28 + 40);
  if (data.length === 0 || total === 0) {
    return (
      <EmptyChart
        height={Math.max(180, height)}
        message="표시할 분포 데이터가 없습니다."
      />
    );
  }
  return (
    <div>
      <div style={{ width: "100%", height }}>
        <ClientOnly height={height}>
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 28, bottom: 4, left: 8 }}
              barCategoryGap={6}
            >
              <CartesianGrid
                horizontal={false}
                strokeDasharray="3 3"
                stroke="#e2e8f0"
              />
              <XAxis
                type="number"
                stroke="#94a3b8"
                fontSize={11}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#475569"
                fontSize={12}
                width={120}
                tick={{ fill: "#334155" }}
              />
              <Tooltip
                cursor={{ fill: "rgba(148,163,184,0.08)" }}
                contentStyle={tooltipStyle}
                formatter={(v: number) => [`${v}건`, "건수"]}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={colorMap?.[d.name] ?? PIE_COLORS[i % PIE_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ClientOnly>
      </div>
    </div>
  );
}

export function DonutChart({
  data,
  colorMap,
}: {
  data: Item[];
  colorMap?: Record<string, string>;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (data.length === 0 || total === 0) {
    return (
      <EmptyChart height={280} message="표시할 분포 데이터가 없습니다." />
    );
  }
  return (
    <div>
      <div style={{ width: "100%", height: 240 }}>
        <ClientOnly height={240}>
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={56}
                outerRadius={90}
                paddingAngle={2}
                stroke="#fff"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={colorMap?.[d.name] ?? PIE_COLORS[i % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number, name: string) => [
                  `${v}건 (${total ? ((v / total) * 100).toFixed(1) : 0}%)`,
                  name,
                ]}
                contentStyle={tooltipStyle}
              />
            </PieChart>
          </ResponsiveContainer>
        </ClientOnly>
      </div>
      <MiniLegend data={data} colorMap={colorMap} total={total} />
    </div>
  );
}

export type StackedSeries = {
  key: string;
  label: string;
  total: number;
  확정: number;
  검토: number;
  거절: number;
  부재: number;
  기타: number;
};

const STACK_KEYS = ["확정", "검토", "거절", "부재", "기타"] as const;

export function ContactTimeChart({ data }: { data: StackedSeries[] }) {
  if (data.length === 0) {
    return (
      <EmptyChart
        height={320}
        message="최종 컨택일이 입력된 행이 아직 없습니다."
      />
    );
  }
  return (
    <div style={{ width: "100%", height: 320 }}>
      <ClientOnly height={320}>
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <AreaChart
            data={data}
            margin={{ top: 8, right: 16, left: -10, bottom: 0 }}
          >
            <defs>
              {STACK_KEYS.map((k) => (
                <linearGradient
                  key={k}
                  id={`grad-${k}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={RESULT_COLORS[k]}
                    stopOpacity={0.55}
                  />
                  <stop
                    offset="95%"
                    stopColor={RESULT_COLORS[k]}
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              allowDecimals={false}
              width={32}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(l, payload) => {
                const k = payload?.[0]?.payload?.key;
                return k ? `${k}` : `${l}`;
              }}
              formatter={(v: number, name: string) => [`${v}건`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            {STACK_KEYS.map((k) => (
              <Area
                key={k}
                type="monotone"
                dataKey={k}
                stackId="1"
                stroke={RESULT_COLORS[k]}
                strokeWidth={1.5}
                fill={`url(#grad-${k})`}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </ClientOnly>
    </div>
  );
}

function EmptyChart({
  height,
  message,
}: {
  height: number;
  message: string;
}) {
  return (
    <div
      style={{ width: "100%", height }}
      className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400"
    >
      {message}
    </div>
  );
}
