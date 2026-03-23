[codex] 2026-03-23 라우팅 분리 메모
- src/server.js는 프로세스 시작과 HTTP 서버 listen, 서비스 조립만 담당하도록 단순화했다.
- src/app/createApp.js에서 express 인스턴스 생성, 공통 미들웨어(json/static), 도메인 라우터 마운트, 에러 미들웨어 연결을 담당한다.
- src/routes/에 run/prompt/asset/settings/web 라우터를 팩토리 함수 형태로 분리해 의존성을 외부 주입받도록 구성했다.
[codex] 2026-03-23 비동기 저장소 전환 메모
- src/store/runStore.js는 fs/promises 기반으로 전환했고 readyPromise + fileAccessQueue 직렬화로 create/update/get/list/delete를 모두 async 메서드로 제공한다.
- src/services/promptService.js는 list/get/update/loadPhasePrompts를 async로 전환해 프롬프트 파일 접근을 await 기반으로 통일했다.
- src/routes/runRoutes.js, src/routes/promptRoutes.js, src/services/pipelineOrchestrator.js, src/services/pipeline/*.js 호출부를 await로 맞춰 예외가 asyncRoute/상위 catch로 일관 전파되도록 정리했다.
[codex] 2026-03-23 설정 운영자 오버라이드 메모
- src/config/environment.js에 운영자 전용 env 로더(getOperatorSettingsEnvOverrides)를 추가해 video/image/ffmpeg/safety 관련 운영 강제값을 객체 형태로 반환한다.
- src/services/settingsService.js는 readConfig에서 코드 기본값 < config.json < env 오버라이드 순서로 병합하고 getDefaultConfig도 env 오버라이드를 반영한다.
- src/config/settingsDefaults.js의 운영자 전용 항목(video.model, video.splitModel, image.model, ffmpeg.path, safety.*)에 readOnly + hidden 플래그를 부여했다.
- src/routes/settingsRoutes.js는 /api/settings, /api/settings/defaults, PATCH/RESET 응답에서 hidden/sensitive 정책을 적용해 운영값 노출을 제한한다.
[codex] 2026-03-23 작업 메모 2
- src/routes/runRoutes.js는 createRun 시 inputVideo/inputText/inputAssetId/selectedReferenceAssets를 함께 저장하도록 입력 분기를 확장했다.
- src/store/runStore.js createRun은 문자열(기존 호환)과 객체 입력을 모두 허용하며 inputText/selectedReferenceAssets 필드를 run 레코드에 기록한다.
- src/services/geminiClient.js는 영상 확장자 기반으로 inline_data mime_type(video/mp4, video/webm)을 동적으로 지정한다.
