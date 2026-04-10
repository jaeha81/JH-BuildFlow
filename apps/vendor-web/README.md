# vendor-web — 협력사 포털

Next.js 14 + TypeScript + Tailwind CSS

협력사 포털 및 관리자 PWA (`/admin/*` 경로, role 분기).

## 실행 명령

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env.local

# 3. 개발 서버 실행 (port 3000)
npm run dev
```

## 환경변수

| 변수명 | 기본값 | 설명 |
|--------|--------|------|
| NEXT_PUBLIC_API_URL | http://localhost:8000 | FastAPI 서버 주소 |
| NEXT_PUBLIC_APP_NAME | 협력사 포털 | 앱 이름 |

## Route 구조

| Route | 설명 |
|-------|------|
| / | 랜딩 (로그인 or 초대 링크 안내) |
| /join/:token | 초대 링크 기반 가입 |
| /login | 협력사 로그인 |
| /dashboard | 협력사 홈 |
| /bid-requests | 발주 수신함 |
| /quotes/new/:bidId | 견적 제출 |
| /messages | Q&A |
| /admin/* | 관리자 PWA (role=admin 검증) |
