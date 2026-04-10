# QUICKSTART — Claude Code 실행 가이드

## 파일 구성

| 파일 | 용도 |
|------|------|
| MASTER_PROMPT.md | 최초 1회 투입 (프로젝트 전체 컨텍스트) |
| PROMPTS_01_05.md | 1단계~5단계 프롬프트 |
| PROMPTS_06_10.md | 6단계~10단계 프롬프트 |
| PROMPTS_11_15.md | 11단계~15단계 프롬프트 |

---

## 실행 순서

### Step 0 — 준비

```bash
# 작업 디렉토리 생성
mkdir interior-contractor-platform
cd interior-contractor-platform

# Claude Code 시작
claude
```

---

### Step 1 — 마스터 프롬프트 투입

`MASTER_PROMPT.md` 파일을 열고 ``` 안의 내용 전체를 복사해서 Claude Code 첫 메시지로 붙여넣는다.

**확인할 것:**
- 전체 폴더 트리 출력됨
- 기술스택 확정 목록 출력됨
- 15단계 개발 순서 출력됨

---

### Step 2 — 단계별 프롬프트 순서대로 투입

각 PROMPT-XX의 ``` 안 내용을 복사해서 투입한다.

```
MASTER → 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12 → 13 → 14(참조용) → 15
```

**각 단계 완료 확인 후 다음 단계 투입.**

---

### Step 3 — 각 단계 완료 확인 방법

**01 완료 확인:**
```bash
# API
cd apps/api && uvicorn main:app --reload
curl http://localhost:8000/health

# vendor-web
cd apps/vendor-web && npm run dev

# admin-desktop
cd apps/admin-desktop && npm run electron:dev
```

**02 완료 확인:**
```bash
cd apps/api
alembic upgrade head
python seed.py
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"test1234"}'
```

**03 완료 확인:**
- agent-config.json에 테스트 폴더 경로 설정
- 해당 폴더에 파일 복사
- Electron 콘솔에서 "File detected" 로그 확인

---

## 주의사항

1. **순서 절대 준수** — 03(에이전트 엔진)이 04(UI) 앞인 이유:
   UI가 IPC 채널에 의존하므로 엔진이 먼저 구현되어야 함.

2. **각 단계 완료 전 다음 단계 투입 금지**
   Claude Code가 미완성 컨텍스트 위에 쌓으면 충돌 발생.

3. **PROMPT-14는 투입용이 아님**
   재시작 시 현재 진행 단계를 Claude Code에게 알려주는 참조 문서.

4. **새 대화 시작 시**
   MASTER_PROMPT.md → PROMPT-14 순서로 투입해서 컨텍스트 복원.

---

## 환경 요구사항

| 항목 | 버전 |
|------|------|
| Node.js | 20 LTS 이상 |
| Python | 3.11 이상 |
| PostgreSQL | 15 이상 |
| Windows | 11 x64 (Electron 빌드 타겟) |

---

## 폴더 구조 최종 확인

```
interior-contractor-platform/
├── apps/
│   ├── admin-desktop/     ← Electron + React (관리자 데스크톱)
│   ├── vendor-web/        ← Next.js (협력사 포털 + 관리자 PWA)
│   └── api/               ← FastAPI
├── packages/
│   ├── shared-types/
│   ├── agent-protocols/
│   └── ui/
└── infra/
    └── docs/
```
