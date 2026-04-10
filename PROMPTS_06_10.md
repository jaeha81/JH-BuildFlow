# 단계별 프롬프트 06–10

---

## PROMPT-06 | FastAPI 핵심 엔드포인트

> **투입 시점:** PROMPT-05 완료 후

```
FastAPI 백엔드 핵심 API를 전부 구현하라.

[인증]
POST /auth/login              → access_token + refresh_token 발급
POST /auth/refresh            → access_token 재발급
POST /auth/logout             → refresh_token 무효화
POST /auth/invite             → 협력사 초대 링크 생성 (이메일 토큰)

[프로젝트]
GET    /projects              → 목록 (company_id 필터, 페이지네이션)
POST   /projects              → 생성
GET    /projects/:id          → 상세
PUT    /projects/:id          → 수정
DELETE /projects/:id          → soft delete
GET    /projects/:id/process-packages   → 공종 패키지 목록
POST   /projects/:id/process-packages   → 공종 패키지 생성
GET    /projects/:id/documents          → 첨부 문서 목록
POST   /projects/:id/documents          → 파일 업로드

[발주]
POST   /bid-requests                    → 공종별 다수 업체 일괄 발주
GET    /bid-requests                    → 목록 (project_id / vendor_id 필터)
GET    /bid-requests/:id                → 상세
PUT    /bid-requests/:id/respond        → 참여/거절/보류 응답
POST   /bid-requests/:id/rebid          → 재발주 (관리자 확인 후 실행)
PUT    /bid-requests/:id/mark-read      → 열람 기록

[견적]
POST   /quotes                          → 파일 업로드 또는 폼 입력
GET    /quotes                          → 목록 (project_id / vendor_id 필터)
GET    /quotes/:id                      → 상세 (파싱 결과 포함)
PUT    /quotes/:id/normalize            → 파싱 결과 저장
GET    /quotes/compare                  → 공종별 업체 견적 비교 (project_id + process_package_id)
GET    /quotes/manual-review-queue      → 수동 보정 필요 목록

[메시지]
GET    /threads                         → 목록 (project_id / vendor_id 필터)
POST   /threads                         → 스레드 생성
GET    /threads/:id/messages            → 메시지 목록
POST   /threads/:id/messages            → 메시지 전송
PUT    /messages/:id/escalate           → 관리자 에스컬레이션

[정산]
GET    /settlements                     → 목록 (project_id / vendor_id 필터)
POST   /settlements                     → 정산 요청 생성
GET    /settlements/:id                 → 상세
PUT    /settlements/:id/approve         → 관리자 승인 (super_admin only)
PUT    /settlements/:id/tax-review      → 세무 검토 상태 업데이트
GET    /settlements/pending-approval    → 승인 대기 목록
GET    /settlements/calendar            → 월별 지급 예정 캘린더 데이터

[협력사]
GET    /vendors                         → 목록 (공종 / 지역 필터)
POST   /vendors                         → 등록
GET    /vendors/:id                     → 상세
PUT    /vendors/:id                     → 수정
GET    /vendors/:id/score               → 평가 점수 + 이력

[분석]
GET    /analytics/vendor-scores         → 전체 협력사 점수 (공종/지역 필터)
GET    /analytics/vendor/:id/history    → 점수 이력
GET    /analytics/low-response          → 미응답 많은 업체 목록
GET    /analytics/top-by-trade          → 공종별 상위 업체
GET    /analytics/bid-stats             → 발주 현황, 응답률, 공종별 통계
GET    /analytics/chart-data            → 차트용 데이터 (type=participation|settlement|score)

[에이전트 동기화]
POST   /agent/sync-file                 → 로컬 에이전트 → 서버 메타데이터 전송
POST   /agent/upload-document           → 파일 업로드
GET    /agent/tasks                     → 모바일 지시사항 → 데스크톱 에이전트 fetch

요구사항:
- 모든 write 엔드포인트에 AuditLog 자동 기록 미들웨어 적용
- company_id tenant 분리 미들웨어 (모든 쿼리에 자동 적용)
- 파일 업로드: 확장자 제한 (pdf, xlsx, xls, jpg, png, hwp), 최대 50MB
- 자동 지급 경로 없음 (approve는 super_admin만, 실제 이체 로직 없음)

완료 기준:
- 모든 엔드포인트 200/201/400/401/403/404 응답 정상
- AuditLog 실제 기록 확인
- 파일 업로드 → 저장 경로 확인

출력:
1) 전체 엔드포인트 구현 코드 (라우터별 파일 분리)
2) 미들웨어 코드 (AuditLog, tenant, auth)
3) 파일 업로드 처리 코드
4) 테스트용 curl 명령 샘플 (주요 5개 이상)
5) 환경변수 목록
```

---

## PROMPT-07 | 발주 상태 머신 및 재발주 로직

> **투입 시점:** PROMPT-06 완료 후

