[codex] 2026-03-23 라우팅 분리 메모
- src/server.js는 프로세스 시작과 HTTP 서버 listen, 서비스 조립만 담당하도록 단순화했다.
- src/app/createApp.js에서 express 인스턴스 생성, 공통 미들웨어(json/static), 도메인 라우터 마운트, 에러 미들웨어 연결을 담당한다.
- src/routes/에 run/prompt/asset/settings/web 라우터를 팩토리 함수 형태로 분리해 의존성을 외부 주입받도록 구성했다.
[codex] 2026-03-23 비동기 저장소 전환 메모
- src/store/runStore.js는 fs/promises 기반으로 전환했고 readyPromise + fileAccessQueue 직렬화로 create/update/get/list/delete를 모두 async 메서드로 제공한다.
- src/services/promptService.js는 list/get/update/loadPhasePrompts를 async로 전환해 프롬프트 파일 접근을 await 기반으로 통일했다.
- src/routes/runRoutes.js, src/routes/promptRoutes.js, src/services/pipelineOrchestrator.js, src/services/pipeline/*.js 호출부를 await로 맞춰 예외가 asyncRoute/상위 catch로 일관 전파되도록 정리했다.
[codex] 2026-03-23 비용 단가 주입 메모
- src/config/environment.js에서 COST_INPUT_RATE_PER_TOKEN, COST_OUTPUT_RATE_PER_TOKEN 환경변수를 숫자로 파싱해 source(env/unset/invalid) 메타와 함께 로딩한다.
- src/config/pricingTable.js를 추가해 gemini.model 기준 토큰 단가 선택 로직(resolveGeminiTokenRates)과 fallback 단가(기존 하드코드 값)를 중앙화했다.
- src/services/pipelineOrchestrator.js는 생성자 의존성(costRateConfig)과 runtimeConfig.gemini.model을 함께 사용해 CostTracker 초기화 단가를 결정한다.
- src/server.js는 서버 시작 시 단가 환경변수 미설정/오류 또는 모델 미등록 상황에서 fallback 사용 경고 로그를 출력한다.
