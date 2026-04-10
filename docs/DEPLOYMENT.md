# JH BuildFlow — 배포 가이드

> 최종 업데이트: 2026-04-10

---

## 환경 구성

| 환경 | API 서버 | 관리자 앱 | 협력사 웹 |
|------|---------|---------|---------|
| 로컬 개발 | http://localhost:8000 | Electron dev mode | http://localhost:3000 |
| 스테이징 | https://api-staging.your-domain.com | portable.exe (staging .env) | https://vendor-staging.your-domain.com |
| 프로덕션 | https://api.your-domain.com | setup.exe (release) | https://vendor.your-domain.com |

---

## 1. 로컬 개발 환경

### 사전 요구사항

- Node.js 20+
- Python 3.11+
- PostgreSQL 14+

### 설치 및 실행

```bash
# 루트에서 전체 의존성 설치
npm install

# API 서버 (가상환경 활성화 후)
cd apps/api
pip install -r requirements.txt
cp .env.example .env        # DB URL, SECRET_KEY 설정
alembic upgrade head         # 마이그레이션
python -m uvicorn app.main:app --reload --port 8000

# 관리자 데스크톱 (별도 터미널)
cd apps/admin-desktop
npm run electron:dev

# 협력사 웹 (별도 터미널)
cd apps/vendor-web
npm run dev
```

### 시드 데이터

```bash
cd apps/api
python -m app.seed          # 기본 회사, 관리자 계정, 샘플 데이터 생성
# 기본 계정: admin@jh.com / password123
```

---

## 2. 스테이징 배포

### API 서버 (Docker)

```dockerfile
# apps/api/Dockerfile (예시)
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t jh-buildflow-api ./apps/api
docker run -d \
  -e DATABASE_URL=postgresql+asyncpg://... \
  -e SECRET_KEY=staging-secret \
  -p 8000:8000 \
  jh-buildflow-api
```

### 협력사 웹 (Vercel / Nginx)

```bash
cd apps/vendor-web
NEXT_PUBLIC_API_URL=https://api-staging.your-domain.com npm run build
# Vercel: vercel --prod
# Nginx: 빌드 결과를 /var/www/vendor-web으로 복사
```

### 관리자 앱 스테이징 빌드

```bash
cd apps/admin-desktop
cp .env.staging .env
VITE_API_BASE_URL=https://api-staging.your-domain.com npm run electron:build:portable
# dist/portable.exe → 테스터에게 배포
```

---

## 3. 프로덕션 배포

### API 서버 권장 구성

```
인터넷 → Nginx (HTTPS, rate-limiting) → Uvicorn (Unix socket)
                                      ↓
                               PostgreSQL 14+ (SSL 강제)
```

필수 환경변수:

```env
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/jh_buildflow?ssl=require
SECRET_KEY=<256bit 랜덤 키>
ALLOWED_ORIGINS=https://vendor.your-domain.com
UPLOAD_DIR=/var/data/uploads
```

### 관리자 앱 프로덕션 빌드

```bash
cd apps/admin-desktop

# 환경변수 설정
export APP_PRODUCT_NAME="JH BuildFlow 관리자"
export APP_ID="com.jh.contractor-platform"
export VITE_API_BASE_URL="https://api.your-domain.com"
export UPDATE_SERVER_URL="https://update.your-domain.com"  # 자동 업데이트 서버

# 아이콘 준비 (필수)
# assets/icon.png — 512×512 PNG

# 코드 서명 (선택, Windows Authenticode)
# export WIN_CERT_FILE=path/to/cert.p12
# export WIN_CERT_PASSWORD=...

npm run electron:build
# 출력: dist/setup.exe (NSIS 설치), dist/portable.exe (포터블)
```

### 자동 업데이트 서버 설정

electron-updater는 `UPDATE_SERVER_URL`이 설정된 경우에만 활성화됩니다.

서버 구조 (generic provider):
```
https://update.your-domain.com/
  ├── latest.yml          # 최신 버전 메타데이터
  └── setup.exe           # 최신 설치 파일
```

`latest.yml` 형식:
```yaml
version: 1.2.0
files:
  - url: setup.exe
    sha512: <base64 sha512>
    size: 12345678
path: setup.exe
sha512: <base64 sha512>
releaseDate: '2026-04-10T00:00:00.000Z'
```

---

## 4. 마이그레이션

```bash
# 새 마이그레이션 생성
cd apps/api
alembic revision --autogenerate -m "설명"

# 마이그레이션 적용
alembic upgrade head

# 롤백 (1단계)
alembic downgrade -1
```

---

## 5. 배포 체크리스트

### API

- [ ] `SECRET_KEY` 환경변수 설정 (최소 32자 랜덤)
- [ ] `DATABASE_URL` SSL 파라미터 포함
- [ ] `ALLOWED_ORIGINS` 실제 도메인만 허용
- [ ] HTTPS 인증서 설정 (Let's Encrypt 권장)
- [ ] `uploads/` 디렉토리 웹루트 밖 배치
- [ ] alembic 마이그레이션 적용 확인

### 관리자 앱

- [ ] `assets/icon.png` (512×512) 배치
- [ ] `VITE_API_BASE_URL` 프로덕션 API URL 설정
- [ ] 빌드 후 `dist/setup.exe` 크기 확인 (정상 범위: 80~150MB)
- [ ] portable.exe 실행 테스트 (API 연결 확인)

### 협력사 웹

- [ ] `NEXT_PUBLIC_API_URL` 프로덕션 API URL 설정
- [ ] HTTPS 설정
- [ ] CSP 헤더 설정
