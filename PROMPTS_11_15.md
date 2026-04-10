# 단계별 프롬프트 11–15

---

## PROMPT-11 | 분석 대시보드 및 협력사 평가

> **투입 시점:** PROMPT-10 완료 후

```
협력사 평가 및 분석 대시보드를 구현하라.

VendorScore 계산 공식 (별도 service layer로 분리):

score = (participation_rate    × 0.25)
      + (response_speed_score  × 0.20)
      + (win_rate              × 0.20)
      + (completion_rate       × 0.20)
      + (quality_score         × 0.15)

각 지표 정의:
- participation_rate   : 발주 수신 횟수 대비 참여 의사 표시 비율
- response_speed_score : 평균 응답 시간 역산 (기준: 48시간 = 0점, 1시간 이내 = 1점)
- win_rate             : 참여 의사 대비 실제 선정 비율
- completion_rate      : 선정 대비 정산 완료(completed) 비율
- quality_score        : 1 - (complaint_count / max(total_projects, 1))

스냅샷 전략:
- VendorScoreSnapshot: 월 1회 자동 계산 (APScheduler)
- 실시간 조회: 최근 스냅샷 + 당월 delta 계산

필수 API:
GET /analytics/vendor-scores         → 전체 목록 (공종/지역 필터, 정렬 가능)
GET /analytics/vendor/:id/history    → 점수 이력 (월별)
GET /analytics/low-response          → 미응답률 상위 업체 (최근 30일 기준)
GET /analytics/top-by-trade          → 공종별 상위 3개 업체
GET /analytics/bid-stats             → 발주 현황, 응답률, 공종별 집계
GET /analytics/chart-data            → 차트용 시계열 데이터
  ?type=participation|settlement|score
  &vendor_id= (optional)
  &period=3m|6m|12m

차기 발주 추천:
- 추천 점수 = vendor_score × 0.6 + 지역_매칭 × 0.2 + 최근_90일_참여율 × 0.2
- PROMPT-07 재발주 로직의 후보 추천 API와 연결

대시보드 화면 (관리자 데스크톱 /analytics):
- 협력사 목록 + 점수 테이블 (공종 필터, 지역 필터)
- 공종별 상위 업체 카드
- 지역별 협력사 분포
- 미응답 많은 업체 경고 리스트
- 최근 참여율 하락 업체 알림

완료 기준:
- 스냅샷 수동 실행 → VendorScoreSnapshot 레코드 생성 확인
- /analytics/vendor-scores 응답 정상
- 차트 데이터 형식 확인

출력:
1) score formula service 코드 (분리된 파일)
2) APScheduler 스냅샷 스케줄러 설정
3) analytics API 전체 코드
4) 차트 데이터 응답 형식 (JSON 예시)
5) 관리자 대시보드 분석 화면 컴포넌트 코드
```

---

## PROMPT-12 | Electron 패키징 (exe/MSI)

> **투입 시점:** PROMPT-11 완료 후

