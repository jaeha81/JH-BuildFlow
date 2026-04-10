# JH BuildFlow — 전체 시스템 아키텍처

> 최종 업데이트: 2026-04-10

---

## 시스템 개요

JH BuildFlow는 내부 건설/인테리어 관리팀과 외부 협력사를 연결하는 발주·견적·정산 플랫폼입니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                         관리자 데스크톱                            │
│                   (Electron 31 + React 18)                       │
│                                                                  │
│  ┌──────────────┐    IPC     ┌─────────────────────────────┐    │
│  │  Renderer    │◄──────────►│  Main Process               │    │
│  │  (React UI)  │            │  ├─ Harness (에이전트 엔진)  │    │
│  │              │            │  │   ├─ ScannerAgent         │    │
│  │  /dashboard  │            │  │   ├─ ClassifierAgent      │    │
│  │  /projects   │            │  │   ├─ EstimatorAgent       │    │
│  │  /vendors    │            │  │   ├─ ValidatorAgent       │    │
│  │  /analytics  │            │  │   └─ ReporterAgent        │    │
│  │  /settlements│            │  └─ electron-updater         │    │
│  └──────┬───────┘            └─────────────────────────────┘    │
└─────────│───────────────────────────────────────────────────────┘
          │ HTTP/REST (VITE_API_BASE_URL)
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API 서버                                  │
│                  (FastAPI + SQLAlchemy 2.0 async)                │
│                                                                  │
│  Routers: /auth /projects /vendors /bids /quotes                │
│           /messages /settlements /analytics /agent-sync         │
│                                                                  │
│  Services: bid_state · ai_reply · vendor_score                  │
│  Stubs:    vendor_registry · notification_kakao · score_ml      │
│                                                                  │
│  APScheduler: VendorScore 월 1회 스냅샷 (매월 1일 02:00)         │
└─────────────────┬───────────────────────────────────────────────┘
                  │ async SQLAlchemy
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PostgreSQL 14+                            │
│                                                                  │
│  companies · users · vendors · projects · process_packages      │
│  bid_requests · quotes · quote_line_normalized                  │
│  messages · message_threads · settlements                       │
│  vendor_score_snapshots · audit_logs · notification_queue       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        협력사 웹 포털                              │
│                   (Next.js 14 App Router)                        │
│                                                                  │
│  /join → /dashboard → /bid-requests → /quotes/new              │
│  /messages → /profile → /admin (관리자 페이지)                   │
│                                                                  │
│  인증: JWT Bearer token (localStorage)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 컴포넌트별 역할

### admin-desktop (Electron)

| 레이어 | 역할 |
|--------|------|
| Main Process | Harness 에이전트 엔진 관리, IPC 라우팅, 자동 업데이트 |
| Renderer | React UI — 대시보드, 프로젝트, 발주, 분석, 정산 |
| Harness | 폴더 감시 → 파일 분류 → 견적 파싱 → 검증 → 리포트 파이프라인 |
| HarnessConnector | 외부 하네스 서버 연결 추상화 (Local/Remote) |

### api (FastAPI)

| 레이어 | 역할 |
|--------|------|
| Routers | HTTP 엔드포인트, RBAC 적용, AuditLog 기록 |
| Services | 비즈니스 로직 (bid_state, vendor_score, ai_reply) |
| Stubs | 외부 연동 확장 포인트 (VendorRegistry, KakaoAI, ScoreML) |
| Models | SQLAlchemy ORM, company_id 테넌트 분리 |

### vendor-web (Next.js)

| 레이어 | 역할 |
|--------|------|
| App Router | 협력사 UI — 가입, 발주 수신, 견적 제출, 메시지 |
| API Client | fetch + JWT Bearer 인증 |

---

## 데이터 흐름

### 발주 → 견적 → 선정 흐름

```
관리자 creates BidRequest
  → Harness SCANNER detects vendor quote file
  → CLASSIFIER → ESTIMATOR → VALIDATOR → REPORTER
  → Quote submitted via vendor-web OR agent-sync API
  → BidRequest status: pending → active → closed
  → 선정된 vendor → Settlement created
  → super_admin approve → payout_approved_at 기록
```

### 협력사 평가 흐름

```
월 1일 02:00 APScheduler
  → vendor_score.snapshot_all_vendors(company_id)
  → VendorScoreSnapshot 레코드 생성 (per vendor)
  → /analytics/top-by-trade 조회 시 최신 스냅샷 반환
  → 향후: ML 파이프라인 교체 가능 (VendorScoreMLConnector)
```

---

## 확장 포인트 요약

| 포인트 | 현재 구현 | 교체 대상 | 위치 |
|--------|----------|----------|------|
| AI 자동응답 | MockAiReplyProvider | ClaudeAiReplyProvider | `api/app/services/ai_reply.py` |
| 견적 파서 | PdfQuoteParser / ExcelQuoteParser | 외부 OCR 서비스 | `agent-engine/adapters/` |
| 협력사 레지스트리 | NullVendorRegistry | PublicApiVendorRegistry | `api/app/services/stubs/vendor_registry.py` |
| 알림 발송 | ConsoleNotificationProvider | KakaoAiProvider | `api/app/services/stubs/notification_kakao.py` |
| 점수 예측 | rule-based compute_score() | RemoteMLVendorScoreConnector | `api/app/services/stubs/vendor_score_ml.py` |
| 하네스 실행 | LocalHarnessConnector | RemoteHarnessConnector | `agent-engine/connector/` |

---

## 테넌트 격리 (멀티 회사)

- 모든 DB 테이블에 `company_id UUID` 컬럼 존재
- 모든 쿼리에 `WHERE company_id = current_user.company_id` 필터 적용
- 회사별 설정: `company_settings` 테이블 (로고 URL, 앱 이름, 색상)
- 화이트라벨: `APP_PRODUCT_NAME`, `APP_ID` 환경변수로 Electron 앱 이름/ID 오버라이드
