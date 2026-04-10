# PROMPT-13 보안 감사 보고서

> 작성일: 2026-04-10
> 대상: apps/api (FastAPI), apps/admin-desktop (Electron), apps/vendor-web (Next.js)

---

## 1. 항목별 점검 결과 표

### [접근 제어]

| 항목 | 판정 | 이유 |
|------|------|------|
| RBAC 누락 엔드포인트 존재 여부 | **FAIL** | `GET /vendors` — vendor 역할 접근 가능 (A2) |
| tenant company_id 분리 미적용 쿼리 | PASS | 전체 쿼리에 `company_id` 필터 적용 확인 |
| 관리자 전용 Electron IPC 채널 role 검증 누락 | PASS | IPC 채널은 Electron main process 내에서만 실행, 외부 노출 없음 |
| 협력사가 다른 협력사 데이터에 접근 가능한 경로 | **FAIL** | `PUT /vendors/:id` — vendor가 타 업체 수정 가능 (A1) |
| 파일 URL 직접 접근 시 권한 검증 | **WARNING** | `/uploads/{uuid}.ext` 인증 없이 직접 접근 가능 (W1) |

### [데이터 보호]

| 항목 | 판정 | 이유 |
|------|------|------|
| 민감 정보 응답 마스킹 필요 구간 | **WARNING** | AuditLog `after` 필드에 연락처·사업자번호 평문 저장 (W4) |
| AuditLog 누락 write 작업 목록 | PASS | create/update/approve 전 작업에 `write_audit()` 호출 확인 |
| 자동 지급 경로 잔존 여부 | PASS | `settlements.py` 주석 "자동 지급 절대 금지" + approve 엔드포인트 수동 처리만 존재 |
| Settlement approve: super_admin 외 접근 여부 | PASS | `require_roles("super_admin")` 단독 적용 확인 |

### [파일 보안]

| 항목 | 판정 | 이유 |
|------|------|------|
| 업로드 확장자/용량 제한 적용 여부 | PASS | `ALLOWED_EXTENSIONS` + `MAX_FILE_SIZE = 50MB` 적용 확인 |
| 파일명 sanitize 적용 여부 (path traversal 방지) | PASS | `uuid.uuid4().hex + ext`로 저장 — 원본 파일명 경로에 미사용 |
| is_internal=true 문서의 협력사 노출 차단 여부 | **WARNING** | 문서 서빙 시 `is_internal` 체크 없음 (W3) |
| 임시 업로드 파일 정리 로직 | **WARNING** | 파싱 실패 시 업로드 파일 미삭제 (W2) |

### [Electron 보안]

| 항목 | 판정 | 이유 |
|------|------|------|
| nodeIntegration: false | PASS | `main/index.ts` webPreferences 확인 |
| contextIsolation: true | PASS | `main/index.ts` webPreferences 확인 |
| IPC 채널 화이트리스트 검증 | PASS | preload.ts에서 명시적 채널 노출만 허용 |
| 원격 URL 로드 방지 (webSecurity) | PASS | `webSecurity: true` 설정 확인 |
| preload 스크립트 불필요한 API 노출 | PASS | agent IPC + updater IPC만 노출, node fs/path 등 미노출 |

### [운영]

| 항목 | 판정 | 이유 |
|------|------|------|
| 에러 로그와 사용자 로그 분리 여부 | **WARNING** | 보안 이벤트(로그인 실패 등)가 app 로그와 혼재 (W5) |
| API 서버 다운 시 Electron 앱 offline graceful degradation | PASS | React Query 캐시 + fetch 에러 핸들러 존재 |
| 로컬 agent-state.json 손상 시 복구 전략 | PASS | Harness 시작 시 파일 없으면 초기화 로직 존재 |
| DB 연결 실패 시 API 응답 방식 | PASS | SQLAlchemy async pool 예외 → 500 반환, 앱 크래시 없음 |

---

## 2. FAIL 항목 수정 코드

### A1 수정 — `PUT /vendors/:id` 자기 업체만 수정 (`apps/api/app/routers/vendors.py`)

```python
vendor = await _get_vendor_or_404(db, vendor_id, current_user.company_id)
# SECURITY: vendor 역할은 이메일이 일치하는 자신의 업체만 수정 가능
if current_user.role == "vendor" and vendor.email != current_user.email:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="자신의 업체 정보만 수정할 수 있습니다."
    )
```

