# API — Interior Contractor Platform

FastAPI + PostgreSQL 15 + SQLAlchemy + Alembic

## 실행 명령

```bash
# 1. 가상환경 생성
python -m venv .venv
source .venv/Scripts/activate  # Windows: .venv\Scripts\activate

# 2. 의존성 설치
pip install -r requirements.txt

# 3. 환경변수 설정
cp .env.example .env
# .env 파일을 편집해서 DATABASE_URL, SECRET_KEY 설정

# 4. DB 마이그레이션
alembic upgrade head

# 5. 서버 실행
uvicorn main:app --reload --port 8000
```

## 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | /health | 헬스체크 |
| GET | /docs | Swagger UI |
| GET | /redoc | ReDoc |

## 환경변수

| 변수명 | 기본값 | 설명 |
|--------|--------|------|
| DATABASE_URL | — | PostgreSQL 접속 URL |
| SECRET_KEY | — | JWT 서명 키 (32자 이상) |
| ALGORITHM | HS256 | JWT 알고리즘 |
| ACCESS_TOKEN_EXPIRE_MINUTES | 15 | Access token 만료(분) |
| REFRESH_TOKEN_EXPIRE_DAYS | 7 | Refresh token 만료(일) |
| APP_PORT | 8000 | 서버 포트 |
