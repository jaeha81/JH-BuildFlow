# 단계별 프롬프트 01–05

---

## PROMPT-01 | 모노레포 초기화 및 아키텍처

> **투입 시점:** 마스터 프롬프트 응답 확인 후

```
프로젝트 초기 구조를 생성하라.

프로젝트명: interior-contractor-platform

기술스택:
- admin-desktop : Electron 28+ (main process Node.js) + React 18 + TypeScript
- vendor-web    : Next.js 14 + TypeScript (협력사 포털 + 관리자 PWA 포함, role 분기)
- api           : FastAPI + Python 3.11 + SQLAlchemy + Alembic
- database      : PostgreSQL 15
- agent-engine  : Electron main process 내 통합 (별도 앱 아님)
- storage       : 로컬 폴더 우선, S3-compatible 추상화 레이어
- auth          : JWT + RBAC
- audit         : 모든 write 작업에 AuditLog 자동 기록

모노레포 구조:
apps/
  admin-desktop/
    src/main/            ← Electron main (IPC, 파일시스템, 에이전트 엔진)
    src/renderer/        ← React UI
    src/agent-engine/    ← Harness + 6개 에이전트 모듈
    src/shared/          ← main-renderer 공유 타입
  vendor-web/            ← Next.js (협력사 + 관리자 PWA)
  api/                   ← FastAPI
packages/
  shared-types/          ← 전체 공유 TypeScript 타입
  agent-protocols/       ← 에이전트 통신 인터페이스 정의
  ui/                    ← 공유 UI 컴포넌트
infra/
  docs/
  scripts/

요구사항:
- Docker 강제 금지, 로컬 실행 우선
- 각 앱 README에 실행 명령, 환경변수 샘플 포함
- api: GET /health 엔드포인트 ({"status": "ok", "timestamp": "..."})
- admin-desktop: 앱 실행 시 "관리자 대시보드 로딩 중" 빈 화면 표시
- vendor-web: GET / → "협력사 포털" 텍스트 확인

완료 기준:
- 세 앱 모두 에러 없이 실행
- /health 200 응답
- Electron 창 뜨고 React 렌더링 확인

출력:
1) 실제 생성한 전체 폴더 트리 (파일명 포함)
2) 각 앱 역할 요약
3) 초기 실행 명령 (api, vendor-web, admin-desktop 각각)
4) 생성 파일 전체 목록
5) 환경변수 목록 (.env.example)
```

---

## PROMPT-02 | DB 스키마 및 인증

> **투입 시점:** PROMPT-01 완료 + 세 앱 실행 확인 후

```
데이터 모델과 인증 체계를 구현하라.

필수 엔티티:
- Company              (tenant 단위, company_settings JSON 컬럼 포함)
- User                 (role: super_admin | sub_admin | site_manager | vendor_user | accounting)
- Project              (name, type, budget, contract_amount, start_date, end_date, site_info, industry_template)
- IndustryTemplate     (cafe | office | hospital | retail — 업종별 기본 공정 세트)
- ProcessPackage       (project_id, trade_type, budget_allocated, schedule, status)
- TradeType            (목공|도장|경량|금속|전기|조명|타일|유리|사인|가구|턴키)
- ProjectDocument      (project_id, doc_type, file_url, version, is_internal, is_external)
- Vendor               (company_name, trade_types[], region[], contact, tax_info, rating)
- BidRequest           (project_id, process_package_id, vendor_id, sent_at, deadline, response_status, read_at)
- BidPackage           (bid_request_id, documents[], instructions)
- Quote                (vendor_id, project_id, file_url, parsed_total, line_items_json, parse_status, manual_review_required)
- QuoteLineNormalized  (quote_id, item_name, unit, quantity, unit_price, amount)
- MessageThread        (project_id, vendor_id, thread_type: project|bid|support)
- Message              (thread_id, sender_role, content, file_url, ai_handled, escalated_at)
- Settlement           (project_id, vendor_id, milestone_type: advance|interim|final, requested_amount, approved_amount, invoice_file, tax_review_status, payout_scheduled_date, payout_approved_by, payout_approved_at)
- VendorScoreSnapshot  (vendor_id, snapshot_date, participation_rate, response_speed_avg, win_rate, completion_rate, complaint_count, settlement_total)
- AuditLog             (company_id, actor_id, action, target_type, target_id, before_json, after_json, ip, timestamp)
- NotificationQueue    (recipient_id, channel: push|email|kakao, payload, status, sent_at)

요구사항:
- 멀티 테넌트: company_id로 데이터 분리
- soft delete (deleted_at) 전체 적용
- created_at, updated_at 전체 적용
- Alembic migration 파일 생성
- seed 데이터: 회사 1개, super_admin 1명, 협력사 3개(공종 각각 다르게), 프로젝트 1개
- JWT access token (15분) + refresh token (7일)
- bcrypt 패스워드 해싱

완료 기준:
- alembic upgrade head 에러 없이 완료
- seed.py 실행 후 DB에 데이터 확인
- POST /auth/login 토큰 발급 확인

출력:
1) ERD 텍스트 설명 (엔티티 관계 명시)
2) Alembic migration 파일 전체
3) seed.py 전체
4) 인증 API 엔드포인트 목록 + 응답 예시
5) 권한 매트릭스 표 (역할 × 기능)
```

