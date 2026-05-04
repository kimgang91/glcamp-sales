# Vercel 배포 가이드

이 문서는 **로컬 동작 확인이 끝난 후** 임직원에게 공유할 수 있도록
Vercel에 배포하는 방법을 안내합니다.

---

## 사전 준비

1. 구글 스프레드시트가 **“링크가 있는 모든 사용자 - 뷰어”** 로 공유되어 있어야 합니다.
   (Vercel 서버가 시트를 읽어야 하기 때문)
2. [https://vercel.com](https://vercel.com) 계정
3. (선택) GitHub 계정 — 자동 재배포가 편리해서 권장

---

## 방법 A. GitHub + Vercel (권장 · 자동 재배포)

```bash
# 프로젝트 폴더에서
git init
git add .
git commit -m "init: glcamp sales dashboard"

# GitHub에 새 비공개 레포 생성 후
git remote add origin https://github.com/<your-org>/glcamp-sales.git
git branch -M main
git push -u origin main
```

이후 Vercel 웹페이지에서:

1. **Add New… → Project**
2. 방금 만든 `glcamp-sales` 레포 선택
3. Framework Preset이 `Next.js`로 자동 인식됩니다. 그대로 **Deploy** 클릭
4. 1~2분 후 `https://glcamp-sales-<랜덤>.vercel.app` 형태의 URL이 발급됩니다.
5. (옵션) **Settings → Domains**에서 원하는 서브도메인으로 변경 가능
6. (옵션) **Settings → Deployment Protection → Vercel Authentication** 을 켜면
   Vercel 계정으로 로그인된 사람만 접근 가능 (임직원 계정 공유 시 활용)

이후 시트 파싱 로직을 수정하면 `git push`만으로 자동 재배포됩니다.

---

## 방법 B. Vercel CLI (가장 빠른 1회성 배포)

```bash
npm i -g vercel

# 프로젝트 폴더에서
vercel              # 처음 로그인/연동 진행 (대화형)
vercel --prod       # 프로덕션 배포
```

배포가 끝나면 콘솔에 URL이 출력됩니다.

---

## 데이터 갱신 주기

- 페이지/API 모두 **60초 ISR** 캐싱입니다.
- 시트를 업데이트해도 최대 1분 이내에 모든 사용자에게 반영됩니다.
- 즉시 갱신이 필요하면 Vercel 대시보드에서 **Deployments → ⋯ → Redeploy**.

---

## 접근 권한 / 보안 옵션

- **공개**: 기본값. URL을 아는 사람 누구나 접근 가능 (단순 공유에 편리)
- **Vercel Authentication**: Vercel 계정으로 로그인한 사람만 접근.
  팀 단위로 권한 관리 가능 (Settings → Deployment Protection)
- **Password Protection**: Pro 플랜 이상에서 단일 비밀번호 설정 가능

---

## 트러블슈팅

| 증상 | 해결 |
| --- | --- |
| `시트를 불러오지 못했습니다` 화면이 뜸 | 시트 공유 설정 확인 (“링크가 있는 모든 사용자”) |
| 데이터가 옛날 그대로 | 1분 ISR 캐시 때문. Vercel에서 Redeploy 또는 1분 대기 |
| 한국 사용자 응답 느림 | `vercel.json`에 `"regions": ["icn1"]` 설정됨 (서울 리전) |