### A2 수정 — `GET /vendors` 관리자 전용 (`apps/api/app/routers/vendors.py`)

```python
ADMIN_ROLES = ("super_admin", "sub_admin", "site_manager", "accounting")

@router.get("", response_model=list[VendorResponse])
async def list_vendors(
    ...
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),  # vendor role 차단
```

---

## 3. WARNING 항목 수정 방안 문서화

| ID | 문제 | 수정 방안 |
|----|------|----------|
| W1 | `/uploads/{uuid}` 직접 접근 가능 | Nginx `internal` + `GET /files/{uuid}` 토큰 검증 프록시 엔드포인트 추가 |
| W2 | 파싱 실패 시 임시 파일 미삭제 | `save_upload()` 반환값을 try/except로 감싸고 파싱 실패 시 `Path(file_url).unlink(missing_ok=True)` 호출 |
| W3 | `is_internal` 문서 협력사 접근 | 문서 서빙 엔드포인트에 `if doc.is_internal and current_user.role == "vendor": raise 403` 추가 |
| W4 | AuditLog 민감 정보 평문 | AuditLog 저장 전 `after` dict에서 `phone`, `business_no` 필드를 `***` 마스킹 |
| W5 | 보안 이벤트 로그 미분리 | Python `logging.getLogger("security")` 별도 핸들러(파일/Slack) 추가 |

---

## 4. 운영 전 필수 TODO 목록

### 인프라 / 배포

- [ ] **HTTPS 강제**: Nginx / LB에서 HTTP→HTTPS 리다이렉트
- [ ] **CORS 출처 제한**: `main.py` `allow_origins=["*"]` → 실제 도메인만 허용
- [ ] **Rate Limiting**: `/auth/login`, `/vendors/register`에 slowapi IP별 제한 (5req/min)
- [ ] **업로드 디렉토리 격리**: `uploads/` 웹루트 밖 이동 + Nginx internal 프록시 서빙
- [ ] **시크릿 관리**: `SECRET_KEY`, DB 패스워드를 AWS SSM / Vault로 이전
- [ ] **DB SSL 강제**: async engine URL에 `?ssl=require` 추가

### 인증 / 권한

- [ ] **Refresh Token 구현**: 액세스 토큰 30분 + 리프레시 7일 구조
- [ ] **비밀번호 정책 강화**: 최소 8자, 대소문자+숫자+특수문자 조합 강제
- [ ] **토큰 블랙리스트**: Redis 또는 DB 기반 로그아웃 처리
- [ ] **vendor 이메일 인증**: `POST /vendors/register` 후 이메일 인증 단계 추가

### 파일 보안

- [ ] **파일 매직 바이트 검증**: `python-magic`으로 실제 MIME 타입 검증
- [ ] **HWP 격리 처리**: HWP 파싱을 Docker 격리 환경에서 수행
- [ ] **업로드 파일 TTL**: 60일 이상 미참조 파일 자동 삭제 스케줄러

### 감사 / 모니터링

- [ ] **보안 이벤트 로그 분리**: 로그인 실패 5회 이상 → Slack 알림
- [ ] **AuditLog DB 권한**: `audit_logs` 테이블에 UPDATE/DELETE DB 권한 제거
- [ ] **민감 정보 마스킹**: AuditLog `after` JSON에서 연락처·사업자번호 마스킹

---

## 5. 향후 고도화 권고

| 우선순위 | 항목 | 기대 효과 |
|---------|------|----------|
| 높음 | Refresh Token + 블랙리스트 | 탈취 토큰 즉시 무효화 |
| 높음 | 파일 서빙 인증 미들웨어 | 내부 문서 URL 직접 접근 차단 |
| 중간 | slowapi Rate Limiting | 브루트포스 / DoS 방어 |
| 중간 | CSP 헤더 (vendor-web) | XSS 공격 표면 감소 |
| 중간 | SAST 파이프라인 (bandit + semgrep) | CI에서 보안 취약점 자동 탐지 |
| 낮음 | HWP 격리 파싱 서비스 분리 | 악성 HWP 매크로 격리 |
| 낮음 | IP geo-fencing (관리자 페이지) | 해외 접근 차단 |
