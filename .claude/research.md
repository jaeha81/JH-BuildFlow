# Research: admin-web (관리자 모바일 Next.js 앱)

최종 업데이트: 2026-04-11

---

## 현재 구조

### 모노레포 (루트 package.json)
- workspaces: `apps/*`, `packages/*`
- 현재 apps: `admin-desktop`, `api`, `vendor-web`
- 현재 packages: `agent-protocols`, `shared-types`, `ui`
- scripts에 `admin-web` 항목 없음 → 추가 필요

### vendor-web (템플릿 기준 앱)
- 경로: `apps/vendor-web/`
- Next.js 14.2.4, React 18.3.1
- Tailwind CSS 3.4.4, PostCSS, Autoprefixer
- react-hook-form 7.72.1
- tsconfig: `../../tsconfig.base.json` extends, paths `@/*` → `./src/*`, `@shared-types/*` 연결
- App Router 구조 (`src/app/`)
- 네오브루탈리즘 디자인: `bg-[#F5F0E8] text-black`
- localStorage 기반 토큰 저장 (`vendor_access_token`)

### API 라우터 목록 (`apps/api/app/routers/`)
| 파일 | prefix | 주요 역할 |
|------|--------|----------|
| auth.py | /auth | login, refresh, /me |
| vendors.py | /vendors | 협력사 CRUD, 점수 조회 |
| bids.py | /bid-requests | 발주 일괄생성, 목록, 응답, 재발주 |
| bid_management.py | /bid-management | 프로젝트별 응답현황, 재발주후보, 미응답알림 |
| quotes.py | /quotes | 견적 제출, 비교, 수동검토큐 |
| projects.py | /projects | 프로젝트 CRUD, 공종패키지, 문서 |
| settlements.py | /settlements | 정산 목록/생성/세무검토/승인, 캘린더 |
| analytics.py | /analytics | 협력사점수, 발주통계, 차트데이터, 추천 |
| messages.py | /threads (/messages) | 스레드/메시지 CRUD, 에스컬레이션 |
| health.py | - | 헬스체크 |
| agent_sync.py | - | 에이전트 동기화 |

### 인증 구조 (apps/api/app/core/security.py + schemas/auth.py)
- **JWT** 기반: `python-jose` 라이브러리
- Access Token payload: `{ sub: user_id, company_id, role, type: "access", exp }`
- Refresh Token payload: `{ sub: user_id, type: "refresh", exp }`
- 응답: `{ access_token, refresh_token, token_type: "bearer" }`
- 역할 계층: `super_admin > sub_admin > site_manager > accounting > vendor_user`
- 관리자 역할 (`ADMIN_ROLES`): `super_admin`, `sub_admin`, `site_manager`
- 정산 승인은 `super_admin` 전용

### admin-desktop 화면 목록 (`apps/admin-desktop/src/renderer/pages/`)
| 파일 | 화면 |
|------|------|
| LoginPage.tsx | 로그인 |
| DashboardPage.tsx | 메인 대시보드 |
| ProjectsPage.tsx | 프로젝트 목록 |
| ProjectDetailPage.tsx | 프로젝트 상세 |
| ProjectNewPage.tsx | 프로젝트 신규 |
| ProjectPackagesPage.tsx | 공종 패키지 관리 |
| QuoteReviewPage.tsx | 견적 검토 |
| VendorsPage.tsx | 협력사 목록 |
| VendorDetailPage.tsx | 협력사 상세 |
| SettlementsPage.tsx | 정산 목록 |
| SettlementDetailPage.tsx | 정산 상세 |
| SettlementCalendarPage.tsx | 정산 캘린더 |
| AnalyticsPage.tsx | 분석 대시보드 |
| AgentMonitorPage.tsx | 에이전트 모니터 |
| FolderSettingsPage.tsx | 폴더 설정 |

---

## 영향 범위

### 신규 생성 파일 (admin-web)
```
apps/admin-web/
  package.json
  next.config.mjs
  tsconfig.json          (vendor-web에서 복사, token key만 변경)
  tailwind.config.ts
  postcss.config.js
  next-env.d.ts
  src/
    app/
      layout.tsx
      globals.css
      page.tsx           (/ → /dashboard redirect)
      login/page.tsx
      dashboard/page.tsx
      bids/page.tsx      (발주 승인 목록)
      bids/[id]/page.tsx (발주 상세/응답현황)
      settlements/page.tsx        (정산 승인 대기)
      settlements/[id]/page.tsx   (정산 승인 액션)
      vendors/page.tsx   (협력사 목록+점수)
      messages/page.tsx  (에스컬레이션 메시지)
    lib/
      api.ts             (vendor-web api.ts 참고, 관리자 엔드포인트 추가)
      auth.ts            (localStorage key: admin_access_token)
    components/
      AdminNav.tsx
      MobileCard.tsx     (공통 카드 컴포넌트)
```

### 수정 필요 파일
- `package.json` (루트): scripts에 `"admin-web": "cd apps/admin-web && npm run dev"` 추가
- `apps/api/app/main.py` (확인 필요): CORS origins에 admin-web 포트 추가 가능성

