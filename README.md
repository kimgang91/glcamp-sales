# 글카펜 영업 현황 대시보드

프렌들리 글카펜 타입 영업 현황 Google Sheets를 임직원이 손쉽게 볼 수 있도록 만든 웹 대시보드입니다.

## 주요 기능

- Google Sheets 원본 시트와 **자동 동기화** (60초 ISR 캐싱)
- 등급 / 담당MD / 플랜 / 지역 / 상태별 **필터 + 자유 검색**
- 캠핑장명·플랜·담당MD·지역 등으로 **정렬 가능한 테이블**
- 등급별 도넛 차트, 담당MD/지역/플랜별 막대 차트
- 현재 필터 결과를 **CSV로 내보내기**
- 모바일 / 데스크톱 반응형 UI

## 데이터 소스

- 시트: `1lN6KnbDqPcqUxWl9-UldVRhxIS87_tV_i8WkBXLvEVg` (gid=0)
- 공개 CSV export URL을 서버사이드(`fetchSalesRows`)에서 호출합니다.
- 시트가 “링크가 있는 모든 사용자(뷰어)”로 공유되어 있어야 합니다.

> 참고: 추후 시트가 비공개로 전환되면 Google Service Account 기반의
> `googleapis` 호출로 교체해야 합니다.

## 로컬 실행

```bash
npm install
npm run dev
```

`http://localhost:3000` 에서 확인할 수 있습니다.

## Vercel 배포

가장 간단한 방법:

1. 이 폴더를 GitHub 레포지토리로 push 합니다.
2. [vercel.com](https://vercel.com) 에 로그인 후 **New Project → Import** 로 해당 레포를 가져옵니다.
3. Framework는 자동으로 `Next.js`로 인식되며 별도 설정 없이 **Deploy** 누르면 끝입니다.
4. 배포 완료 후 임직원에게 도메인(예: `glcamp-sales.vercel.app`)을 공유하면 됩니다.

또는 CLI로:

```bash
npm i -g vercel
vercel        # 첫 배포
vercel --prod # 프로덕션 배포
```

### 환경 변수

현재 버전은 시트가 공개되어 있다는 전제이므로 별도 환경 변수가 필요 없습니다.

## 구조

```
app/
  api/sales/route.ts   # JSON API (선택적으로 외부에서 호출 가능)
  page.tsx             # 서버 컴포넌트, 시트 fetch
  layout.tsx
  globals.css
components/
  Dashboard.tsx        # 메인 대시보드 (필터/검색/테이블)
  Charts.tsx           # Recharts 기반 도넛/바 차트
  StatCard.tsx         # 상단 KPI 카드
lib/
  sheet.ts             # CSV fetch + 파싱 유틸
```

## 캐싱 전략

- 페이지(`app/page.tsx`)와 API(`app/api/sales/route.ts`)는 모두 60초 ISR로 캐싱됩니다.
- 사용자가 “새로고침” 버튼을 눌러도 60초 이내에는 캐시된 데이터가 반환될 수 있습니다.
  즉시 반영이 필요할 경우 Vercel 대시보드에서 **Deployments → ⋯ → Redeploy** 를 눌러주세요.
