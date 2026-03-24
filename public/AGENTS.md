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
[codex] 2026-03-23 추가 메모 5
- 사용자 요청으로 public/index.html을 Hello World 단일 페이지로 교체했고, 나머지 public 정적 페이지/스타일 파일을 제거했다.
[codex] 2026-03-23 추가 메모 6
- public/index.html을 Mimic 단일 컬럼 대시보드 레이아웃으로 재구성해 헤더/입력 컴포저/탭·상태 요약/태스크 리스트를 한 화면에서 동작하도록 구현했다.
- 태스크 행에 phase ring(진행률 arc + 공전 dot), 전문가 pulse dot, 4단계 phase track, 비용/토큰 포맷, 상태 badge를 추가하고 640px 이하에서는 phase track/비용 영역을 숨기도록 반응형 처리했다.
- 입력 컴포저는 Enter 전송·Shift+Enter 줄바꿈·최대 3개 첨부·파일 칩 제거·모델/토론 라운드 pill 토글을 지원하며 전송 시 running 상태 태스크를 목록 최상단에 추가한다.
[codex] 2026-03-23 추가 메모 7
- public/index.html 입력 컴포저를 첨부 프리뷰 카드(104x88), 동영상 썸네일 캡처, 타입별 @태그 자동 부여(@영상N/@이미지N), 제거 시 태그 재정렬 로직으로 확장했다.
- textarea에서 @ 입력 시 현재 첨부 목록 기반 자동완성 드롭다운을 노출하고 방향키/엔터 선택으로 태그를 삽입하도록 반영했다.
- 태스크 생성 시 attachments 메타데이터(tag/filename/type/thumbnailUrl)를 run 항목에 포함하도록 대시보드 상태 모델을 확장했다.
[codex] 2026-03-23 추가 메모 8
- public/index.html 헤더 우측의 API/비용 요약을 제거해 상단 우측 영역을 비우고, 입력 컴포저 하단 툴바는 [+ 첨부]와 전송 버튼만 남기도록 단순화했다.
- 탭 바를 작업/프롬프트/에셋/설정 4개로 고정하고 상태 요약 pill 영역을 제거했으며, 480px 이하에서 첨부 프리뷰 카드를 80x68로 축소하도록 반응형 규칙을 추가했다.
[codex] 2026-03-23 추가 메모 9
- public/index.html의 입력 textarea를 contentEditable 기반 prompt-editor로 교체하고, @자동완성 선택 시 inline 비편집 tag-chip(span[data-tag][data-type])을 삽입하도록 갱신했다.
- 첨부 제거 시 해당 tag-chip 자동 삭제 및 남은 첨부의 @태그 재인덱싱에 맞춰 chip 라벨/데이터 동기화를 적용했다.
- 전송 텍스트는 contentEditable DOM에서 chip의 data-tag를 포함한 플레인 텍스트로 복원(getEditorPlainText)해 run input으로 저장한다.
[codex] 2026-03-24 추가 메모 10
- public/index.html 탭 영역의 프롬프트 개수 뱃지를 정적 13에서 동적 카운트로 변경하고 초기값은 0으로 설정했다.
- 클라이언트 스크립트에 refreshPromptsCount를 추가해 /api/prompts 응답 길이를 뱃지에 반영하고, 응답 실패 시 0을 표시한다.

[codex] 2026-03-24 추가 메모 11
- public/config.js를 추가해 commitHash를 전역 설정(window.APP_CONFIG)으로 분리했다.
- public/index.html 헤더 우측에 build 해시 라벨을 추가하고 config.js 값으로 동적 렌더링되도록 반영했다.

[codex] 2026-03-24 추가 메모 12
- public/config.js의 commitHash는 수동 수정 대신 npm prestart/predev에서 실행되는 sync-build-hash 스크립트로 자동 갱신된다.
[codex] 2026-03-24 추가 메모 11
- public/index.html 입력 에디터 keydown 처리에서 Enter 단축 전송(createTaskFromInput)을 제거해 Enter 기본 동작이 줄바꿈으로만 동작하도록 변경했다.
- 전송은 우측 전송 버튼 클릭으로만 실행되며, 자동완성 드롭다운이 열려 있을 때 Enter 후보 선택 동작은 유지된다.
[codex] 2026-03-24 추가 메모 12
- public/index.html 입력 에디터 단축키를 조정해 `Enter`는 기본 줄바꿈만 수행하고, `Alt+Enter`에서만 `createTaskFromInput` 제출이 실행되도록 변경했다.
- 자동완성 드롭다운이 열려 있을 때도 `Alt+Enter`는 후보 선택보다 제출을 우선 처리하며, 일반 `Enter`의 후보 선택 동작은 유지된다.
[codex] 2026-03-24 추가 메모 13
- public/index.html 탭 바에서 프롬프트 카운트 뱃지와 /api/prompts 연동 카운트 갱신 로직(refreshPromptsCount)을 제거했다.
- 프롬프트 탭은 숫자 없이 텍스트만 표시해 실제 콘텐츠 미구현 상태에서 오해를 줄이도록 정리했다.
- public/run.html 모니터링 전용 화면을 복구해 `/run/:id`로 진입 시 대시보드와 다른 UI를 렌더링하도록 구성했다.
- public/result.html 결과 전용 화면을 추가해 `/run/:id/result`에서 run 식별자 기반 결과 뷰를 분리했다.
[codex] 2026-03-24 추가 메모 14
- public/index.html 헤더의 상단 내비게이션 라벨(대시보드/프롬프트/에셋/설정)을 제거해 브랜드 텍스트만 노출되도록 정리했다.

[codex] 2026-03-24 추가 메모 15
- public/index.html을 인라인 구현 없이 React 마운트용 최소 엔트리 문서로 치환했다.