---

## PROMPT-03 | Harness 에이전트 엔진 (데스크톱 내장)

> **투입 시점:** PROMPT-02 완료 + DB 마이그레이션 확인 후

```
Electron main process 내부에 Harness 오케스트레이터와 6개 에이전트를 구현하라.

위치: apps/admin-desktop/src/agent-engine/

구조:
agent-engine/
  harness.ts              ← Wave 실행 제어, 에이전트 상태 관리
  agents/
    scanner.ts            ← 로컬 폴더 파일 감지 (chokidar)
    classifier.ts         ← 공종/문서유형/프로젝트 자동 태깅
    packager.ts           ← 협력사별 발주 자료 세트 생성
    estimator.ts          ← 견적 파일 파싱 (PDF/Excel, adapter 패턴)
    validator.ts          ← 파싱 결과 검증, 수동 보정 큐 분류
    reporter.ts           ← 견적 비교, 발주 현황, 정산 리포트 생성
  adapters/
    pdf-parser.ts         ← pdfjs-dist 기반
    excel-parser.ts       ← xlsx 라이브러리 기반
    hwp-stub.ts           ← HWP 파일 수신만, 파싱은 stub (manual_review_required=true)
  protocols/
    agent-message.ts      ← 에이전트 간 메시지 인터페이스
  state/
    harness-state.ts      ← Wave 실행 상태, 에이전트 상태 저장

Harness 동작 규칙:
- Wave 단위로 에이전트를 순차 또는 병렬 실행
- 각 에이전트 상태: idle | running | done | error
- 에이전트 실패 시 다음 에이전트로 전파하지 않고 error 큐에 적재
- IPC 채널로 renderer에 실시간 상태 전송
- 모든 실행 결과는 로컬 JSON 상태 파일에 기록

SCANNER 상세:
- agent-config.json으로 감시 루트 폴더 설정
- 표준 폴더 기준 파일 감지:
  00_프로젝트기본정보 / 01_도면 / 02_공내역서_물량 / 03_공정일정 /
  04_협력사발주자료 / 05_협력사견적서원본 / 06_표준화견적데이터 /
  07_현장사진_이슈 / 08_정산_세무 / 09_완료보고 / 99_로그_감사기록
- 신규 파일 감지 시 CLASSIFIER로 메시지 전송
- 중복 감지 방지: file hash (SHA-256) 기반

ESTIMATOR 상세:
- PDF: pdfjs-dist로 텍스트 추출
- Excel: xlsx 라이브러리
- 파싱 실패 시 manual_review_required = true로 VALIDATOR 전달
- adapter 패턴: 향후 OCR 교체 가능한 인터페이스 유지

IPC 채널 목록 (main ↔ renderer):
- agent:status-update     → 에이전트 상태 변경 알림
- agent:file-detected     → 신규 파일 감지 알림
- agent:parse-complete    → 견적 파싱 완료
- agent:manual-review     → 수동 보정 큐 추가
- agent:start-wave        ← renderer가 Wave 실행 요청
- agent:get-status        ← renderer가 현재 상태 조회

완료 기준:
- 테스트 폴더에 PDF 또는 Excel 복사 시 SCANNER 감지 확인
- Harness 상태가 IPC로 renderer에 전달되는 것 확인
- agent-config.json 수정으로 루트 폴더 변경 가능 확인

출력:
1) 전체 파일 구조 및 코드
2) IPC 채널 전체 목록
3) agent-config.json 샘플
4) 테스트 방법 (파일 복사 → 감지 확인 절차)
5) 에이전트 상태 흐름도 (텍스트)
```

---

## PROMPT-04 | 관리자 데스크톱 앱 UI

> **투입 시점:** PROMPT-03 완료 + IPC 통신 확인 후

