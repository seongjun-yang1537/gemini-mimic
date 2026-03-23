[codex] 2026-03-23 작업 메모
- 현재 저장소는 Node.js 기반이며 서버 진입점은 src/server.js를 사용한다.
- API는 Express + WebSocket(ws) 기반으로 /api/run, /api/prompts, /ws/run/:id 경로를 제공한다.
- 실행 기록은 outputs/runs.json 파일에 저장된다.
- 프롬프트 파일은 prompts/<phase>/*.md 구조로 관리한다.
- taurus/api.js 모듈을 백엔드에서 import하여 Veo 생성 로직을 재사용한다.
- 정적 UI 파일은 public/ 아래에서 제공한다.
[codex] 2026-03-23 추가 메모 2
- 정적 라우팅은 /run/:id, /run/:id/result, /prompts 경로를 사용하고 각각 public/run.html, public/result.html, public/prompts.html을 반환한다.
- 대시보드 실행 목록에서 모니터링(/run/:id)과 결과(/run/:id/result) 화면으로 바로 이동할 수 있다.
- run.html은 전문가 패널/토론 로그/정리 결과/미디어 프리뷰를 분리해 WebSocket 이벤트를 실시간 반영한다.
[codex] 2026-03-23 추가 메모 3
- Gemini API 키 로딩은 src/config/environment.js에서 .env(프로젝트 루트) 기준으로 중앙 관리한다.
- 서버 시작 시 GeminiClient 생성 전에 GEMINI_API_KEY 존재 여부를 검증하고, 누락 시 .env 설정 안내 오류를 반환한다.
