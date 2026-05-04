type Props = {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "default" | "green" | "blue" | "amber" | "rose";
  onClick?: () => void;
  active?: boolean;
};

const accentMap: Record<
  NonNullable<Props["accent"]>,
  { bg: string; bar: string; label: string; ring: string }
> = {
  default: {
    bg: "bg-white border-slate-200",
    bar: "from-slate-300 to-slate-400",
    label: "text-slate-500",
    ring: "ring-slate-400",
  },
  green: {
    bg: "bg-white border-emerald-200/70",
    bar: "from-emerald-400 to-emerald-500",
    label: "text-emerald-700",
    ring: "ring-emerald-400",
  },
  blue: {
    bg: "bg-white border-sky-200/70",
    bar: "from-sky-400 to-sky-500",
    label: "text-sky-700",
    ring: "ring-sky-400",
  },
  amber: {
    bg: "bg-white border-amber-200/70",
    bar: "from-amber-400 to-amber-500",
    label: "text-amber-700",
    ring: "ring-amber-400",
  },
  rose: {
    bg: "bg-white border-rose-200/70",
    bar: "from-rose-400 to-rose-500",
    label: "text-rose-700",
    ring: "ring-rose-400",
  },
};

export default function StatCard({
  label,
  value,
  hint,
  accent = "default",
  onClick,
  active = false,
}: Props) {
  const a = accentMap[accent];
  const clickable = typeof onClick === "function";

  const baseClass = `card-hover relative overflow-hidden rounded-2xl border ${a.bg} p-4 shadow-sm transition`;
  const clickableClass = clickable
    ? "cursor-pointer text-left hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-400"
    : "";
  const activeClass = active
    ? `ring-2 ring-offset-1 ${a.ring} shadow-md`
    : "";

  const content = (
    <>
      <div
        className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${a.bar}`}
      />
      <div
        className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${a.label}`}
      >
        <span>{label}</span>
        {clickable && (
          <span
            className={`text-[9px] font-medium normal-case tracking-normal ${
              active ? "text-slate-700" : "text-slate-400"
            }`}
            aria-hidden
          >
            {active ? "필터해제" : "클릭필터"}
          </span>
        )}
      </div>
      <div className="mt-1.5 text-[28px] font-bold leading-none tabular text-slate-900">
        {value}
      </div>
      {hint && <div className="mt-1.5 text-[11px] text-slate-400">{hint}</div>}
    </>
  );

  if (clickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`${baseClass} ${clickableClass} ${activeClass} w-full`}
      >
        {content}
      </button>
    );
  }

  return <div className={`${baseClass} ${activeClass}`}>{content}</div>;
}
