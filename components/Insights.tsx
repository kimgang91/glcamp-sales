"use client";

import type { TopicCount } from "@/lib/analysis";
import { RESULT_COLORS } from "./Charts";

const BUCKET_META: Record<
  TopicCount["bucket"],
  { title: string; subtitle: string; accent: string; tint: string; icon: string }
> = {
  positive: {
    title: "영업이 잘 되는 포인트",
    subtitle: "고객이 가입/확장 의향을 보일 때 자주 등장하는 키워드",
    accent: "border-emerald-200 bg-emerald-50/60",
    tint: "text-emerald-700",
    icon: "↗",
  },
  concern: {
    title: "고민·검토 포인트",
    subtitle: "결정을 미루거나 추가 논의를 요청하는 신호",
    accent: "border-sky-200 bg-sky-50/60",
    tint: "text-sky-700",
    icon: "↺",
  },
  objection: {
    title: "거절·이탈 사유",
    subtitle: "도입을 망설이거나 거절하는 핵심 이유",
    accent: "border-rose-200 bg-rose-50/60",
    tint: "text-rose-700",
    icon: "↘",
  },
  context: {
    title: "맥락 / 외부 채널 언급",
    subtitle: "내용에서 자주 등장하는 외부 채널·환경",
    accent: "border-amber-200 bg-amber-50/60",
    tint: "text-amber-700",
    icon: "•",
  },
};

export default function Insights({ topics }: { topics: TopicCount[] }) {
  const buckets: TopicCount["bucket"][] = [
    "positive",
    "concern",
    "objection",
    "context",
  ];

  const totalDetail = topics.reduce((s, t) => s + t.count, 0);

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            내용 인사이트
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            영업 메모(내용 / 사유 / 비고)를 키워드 패턴으로 자동 분류한 결과예요.
            현재 필터된 데이터 기준 · 매칭{" "}
            <span className="tabular font-semibold text-slate-700">
              {totalDetail}
            </span>
            건
          </p>
        </div>
      </div>

      {totalDetail === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
          아직 분석할 메모가 없습니다. 시트의 “내용 / 사유” 컬럼이 채워지면
          자동으로 인사이트가 표시됩니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {buckets.map((b) => {
            const meta = BUCKET_META[b];
            const items = topics
              .filter((t) => t.bucket === b && t.count > 0)
              .sort((a, b) => b.count - a.count);
            return (
              <div
                key={b}
                className={`rounded-2xl border p-5 shadow-sm ${meta.accent}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-base font-bold shadow-sm ${meta.tint}`}
                  >
                    {meta.icon}
                  </span>
                  <div>
                    <h3 className={`text-sm font-bold ${meta.tint}`}>
                      {meta.title}
                    </h3>
                    <p className="text-[11px] text-slate-500">{meta.subtitle}</p>
                  </div>
                </div>

                {items.length === 0 ? (
                  <p className="mt-4 text-xs text-slate-400">
                    이 카테고리에 해당하는 키워드 매칭이 아직 없습니다.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {items.map((it) => (
                      <li key={it.label}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-800">
                            {it.label}
                          </span>
                          <span
                            className={`tabular text-sm font-bold ${meta.tint}`}
                          >
                            {it.count}건
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/70">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                (it.count /
                                  Math.max(...items.map((x) => x.count))) *
                                  100,
                              )}%`,
                              background:
                                b === "positive"
                                  ? "linear-gradient(90deg,#34d399,#10b981)"
                                  : b === "concern"
                                  ? "linear-gradient(90deg,#7dd3fc,#0ea5e9)"
                                  : b === "objection"
                                  ? "linear-gradient(90deg,#fda4af,#ef4444)"
                                  : "linear-gradient(90deg,#fcd34d,#f59e0b)",
                            }}
                          />
                        </div>
                        {it.examples.length > 0 && (
                          <details className="mt-1 group">
                            <summary className="cursor-pointer list-none text-[11px] text-slate-500 hover:text-slate-700">
                              <span className="group-open:hidden">
                                ▸ 매칭된 메모 보기 ({it.examples.length})
                              </span>
                              <span className="hidden group-open:inline">
                                ▾ 닫기
                              </span>
                            </summary>
                            <ul className="mt-1 space-y-1 border-l-2 border-white/80 pl-3">
                              {it.examples.map((ex, i) => (
                                <li
                                  key={i}
                                  className="text-[11.5px] leading-relaxed text-slate-600"
                                >
                                  <span
                                    className="mr-1 inline-block min-w-[26px] rounded-sm px-1 text-center text-[10px] font-semibold text-white"
                                    style={{
                                      background:
                                        RESULT_COLORS[ex.result] ?? "#94a3b8",
                                    }}
                                  >
                                    {ex.result}
                                  </span>
                                  <span className="font-medium text-slate-700">
                                    {ex.campsite}
                                  </span>{" "}
                                  · {ex.snippet}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
