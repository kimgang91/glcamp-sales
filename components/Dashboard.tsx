"use client";

import { useMemo, useState } from "react";
import {
  REASON_CATEGORIES,
  RESULT_CATEGORIES,
  type ReasonCategory,
  type ResultCategory,
  type SalesRow,
} from "@/lib/sheet";
import {
  analyzeTopics,
  buildTimeSeries,
  type Granularity,
} from "@/lib/analysis";
import StatCard from "./StatCard";
import {
  ContactTimeChart,
  DonutChart,
  HorizontalBar,
  REASON_COLORS,
  RESULT_COLORS,
} from "./Charts";
import Insights from "./Insights";

type Props = {
  rows: SalesRow[];
  updatedAt: string;
};

type SortKey =
  | "campsite"
  | "grade"
  | "plan"
  | "manager"
  | "status"
  | "region"
  | "lastContact"
  | "result";

type SortDir = "asc" | "desc";

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr.filter((v) => v && v.length > 0))).sort((a, b) =>
    a.localeCompare(b, "ko"),
  );
}

function countBy(
  rows: SalesRow[],
  key: keyof SalesRow,
): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = (r[key] as string) || "(미지정)";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map, ([name, value]) => ({ name, value })).sort(
    (a, b) => b.value - a.value,
  );
}

const GRADE_ORDER = ["S", "A", "B", "C", "D", "무등급", "(미지정)"];

function gradeRank(g: string): number {
  const idx = GRADE_ORDER.indexOf(g);
  return idx === -1 ? GRADE_ORDER.length : idx;
}

