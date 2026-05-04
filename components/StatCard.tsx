type Props = {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "default" | "green" | "blue" | "amber" | "rose";
};

const accentMap: Record<NonNullable<Props["accent"]>, { bg: string; bar: string; label: string }> = {
  default: {
    bg: "bg-white border-slate-200",
    bar: "from-slate-300 to-slate-400",
    label: "text-slate-500",
  },
  green: {
    bg: "bg-white border-emerald-200/70",
    bar: "from-emerald-400 to-emerald-500",
    label: "text-emerald-700",
  },
  blue: {
    bg: "bg-white border-sky-200/70",
    bar: "from-sky-400 to-sky-500",
    label: "text-sky-700",
  },
  amber: {
    bg: "bg-white border-amber-200/70",
    bar: "from-amber-400 to-amber-500",
    label: "text-amber-700",
  },
  rose: {
    bg: "bg-white border-rose-200/70",
    bar: "from-rose-400 to-rose-500",
    label: "text-rose-700",
  },
};

export default function StatCard({
  label,
  value,
  hint,
  accent = "default",
}: Props) {
  const a = accentMap[accent];
  return (
    <div
      className={`card-hover relative overflow-hidden rounded-2xl border ${a.bg} p-4 shadow-sm`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${a.bar}`}
      />
      <div className={`text-[11px] font-semibold uppercase tracking-wider ${a.label}`}>
        {label}
      </div>
      <div className="mt-1.5 text-[28px] font-bold leading-none tabular text-slate-900">
        {value}
      </div>
      {hint && <div className="mt-1.5 text-[11px] text-slate-400">{hint}</div>}
    </div>
  );
}
