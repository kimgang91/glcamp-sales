import type { ResultCategory, SalesRow } from "./sheet";

export type Granularity = "day" | "week" | "month";

export type TimeBucket = {
  /** ISO date (granularity 시작일) */
  key: string;
  /** 보기용 라벨 (e.g. "5/1", "5/01 (주)", "2026-05") */
  label: string;
  total: number;
  확정: number;
  검토: number;
  거절: number;
  부재: number;
  기타: number;
};

function startOfWeek(d: Date): Date {
  // 월요일 시작
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const r = new Date(d);
  r.setDate(d.getDate() - diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtLabel(d: Date, g: Granularity): string {
  if (g === "month") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  if (g === "week") {
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${m}/${String(day).padStart(2, "0")}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function bucketStart(d: Date, g: Granularity): Date {
  if (g === "week") return startOfWeek(d);
  if (g === "month") return startOfMonth(d);
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function nextBucket(d: Date, g: Granularity): Date {
  const r = new Date(d);
  if (g === "day") r.setDate(r.getDate() + 1);
  else if (g === "week") r.setDate(r.getDate() + 7);
  else r.setMonth(r.getMonth() + 1);
  return r;
}

/**
 * 최종 컨택일이 채워진 행만 추려서 시간 버킷별로 집계한다.
 * 데이터가 적을 때도 막대가 비어 보이지 않도록 시작~끝 사이 빈 버킷도 포함한다.
 */
export function buildTimeSeries(
  rows: SalesRow[],
  granularity: Granularity,
): TimeBucket[] {
  const dated = rows.filter((r) => r.contactedAt);
  if (dated.length === 0) return [];

  const map = new Map<string, TimeBucket>();
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  for (const r of dated) {
    const d = new Date(r.contactedAt + "T00:00:00");
    if (Number.isNaN(d.getTime())) continue;
    const start = bucketStart(d, granularity);
    if (!minDate || start < minDate) minDate = start;
    if (!maxDate || start > maxDate) maxDate = start;
    const key = fmtDate(start);
    let b = map.get(key);
    if (!b) {
      b = {
        key,
        label: fmtLabel(start, granularity),
        total: 0,
        확정: 0,
        검토: 0,
        거절: 0,
        부재: 0,
        기타: 0,
      };
      map.set(key, b);
    }
    b.total += 1;
    const cat = r.resultCategory;
    if (cat === "확정") b.확정 += 1;
    else if (cat === "검토") b.검토 += 1;
    else if (cat === "거절") b.거절 += 1;
    else if (cat === "부재") b.부재 += 1;
    else b.기타 += 1;
  }

  if (!minDate || !maxDate) return [];

  // 빈 버킷 채우기 (최대 365개로 제한)
  const out: TimeBucket[] = [];
  let cur = bucketStart(minDate, granularity);
  let safety = 0;
  while (cur <= maxDate && safety < 400) {
    const key = fmtDate(cur);
    const found = map.get(key);
    out.push(
      found ?? {
        key,
        label: fmtLabel(cur, granularity),
        total: 0,
        확정: 0,
        검토: 0,
        거절: 0,
        부재: 0,
        기타: 0,
      },
    );
    cur = nextBucket(cur, granularity);
    safety += 1;
  }

  return out;
}

/* ---------------------------------------------------------------------------
 * 내용(detail) 텍스트 키워드 분석
 * ------------------------------------------------------------------------- */

export type Topic = {
  /** 카테고리: positive(영업포인트) / concern(고민) / objection(거절·이탈) / context(맥락) */
  bucket: "positive" | "concern" | "objection" | "context";
  label: string;
  patterns: RegExp[];
};

/**
 * 영업 텍스트 내에서 자주 등장하는 키워드/주제 정의.
 * patterns 는 OR 매칭이며, 한 행이 같은 토픽에 여러 번 매칭돼도 1로 카운트된다.
 */
export const TOPICS: Topic[] = [
  // 긍정 — 영업 포인트
  { bucket: "positive", label: "채널 확장 의향", patterns: [/채널.{0,4}(확장|확대|늘|추가)/, /채널.{0,4}(많|넓)/] },
  { bucket: "positive", label: "가입/시작 의향", patterns: [/가입.{0,4}(의향|희망|예정|할게|하기로)/, /시작.{0,4}(하기로|예정|희망)/, /진행.{0,4}(예정|하기로)/] },
  { bucket: "positive", label: "기존 채널 불만 (이탈 가능)", patterns: [/이탈.{0,4}(고민|검토)/, /(떠나요|야놀자|여기어때).{0,6}(불만|이탈|어렵|힘)/, /(떠나요|야놀자|여기어때).{0,6}이탈/, /(불만|싫|짜증).{0,4}(많|있)/] },
  { bucket: "positive", label: "방관리/방막기 니즈", patterns: [/방.{0,2}막기/, /방.{0,2}관리/, /일정.{0,4}관리/, /자동.{0,4}동기화/] },
  { bucket: "positive", label: "긍정 검토", patterns: [/(좋|괜찮).{0,4}(생각|반응|보)/, /관심.{0,4}있/, /해보.{0,4}(고|싶)/] },

  // 고민 / 검토
  { bucket: "concern", label: "비교/검토 중", patterns: [/검토.{0,4}(중|예정|하기로)/, /비교/, /고민.{0,4}(중|있)/] },
  { bucket: "concern", label: "추후 재컨택", patterns: [/(추후|연휴|다시).{0,8}(연락|전화|컨택)/, /(주말|평일|이번주|다음주).{0,8}(다시|연락)/] },
  { bucket: "concern", label: "상의 필요", patterns: [/(상의|논의|협의).{0,4}(필요|예정|중)/, /(가족|배우자|와이프|남편|대표|본사).{0,6}(상의|얘기|협의)/] },

  // 거절 / 부정
  { bucket: "objection", label: "수수료/비용 부담", patterns: [/수수료/, /비용.{0,4}(부담|높|비싸|커)/, /가격.{0,4}(부담|높|비싸)/, /(%|퍼센트).{0,6}(높|많|부담)/] },
  { bucket: "objection", label: "약정/기간 부담", patterns: [/약정/, /(1년|2년|기간).{0,4}(부담|길|어렵)/, /계약기간/, /록인|lock.?in/i] },
  { bucket: "objection", label: "현재 만족", patterns: [/현재.{0,4}만족/, /지금.{0,4}(괜찮|좋|충분)/, /기존.{0,4}(만족|충분)/] },
  { bucket: "objection", label: "관심 없음", patterns: [/관심.{0,3}없/, /필요.{0,3}없/, /(생각|계획).{0,3}없/] },
  { bucket: "objection", label: "성향/마인드", patterns: [/성향/, /마인드/, /개인적.{0,4}(이유|성향)/] },
  { bucket: "objection", label: "운영/관리 부담", patterns: [/(운영|관리).{0,4}(어려|힘|부담|복잡)/, /(혼자|혼란).{0,4}(운영|관리)/, /너무.{0,4}(힘|어렵|복잡|많)/] },
  { bucket: "objection", label: "신뢰/브랜드 우려", patterns: [/(신뢰|브랜드|평판|낯설).{0,4}(없|어렵|걱정)/] },

  // 맥락 — 자주 언급되는 외부 채널/주체
  { bucket: "context", label: "떠나요 언급", patterns: [/떠나요/] },
  { bucket: "context", label: "야놀자 언급", patterns: [/야놀자/] },
  { bucket: "context", label: "여기어때 언급", patterns: [/여기어때/] },
  { bucket: "context", label: "에어비앤비 언급", patterns: [/에어비앤비|에어비엔비|airbnb/i] },
  { bucket: "context", label: "직영/자체 채널 언급", patterns: [/(직영|자체|홈페이지|네이버.{0,2}예약).{0,6}(많|위주|중심)/] },
];

export type TopicCount = {
  bucket: Topic["bucket"];
  label: string;
  count: number;
  /** 매칭된 원문 일부 (최대 5개, 캠핑장명 prefix) */
  examples: { campsite: string; snippet: string; result: ResultCategory }[];
};

export function analyzeTopics(rows: SalesRow[]): TopicCount[] {
  const out: TopicCount[] = TOPICS.map((t) => ({
    bucket: t.bucket,
    label: t.label,
    count: 0,
    examples: [],
  }));

  for (const r of rows) {
    const text = `${r.detail} ${r.note} ${r.reason}`.trim();
    if (!text) continue;
    TOPICS.forEach((topic, i) => {
      if (topic.patterns.some((p) => p.test(text))) {
        out[i].count += 1;
        if (out[i].examples.length < 5) {
          const snippet = text.length > 120 ? text.slice(0, 120) + "…" : text;
          out[i].examples.push({
            campsite: r.campsite,
            snippet,
            result: r.resultCategory,
          });
        }
      }
    });
  }
  return out;
}

export function pickTop<T extends { count: number }>(items: T[], n: number): T[] {
  return [...items].filter((x) => x.count > 0).sort((a, b) => b.count - a.count).slice(0, n);
}