```
발주 운영 로직을 구현하라.

상태 머신 정의:
BidRequest 상태:
  draft → sent → read → accepted
                       → declined
                       → hold
                       → expired (마감 초과 + 미응답)

재발주 상태:
  rebid_candidate → rebid_pending_confirm → rebid_confirmed → rebid_sent

상태 전이 규칙:
- sent: 발주 생성 + 알림 발송 시점
- read: 협력사가 발주 상세 열람 시 (read_at 기록)
- expired: deadline 초과 + response_status = null → 조회 시점에 자동 전환
- rebid_pending_confirm: 관리자가 재발주 요청 시 (발송 전 확인 대기)
- rebid_confirmed: 관리자 확인 완료 → rebid_sent로 전환 가능

차순위 업체 추천 로직:
score = VendorScoreSnapshot.score × 0.6
      + 지역_매칭 × 0.2          // 프로젝트 지역과 협력사 서비스 지역 일치 여부
      + 최근_90일_참여율 × 0.2

재발주 규칙:
- 자동 발송 절대 금지
- 관리자 확인(rebid_confirmed) 없이 rebid_sent 전환 불가
- 재발주 로그 AuditLog에 기록

미응답 경고:
- 발송 후 24시간 경과 + 미응답 → 관리자 대시보드 경고 배지
- 발송 후 48시간 경과 + 미응답 → 알림 재발송 (NotificationQueue 적재)

프로젝트 상세 화면 공종별 응답 현황 테이블:
- 컬럼: 업체명 | 발송 시각 | 열람 여부 | 응답 상태 | 경과 시간 | 액션

완료 기준:
- 발주 생성 → sent 상태 확인
- 협력사 열람 → read 상태 변경 확인
- deadline 초과 미응답 → expired 자동 전환 확인
- 재발주 후보 목록 API 응답 확인

출력:
1) 상태 머신 코드 + 텍스트 흐름도
2) 만료 처리 방식 (쿼리 기반 lazy evaluation)
3) 재발주 후보 추천 로직 코드
4) API 연동 포인트 목록
5) 관리자 응답 현황 테이블 컴포넌트 코드
```

---

## PROMPT-08 | 견적 표준화 파이프라인

> **투입 시점:** PROMPT-07 완료 후

```
견적 수집 후 내부 표준 구조로 변환하는 파이프라인을 구현하라.

처리 흐름:
파일 업로드
  → ESTIMATOR 에이전트 (파싱 시도)
  → VALIDATOR (신뢰도 검증)
  → 성공: QuoteLineNormalized 저장
  → 실패: manual_review_required = true → 수동 보정 큐

표준 출력 구조 (TypeScript 타입):
interface NormalizedQuote {
  quote_header: {
    vendor_name: string
    project_name: string
    submitted_at: string
    valid_until?: string
  }
  vendor_business_snapshot: {
    biz_number: string
    representative: string
    address: string
  }
  quote_total: number
  tax_included: boolean
  line_items: Array<{
    item_name: string
    spec?: string
    unit: string
    quantity: number
    unit_price: number
    amount: number
    note?: string
  }>
  parse_warnings: string[]
  manual_review_required: boolean
  parse_log: {
    method: 'pdf' | 'excel' | 'form' | 'hwp_stub'
    confidence_score: number   // 0~1
    failed_fields: string[]
  }
}

Adapter 패턴 인터페이스:
interface QuoteParser {
  parse(filePath: string): Promise<ParseResult>
  readonly supportedExtensions: string[]
}

구현체:
- PdfQuoteParser   implements QuoteParser  (pdfjs-dist)
- ExcelQuoteParser implements QuoteParser  (xlsx)
- HwpQuoteParser   implements QuoteParser  (stub: manual_review_required=true)
- FormInputParser  implements QuoteParser  (직접 입력 데이터)

신뢰도 기준:
- confidence_score >= 0.8: 자동 저장
- confidence_score 0.5~0.8: 경고 포함 저장, 관리자 검토 권고
- confidence_score < 0.5: manual_review_required = true

수동 보정 UI (관리자 데스크톱 /quotes/:id/review):
- 좌측: 원본 파일 미리보기 (PDF iframe 또는 이미지)
- 우측: 추출된 항목 편집 폼 (항목 추가/삭제/수정)
- 하단: "보정 완료" 버튼 → VALIDATOR 재통과 → 저장

원본 파일 보존 규칙:
- 파싱 결과와 원본 파일 경로를 Quote 테이블에 함께 저장
- 원본 파일은 덮어쓰지 않음

완료 기준:
- 샘플 Excel 파일 업로드 → 파싱 결과 JSON 확인
- confidence_score < 0.5 → manual_review 큐 등록 확인
- 수동 보정 저장 → QuoteLineNormalized 업데이트 확인

출력:
1) parser service 전체 코드 (adapter 패턴)
2) adapter 인터페이스 정의
3) manual review queue API
4) 수동 보정 UI 컴포넌트 코드
5) 테스트용 샘플 Excel 형식 정의 + 파서 동작 확인 방법
```

