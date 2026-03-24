[codex] 2026-03-23 작업 메모 1
- client/는 Vite + React + TypeScript + Tailwind(vite plugin) 기반 프론트엔드로 초기화되었다.
- public/index.html 단일 파일 구조를 컴포넌트/훅/타입/상수/스타일 분리 구조로 이전했다.
- 엔트리포인트는 src/main.tsx, 라우팅 진입은 src/App.tsx, 대시보드 페이지는 src/pages/DashboardPage.tsx를 사용한다.
- 공통 디자인 토큰은 src/styles/index.css, 애니메이션은 src/styles/animations.css에서 관리한다.
