# JH BuildFlow — 보안 정책

> 최종 업데이트: 2026-04-10
> 상세 감사 결과: `docs/SECURITY_AUDIT.md`

---

## 1. 인증 / 인가

### JWT 토큰

| 항목 | 값 |
|------|-----|
| 알고리즘 | HS256 |
| 만료 시간 | 30분 (액세스 토큰) |
| 발급 | `POST /auth/token` |
| 전달 방식 | `Authorization: Bearer <token>` |

> 향후 구현: Refresh Token (7일) + Redis 블랙리스트

### 비밀번호 저장

- bcrypt 해시 (`passlib[bcrypt]`)
- 평문 비밀번호는 어떤 로그에도 기록하지 않음

---

## 2. RBAC 매트릭스

### API 엔드포인트별 접근 권한

| 리소스 | super_admin | sub_admin | site_manager | accounting | vendor |
|--------|:-----------:|:---------:|:------------:|:----------:|:------:|
| GET /vendors | ✓ | ✓ | ✓ | ✓ | ✗ |
| POST /vendors | ✓ | ✓ | ✗ | ✗ | ✗ |
| PUT /vendors/:id | ✓ | ✓ | ✗ | ✗ | 자신만 |
| GET /projects | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST /projects | ✓ | ✓ | ✓ | ✗ | ✗ |
| GET /settlements | ✓ | ✓ | ✓ | ✓ | ✗ |
| POST /settlements | ✓ | ✓ | ✓ | ✓ | ✗ |
| PUT /settlements/:id/approve | ✓ | ✗ | ✗ | ✗ | ✗ |
| GET /analytics/* | ✓ | ✓ | ✓ | ✓ | ✗ |
| POST /analytics/compute-snapshots | ✓ | ✗ | ✗ | ✗ | ✗ |

### 역할 설명

| 역할 | 설명 |
|------|------|
| `super_admin` | 최고 관리자 — 모든 작업 + 정산 승인 |
| `sub_admin` | 부관리자 — 정산 승인 제외 전체 |
| `site_manager` | 현장 관리자 — 프로젝트/발주/정산 조회·생성 |
| `accounting` | 회계 — 정산 조회, 세금계산서 처리 |
| `vendor` | 협력사 — 자신의 발주·견적·메시지만 접근 |

---

## 3. 테넌트 격리

- 모든 테이블에 `company_id UUID` 컬럼 존재
- 모든 API 쿼리에 `WHERE company_id = current_user.company_id` 필터 강제
- 타 회사 데이터 접근 시 404 반환 (존재 여부도 노출하지 않음)
- 슈퍼 관리자도 타 company_id 데이터 접근 불가

---

## 4. 파일 보안

### 업로드 정책

| 항목 | 값 |
|------|-----|
| 허용 확장자 | pdf, xlsx, xls, jpg, jpeg, png, hwp |
| 최대 파일 크기 | 50 MB |
| 저장 방식 | `{uuid4}.{ext}` — 원본 파일명 경로에 미사용 (path traversal 방지) |
| 저장 위치 | `uploads/` 디렉토리 (웹루트 밖 권장) |

### 파일 접근 제어

- 현재: `/uploads/{uuid}` 직접 서빙 (개발 환경)
- 프로덕션 권장: Nginx `internal` + API 토큰 검증 프록시 엔드포인트
- `is_internal=True` 문서: vendor 역할 접근 차단 (운영 전 TODO)

---

## 5. Electron 보안

| 설정 | 값 | 이유 |
|------|-----|------|
| `nodeIntegration` | `false` | renderer에서 Node.js 직접 접근 차단 |
| `contextIsolation` | `true` | preload 스크립트 격리 |
| `webSecurity` | `true` | 동일 출처 정책 적용 |
| preload 노출 API | 명시적 화이트리스트만 | `contextBridge.exposeInMainWorld` |

---

## 6. 감사 로그 (AuditLog)

모든 write 작업(`create`, `update`, `approve`)에 AuditLog 기록:

```json
{
  "company_id": "...",
  "actor_id": "...",
  "actor_role": "super_admin",
  "action": "vendor.update",
  "target_type": "Vendor",
  "target_id": "...",
  "before": { ... },
  "after": { ... },
  "ip_address": "...",
  "user_agent": "...",
  "created_at": "2026-04-10T00:00:00Z"
}
```

- `audit_logs` 테이블에 UPDATE/DELETE 권한 제거 권고 (운영 전 TODO)
- 민감 필드(`phone`, `business_no`) 마스킹 운영 전 적용 권고

---

## 7. 정산 결제 보호

- **자동 지급 절대 금지** — `settlements.py` 주석 및 코드 레벨 명시
- `PUT /settlements/:id/approve` — `require_roles("super_admin")` 단독 적용
- `approved_amount`, `payout_approved_by`, `payout_approved_at` 기록
- AuditLog `settlement.approve` 액션 기록

---

## 8. 보안 이벤트 응답 절차

1. 로그인 실패 5회 이상 감지 → 계정 잠금 (운영 전 TODO)
2. 비정상 company_id 접근 시도 → 즉시 403, 보안 로그 기록
3. 파일 업로드 확장자 위반 → 400 반환, 파일 저장 없음
4. JWT 만료 → 401, 클라이언트 재로그인 유도
5. DB 연결 실패 → 503 반환, 앱 크래시 없음

---

## 9. 운영 전 보안 TODO

> 상세 내용: `docs/SECURITY_AUDIT.md` — Section 3 참조

- [ ] HTTPS 강제 및 HSTS 헤더
- [ ] CORS `allow_origins` 실제 도메인 제한
- [ ] Rate Limiting (로그인, 등록 엔드포인트)
- [ ] Refresh Token + 토큰 블랙리스트
- [ ] 파일 서빙 인증 미들웨어
- [ ] `is_internal` 문서 vendor 차단
- [ ] AuditLog 테이블 UPDATE/DELETE 권한 제거
- [ ] 비밀번호 정책 강화 (8자+ 복잡도)
- [ ] 보안 이벤트 전용 로그 채널
