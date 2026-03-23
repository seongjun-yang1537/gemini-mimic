[codex] 2026-03-23 UI 작업 메모
- public/ 하위 정적 페이지 변경 시 라이트 테마 토큰(public/styles.css)과 일관된 톤을 유지하고 상태/오류/진행중 표현을 사용자에게 즉시 인지 가능하게 구성한다.
- run.html은 실시간 모니터링 화면이므로 진행중 애니메이션, 취소/실패/완료 상태 전환, WebSocket 이벤트 기반 로그 반영의 가시성을 우선한다.
[codex] 2026-03-23 run 모니터링 개선 메모
- run.html에 상태 탑바(스피너/펄스/상태 라벨)를 추가해 파이프라인 진행중 여부를 시각적으로 강조했다.
- run.html의 실행 취소 버튼은 /api/run/:id/cancel 호출 후 UI 상태를 cancelling/cancelled로 전환하고 취소 메시지를 로그에도 남긴다.
[codex] 2026-03-23 추가 메모 3
- public/index.html 실행 입력 영역을 하단 고정 Prompt Input Bar 레이아웃으로 교체하고 첨부 스트립/드래그앤드롭/📎 드롭다운을 추가했다.
- 서버 드라이브 선택 모달을 index에 포함해 헤더 검색(300ms debounce), 브레드크럼, 정렬/필터/뷰 전환, 파일 선택 후 첨부 반영 플로우를 구현했다.
[codex] 2026-03-23 추가 메모 4
- public/index.html 실행 목록 상태 뱃지 렌더링에 isRunActive(created/queued/running/cancelling) 판별을 추가해 진행 중 실행만 radial 애니메이션 클래스를 부여한다.
- public/styles.css에 .badge-radial-progress와 radial-spin/radial-pulse 키프레임을 추가해 실행 중 상태 뱃지 주변에 원형 진행 애니메이션을 표시한다.