function gradeBadgeClass(grade: string): string {
  switch (grade) {
    case "S":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "A":
      return "bg-rose-100 text-rose-800 border-rose-200";
    case "B":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "C":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "D":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "무등급":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function statusBadgeClass(status: string): string {
  if (status.includes("운영"))
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status.includes("상담") || status.includes("협의"))
    return "bg-sky-50 text-sky-700 border-sky-200";
  if (status.includes("보류"))
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (
    status.includes("거절") ||
    status.includes("실패") ||
    status.includes("이탈")
  )
    return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

const SECTIONS = [
  { id: "overview", label: "개요", hint: "전체 요약" },
  { id: "result", label: "결과 · 사유", hint: "확정/검토/거절" },
  { id: "timeline", label: "컨택 추이", hint: "일·주·월별" },
  { id: "insight", label: "내용 인사이트", hint: "키워드 분류" },
  { id: "table", label: "전체 데이터", hint: "필터 가능 테이블" },
] as const;

export default function Dashboard({ rows, updatedAt }: Props) {
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState<string>("");
  const [manager, setManager] = useState<string>("");
  const [plan, setPlan] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [resultCat, setResultCat] = useState<string>("");
  const [reasonCat, setReasonCat] = useState<string>("");
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [sortKey, setSortKey] = useState<SortKey>("campsite");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  // 기본은 전체 표시. 데이터가 매우 많을 때만 사용자가 원하는 만큼만 보도록 페이지네이션 버튼 제공.
  const [pageSize, setPageSize] = useState<number>(Number.MAX_SAFE_INTEGER);

  const grades = useMemo(
    () =>
      uniq(rows.map((r) => r.grade)).sort(
        (a, b) => gradeRank(a) - gradeRank(b),
      ),
    [rows],
  );
  const managers = useMemo(() => uniq(rows.map((r) => r.manager)), [rows]);
  const plans = useMemo(() => uniq(rows.map((r) => r.plan)), [rows]);
  const regions = useMemo(() => uniq(rows.map((r) => r.region)), [rows]);
  const statuses = useMemo(() => uniq(rows.map((r) => r.status)), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (grade && r.grade !== grade) return false;
      if (manager && r.manager !== manager) return false;
      if (plan && r.plan !== plan) return false;
      if (region && r.region !== region) return false;
      if (status && r.status !== status) return false;
      if (resultCat && r.resultCategory !== resultCat) return false;
      if (reasonCat && r.reasonCategory !== reasonCat) return false;
      if (!q) return true;
      return r.haystack.includes(q);
    });
  }, [rows, search, grade, manager, plan, region, status, resultCat, reasonCat]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      if (sortKey === "grade") {
        return (gradeRank(a.grade) - gradeRank(b.grade)) * dir;
      }
      if (sortKey === "lastContact") {
        return (
          ((a.contactedAt || "") < (b.contactedAt || "")
            ? -1
            : (a.contactedAt || "") > (b.contactedAt || "")
              ? 1
              : 0) * dir
        );
      }
      const va =
        (a[sortKey === "result" ? "resultCategory" : sortKey] as string) ?? "";
      const vb =
        (b[sortKey === "result" ? "resultCategory" : sortKey] as string) ?? "";
      return va.localeCompare(vb, "ko") * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const operating = filtered.filter((r) => r.status.includes("운영")).length;
    const confirmed = filtered.filter((r) => r.resultCategory === "확정").length;
    const reviewing = filtered.filter((r) => r.resultCategory === "검토").length;
    const rejected = filtered.filter((r) => r.resultCategory === "거절").length;
    const noContact = filtered.filter((r) => !r.contactedAt).length;
    const contacted = total - noContact;
    return {
      total,
      operating,
      contacted,
      confirmed,
      reviewing,
      rejected,
      noContact,
    };
  }, [filtered]);

  const pct = (n: number) =>
    stats.total ? `${((n / stats.total) * 100).toFixed(1)}%` : "0%";

  const byGrade = useMemo(() => {
    const c = countBy(filtered, "grade");
    return c.sort((a, b) => gradeRank(a.name) - gradeRank(b.name));
  }, [filtered]);
  const byManager = useMemo(() => countBy(filtered, "manager"), [filtered]);
  const byPlan = useMemo(() => countBy(filtered, "plan"), [filtered]);
  const byRegion = useMemo(() => countBy(filtered, "region"), [filtered]);

  const byResult = useMemo(() => {
    const c = countBy(filtered, "resultCategory");
    const order = [...RESULT_CATEGORIES, "(미분류)"];
    return c.sort(
      (a, b) =>
        order.indexOf(a.name as never) - order.indexOf(b.name as never),
    );
  }, [filtered]);
  const byReason = useMemo(() => {
    const c = countBy(filtered, "reasonCategory");
    const order = [...REASON_CATEGORIES, "(미분류)"];
    return c.sort(
      (a, b) =>
        order.indexOf(a.name as never) - order.indexOf(b.name as never),
    );
  }, [filtered]);

  const timeSeries = useMemo(
    () => buildTimeSeries(filtered, granularity),
    [filtered, granularity],
  );

  const topics = useMemo(() => analyzeTopics(filtered), [filtered]);

  const totalAll = rows.length;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function resetFilters() {
    setSearch("");
    setGrade("");
    setManager("");
    setPlan("");
    setRegion("");
    setStatus("");
    setResultCat("");
    setReasonCat("");
  }

  function exportCsv() {
    const headers = [
      "등급",
      "캠핑장명",
      "플랜명",
      "담당MD",
      "상태",
      "지역",
      "주소",
      "연락처",
      "최종 컨택일",
      "결과",
      "결과(분류)",
      "사유",
      "사유(분류)",
      "내용",
      "비고",
    ];
    const escape = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
    const lines = [headers.join(",")];
    for (const r of sorted) {
      lines.push(
        [
          r.grade,
          r.campsite,
          r.plan,
          r.manager,
          r.status,
          r.region,
          r.address,
          r.phone,
          r.lastContact,
          r.result,
          r.resultCategory,
          r.reason,
          r.reasonCategory,
          r.detail,
          r.note,
        ]
          .map(escape)
          .join(","),
      );
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `glcamp-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const pagedRows = sorted.slice(0, pageSize);
  const hasMore = sorted.length > pagedRows.length;

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-8">
      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              실시간 시트 동기화 · 60초 캐시
            </div>
            <h1 className="mt-1.5 text-[28px] font-bold leading-tight tracking-tight text-slate-900">
              글카펜 영업 현황 대시보드
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              프렌들리 글카펜 타입 영업 현황 · 마지막 갱신{" "}
              <span className="tabular text-slate-700">
                {new Date(updatedAt).toLocaleString("ko-KR")}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="https://docs.google.com/spreadsheets/d/1lN6KnbDqPcqUxWl9-UldVRhxIS87_tV_i8WkBXLvEVg/edit?gid=0"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              원본 시트 열기 →
            </a>
            <button
              onClick={exportCsv}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              CSV 내보내기
            </button>
            <button
              onClick={() => location.reload()}
              className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              새로고침
            </button>
          </div>
        </div>
      </header>

      {/* Filter Bar */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍  캠핑장·주소·연락처·메모 통합 검색"
              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm transition focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <Select label="등급" value={grade} onChange={setGrade} options={grades} />
          <Select
            label="담당MD"
            value={manager}
            onChange={setManager}
            options={managers}
          />
          <Select label="플랜" value={plan} onChange={setPlan} options={plans} />
          <Select label="지역" value={region} onChange={setRegion} options={regions} />
          <Select label="상태" value={status} onChange={setStatus} options={statuses} />
          <Select
            label="결과"
            value={resultCat}
            onChange={setResultCat}
            options={[...RESULT_CATEGORIES] as string[]}
          />
          <Select
            label="사유"
            value={reasonCat}
            onChange={setReasonCat}
            options={[...REASON_CATEGORIES] as string[]}
          />
          <button
            onClick={resetFilters}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            초기화
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="text-slate-500">
            전체{" "}
            <span className="tabular font-semibold text-slate-700">
              {totalAll.toLocaleString("ko-KR")}
            </span>
            건 중{" "}
            <span className="tabular font-semibold text-emerald-700">
              {filtered.length.toLocaleString("ko-KR")}
            </span>
            건 표시 중
          </div>
        </div>
      </section>

      {/* Top KPIs */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard
          label="총 고객 수"
          value={stats.total.toLocaleString("ko-KR")}
          hint={`전체 ${totalAll.toLocaleString("ko-KR")}건 중`}
          accent="default"
        />
        <StatCard
          label="운영중"
          value={stats.operating.toLocaleString("ko-KR")}
          hint={pct(stats.operating)}
          accent="green"
        />
        <StatCard
          label="컨택완료"
          value={stats.contacted.toLocaleString("ko-KR")}
          hint={`총 ${stats.contacted.toLocaleString("ko-KR")}건 · ${pct(stats.contacted)}`}
          accent="green"
        />
        <StatCard
          label="확정"
          value={stats.confirmed.toLocaleString("ko-KR")}
          hint={pct(stats.confirmed)}
          accent="green"
        />
        <StatCard
          label="검토중"
          value={stats.reviewing.toLocaleString("ko-KR")}
          hint={pct(stats.reviewing)}
          accent="blue"
        />
        <StatCard
          label="거절"
          value={stats.rejected.toLocaleString("ko-KR")}
          hint={pct(stats.rejected)}
          accent="rose"
        />
        <StatCard
          label="미컨택"
          value={stats.noContact.toLocaleString("ko-KR")}
          hint={`${pct(stats.noContact)} · 컨택일 미입력`}
          accent="amber"
        />
      </section>

      {/* Section Anchor Nav (sticky) */}
      <nav className="sticky top-2 z-20 mb-6 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white/90 p-1 shadow-sm backdrop-blur">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="flex-1 min-w-[110px] rounded-lg px-3 py-2 text-left transition hover:bg-slate-50"
          >
            <div className="text-sm font-semibold text-slate-700">
              {s.label}
            </div>
            <div className="text-[11px] text-slate-400">{s.hint}</div>
          </a>
        ))}
      </nav>

      {/* Section: Overview */}
      <SectionHeader id="overview" title="개요" subtitle="전체 영업 현황을 한눈에" />
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="등급별 분포" sub={`${byGrade.length}개 카테고리`}>
            <DonutChart data={byGrade} />
          </Card>
          <Card title="담당MD별 건수" sub={`${byManager.length}명`}>
            <HorizontalBar data={byManager} />
          </Card>
          <Card title="지역별 분포" sub={`${byRegion.length}개 지역`}>
            <HorizontalBar data={byRegion} />
          </Card>
        </div>
        <Card title="플랜별 분포" sub={`${byPlan.length}개 플랜`}>
          <HorizontalBar data={byPlan} />
        </Card>
      </div>

      {/* Section: Result × Reason */}
      <SectionHeader
        id="result"
        title="결과 · 사유"
        subtitle="드롭다운 카테고리별 분포와 교차 매트릭스"
      />
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="결과 분포" sub="확정 · 검토 · 거절 · 부재 · 기타 · 미분류">
            <DonutChart data={byResult} colorMap={RESULT_COLORS} />
          </Card>
          <Card
            title="사유 분포"
            sub="수수료 · 서비스 · 현재만족 · 약정기간 · 관심없음 · 성향 · 기타"
          >
            <DonutChart data={byReason} colorMap={REASON_COLORS} />
          </Card>
        </div>
        <Card
          title="결과 × 사유 교차 매트릭스"
          sub="어떤 사유가 어떤 결과로 이어지는지 한눈에 보기"
        >
          <CrossMatrix rows={filtered} />
        </Card>
      </div>

      {/* Section: Timeline */}
      <SectionHeader
        id="timeline"
        title="컨택 추이"
        subtitle="최종 컨택일 기준 일/주/월별 활동량"
      />
      <Card
        title="컨택 활동 시계열"
        sub={
          timeSeries.length > 0
            ? `${timeSeries[0].key} ~ ${timeSeries[timeSeries.length - 1].key} · 결과별 누적`
            : "최종 컨택일이 입력된 데이터가 없습니다"
        }
        right={
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            {(["day", "week", "month"] as Granularity[]).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`rounded-md px-3 py-1 font-medium transition ${
                  granularity === g
                    ? "bg-white text-slate-900 shadow"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {g === "day" ? "일별" : g === "week" ? "주별" : "월별"}
              </button>
            ))}
          </div>
        }
      >
        <ContactTimeChart data={timeSeries} />
      </Card>

      {/* Section: Insights */}
      <SectionHeader
        id="insight"
        title="내용 인사이트"
        subtitle="영업 메모 자동 키워드 분석"
      />
      <Insights topics={topics} />

      {/* Section: Full Table */}
      <SectionHeader
        id="table"
        title="전체 데이터"
        subtitle="필터·정렬 가능한 영업 마스터 테이블"
      />
      <DataTable
        rows={pagedRows}
        totalFiltered={sorted.length}
        sortKey={sortKey}
        sortDir={sortDir}
        toggleSort={toggleSort}
        formatPhone={formatPhone}
        gradeBadgeClass={gradeBadgeClass}
        statusBadgeClass={statusBadgeClass}
        hasMore={hasMore}
        onLoadMore={() => setPageSize((n) => n + 200)}
        onLoadAll={() => setPageSize(sorted.length)}
        pageSize={pageSize}
      />

      <footer className="mt-10 text-center text-xs text-slate-400">
        © Friendly · 글카펜 영업 현황 대시보드
      </footer>
    </div>
  );
}

