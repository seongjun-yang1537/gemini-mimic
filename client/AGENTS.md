[codex] 2026-03-23 작업 메모 1
- client/는 Vite + React + TypeScript + Tailwind(vite plugin) 기반 프론트엔드로 초기화되었다.
- public/index.html 단일 파일 구조를 컴포넌트/훅/타입/상수/스타일 분리 구조로 이전했다.
- 엔트리포인트는 src/main.tsx, 라우팅 진입은 src/App.tsx, 대시보드 페이지는 src/pages/DashboardPage.tsx를 사용한다.
- 공통 디자인 토큰은 src/styles/index.css, 애니메이션은 src/styles/animations.css에서 관리한다.
[codex] 2026-03-24 추가 메모 2
- 대시보드 라우팅을 분리해 `/`는 production 데이터 모드(초기 빈 작업 목록), `/debug`는 mock 데이터 모드로 렌더링하도록 `client/src/App.tsx`와 `DashboardPage`를 갱신했다.
- 작업 데이터 훅을 `useTasksFromAPI`(초기 빈 배열, 로컬 prepend)와 `useTasksFromMock`(기본 3건 + 상태별 추가/리셋)로 분리했고, 디버그 전용 툴바(`client/src/debug/DebugToolbar.tsx`)를 추가했다.
- `client/src/debug/mockTasks.ts`에 running/completed/failed 대표 작업 3건을 정의하고, 작업 카드 타입을 `currentPhase`, `phaseStatuses`, `costUsd`, `tokenCount`, `statusLabel`, `expertDots` 구조로 정규화했다.
- 작업 빈 상태 문구를 "아직 작업이 없습니다 / 아래 입력창에서 밈 영상을 첨부하고 실행하세요" 2줄로 고정하고 최소 높이 200px 중앙 정렬 스타일을 적용했다.
[codex] 2026-03-24 추가 메모 3
- 대시보드 입력창(`client/src/pages/DashboardPage.tsx`)의 키보드 동작을 조정해 `Enter`는 줄바꿈으로 유지하고, `Alt+Enter`에서만 `handleSend`를 호출해 태스크가 생성되도록 변경했다.
- 자동완성 드롭다운이 열려 있을 때도 `Alt+Enter`는 태스크 생성 우선으로 처리하고, 일반 `Enter`는 기존처럼 자동완성 후보 선택에 사용된다.
[codex] 2026-03-24 추가 메모 4
- `client/src/App.tsx`에 Run 상세 라우트(`/run/:id`, `/debug/run/:id`)를 추가하고, `RunDetailPage`를 신규 도입해 Task 상세 화면 진입 경로를 연결했다.
- `client/src/styles/index.css`에 run-detail 전용 레이아웃/섹션/탭/스테퍼/생성물 아이콘 스타일을 추가해 360px 좌측 패널 + 우측 콘텐츠 구조와 모바일 토글 동작을 반영했다.