```
Electron renderer (React + TypeScript) 기반 관리자 대시보드 UI를 구현하라.

필수 화면 및 route:
/                        ← 홈 대시보드
/login                   ← 로그인
/projects                ← 프로젝트 목록
/projects/new            ← 프로젝트 생성 폼
/projects/:id            ← 프로젝트 상세
/projects/:id/packages   ← 공종별 패키지 (예산 배분)
/vendors                 ← 협력사 목록
/vendors/:id             ← 협력사 상세
/bid-requests/new        ← 발주 요청 생성
/bid-requests/:id        ← 발주 상세 (응답 현황)
/agent-monitor           ← Harness 에이전트 실행 모니터
/settings/folder         ← 로컬 폴더 설정

홈 대시보드 위젯:
- 진행 중 프로젝트 수
- 승인 대기 정산 건수
- 미응답 업체 수 (24시간 초과)
- 처리 필요 문의 건수
- 에이전트 실행 상태 요약

프로젝트 생성 폼 필드:
project_name, site_address, client_name,
industry_type (카페|오피스|병원|상가 선택 → 공정 자동 세팅),
trade_categories[] (복수 선택),
contract_amount, estimated_budget,
start_date, end_date, notes, attachments

공종별 예산 배분 화면:
- 전체 예산 대비 공종별 % 또는 금액 입력
- 합계 실시간 검증 (초과 시 경고)
- 실제 견적 수집 후 기준 대비 편차 표시
- 수동 조정 가능

에이전트 모니터 화면:
- 에이전트 6개 상태 카드 (idle/running/done/error)
- 현재 처리 중인 파일명
- 최근 에러 메시지
- 수동 보정 큐 카운트 (클릭 → 보정 화면)
- Wave 수동 실행 버튼

요구사항:
- IPC로 main process 에이전트 엔진과 통신
- API 연동: 실제 CRUD, 더미 데이터 사용 금지
- Tailwind CSS 또는 shadcn/ui 사용
- validation, empty state, loading state, error state 전부 구현
- 실무형 UI, 과도한 애니메이션 금지

완료 기준:
- 로그인 → 대시보드 진입 확인
- 프로젝트 생성 후 목록에 표시 확인
- 에이전트 모니터에서 상태 변화 실시간 반영 확인

출력:
1) 구현 파일 전체 목록
2) 페이지별 기능 및 IPC/API 연결 명세
3) 컴포넌트 트리
4) 테스트 방법
```

---

## PROMPT-05 | 협력사 웹 포털 (Next.js)

> **투입 시점:** PROMPT-04 완료 후

```
협력사 전용 웹 포털을 구현하라. (apps/vendor-web)

Route 구조:
/                        ← 랜딩 (로그인 or 초대 링크 안내)
/join/:token             ← 초대 링크 기반 가입 (이메일 토큰)
/login                   ← 협력사 로그인
/dashboard               ← 협력사 홈 (발주 수신함 요약)
/bid-requests            ← 발주 수신함 목록
/bid-requests/:id        ← 발주 상세 (자료 다운로드, 응답 버튼)
/quotes/new/:bidId       ← 견적 제출
/quotes/:id              ← 제출한 견적 확인
/messages                ← Q&A 목록
/messages/:threadId      ← 메시지 스레드
/profile                 ← 협력사 정보 수정
/admin/*                 ← 관리자 PWA (role=admin 검증 후 진입)

가입 플로우 (wizard 형태):
Step 1: 기본정보 (업체명, 대표자, 연락처, 이메일, 주소)
Step 2: 사업자 정보 (사업자등록증 업로드 또는 수기 입력)
Step 3: 공종 선택 (복수 선택)
Step 4: 서비스 가능 지역 선택
Step 5: 완료

견적 제출 방식 (3가지):
1) 플랫폼 템플릿 직접 입력 (항목명, 수량, 단가, 금액)
2) PDF 업로드
3) Excel 업로드
※ HWP: 파일 업로드만 허용, 파싱은 서버 후처리

발주 응답:
- 참여 / 거절 / 보류 버튼
- 응답 마감시간 카운트다운 표시
- 거절/보류 시 사유 입력 선택 사항

관리자 PWA (/admin/* 경로):
- JWT role=admin 검증
- 모바일 레이아웃 최적화
- 필수 화면: 승인 대기 목록, 프로젝트 현황 요약, 미응답 알림, 긴급 메시지 확인

협력사 UX 원칙:
- 화면 단순화, 불필요한 정보 제거
- 필수/선택 입력 명확히 구분 (필수: 빨간 *)
- 사업자 정보는 견적서 상단 자동 채움 구조로 저장

완료 기준:
- 초대 링크 → 가입 완료 → 로그인 → 발주 수신함 진입 확인
- 견적 파일 업로드 후 API 전달 확인
- 관리자 PWA /admin 진입 시 role 검증 확인

출력:
1) 협력사 온보딩 플로우 (텍스트)
2) 화면 목록 및 route 전체
3) 파일 업로드 처리 방식 (form multipart)
4) 관리자 PWA 분기 구조
5) 테스트 방법
```