---

## PROMPT-09 | 메시지/Q&A/에스컬레이션

> **투입 시점:** PROMPT-08 완료 후

```
협력사-관리자 메시지 시스템을 구현하라.

Thread 모델:
- thread_type: project | bid | support
- project: 프로젝트 전반 관련 대화
- bid: 특정 발주 관련 대화 (bid_request_id 연결)
- support: 협력사 상담 요청
- 모든 thread는 project_id + vendor_id와 연결

메시지 기능:
- 협력사: 메시지 작성, 파일 첨부 (jpg/png/pdf, 10MB 이하)
- 관리자: 답변, 처리 완료 표시 (resolved_at 기록)
- 읽음 상태: read_at 기록 (발신자 기준)
- 파일 첨부 시 message_file_url 저장

AI 자동응답 Provider 인터페이스:
interface AiReplyProvider {
  canHandle(message: string): Promise<boolean>
  reply(message: string, context: ThreadContext): Promise<string>
}

- MockAiReplyProvider: 현재 구현 (단순 패턴 매칭 응답)
- 향후 ClaudeAiReplyProvider로 교체 가능한 구조 유지

Escalate 흐름:
1. AI canHandle() = false → escalate_flag = true
2. NotificationQueue에 관리자 알림 적재
3. 관리자 대시보드 "처리 필요 문의" 카운트 증가
4. 관리자 답변 후 escalate_resolved_at 기록

관리자 대시보드 위젯 "처리 필요 문의":
- 미응답 메시지 수 + escalated 메시지 수
- 클릭 → 해당 thread 목록으로 이동
- 24시간 이상 미응답 시 빨간색 강조

완료 기준:
- 협력사 메시지 전송 → 관리자 수신 확인
- AI canHandle=false → escalate 상태 변경 확인
- 관리자 위젯 카운트 실시간 반영 확인

출력:
1) Thread + Message Alembic 스키마
2) 메시지 API 전체 코드
3) AI provider 인터페이스 + Mock 구현 코드
4) 관리자 위젯 컴포넌트 코드
5) Escalate 흐름 정의 (텍스트)
```

---

## PROMPT-10 | 정산·승인형 지급 구조

> **투입 시점:** PROMPT-09 완료 후

```
정산 모듈을 구현하라.

핵심 원칙: 자동 지급 경로 없음. 모든 지급은 인간 승인 필수.

Milestone 흐름:
advance(선금) → interim(중도금) → final(잔금)

각 milestone 상태:
requested → tax_review_pending → tax_review_done → pending_approval → approved → scheduled → completed

승인 워크플로:
1. 협력사: 계산서 파일 업로드 + 청구 금액 입력 → requested
2. 시스템: tax_review_pending 상태로 등록
3. 세무/회계(accounting 역할): 검토 후 tax_review_done 업데이트
4. 최고관리자(super_admin): 최종 승인 → approved
5. 관리자: 지급 예정일 입력 → scheduled
6. 완료 표시: completed (실제 이체는 외부 수동 처리)

Settlement 필드:
- milestone_type: advance | interim | final
- requested_amount: number
- approved_amount: number (승인 시 입력)
- invoice_file_url: string
- tax_review_status: pending | reviewed | approved | rejected
- tax_review_note: string (세무 검토 메모)
- payout_scheduled_date: date
- payout_approved_by: user_id (super_admin)
- payout_approved_at: timestamp
- payment_note: string

필수 화면 (관리자 데스크톱):
/settlements                 ← 전체 정산 목록
/settlements/pending         ← 승인 대기 목록 (우선순위 정렬)
/settlements/calendar        ← 월별 지급 예정 캘린더
/projects/:id/settlements    ← 프로젝트별 정산 탭

지급 캘린더:
- 월별 뷰: 날짜별 지급 예정 금액 시각화
- 클릭 시 해당 정산 상세로 이동

법무/세무 주의 항목 (코드 주석으로 기록):
- 실제 계좌이체는 시스템 외부에서 수동 처리
- 세금계산서 발행 여부는 시스템이 추적하지 않음 (메모 필드만 제공)
- 에스크로 기능은 현재 미구현 (향후 PG사 연동 필요)

완료 기준:
- 협력사 계산서 업로드 → requested 상태 확인
- accounting 검토 → tax_review_done 전환 확인
- super_admin 승인 → approved 전환 확인
- 캘린더 API 데이터 형식 확인

출력:
1) Settlement Alembic 스키마
2) 승인 워크플로 API 전체 코드
3) 캘린더 데이터 엔드포인트
4) 정산 UI 컴포넌트 코드 (목록, 상세, 캘린더)
5) 법무/세무 주의 항목 메모
```
