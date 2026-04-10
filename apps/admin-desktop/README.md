# admin-desktop — 관리자 데스크톱 앱

Electron 31 + React 18 + TypeScript + Tailwind CSS

Windows 11 x64 설치형 데스크톱 앱. 로컬 공사 관리 폴더 감시, 자료 분류, 에이전트 엔진 내장.

## 실행 명령

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env

# 3. 개발 모드 (renderer + main 동시 실행)
npm run dev

# 4. 별도 터미널에서 Electron 실행
npm run electron
```

## 빌드

```bash
# 배포용 빌드 (NSIS 설치파일 + Portable exe)
npm run build:electron
# → release/ 폴더에 생성
```

## 환경변수

| 변수명 | 기본값 | 설명 |
|--------|--------|------|
| VITE_API_URL | http://localhost:8000 | FastAPI 서버 주소 |
| VITE_APP_TITLE | JH BuildFlow 관리자 | 앱 타이틀 |

## 주요 구조

```
src/
  main/           ← Electron main process (IPC, 파일시스템)
  renderer/       ← React UI (Vite)
  agent-engine/   ← Harness + 6개 에이전트
  shared/         ← main-renderer 공유 타입
```