```
Electron 앱을 Windows 11 x64 배포 가능한 형태로 패키징하라.

빌더: electron-builder

타겟:
- NSIS installer (setup.exe): 설치형 패키지
- portable exe: 설치 없이 실행 가능한 버전

설정 요구사항:
- appId: com.jh.contractor-platform
- productName: 환경변수 APP_PRODUCT_NAME으로 오버라이드 가능 (화이트라벨 대응)
- win 타겟: ['nsis', 'portable']
- nsis: oneClick=false, allowDirChange=true, createDesktopShortcut=true
- 아이콘: assets/icon.png (512×512) → ICO 자동 변환
- 코드 서명: 개발 단계에서는 비활성, 구조만 준비

자동 업데이트 구조:
- electron-updater 설치 및 초기 설정
- 업데이트 서버 URL: 환경변수 UPDATE_SERVER_URL (현재는 빈 값)
- 업데이트 확인 로직은 구현하되 실제 서버 없을 때 조용히 실패하도록 처리

환경 분리:
- development : electron . (로컬 실행)
- production  : electron-builder build --win
- API 연결: 개발=http://localhost:8000, 프로덕션=환경변수 VITE_API_BASE_URL

package.json scripts 추가:
{
  "electron:dev": "...",
  "electron:build": "electron-builder build --win",
  "electron:build:portable": "electron-builder build --win --target portable"
}

빌드 출력:
- dist/setup.exe       (NSIS 설치 파일)
- dist/portable.exe    (포터블 실행 파일)

화이트라벨 대응:
- appId, productName, 아이콘 경로를 환경변수로 분리
- company_settings 테이블의 로고/색상을 앱 시작 시 API에서 읽어 적용

완료 기준:
- npm run electron:build 에러 없이 완료
- dist/ 폴더에 setup.exe + portable.exe 생성 확인
- portable.exe 실행 후 앱 정상 동작 확인

출력:
1) electron-builder.yml 전체 설정
2) package.json build 스크립트 전체
3) 환경변수 주입 방식 (vite.config.ts 포함)
4) 자동 업데이트 구조 코드
5) 빌드 명령 및 출력 파일 위치
```

---

## PROMPT-13 | 보안 및 운영 점검

> **투입 시점:** PROMPT-12 완료 후

```
구현된 전체 시스템에 대해 보안·운영 점검을 수행하라.

[접근 제어 점검]
□ RBAC 누락 엔드포인트 존재 여부
□ tenant company_id 분리 미적용 쿼리
□ 관리자 전용 Electron IPC 채널 role 검증 누락
□ 협력사가 다른 협력사 데이터에 접근 가능한 경로
□ 파일 URL 직접 접근 시 권한 검증 (signed URL or token 방식)

[데이터 보호 점검]
□ 사업자번호, 연락처 등 민감 정보 응답 마스킹 필요 구간
□ AuditLog 누락 write 작업 목록
□ 자동 지급 경로 잔존 여부 (코드 레벨 검증)
□ Settlement approve: super_admin 외 접근 가능 여부

[파일 보안 점검]
□ 업로드 확장자/용량 제한 적용 여부 (pdf, xlsx, xls, jpg, png, hwp / 50MB)
□ 파일명 sanitize 적용 여부 (path traversal 방지)
□ is_internal=true 문서가 협력사 API로 노출되는 경로 차단 여부
□ 임시 업로드 파일 정리 로직

[Electron 보안 점검]
□ nodeIntegration: false 설정 여부
□ contextIsolation: true 설정 여부
□ IPC 채널 화이트리스트 검증 (허용된 채널만 처리)
□ 원격 URL 로드 방지 (webSecurity 설정)
□ preload 스크립트에서 불필요한 API 노출 여부

[운영 점검]
□ 에러 로그와 사용자 로그 분리 여부
□ API 서버 다운 시 Electron 앱 offline graceful degradation
□ 로컬 agent-state.json 파일 손상 시 복구 전략
□ DB 연결 실패 시 API 응답 방식

출력 형식:
각 항목: [PASS | FAIL | WARNING] 판정 + 이유

완료 기준:
- FAIL 항목 모두 수정 완료
- WARNING 항목 수정 방안 문서화

출력:
1) 항목별 점검 결과 표 (PASS/FAIL/WARNING)
2) FAIL 항목 수정 코드 (파일 경로 명시)
3) 운영 전 필수 TODO 목록
4) 향후 고도화 권고 항목
```

---

## PROMPT-14 | 단계별 실행 순서 강제

> **투입 시점:** 새 대화 시작 시 또는 재시작 시 참조용

