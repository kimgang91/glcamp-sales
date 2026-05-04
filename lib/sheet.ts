import Papa from "papaparse";

export const SHEET_ID = "1lN6KnbDqPcqUxWl9-UldVRhxIS87_tV_i8WkBXLvEVg";
export const SHEET_GID = "0";

export const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

/** 결과 드롭다운 정규화 카테고리 */
export const RESULT_CATEGORIES = [
  "확정",
  "검토",
  "거절",
  "부재",
  "기타",
] as const;
export type ResultCategory = (typeof RESULT_CATEGORIES)[number] | "(미분류)";

/** 사유 드롭다운 정규화 카테고리 */
export const REASON_CATEGORIES = [
  "수수료",
  "서비스",
  "현재만족",
  "약정기간",
  "관심없음",
  "성향",
  "기타",
] as const;
export type ReasonCategory = (typeof REASON_CATEGORIES)[number] | "(미분류)";

export type SalesRow = {
  grade: string;
  campsite: string;
  plan: string;
  manager: string;
  status: string;
  /** 시트 원문 (예: "2026. 5. 1") */
  lastContact: string;
  /** YYYY-MM-DD ISO date string. 미입력 시 빈 문자열 */
  contactedAt: string;
  result: string;
  resultCategory: ResultCategory;
  reason: string;
  reasonCategory: ReasonCategory;
  detail: string;
  address: string;
  phone: string;
  note: string;
  /** 시/도 단위 지역명 (e.g. 강원, 경기, 제주) */
  region: string;
  /** 자유롭게 검색할 수 있도록 결합된 텍스트 */
  haystack: string;
};

const REGION_PATTERNS: Array<{ key: string; match: RegExp }> = [
  { key: "서울", match: /^서울/ },
  { key: "부산", match: /^부산/ },
  { key: "대구", match: /^대구/ },
  { key: "인천", match: /^인천/ },
  { key: "광주", match: /^광주/ },
  { key: "대전", match: /^대전/ },
  { key: "울산", match: /^울산/ },
  { key: "세종", match: /^세종/ },
  { key: "경기", match: /^경기/ },
  { key: "강원", match: /^강원/ },
  { key: "충북", match: /^충(청)?북/ },
  { key: "충남", match: /^충(청)?남/ },
  { key: "전북", match: /^전(라)?북|^전북/ },
  { key: "전남", match: /^전(라)?남|^전남/ },
  { key: "경북", match: /^경(상)?북|^경북/ },
  { key: "경남", match: /^경(상)?남|^경남/ },
  { key: "제주", match: /^제주/ },
];

function cleanCell(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function parseRegion(address: string): string {
  if (!address) return "기타";
  for (const { key, match } of REGION_PATTERNS) {
    if (match.test(address)) return key;
  }
  return "기타";
}

/** "2026. 5. 1" / "2026.5.1" / "2026-05-01" / "2026/5/1" 형식 → ISO yyyy-mm-dd */
export function parseDate(s: string): string {
  if (!s) return "";
  const t = s.trim().replace(/\s+/g, "");
  const m = t.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})\.?$/);
  if (!m) return "";
  const y = m[1];
  const mo = m[2].padStart(2, "0");
  const d = m[3].padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

function classifyResult(s: string): ResultCategory {
  if (!s) return "(미분류)";
  const t = s.trim();
  if (/확정|성사|체결|가입|승인/.test(t)) return "확정";
  if (/검토|보류|상의|고민|논의|추후|대기|회신/.test(t)) return "검토";
  if (/거절|불가|반려|취소|이탈|중단/.test(t)) return "거절";
  if (/부재|미응답|연결안됨|없음|미통화|연락안됨/.test(t)) return "부재";
  return "기타";
}

function classifyReason(s: string): ReasonCategory {
  if (!s) return "(미분류)";
  const t = s.trim();
  if (/수수료|비용|가격|요금|단가|%|퍼센트|할인/.test(t)) return "수수료";
  if (/서비스|시스템|기능|운영|정산|cs|관리/i.test(t)) return "서비스";
  if (/현재만족|만족|기존|불편없|괜찮/.test(t)) return "현재만족";
  if (/약정|기간|계약|록인|장기/.test(t)) return "약정기간";
  if (/관심없|관심 없|필요없|니즈없|안하/.test(t)) return "관심없음";
  if (/성향|개인적|취향|스타일|마인드/.test(t)) return "성향";
  return "기타";
}

/**
 * Google Sheets CSV 응답을 파싱한다. 시트의 첫 두 행은
 *  - 0행: 빈 행
 *  - 1행: 한국어 헤더(등급, 캠핑장명, ...)
 * 형태이고 나머지는 실제 데이터이다.
 */
export function parseSalesCsv(csv: string): SalesRow[] {
  const parsed = Papa.parse<string[]>(csv, {
    header: false,
    skipEmptyLines: false,
  });

  const rows = parsed.data as string[][];
  if (!rows || rows.length === 0) return [];

  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const row = rows[i] ?? [];
    const joined = row.map(cleanCell).join("|");
    if (joined.includes("등급") && joined.includes("캠핑장명")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];

  const header = rows[headerIdx].map(cleanCell);
  const idx = (label: string) => header.findIndex((h) => h === label);

  const col = {
    grade: idx("등급"),
    campsite: idx("캠핑장명"),
    plan: idx("플랜명"),
    manager: idx("담당MD"),
    status: idx("상태"),
    lastContact: idx("최종 컨택일"),
    result: idx("결과"),
    reason: idx("사유"),
    detail: idx("내용"),
    address: idx("주소"),
    phone: idx("연락처"),
    note: idx("비고"),
  };

  const out: SalesRow[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const grade = cleanCell(r[col.grade]);
    const campsite = cleanCell(r[col.campsite]);
    if (!grade && !campsite) continue;

    const address = cleanCell(r[col.address]);
    const lastContact = cleanCell(r[col.lastContact]);
    const result = cleanCell(r[col.result]);
    const reason = cleanCell(r[col.reason]);
    const detail = cleanCell(r[col.detail]);
    const note = cleanCell(r[col.note]);
    const phone = cleanCell(r[col.phone]);
    const plan = cleanCell(r[col.plan]);
    const manager = cleanCell(r[col.manager]);
    const status = cleanCell(r[col.status]) || "(미지정)";

    const region = parseRegion(address);
    const contactedAt = parseDate(lastContact);

    out.push({
      grade: grade || "(미지정)",
      campsite,
      plan,
      manager,
      status,
      lastContact,
      contactedAt,
      result,
      resultCategory: classifyResult(result),
      reason,
      reasonCategory: classifyReason(reason),
      detail,
      address,
      phone,
      note,
      region,
      haystack: [
        grade,
        campsite,
        plan,
        manager,
        status,
        lastContact,
        result,
        reason,
        detail,
        address,
        phone,
        note,
        region,
      ]
        .join(" ")
        .toLowerCase(),
    });
  }

  return out;
}

export async function fetchSalesRows(): Promise<SalesRow[]> {
  const res = await fetch(SHEET_CSV_URL, {
    next: { revalidate: 60 },
    headers: {
      "User-Agent": "Mozilla/5.0 glcamp-sales-dashboard",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet: ${res.status} ${res.statusText}`);
  }
  const csv = await res.text();
  return parseSalesCsv(csv);
}
