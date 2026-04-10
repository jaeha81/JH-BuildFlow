# JH BuildFlow — 인테리어 공사 협력사 발주·견적·정산 플랫폼

## 시스템 구조

| 앱 | 기술스택 | 설명 |
|----|---------|------|
| `apps/admin-desktop` | Electron 31 + React 18 + TypeScript | Windows 설치형 관리자 앱, 에이전트 엔진 내장 |
| `apps/vendor-web` | Next.js 14 + TypeScript | 협력사 포털 + 관리자 PWA (role 분기) |
| `apps/api` | FastAPI + Python 3.11 + PostgreSQL 15 | REST API + DB |
| `packages/shared-types` | TypeScript | 전체 공유 타입 |
| `packages/agent-protocols` | TypeScript | 에이전트 통신 인터페이스 |
| `packages/ui` | React + TypeScript | 공유 UI 컴포넌트 |

## 실행 순서

```bash
# 1. API 서버 (port 8000)
cd apps/api
python -m venv .venv && .venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env  # .env 편집 필요
uvicorn main:app --reload --port 8000

# 2. 협력사 웹 포털 (port 3000)
cd apps/vendor-web
npm install
cp .env.example .env.local
npm run dev

# 3. 관리자 데스크톱 앱 (Electron)
cd apps/admin-desktop
npm install
cp .env.example .env
npm run dev
# 별도 터미널에서:
npm run electron
```

## 완료 기준 확인

```bash
# API 헬스체크
curl http://localhost:8000/health
# → {"status":"ok","timestamp":"..."}

# 협력사 포털
# 브라우저에서 http://localhost:3000 → "협력사 포털" 텍스트 확인

# Electron
# 앱 창 뜨고 "관리자 대시보드 로딩 중" 화면 확인
```

## 에이전트 파이프라인

```
SCANNER → CLASSIFIER → PACKAGER → ESTIMATOR → VALIDATOR → REPORTER
```

- **Harness**: Wave 단위 실행 제어, 충돌 방지
- 위치: `apps/admin-desktop/src/agent-engine/`
