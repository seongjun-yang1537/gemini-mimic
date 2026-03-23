[codex] 2026-03-23 라우팅 분리 메모
- src/server.js는 프로세스 시작과 HTTP 서버 listen, 서비스 조립만 담당하도록 단순화했다.
- src/app/createApp.js에서 express 인스턴스 생성, 공통 미들웨어(json/static), 도메인 라우터 마운트, 에러 미들웨어 연결을 담당한다.
- src/routes/에 run/prompt/asset/settings/web 라우터를 팩토리 함수 형태로 분리해 의존성을 외부 주입받도록 구성했다.
[codex] 2026-03-23 비동기 저장소 전환 메모
- src/store/runStore.js는 fs/promises 기반으로 전환했고 readyPromise + fileAccessQueue 직렬화로 create/update/get/list/delete를 모두 async 메서드로 제공한다.
- src/services/promptService.js는 list/get/update/loadPhasePrompts를 async로 전환해 프롬프트 파일 접근을 await 기반으로 통일했다.
- src/routes/runRoutes.js, src/routes/promptRoutes.js, src/services/pipelineOrchestrator.js, src/services/pipeline/*.js 호출부를 await로 맞춰 예외가 asyncRoute/상위 catch로 일관 전파되도록 정리했다.
[codex] 2026-03-23 런타임 상수 메모
- src/config/runtimeConstants.js를 추가해 영상 세그먼트/폴링/토론/안전장치/phase timeout 하드리밋과 기본값을 중앙화했다.
- src/config/settingsDefaults.js, src/services/debateEngine.js, src/services/runSafety.js가 runtimeConstants를 import해 숫자 중복 선언을 제거했다.
