# JH BuildFlow — 에이전트 메시지 인터페이스 명세

> 최종 업데이트: 2026-04-10

---

## 에이전트 파이프라인 구조

```
파일 감지
   │
   ▼
[SCANNER] ──file-detected──► [CLASSIFIER] ──classified──► [PACKAGER]
                                                                │
                                                         packaged
                                                                │
                                                                ▼
                                                         [ESTIMATOR] ──parse-complete──►[VALIDATOR]
                                                                                              │
                                                                              validation-result
                                                                                              │
                                                                         ┌────────────────────┤
                                                                         │                    │
                                                                  isValid=true          manualReview=true
                                                                         │                    │
                                                                         ▼                    ▼
                                                                   [REPORTER]          ManualReviewQueue
```

---

## 에이전트 목록

| 에이전트 | 역할 | 입력 | 출력 |
|---------|------|------|------|
| SCANNER | 폴더 감시, 파일 감지 | 파일 시스템 이벤트 | `FileDetectedPayload` |
| CLASSIFIER | 파일 유형 분류 | `FileDetectedPayload` | `ClassifiedPayload` |
| PACKAGER | 패키지 묶음 생성 | `ClassifiedPayload[]` | `PackagedPayload` |
| ESTIMATOR | 견적 파일 파싱 | 파일 경로 | `ParseResultPayload` |
| VALIDATOR | 파싱 결과 검증 | `ParseResultPayload` | `ValidationResultPayload` |
| REPORTER | 비교 리포트 생성 | `ValidationResultPayload[]` | `ReportPayload` |

---

## 메시지 기본 구조

```typescript
interface AgentMessage<T = unknown> {
  id: string;           // UUID
  fromAgent: AgentName;
  toAgent: AgentName;
  timestamp: string;    // ISO 8601
  payload: T;
}
```

---

## 페이로드 명세

### FileDetectedPayload

```typescript
{
  filePath: string;      // 절대 경로
  fileName: string;      // 파일명
  fileHash: string;      // SHA-256 (중복 방지)
  folderKey: string;     // 감시 폴더 키
  detectedAt: string;    // ISO 8601
  sizeBytes: number;
}
```

### ClassifiedPayload

```typescript
{
  filePath: string;
  fileHash: string;
  tradeType: string | null;    // "전기" | "설비" | "철골" | ...
  docType: string | null;      // "quote" | "contract" | "drawing" | ...
  projectHint: string | null;  // 파일명에서 추출한 프로젝트 힌트
  confidence: number;          // 0.0 ~ 1.0
}
```

### ParseResultPayload

```typescript
{
  filePath: string;
  fileHash: string;
  parsedTotal: number | null;
  lineItems: LineItem[];
  parseStatus: "success" | "failed";
  manualReviewRequired: boolean;
  errorDetail: string | null;
}

interface LineItem {
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}
```

### ValidationResultPayload

```typescript
{
  filePath: string;
  isValid: boolean;
  issues: string[];              // 검증 실패 항목 목록
  manualReviewRequired: boolean;
  correctedLineItems: LineItem[];
}
```

---

## IPC 채널 목록

| 방향 | 채널 | 설명 |
|------|------|------|
| main → renderer | `agent:status-update` | 에이전트 상태 변경 브로드캐스트 |
| main → renderer | `agent:file-detected` | 파일 감지 알림 |
| main → renderer | `agent:parse-complete` | 파싱 완료 결과 |
| main → renderer | `agent:manual-review` | 수동 검토 요청 |
| renderer → main | `agent:start-wave` | Wave 시작 요청 |
| renderer → main | `agent:get-status` | 현재 상태 조회 (invoke) |
| main → renderer | `updater:update-available` | 업데이트 알림 |
| main → renderer | `updater:download-progress` | 다운로드 진행률 |
| main → renderer | `updater:update-downloaded` | 다운로드 완료 |
| renderer → main | `updater:install` | 업데이트 설치 (invoke) |

---

## 하네스 상태 머신

```
idle
  │ file-detected
  ▼
running ──────────────► done
  │                       │
  │ error                 │ addProcessedHash
  ▼                       ▼
error                  idle (waveRunning = false)
```

### AgentStatus 값

| 값 | 의미 |
|----|------|
| `idle` | 대기 중 |
| `running` | 처리 중 |
| `done` | 완료 |
| `error` | 오류 발생 |

---

## HarnessConnector 인터페이스

```typescript
interface HarnessConnector {
  executeWave(agents: AgentJob[]): Promise<WaveResult>;
  getStatus(): Promise<HarnessStatus>;
  onAgentComplete(callback: (result: AgentResult) => void): void;
  onError(callback: (error: AgentError) => void): void;
}
```

구현체:
- `LocalHarnessConnector` — Electron main process 내장, 현재 운영 구현
- `RemoteHarnessConnector` — 외부 서버 연결 stub (NotImplementedError)

선택 함수: `createHarnessConnector(localHarness?, remoteUrl?, remoteApiKey?)`

---

## 에러 처리 정책

1. ESTIMATOR 오류 → `agentStatus["ESTIMATOR"] = "error"` + `waveStatus = "failed"` + IPC status-update 브로드캐스트
2. VALIDATOR `manualReviewRequired = true` → ManualReviewQueue 적재 + `agent:manual-review` IPC 전송
3. 중복 파일 (`fileHash` 기존 처리 이력) → 즉시 무시, 파이프라인 진입 없음
4. Harness 설정 파일 손상 → DEFAULT_CONFIG 폴백, 앱 크래시 없음
