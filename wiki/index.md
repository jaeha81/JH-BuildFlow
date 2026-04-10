# JH BuildFlow Wiki

인테리어 공사 협력사 발주·견적·정산 플랫폼

## 페이지 목록

| 파일 | 설명 | 상태 |
|------|------|------|
| [architecture.md](architecture.md) | 시스템 아키텍처 전체 | 작성 중 |
| [known-issues.md](known-issues.md) | 버그/보완사항 | 활성 |

## docs/ 문서 (PROMPT-15 생성)

| 파일 | 설명 |
|------|------|
| [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) | 전체 시스템 다이어그램 + 컴포넌트 역할 + 확장 포인트 |
| [docs/AGENT_PROTOCOL.md](../docs/AGENT_PROTOCOL.md) | 에이전트 메시지 인터페이스 명세 + IPC 채널 목록 |
| [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) | 로컬 개발 → 스테이징 → 프로덕션 배포 순서 |
| [docs/SECURITY.md](../docs/SECURITY.md) | 보안 정책, RBAC 매트릭스, 파일 접근 제어 |
| [docs/SECURITY_AUDIT.md](../docs/SECURITY_AUDIT.md) | PROMPT-13 보안 감사 결과 (FAIL/WARNING/TODO) |

## 조회 가이드

- 전체 구조/기술스택 → `docs/ARCHITECTURE.md`
- 에이전트 파이프라인/IPC → `docs/AGENT_PROTOCOL.md`
- 배포 방법 → `docs/DEPLOYMENT.md`
- 보안 정책/RBAC → `docs/SECURITY.md`
- 버그/에러 → `known-issues.md`