### 영향받는 의존성
- `packages/shared-types`: 기존 타입 재사용 가능 (TokenResponse, UserMe 등)
- `packages/ui`: 공통 UI 컴포넌트 활용 여부 확인 필요

---

## 구현 방향

### admin-web에 필요한 화면 (모바일 우선 순위)

| 우선순위 | 화면 | 대응 API | 역할 |
|---------|------|---------|------|
| 1 | 로그인 | POST /auth/login | 전체 |
| 2 | 대시보드 | GET /analytics/bid-stats, GET /threads/escalation-stats | ADMIN |
| 3 | 정산 승인 대기 목록 | GET /settlements/pending-approval | super_admin |
| 4 | 정산 승인 액션 | PUT /settlements/{id}/approve | super_admin |
| 5 | 발주 응답현황 | GET /bid-management/response-status/{project_id} | ADMIN |
| 6 | 협력사 목록+점수 | GET /vendors, GET /analytics/vendor-scores | ADMIN |
| 7 | 메시지(에스컬레이션) | GET /threads, GET /threads/{id}/messages, POST /threads/{id}/messages | 전체 |
| 8 | 분석 요약 | GET /analytics/bid-stats, GET /analytics/low-response | ADMIN |

### 재사용 가능한 API 엔드포인트
```
POST /auth/login          → 관리자 로그인 (동일 엔드포인트, role 검증 API 서버에서 처리)
GET  /auth/me             → 로그인 사용자 정보
POST /auth/refresh        → 토큰 갱신
GET  /settlements/pending-approval   → 승인 대기 정산 목록
PUT  /settlements/{id}/approve       → 정산 승인 (super_admin)
GET  /bid-management/response-status/{project_id}  → 발주 현황
POST /bid-management/notify-unresponded             → 미응답 알림 발송
GET  /vendors             → 협력사 목록 (trade_type, region 필터)
GET  /analytics/bid-stats → 발주 통계 (대시보드 위젯)
GET  /analytics/vendor-scores → 협력사 점수 목록
GET  /analytics/low-response  → 미응답 협력사
GET  /threads             → 메시지 스레드 목록
GET  /threads/{id}/messages   → 메시지 내용
POST /threads/{id}/messages   → 메시지 전송
GET  /threads/escalation-stats → 에스컬레이션 카운트 (대시보드 위젯)
GET  /projects            → 프로젝트 목록 (발주현황 화면 진입점)
```

### vendor-web에서 복사할 설정 파일
| 파일 | 변경 사항 |
|------|---------|
| `next.config.mjs` | 변경 없음 (reactStrictMode: true) |
| `tsconfig.json` | paths `@shared-types/*` 경로 동일, 변경 없음 |
| `tailwind.config.ts` | content 경로 동일 (`./src/**/*.{ts,tsx}`) |
| `postcss.config.js` | 변경 없음 |
| `src/app/globals.css` | 네오브루탈리즘 스타일 재사용 |
| `src/lib/api.ts` | 복사 후 token key `vendor_access_token` → `admin_access_token`, 관리자 API 함수 추가 |
| `src/lib/auth.ts` | 복사 후 함수명/key 변경: `saveAdminTokens`, `admin_access_token` |

### 주의사항 및 리스크
1. **포트 충돌**: vendor-web이 3000, admin-web은 3001 사용 권장. `package.json` dev script에 `-p 3001` 명시.
2. **역할 분기**: 로그인 후 role이 `vendor_user`이면 접근 차단 필요 (클라이언트 측 guard).
3. **정산 승인**: `super_admin` 전용 엔드포인트 — 화면 내 역할 체크 UI 별도 처리.
4. **CORS**: `apps/api/app/main.py`에서 `http://localhost:3001` 허용 여부 확인 필요.
5. **모바일 터치 UX**: 승인 버튼은 min-height 48px 이상, 카드형 레이아웃으로 구성 권장.
6. **토큰 키 충돌**: vendor-web과 같은 브라우저에서 열 경우 localStorage key 반드시 분리.

### 참고할 기존 패턴
- API 클라이언트 패턴: `apps/vendor-web/src/lib/api.ts:10` (`request<T>` 함수)
- 인증 토큰 저장: `apps/vendor-web/src/lib/auth.ts:3` (localStorage 패턴)
- 레이아웃/배경색: `apps/vendor-web/src/app/layout.tsx:14` (`bg-[#F5F0E8]`)
- 네오브루탈리즘 UI: `apps/vendor-web/src/components/ui.tsx`
- 네비게이션: `apps/vendor-web/src/app/VendorNav.tsx`

---

## 추정 작업량

**중~대**

- 설정 파일 복사/수정: 소 (30분)
- 인증 + 레이아웃 + 네비게이션: 소 (1~2시간)
- 대시보드 + 정산승인 화면: 중 (3~4시간)
- 발주현황 + 협력사 목록 화면: 중 (2~3시간)
- 메시지/에스컬레이션 화면: 소 (1~2시간)
- 전체: **약 8~12시간** (모바일 최적화 포함)