```
이 프로젝트를 다음 순서로만 진행하라.
각 단계는 이전 단계 완료 확인 후에만 시작한다.

단계 목록:
1.  모노레포 구조 + /health + Electron 빈 창 실행 확인         [PROMPT-01]
2.  DB 스키마 migration + seed + JWT 인증 동작 확인            [PROMPT-02]
3.  Harness 에이전트 엔진 + SCANNER 폴더 감시 동작 확인        [PROMPT-03]
4.  관리자 데스크톱 UI 핵심 화면 + IPC 연동 확인               [PROMPT-04]
5.  협력사 웹 포털 가입/발주 수신/응답 기능                    [PROMPT-05]
6.  FastAPI 핵심 엔드포인트 전체 + AuditLog 미들웨어           [PROMPT-06]
7.  발주 상태 머신 + 재발주 로직 + 미응답 경고                 [PROMPT-07]
8.  견적 파싱 파이프라인 + 수동 보정 UI                        [PROMPT-08]
9.  메시지/Q&A + AI Mock + Escalate 흐름                       [PROMPT-09]
10. 정산/승인 워크플로 + 캘린더                                [PROMPT-10]
11. 분석 대시보드 + 협력사 평가 점수                           [PROMPT-11]
12. Electron 패키징 (portable.exe 빌드 성공)                   [PROMPT-12]
13. 보안/운영 점검 + FAIL 항목 수정                            [PROMPT-13]
14. Harness 외부 연동 인터페이스 + 확장 가이드                 [PROMPT-15]

작업 규칙:
- 각 단계 시작 전 완료 기준을 먼저 출력하라.
- 단계 종료 시 실제 생성 파일 목록 + 동작 확인 명령을 출력하라.
- 미완성 기능을 완료 표시하지 마라.
- 가능한 한 작은 단위로 커밋하라. (feat/step-01 형식)
- 각 단계 끝에 다음 단계 진행 전 확인이 필요한 사항을 명시하라.
```

---

## PROMPT-15 | Harness 외부 연동 인터페이스 및 확장 가이드

> **투입 시점:** PROMPT-13 완료 후 (최종 단계)

```
JH-하네스 외부 연동 포인트와 향후 확장 구조를 정의하라.

HarnessConnector 인터페이스:
interface HarnessConnector {
  executeWave(agents: AgentJob[]): Promise<WaveResult>
  getStatus(): Promise<HarnessStatus>
  onAgentComplete(callback: (result: AgentResult) => void): void
  onError(callback: (error: AgentError) => void): void
}

구현체 두 개:
- LocalHarnessConnector  : 현재 구현 (Electron main process 내장)
- RemoteHarnessConnector : 향후 외부 하네스 서버 연결 stub
  (WebSocket 또는 HTTP polling 방식, 현재는 NotImplementedError)

확장 포인트 목록:
- 화이트라벨   : company_settings 테이블 (로고, 색상, 앱 이름, API URL)
- 다중 회사    : company_id tenant 구조 이미 적용됨
- 외부 업체    : VendorRegistry API 연결 포인트 (stub)
- 추천 엔진    : VendorScoreSnapshot → 외부 ML 파이프라인 연결 포인트 (stub)
- 카카오 알림  : NotificationQueue kakao 채널 (KakaoAiProvider stub)
- AI 자동응답  : AiReplyProvider → ClaudeAiReplyProvider 교체 가능 구조 유지
- OCR 교체     : QuoteParser adapter → 외부 OCR 서비스 연결 가능

문서 생성 (infra/docs/):
- ARCHITECTURE.md  : 전체 시스템 구조 다이어그램 (텍스트 기반)
- AGENT_PROTOCOL.md: 에이전트 메시지 인터페이스 명세
- DEPLOYMENT.md    : 로컬 개발 → 스테이징 → 프로덕션 배포 순서
- SECURITY.md      : 보안 정책, 파일 접근 제어, RBAC 매트릭스

완료 기준:
- HarnessConnector 인터페이스 코드 생성 확인
- 4개 문서 생성 확인
- 확장 포인트 stub 코드 위치 명세 확인

출력:
1) HarnessConnector 인터페이스 + 두 구현체 코드
2) 확장 포인트 stub 파일 목록 및 위치
3) ARCHITECTURE.md 전체
4) AGENT_PROTOCOL.md 전체
5) DEPLOYMENT.md 전체
6) SECURITY.md 전체
```
