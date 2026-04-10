# 시스템 아키텍처

최종 업데이트: 2026-04-10

## 전체 구조

```
로컬 PC (Windows 11)
├── admin-desktop (Electron)
│   ├── renderer (React 18, port 5173 dev)
│   ├── main process (Node.js, IPC)
│   └── agent-engine
│       ├── Harness (Wave 제어)
│       └── SCANNER → CLASSIFIER → PACKAGER → ESTIMATOR → VALIDATOR → REPORTER
│
서버 (VPS/Cloud)
├── api (FastAPI, port 8000)
│   └── PostgreSQL 15
└── vendor-web (Next.js, port 3000)
    ├── 협력사 포털
    └── 관리자 PWA (/admin/*)
```

## 기술스택 최종 확정

| 구분 | 기술 | 버전 |
|------|------|------|
| 데스크톱 | Electron | 31+ |
| 프론트엔드 | React | 18 |
| 웹 | Next.js | 14 |
| 언어 | TypeScript | 5.4 |
| API | FastAPI | 0.111 |
| 언어 | Python | 3.11 |
| ORM | SQLAlchemy | 2.0 |
| 마이그레이션 | Alembic | 1.13 |
| DB | PostgreSQL | 15 |
| 스타일 | Tailwind CSS | 3.4 |
| 파일감시 | chokidar | 3.6 |
| PDF파싱 | pdfjs-dist | 4.2 |
| Excel파싱 | xlsx | 0.18 |
| 인증 | JWT (HS256) | — |

## 데이터 흐름

1. 로컬 PC 공사 폴더에 파일 저장
2. SCANNER 감지 → 파일 해시 중복 체크
3. CLASSIFIER 태깅 (공종/문서유형/프로젝트)
4. PACKAGER 협력사별 발주 자료 세트 생성
5. ESTIMATOR 견적 파싱 (PDF/Excel)
6. VALIDATOR 검증 → 수동 보정 큐 분류
7. REPORTER 결과 리포트 생성
8. API 서버 DB 동기화

## 관련 페이지

- [known-issues.md](known-issues.md)
