[codex] 2026-03-23 작업 메모
- 현재 저장소는 Node.js 기반이며 서버 진입점은 src/server.js를 사용한다.
- API는 Express + WebSocket(ws) 기반으로 /api/run, /api/prompts, /ws/run/:id 경로를 제공한다.
- 실행 기록은 outputs/runs.json 파일에 저장된다.
- 프롬프트 파일은 prompts/<phase>/*.md 구조로 관리한다.
- taurus/api.js 모듈을 백엔드에서 import하여 Veo 생성 로직을 재사용한다.
- 정적 UI 파일은 public/ 아래에서 제공한다.