/* ---------- Sub Components ---------- */

function SectionHeader({
  id,
  title,
  subtitle,
}: {
  id: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div id={id} className="scroll-mt-24 mb-3 mt-10 first:mt-2 flex items-end justify-between gap-3 border-b border-slate-200 pb-2">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      </div>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className="text-[11px] text-slate-400 hover:text-slate-600"
      >
        ↑ 맨 위로
      </a>
    </div>
  );
}

function Card({
  title,
  sub,
  right,
  children,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card-hover rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
    >
      <option value="">{label} 전체</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function CrossMatrix({ rows }: { rows: SalesRow[] }) {
  const results: ResultCategory[] = [...RESULT_CATEGORIES];
  const reasons: ReasonCategory[] = [...REASON_CATEGORIES];

  const matrix: Record<string, Record<string, number>> = {};
  let max = 0;
  for (const res of results) {
    matrix[res] = {};
    for (const rea of reasons) matrix[res][rea] = 0;
  }
  for (const r of rows) {
    if (r.resultCategory === "(미분류)") continue;
    if (r.reasonCategory === "(미분류)") continue;
    matrix[r.resultCategory][r.reasonCategory] += 1;
    if (matrix[r.resultCategory][r.reasonCategory] > max) {
      max = matrix[r.resultCategory][r.reasonCategory];
    }
  }
  if (max === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400">
        결과·사유가 모두 입력된 행이 아직 없어요. 시트가 채워지면 매트릭스가
        활성화됩니다.
      </div>
    );
  }
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left font-medium text-slate-500">
              결과 \\ 사유
            </th>
            {reasons.map((rea) => (
              <th
                key={rea}
                className="px-3 py-2 text-center font-medium text-slate-500"
              >
                {rea}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((res) => (
            <tr key={res} className="border-t border-slate-100">
              <td className="whitespace-nowrap px-3 py-2 font-semibold">
                <span
                  className="inline-block rounded-md px-2 py-0.5 text-[11px] text-white"
                  style={{ background: RESULT_COLORS[res] }}
                >
                  {res}
                </span>
              </td>
              {reasons.map((rea) => {
                const v = matrix[res][rea];
                const intensity = max ? v / max : 0;
                return (
                  <td
                    key={rea}
                    className="px-3 py-2 text-center tabular"
                    style={{
                      background:
                        v > 0
                          ? `rgba(16,185,129,${0.08 + intensity * 0.5})`
                          : "transparent",
                      color: v > 0 ? "#0f5132" : "#94a3b8",
                      fontWeight: v > 0 ? 600 : 400,
                    }}
                  >
                    {v}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DataTable({
  rows,
  totalFiltered,
  sortKey,
  sortDir,
  toggleSort,
  formatPhone,
  gradeBadgeClass,
  statusBadgeClass,
  hasMore,
  onLoadMore,
  onLoadAll,
  pageSize,
}: {
  rows: SalesRow[];
  totalFiltered: number;
  sortKey: SortKey;
  sortDir: SortDir;
  toggleSort: (k: SortKey) => void;
  formatPhone: (s: string) => string;
  gradeBadgeClass: (g: string) => string;
  statusBadgeClass: (s: string) => string;
  hasMore: boolean;
  onLoadMore: () => void;
  onLoadAll: () => void;
  pageSize: number;
}) {
  const showing = Math.min(pageSize, totalFiltered);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 text-xs">
        <div className="text-slate-500">
          <span className="tabular font-semibold text-slate-700">
            {showing.toLocaleString("ko-KR")}
          </span>{" "}
          / {totalFiltered.toLocaleString("ko-KR")}건 표시
          {hasMore && <span className="ml-1 text-slate-400">(아래 더보기)</span>}
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <span>정렬:</span>
          <span className="font-medium text-slate-700">
            {sortKey === "campsite"
              ? "캠핑장명"
              : sortKey === "grade"
                ? "등급"
                : sortKey === "plan"
                  ? "플랜"
                  : sortKey === "manager"
                    ? "담당MD"
                    : sortKey === "status"
                      ? "상태"
                      : sortKey === "result"
                        ? "결과"
                        : sortKey === "region"
                          ? "지역"
                          : "최종 컨택"}
          </span>
          <span className="text-slate-400">
            {sortDir === "asc" ? "오름차순" : "내림차순"}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50/95 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <Th onClick={() => toggleSort("grade")} active={sortKey === "grade"} dir={sortDir}>
                등급
              </Th>
              <Th
                onClick={() => toggleSort("campsite")}
                active={sortKey === "campsite"}
                dir={sortDir}
              >
                캠핑장명
              </Th>
              <Th onClick={() => toggleSort("plan")} active={sortKey === "plan"} dir={sortDir}>
                플랜
              </Th>
              <Th
                onClick={() => toggleSort("manager")}
                active={sortKey === "manager"}
                dir={sortDir}
              >
                담당MD
              </Th>
              <Th
                onClick={() => toggleSort("status")}
                active={sortKey === "status"}
                dir={sortDir}
              >
                상태
              </Th>
              <Th
                onClick={() => toggleSort("result")}
                active={sortKey === "result"}
                dir={sortDir}
              >
                결과
              </Th>
              <th className="px-4 py-3 text-left font-medium">사유</th>
              <Th
                onClick={() => toggleSort("region")}
                active={sortKey === "region"}
                dir={sortDir}
              >
                지역
              </Th>
              <th className="px-4 py-3 text-left font-medium">주소</th>
              <th className="px-4 py-3 text-left font-medium">연락처</th>
              <Th
                onClick={() => toggleSort("lastContact")}
                active={sortKey === "lastContact"}
                dir={sortDir}
              >
                최종 컨택
              </Th>
              <th className="px-4 py-3 text-left font-medium">메모</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`inline-flex min-w-[40px] justify-center rounded-md border px-2 py-0.5 text-xs font-semibold ${gradeBadgeClass(r.grade)}`}
                  >
                    {r.grade}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                  {r.campsite}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {r.plan}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {r.manager}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${statusBadgeClass(r.status)}`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {r.resultCategory !== "(미분류)" ? (
                    <span
                      className="inline-flex rounded-md px-2 py-0.5 text-xs font-semibold text-white"
                      style={{ background: RESULT_COLORS[r.resultCategory] }}
                    >
                      {r.resultCategory}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">-</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {r.reasonCategory !== "(미분류)" ? (
                    <span
                      className="inline-flex rounded-md px-2 py-0.5 text-xs"
                      style={{
                        background: REASON_COLORS[r.reasonCategory] + "30",
                        color: REASON_COLORS[r.reasonCategory],
                        border: `1px solid ${REASON_COLORS[r.reasonCategory]}55`,
                      }}
                    >
                      {r.reasonCategory}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">-</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {r.region}
                </td>
                <td
                  className="px-4 py-3 text-slate-600 max-w-[260px] truncate"
                  title={r.address}
                >
                  {r.address}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700 tabular">
                  {r.phone ? (
                    <a
                      href={`tel:${r.phone.replace(/\D/g, "")}`}
                      className="hover:text-emerald-700 hover:underline"
                    >
                      {formatPhone(r.phone)}
                    </a>
                  ) : (
                    ""
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600 tabular">
                  {r.lastContact}
                </td>
                <td
                  className="px-4 py-3 text-slate-600 max-w-[280px] truncate"
                  title={[r.detail, r.note].filter(Boolean).join(" / ")}
                >
                  {[r.detail, r.note].filter(Boolean).join(" / ")}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={12}
                  className="px-4 py-12 text-center text-sm text-slate-400"
                >
                  조건에 해당하는 데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3">
          <button
            onClick={onLoadMore}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            200건 더 보기
          </button>
          <button
            onClick={onLoadAll}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            전체 {totalFiltered.toLocaleString("ko-KR")}건 모두 보기
          </button>
        </div>
      )}
    </section>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: SortDir;
}) {
  return (
    <th
      onClick={onClick}
      className={`cursor-pointer select-none px-4 py-3 text-left font-medium ${active ? "text-emerald-700" : ""}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <span className="text-[10px] opacity-60">
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </span>
    </th>
  );
}
