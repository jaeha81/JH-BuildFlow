# JH BuildFlow CLAUDE.md

## 글로벌 지침 상속
이 프로젝트는 JH 글로벌 지침(`~/.claude/CLAUDE.md`)을 따른다.
**research.md → plan.md → 승인 → 구현**

---

## 프로젝트 개요

- **목적**: 인테리어 공사 협력사 발주·견적·정산 플랫폼
- **위치**: `D:\ai프로젝트\JH BuildFlow`
- **구조**: 모노레포 (Electron + Next.js + FastAPI)

## 앱 구조

| 앱 | 스택 | 설명 |
|----|------|------|
| `apps/admin-desktop` | Electron 31 + React 18 + TypeScript | Windows 설치형 관리자 앱 |
| `apps/vendor-web` | Next.js 14 + TypeScript | 협력사 포털 + 관리자 PWA |
| `apps/api` | FastAPI + Python 3.11 + PostgreSQL 15 | REST API + DB |
| `packages/shared-types` | TypeScript | 전체 공유 타입 |
| `packages/ui` | React + TypeScript | 공유 UI 컴포넌트 |

## 개발 실행 순서

```bash
# 1. API 서버 (port 8000)
cd apps/api
python -m venv .venv && .venv/Scripts/activate
pip install -r requirements.txt
uvicorn main:app --reload

# 2. vendor-web (port 3000)
cd apps/vendor-web && npm install && npm run dev

# 3. admin-desktop
cd apps/admin-desktop && npm install && npm run dev
```

## 핵심 원칙

- 모노레포 의존성 변경 시 `packages/shared-types` 먼저 수정
- DB 스키마 변경은 사용자 승인 필수
- Electron + Next.js 동시 실행 포트 충돌 주의 (3000 / 8000)
